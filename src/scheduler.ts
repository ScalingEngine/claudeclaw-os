import crypto from 'crypto';

import { CronExpressionParser } from 'cron-parser';

import { AGENT_ID, ALLOWED_CHAT_ID, MAIN_AGENT_ID, agentMcpAllowlist } from './config.js';
import {
  getDueTasks,
  getSession,
  logConversationTurn,
  markTaskRunning,
  updateTaskAfterRun,
  resetStuckTasks,
  claimNextMissionTask,
  completeMissionTask,
  resetStuckMissionTasks,
  getMissionTask,
  markDispatchExecuting,
  markDispatchExecuted,
  markDispatchFailed,
  setDispatchContentHash,
  setDispatchNotionPageId,
} from './db.js';
import { claimApprovedTicketViaWorker, createDispatchReceiptViaWorker } from './cos-worker-exec.js';
import { markNotionTerminal } from './notion-sync.js';
import { logger } from './logger.js';
import { messageQueue } from './message-queue.js';
import { runAgent } from './agent.js';
import { formatForTelegram, splitMessage } from './bot.js';
import { writeVaultTranscript } from './vault-transcript.js';

type Sender = (text: string) => Promise<void>;

/** Max time (ms) a scheduled task can run before being killed. */
const TASK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

let sender: Sender;

/**
 * In-memory set of task IDs currently being executed.
 * Acts as a fast-path guard alongside the DB-level lock in markTaskRunning.
 */
const runningTaskIds = new Set<string>();

/**
 * Initialise the scheduler. Call once after the Telegram bot is ready.
 * @param send  Function that sends a message to the user's Telegram chat.
 */
let schedulerAgentId: string = MAIN_AGENT_ID;

export function initScheduler(send: Sender, agentId: string = MAIN_AGENT_ID): void {
  if (!ALLOWED_CHAT_ID) {
    logger.warn('ALLOWED_CHAT_ID not set — scheduler will not send results');
  }
  sender = send;
  schedulerAgentId = agentId;

  // Recover tasks stuck in 'running' from a previous crash
  const recovered = resetStuckTasks(agentId);
  if (recovered > 0) {
    logger.warn({ recovered, agentId }, 'Reset stuck tasks from previous crash');
  }
  const recoveredMission = resetStuckMissionTasks(agentId);
  if (recoveredMission > 0) {
    logger.warn({ recovered: recoveredMission, agentId }, 'Reset stuck mission tasks from previous crash');
  }

  setInterval(() => void runDueTasks(), 60_000);
  logger.info({ agentId }, 'Scheduler started (checking every 60s)');
}

async function runDueTasks(): Promise<void> {
  const tasks = getDueTasks(schedulerAgentId);

  if (tasks.length > 0) {
    logger.info({ count: tasks.length }, 'Running due scheduled tasks');
  }

  for (const task of tasks) {
    // In-memory guard: skip if already running in this process
    if (runningTaskIds.has(task.id)) {
      logger.warn({ taskId: task.id }, 'Task already running, skipping duplicate fire');
      continue;
    }

    // Compute next occurrence BEFORE executing so we can lock the task
    // in the DB immediately, preventing re-fire on subsequent ticks.
    const nextRun = computeNextRun(task.schedule);
    runningTaskIds.add(task.id);
    markTaskRunning(task.id, nextRun);

    logger.info({ taskId: task.id, prompt: task.prompt.slice(0, 60) }, 'Firing task');

    // Route through the message queue so scheduled tasks wait for any
    // in-flight user message to finish before running. This prevents
    // two Claude processes from hitting the same session simultaneously.
    const chatId = ALLOWED_CHAT_ID || 'scheduler';
    messageQueue.enqueue(chatId, async () => {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), TASK_TIMEOUT_MS);

      try {
        await sender(`Scheduled task running: "${task.prompt.slice(0, 80)}${task.prompt.length > 80 ? '...' : ''}"`);

        // Run as a fresh agent call (no session — scheduled tasks are autonomous)
        const result = await runAgent(task.prompt, undefined, () => {}, undefined, undefined, abortController, undefined, agentMcpAllowlist);
        clearTimeout(timeout);

        if (result.aborted) {
          updateTaskAfterRun(task.id, nextRun, 'Timed out after 10 minutes', 'timeout');
          await sender(`⏱ Task timed out after 10m: "${task.prompt.slice(0, 60)}..." — killed.`);
          logger.warn({ taskId: task.id }, 'Task timed out');
          return;
        }

        const text = result.text?.trim() || 'Task completed with no output.';
        for (const chunk of splitMessage(formatForTelegram(text))) {
          await sender(chunk);
        }

        // Inject task output into the active chat session so user replies have context
        if (ALLOWED_CHAT_ID) {
          const activeSession = getSession(ALLOWED_CHAT_ID, schedulerAgentId);
          logConversationTurn(ALLOWED_CHAT_ID, 'user', `[Scheduled task]: ${task.prompt}`, activeSession ?? undefined, schedulerAgentId);
          logConversationTurn(ALLOWED_CHAT_ID, 'assistant', text, activeSession ?? undefined, schedulerAgentId);
        }

        updateTaskAfterRun(task.id, nextRun, text, 'success');

        logger.info({ taskId: task.id, nextRun }, 'Task complete, next run scheduled');
      } catch (err) {
        clearTimeout(timeout);
        const errMsg = err instanceof Error ? err.message : String(err);
        updateTaskAfterRun(task.id, nextRun, errMsg.slice(0, 500), 'failed');

        logger.error({ err, taskId: task.id }, 'Scheduled task failed');
        try {
          await sender(`❌ Task failed: "${task.prompt.slice(0, 60)}..." — ${errMsg.slice(0, 200)}`);
        } catch {
          // ignore send failure
        }
      } finally {
        runningTaskIds.delete(task.id);
      }
    });
  }

  // Also check for queued mission tasks (one-shot async tasks from Mission Control)
  await runDueMissionTasks();
}

async function runDueMissionTasks(): Promise<void> {
  const mission = claimNextMissionTask(schedulerAgentId);
  if (!mission) return;

  const missionKey = 'mission-' + mission.id;
  if (runningTaskIds.has(missionKey)) return;
  runningTaskIds.add(missionKey);

  logger.info({ missionId: mission.id, title: mission.title }, 'Running mission task');

  // Phase 4: Notion-originated mission? Flip local dispatch_log to
  // executing (canonical audit), then do the governed claim-time Notion
  // write via cos-worker.
  //
  // Phase 6 Wave 0.5 Phase C: this replaces the old per-agent
  // mirrorDispatchToNotion(status:'Executing') call, which failed
  // silently because the per-agent scheduler process lacks Notion
  // access. claimApprovedTicket runs in Notion's infra with its own
  // token, AND stamps the source row Write Source=Agent + Last Synced
  // At at claim time (ClaudeClaw's local-first claim never did this —
  // strengthens echo prevention + surfaces the claim in Notion).
  // Idempotent by run_id; rejects non-claim-eligible rows. Best-effort:
  // local dispatch_log stays canonical, worker failure ⇒ logged no-op.
  const isNotionLinked = !!mission.notion_page_id && !!mission.dispatch_log_id;
  if (isNotionLinked && mission.dispatch_log_id) {
    markDispatchExecuting(mission.dispatch_log_id);
    const dispatchLogId = mission.dispatch_log_id;
    void claimApprovedTicketViaWorker({
      action_page_id: mission.notion_page_id!,
      action_db: notionDbLabel(mission.notion_db),
      claimed_by: schedulerAgentId,
      run_id: mission.id,
    }).then((res) => {
      if (res?.dispatch_log_page_id) {
        setDispatchNotionPageId(dispatchLogId, res.dispatch_log_page_id);
      }
    });
  }

  const chatId = ALLOWED_CHAT_ID || 'mission';
  messageQueue.enqueue(chatId, async () => {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), TASK_TIMEOUT_MS);

    // Cross-process cancel signal: dashboard flips status to 'cancelled' in
    // SQLite, this poll picks it up within 5s and aborts the runAgent call.
    let cancelledByUser = false;
    const cancelPoll = setInterval(() => {
      const current = getMissionTask(mission.id);
      if (current?.status === 'cancelled') {
        cancelledByUser = true;
        abortController.abort();
        clearInterval(cancelPoll);
      }
    }, 5_000);

    try {
      const result = await runAgent(mission.prompt, undefined, () => {}, undefined, undefined, abortController, undefined, agentMcpAllowlist);
      clearTimeout(timeout);
      clearInterval(cancelPoll);

      if (result.aborted) {
        if (cancelledByUser) {
          // Status is already 'cancelled' from the dashboard write — leave it.
          logger.info({ missionId: mission.id }, 'Mission task cancelled by user');
          // Phase 4.1: best-effort transcript for the cancelled run. The row
          // is already 'cancelled' (user-driven terminal) so we don't gate
          // on transcript success — re-running would contradict the user.
          await tryWriteTranscript(mission, schedulerAgentId, '', 'cancelled by user', 'failed');
          await finalizeNotion(mission, 'failed', 'cancelled by user');
        } else {
          // Phase 4.1: vault transcript is a hard precondition for marking
          // terminal. If the transcript can't be written, leave the mission
          // in 'running' so resetStuckMissionTasks reclaims it.
          const transcriptOk = await tryWriteTranscript(
            mission,
            schedulerAgentId,
            '',
            'Timed out after 10 minutes',
            'failed',
          );
          if (!transcriptOk) {
            logger.error({ missionId: mission.id }, 'Vault transcript write failed on timeout — refusing to mark mission failed');
            return;
          }
          completeMissionTask(mission.id, null, 'failed', 'Timed out after 10 minutes');
          logger.warn({ missionId: mission.id }, 'Mission task timed out');
          await finalizeNotion(mission, 'failed', 'Timed out after 10 minutes');
          try {
            await sender('Mission task timed out: "' + mission.title + '"');
          } catch (sendErr) {
            // Sender can fail for Telegram API blips or chat-not-found. We
            // still want to see it so the user isn't silently unnotified.
            logger.warn({ err: sendErr, missionId: mission.id }, 'Failed to send mission timeout notification');
          }
        }
      } else {
        const text = result.text?.trim() || 'Task completed with no output.';

        // Phase 4.1: vault transcript is a hard precondition for marking
        // terminal. If the transcript can't be written (disk full, vault
        // missing, etc), we DO NOT mark the mission complete or flip Notion.
        // Mission stays in 'running' state; resetStuckMissionTasks on next
        // boot reclaims it.
        const transcriptOk = await tryWriteTranscript(mission, schedulerAgentId, text, undefined, 'executed');
        if (!transcriptOk) {
          logger.error({ missionId: mission.id }, 'Vault transcript write failed — refusing to mark mission complete');
          return;
        }

        completeMissionTask(mission.id, text, 'completed');
        logger.info({ missionId: mission.id }, 'Mission task completed');
        await finalizeNotion(mission, 'success', text);

        // Send result to Telegram
        for (const chunk of splitMessage(formatForTelegram(text))) {
          await sender(chunk);
        }

        // Inject into conversation context so agent can reference it
        if (ALLOWED_CHAT_ID) {
          const activeSession = getSession(ALLOWED_CHAT_ID, schedulerAgentId);
          logConversationTurn(ALLOWED_CHAT_ID, 'user', '[Mission task: ' + mission.title + ']: ' + mission.prompt, activeSession ?? undefined, schedulerAgentId);
          logConversationTurn(ALLOWED_CHAT_ID, 'assistant', text, activeSession ?? undefined, schedulerAgentId);
        }
      }
    } catch (err) {
      clearTimeout(timeout);
      clearInterval(cancelPoll);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (cancelledByUser) {
        logger.info({ missionId: mission.id }, 'Mission task cancelled by user (threw on abort)');
        await tryWriteTranscript(mission, schedulerAgentId, '', 'cancelled by user', 'failed');
        await finalizeNotion(mission, 'failed', 'cancelled by user');
      } else {
        // Phase 4.1: same gate on the catch path. If transcript fails,
        // leave mission in 'running' for next boot to reclaim.
        const transcriptOk = await tryWriteTranscript(
          mission,
          schedulerAgentId,
          '',
          errMsg.slice(0, 2000),
          'failed',
        );
        if (!transcriptOk) {
          logger.error({ err, missionId: mission.id }, 'Vault transcript write failed on error — refusing to mark mission failed');
          return;
        }
        completeMissionTask(mission.id, null, 'failed', errMsg.slice(0, 500));
        logger.error({ err, missionId: mission.id }, 'Mission task failed');
        await finalizeNotion(mission, 'failed', errMsg);
      }
    } finally {
      clearInterval(cancelPoll);
      runningTaskIds.delete(missionKey);
    }
  });
}

/**
 * Phase 4.1 — vault transcript contract.
 *
 * Writes a full transcript to <VAULT_ROOT>/_execution/durable/queue/<lane>/
 * <notion_page_id>.md before the scheduler marks a Notion-originated mission
 * terminal. Non-Notion missions skip silently — the contract only applies
 * to work units that have a Notion source row.
 *
 * Returns true on success (or skip). Returns false if the write threw, in
 * which case the scheduler refuses to advance the mission to a terminal
 * state.
 */
async function tryWriteTranscript(
  mission: {
    id: string;
    prompt: string;
    started_at: number | null;
    notion_page_id?: string | null;
    notion_db?: string | null;
    dispatch_log_id?: string | null;
  },
  agent: string,
  output: string,
  errorMessage: string | undefined,
  status: 'executed' | 'failed' | 'acknowledged',
): Promise<boolean> {
  // Non-Notion missions skip silently — the contract only applies to
  // Notion-originated work.
  if (!mission.notion_page_id || !mission.notion_db || !mission.dispatch_log_id) {
    return true;
  }
  try {
    writeVaultTranscript({
      notionPageId: mission.notion_page_id,
      notionDb: mission.notion_db as 'comms' | 'execution' | 'decisions' | 'signals',
      dispatchLogId: mission.dispatch_log_id,
      runId: mission.id,
      agent,
      startedAt: new Date(mission.started_at ? mission.started_at * 1000 : Date.now()),
      finishedAt: new Date(),
      status,
      prompt: mission.prompt,
      output,
      errorMessage,
    });
    return true;
  } catch (err) {
    logger.error({ err, missionId: mission.id }, 'writeVaultTranscript threw');
    return false;
  }
}

// Phase 4: when a Notion-originated mission ends, flip dispatch_log to
// executed/failed AND write back to the source Notion row. Non-Notion
// missions skip silently.
async function finalizeNotion(
  mission: {
    id: string;
    title?: string;
    notion_page_id?: string | null;
    notion_db?: string | null;
    dispatch_log_id?: string | null;
    started_at?: number | null;
  },
  outcome: 'success' | 'failed',
  detail: string,
): Promise<void> {
  if (!mission.notion_page_id || !mission.notion_db || !mission.dispatch_log_id) return;

  if (outcome === 'success') {
    markDispatchExecuted(mission.dispatch_log_id);
  } else {
    markDispatchFailed(mission.dispatch_log_id, detail);
  }

  // Phase 4.1: persist the content hash locally so the next webhook fired
  // by our own write-back can be filtered by isAgentEcho's hash-check
  // defense. Must match the hash markNotionTerminal writes to Notion's
  // `Content Hash` rich_text — same input, same digest, same slice.
  const contentHash = detail
    ? crypto.createHash('sha256').update(detail).digest('hex').slice(0, 16)
    : '';
  if (contentHash) setDispatchContentHash(mission.dispatch_log_id, contentHash);

  try {
    await markNotionTerminal(mission.notion_page_id, mission.notion_db, outcome, detail);
  } catch (err) {
    logger.warn({ err, missionId: mission.id }, 'markNotionTerminal threw — local state is authoritative');
  }

  // Phase 6 Wave 0.5 Phase B: update the Notion COS Dispatch Log receipt
  // to its terminal state. ClaudeClaw mirrors the row as "Executing" at
  // the claim transition but never updates it at terminal — this fills
  // that gap. Idempotent by Run ID (UPDATEs the Executing row, no dup).
  // Purely additive + best-effort: local dispatch_log + vault transcript
  // remain the canonical audit (ARCHITECTURE-V2 authority split).
  try {
    const receipt = await createDispatchReceiptViaWorker({
      run_id: mission.id,
      action_title: mission.title ?? `${mission.notion_db}/${mission.notion_page_id.slice(0, 8)}`,
      action_db: notionDbLabel(mission.notion_db),
      action_page_id: mission.notion_page_id,
      actor: 'COS Automated',
      status: outcome === 'success' ? 'Executed' : 'Failed',
      action_type: null,
      agent: schedulerAgentId,
      target: null,
      details: null,
      result: outcome === 'success' ? detail.slice(0, 2000) : null,
      error: outcome === 'failed' ? detail.slice(0, 2000) : null,
      // mission.started_at is epoch SECONDS (sqlite strftime('%s')), not ms.
      started_at: mission.started_at ? new Date(mission.started_at * 1000).toISOString() : null,
      finished_at: new Date().toISOString(),
      vault_slug: `_execution/durable/queue/${mission.notion_db}/${mission.notion_page_id}.md`,
      content_hash: contentHash || null,
    });
    if (receipt) {
      logger.info(
        { missionId: mission.id, receiptPageId: receipt.receipt_page_id, created: receipt.created, status: receipt.status },
        'Dispatch Log receipt updated via cos-worker (Phase B)',
      );
    }
  } catch (err) {
    logger.warn({ err, missionId: mission.id }, 'createDispatchReceipt threw — local state is authoritative');
  }
}

function notionDbLabel(notionDb: string | null | undefined): import('./db.js').DispatchActionDb {
  switch (notionDb) {
    case 'comms':      return 'Communications Queue';
    case 'execution':  return 'Execution Queue';
    case 'decisions':  return 'Decisions';
    case 'signals':    return 'Priority Signals';
    default:           return 'Execution Queue';
  }
}

export function computeNextRun(cronExpression: string): number {
  const interval = CronExpressionParser.parse(cronExpression);
  return Math.floor(interval.next().getTime() / 1000);
}

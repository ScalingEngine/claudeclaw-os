/**
 * Phase 4: Notion ↔ ClaudeClaw sync loop.
 *
 *   Notion (Lucky drafts + Noah approves on mobile)
 *      │
 *      │  Status flips to a claim trigger (e.g. Comms→Approved, Signals→New)
 *      ▼
 *   notion-sync.ts (this module)
 *      • 10-min reconciliation poll across the 4 agent-executable DBs
 *      • POST /webhook/notion accelerates (mounted in dashboard.ts)
 *      • Loop-prevention: drops echoes of our own writes
 *      ▼
 *   mission_tasks (queued) + dispatch_log (queued)
 *      │
 *      ▼
 *   scheduler.ts claims mission → runAgent → completeMissionTask
 *      └─ on terminal: markNotionTerminal() flips Notion row atomically
 *
 * Lifecycle is tracked in dispatch_log (queued → executing → executed|failed).
 * Action DBs flip atomically (Approved → Sent | Executed | Acknowledged) so
 * the Notion UX doesn't see an "Executing" purgatory state.
 *
 * Boots only when CLAUDECLAW_ROLE === 'primary'. The Mac dev instance MUST
 * NOT poll Notion — that's the VPS executor's lane.
 */

import crypto from 'crypto';

import {
  type DispatchActionDb,
  createDispatchLog,
  createMissionTask,
  getMissionTaskByNotionPage,
  hasDispatchLogForActionPage,
  markDispatchExecuted,
  markDispatchFailed,
} from './db.js';
import { logger } from './logger.js';
import {
  type NotionPage,
  createPageInDatabase,
  getDate,
  getRichText,
  getSelect,
  getStatus,
  getTitle,
  isConfigured,
  props,
  queryDatabase,
  retrievePage,
  updatePage,
} from './notion-api.js';

// ── Configuration: DB IDs + claim contracts ───────────────────────────

interface LaneConfig {
  key: 'comms' | 'execution' | 'decisions' | 'signals';
  label: string;
  dbId: string;
  actionDb: DispatchActionDb;
  claimStatuses: string[];                     // statuses that mean "agent may claim"
  terminalSuccessStatus: string;               // what we flip to on success
  terminalFailureStatus: string | null;        // what we flip to on irrecoverable failure (null = no flip)
  promptTemplate: (page: NotionPage) => string;
  /** Agents that should run this lane's missions. First match wins. */
  agentId: string;
}

const DISPATCH_LOG_DB = '987b2b4e-9d1b-45e4-84a4-acd56dd09dc1';
const DECISIONS_DB = 'c04ea54f-1d29-478f-b563-ce5ff49ff5de';
const EXECUTION_QUEUE_DB = '3c9eadee-24a7-4b74-8411-1fa6c7b69654';

const LANES: LaneConfig[] = [
  {
    key: 'comms',
    label: 'Communications Queue',
    dbId: '1441582c-328d-44dd-8ff9-504675e9e827',
    actionDb: 'Communications Queue',
    claimStatuses: ['Approved'],
    terminalSuccessStatus: 'Sent',
    terminalFailureStatus: 'Draft',
    agentId: 'poe',                            // comms agent
    promptTemplate: (page) => `Send the comms draft on Notion page ${page.id} (${getTitle(page)}). Read the body from the page, dispatch via the channel indicated, then return a one-line confirmation.`,
  },
  {
    key: 'execution',
    label: 'Execution Queue',
    dbId: '3c9eadee-24a7-4b74-8411-1fa6c7b69654',
    actionDb: 'Execution Queue',
    claimStatuses: ['Approved'],
    terminalSuccessStatus: 'Executed',
    terminalFailureStatus: 'Rejected',
    agentId: 'hopper',                         // ops agent
    promptTemplate: (page) => `Execute the cross-system action on Notion page ${page.id} (${getTitle(page)}). Read the payload from the page body, perform the operation, then return a one-line summary.`,
  },
  {
    key: 'signals',
    label: 'Priority Signals',
    dbId: 'bc945eb3-12e0-4eb1-90d2-f98035080ca1',
    actionDb: 'Priority Signals',
    claimStatuses: ['New'],
    terminalSuccessStatus: 'Acknowledged',
    terminalFailureStatus: null,               // signals are never "failed" — they're triage hints
    agentId: 'vera',                           // research/signal agent
    promptTemplate: (page) => `Triage Priority Signal ${page.id} (${getTitle(page)}). Decide whether to (a) spawn a Comms Queue row, (b) spawn an Execution Queue row, or (c) intel-only. Read the page body for context.`,
  },
  // Decisions: read-only gate, no claim. Phase 4 surfaces it via cron only
  // when Downstream Action is set — handled separately to avoid spawning
  // a mission for every Decided row.
];

const POLL_INTERVAL_MS = 10 * 60 * 1000;       // 10 min reconciliation
const LOOP_PREVENTION_WINDOW_MS = 60 * 1000;   // drop echoes within 60s
const LANE_BY_KEY = new Map(LANES.map((l) => [l.key, l]));
const LANE_BY_DB_ID = new Map(LANES.map((l) => [l.dbId, l]));

// ── Loop prevention ───────────────────────────────────────────────────

/**
 * Webhook self-echo filter. A page we just wrote to will fire a webhook;
 * if Write Source=Agent AND Last Synced At is within LOOP_PREVENTION_WINDOW_MS
 * of right now, treat it as our own echo and drop.
 *
 * Belt-and-suspenders: page identity is also checked against
 * mission_tasks.notion_page_id uniqueness in the claim path.
 */
export function isAgentEcho(page: NotionPage): boolean {
  if (getSelect(page, 'Write Source') !== 'Agent') return false;
  const lastSynced = getDate(page, 'Last Synced At');
  if (!lastSynced) return false;
  const ageMs = Date.now() - new Date(lastSynced).getTime();
  return ageMs >= 0 && ageMs < LOOP_PREVENTION_WINDOW_MS;
}

// ── Claim a single Notion row → mission_tasks + dispatch_log ──────────

/**
 * Idempotent claim. Returns the new mission id on success, null if the
 * row was already claimed (idempotency guard) or filtered as an echo.
 */
export function claimNotionRow(page: NotionPage, laneKey: LaneConfig['key']): string | null {
  const lane = LANE_BY_KEY.get(laneKey);
  if (!lane) {
    logger.error({ laneKey, pageId: page.id }, 'Unknown lane key — refusing to claim');
    return null;
  }

  if (isAgentEcho(page)) {
    logger.debug({ pageId: page.id, lane: lane.key }, 'Dropping agent-echo webhook');
    return null;
  }

  // Idempotency: if we've already claimed this Notion page, skip silently.
  const existing = getMissionTaskByNotionPage(page.id);
  if (existing) {
    logger.debug(
      { pageId: page.id, missionId: existing.id, status: existing.status },
      'Notion page already claimed — skipping',
    );
    return null;
  }

  const dispatchId = crypto.randomUUID();
  const missionId = crypto.randomUUID();

  // Dispatch log row first so we have an audit pointer even if mission insert
  // fails (sqlite local — this is one transaction-equivalent in practice).
  createDispatchLog({
    id: dispatchId,
    actionDb: lane.actionDb,
    actionPageId: page.id,
    missionId,
    agent: lane.agentId,
  });

  createMissionTask(
    missionId,
    `[${lane.label}] ${getTitle(page).slice(0, 80) || '(untitled)'}`,
    lane.promptTemplate(page),
    lane.agentId,
    'notion-sync',
    1,                                         // Notion-originated tasks get priority 1
    { notionPageId: page.id, notionDb: lane.key, dispatchLogId: dispatchId },
  );

  logger.info(
    { pageId: page.id, lane: lane.key, missionId, dispatchId },
    'Claimed Notion row',
  );
  return missionId;
}

// ── Webhook ingestion ─────────────────────────────────────────────────

interface NotionWebhookPayload {
  type?: string;                               // e.g. 'page.properties_updated'
  entity?: { id?: string; type?: string };
  data?: { parent?: { id?: string; type?: string }; updated_properties?: string[] };
}

/**
 * Handle a Notion webhook event. Called from the dashboard route. Returns
 * a brief result for logging/HTTP body.
 *
 *   parent.id (database) tells us which lane the changed page belongs to.
 *   entity.id is the page id.
 *
 * The webhook is a hint — the cron is ground truth — so we don't have to
 * handle every payload shape perfectly. If we can't identify the lane,
 * log + ignore; the next cron tick will pick it up.
 */
export async function handleNotionWebhook(payload: NotionWebhookPayload): Promise<{ claimed: boolean; reason: string }> {
  const pageId = payload.entity?.id;
  const parentDb = payload.data?.parent?.id;
  if (!pageId || !parentDb) {
    return { claimed: false, reason: 'missing entity.id or parent.id' };
  }

  // Normalize Notion's no-dash UUIDs.
  const dashedDb = dashUuid(parentDb);
  const lane = LANE_BY_DB_ID.get(dashedDb);
  if (!lane) {
    return { claimed: false, reason: `db ${dashedDb} not in any lane` };
  }

  const page = await retrievePage(pageId);
  const status = getStatus(page);
  if (!status || !lane.claimStatuses.includes(status)) {
    return { claimed: false, reason: `status=${status} not a claim trigger for ${lane.key}` };
  }

  const missionId = claimNotionRow(page, lane.key);
  return missionId
    ? { claimed: true, reason: `mission ${missionId}` }
    : { claimed: false, reason: 'duplicate or echo' };
}

function dashUuid(s: string): string {
  const hex = s.replace(/-/g, '').toLowerCase();
  if (hex.length !== 32) return s;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ── Reconciliation poll ───────────────────────────────────────────────

/** Poll all lanes once; idempotent claims. Returns counts for logging. */
export async function reconcileOnce(): Promise<{ claimed: number; checked: number; errors: number; spawned: number }> {
  let claimed = 0;
  let checked = 0;
  let errors = 0;

  for (const lane of LANES) {
    try {
      const filter = {
        or: lane.claimStatuses.map((s) => ({
          property: 'Status',
          status: { equals: s },
        })),
      };
      const pages = await queryDatabase(lane.dbId, filter);
      checked += pages.length;
      for (const page of pages) {
        const missionId = claimNotionRow(page, lane.key);
        if (missionId) claimed += 1;
      }
    } catch (err) {
      errors += 1;
      logger.warn({ err, lane: lane.key }, 'Reconcile failed for lane');
    }
  }

  // Decisions spawn pass — separate from agent-claim lanes because the
  // "claim" here is mechanical (read Downstream Action, create Execution
  // Queue row, link back), no agent run needed.
  const decisionsResult = await reconcileDecisions();
  checked += decisionsResult.checked;
  errors += decisionsResult.errors;

  if (claimed > 0 || decisionsResult.spawned > 0 || errors > 0) {
    logger.info(
      { claimed, spawned: decisionsResult.spawned, checked, errors },
      'Notion reconcile pass',
    );
  }
  return { claimed, checked, errors, spawned: decisionsResult.spawned };
}

// ── Decisions: spawn Execution Queue rows from Decided + Downstream Action ──

/**
 * Per the COS Operating Manual, agents may act when:
 *   "Decisions status = Decided and Downstream Action exists"
 *
 * The agent's job is NOT to execute the decision (Noah already did that by
 * marking it Decided). The agent's job is to spawn an Execution Queue row
 * that captures the Downstream Action, so the existing Execution Queue
 * claim flow can carry it forward.
 *
 * The Decision row's Status is NEVER flipped by this function — per the
 * manual, "Agent never writes Decision Status." The spawn is recorded in
 * the local dispatch_log (action_db='Decisions', action_page_id=<decision
 * page id>) which provides idempotency.
 */
async function reconcileDecisions(): Promise<{ spawned: number; checked: number; errors: number }> {
  let spawned = 0;
  let checked = 0;
  let errors = 0;

  const filter = {
    and: [
      { property: 'Status', status: { equals: 'Decided' } },
      { property: 'Downstream Action', rich_text: { is_not_empty: true } },
    ],
  };

  try {
    const pages = await queryDatabase(DECISIONS_DB, filter);
    checked = pages.length;
    for (const page of pages) {
      try {
        const newRowId = await spawnExecutionFromDecision(page);
        if (newRowId) spawned += 1;
      } catch (err) {
        errors += 1;
        logger.warn({ err, decisionId: page.id }, 'Decision spawn failed');
      }
    }
  } catch (err) {
    errors += 1;
    logger.warn({ err }, 'reconcileDecisions query failed');
  }

  return { spawned, checked, errors };
}

/**
 * Spawn an Execution Queue row from a Decision. Idempotent — checks
 * dispatch_log for an existing row keyed on the Decision page id before
 * doing anything. Returns the new Execution Queue page id on success,
 * null if skipped (already spawned, echo, or empty downstream).
 */
async function spawnExecutionFromDecision(decisionPage: NotionPage): Promise<string | null> {
  if (hasDispatchLogForActionPage('Decisions', decisionPage.id)) {
    logger.debug({ decisionId: decisionPage.id }, 'Decision already spawned — skipping');
    return null;
  }
  if (isAgentEcho(decisionPage)) {
    logger.debug({ decisionId: decisionPage.id }, 'Decision echo — skipping');
    return null;
  }

  const decisionTitle = (getTitle(decisionPage, 'Decision') || '(untitled decision)').slice(0, 80);
  const downstreamAction = getRichText(decisionPage, 'Downstream Action').trim();
  if (!downstreamAction) {
    logger.debug({ decisionId: decisionPage.id }, 'Decision has empty Downstream Action');
    return null;
  }

  // Record dispatch BEFORE creating the row so a race can't double-spawn.
  // We mark it executed immediately on success (or failed on Notion error)
  // because the spawn is synchronous — no scheduler-driven async work.
  const dispatchId = crypto.randomUUID();
  createDispatchLog({
    id: dispatchId,
    actionDb: 'Decisions',
    actionPageId: decisionPage.id,
    agent: 'notion-sync',
  });

  try {
    // Build the Execution Queue row. Property names verified against the
    // live DB schema: Handoff Title (title), Status (status), Next Action
    // (rich_text), Related Decisions (relation), plus Phase 4 provenance.
    const properties: Record<string, any> = {
      'Handoff Title': props.title(`From Decision: ${decisionTitle}`),
      Status: props.status('Pending'),
      'Next Action': props.richText(downstreamAction.slice(0, 2000)),
      'Write Source': props.select('Agent'),
      'Last Synced At': props.date(new Date().toISOString()),
      'Related Decisions': {
        relation: [{ id: decisionPage.id }],
      },
    };

    const decisionType = getSelect(decisionPage, 'Decision Type');
    if (decisionType) properties['Decision Type'] = props.select(decisionType);

    const newRow = await createPageInDatabase(EXECUTION_QUEUE_DB, properties);
    markDispatchExecuted(dispatchId);

    // Write loop-prevention provenance back to the Decision row so a
    // webhook on this same Decision (which we just touched) gets filtered
    // by isAgentEcho.
    await updatePage(decisionPage.id, {
      'Write Source': props.select('Agent'),
      'Last Synced At': props.date(new Date().toISOString()),
      'Vault Slug': props.richText(`_execution/durable/queue/decisions/${decisionPage.id}.md`),
    });

    logger.info(
      { decisionId: decisionPage.id, executionId: newRow.id, dispatchId },
      'Spawned Execution Queue row from Decision',
    );
    return newRow.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    markDispatchFailed(dispatchId, msg.slice(0, 500));
    throw err;
  }
}

// ── Terminal write-back (scheduler calls this when a mission finishes) ──

/**
 * Called from scheduler.ts when a Notion-originated mission ends. Flips the
 * source Notion row to its terminal status atomically with provenance.
 *
 *   outcome 'success' → terminalSuccessStatus + Write Source=Agent + Last Synced At
 *   outcome 'failed'  → terminalFailureStatus (if defined) + same provenance,
 *                       plus an error rich_text on a Notes property if present.
 *   outcome 'skip'    → no terminal flip (used for signals where the agent
 *                       decided not to spawn downstream and the human triages)
 */
export async function markNotionTerminal(
  notionPageId: string,
  laneKey: string,
  outcome: 'success' | 'failed' | 'skip',
  detail?: string,
): Promise<void> {
  const lane = LANE_BY_KEY.get(laneKey as LaneConfig['key']);
  if (!lane) {
    logger.warn({ notionPageId, laneKey }, 'markNotionTerminal: unknown lane');
    return;
  }
  if (outcome === 'skip') return;

  const slug = `_execution/durable/queue/${lane.key}/${notionPageId}.md`;
  const contentHash = detail
    ? crypto.createHash('sha256').update(detail).digest('hex').slice(0, 16)
    : '';

  let newStatus: string | null = null;
  if (outcome === 'success') newStatus = lane.terminalSuccessStatus;
  else if (outcome === 'failed') newStatus = lane.terminalFailureStatus;

  if (!newStatus) {
    // No status flip allowed for this lane on this outcome (e.g. signals fail)
    return;
  }

  const properties: Record<string, any> = {
    Status: props.status(newStatus),
    'Write Source': props.select('Agent'),
    'Vault Slug': props.richText(slug),
    'Content Hash': props.richText(contentHash),
    'Last Synced At': props.date(new Date().toISOString()),
  };

  try {
    await updatePage(notionPageId, properties);
    logger.info(
      { notionPageId, lane: lane.key, newStatus, outcome },
      'Flipped Notion row to terminal',
    );
  } catch (err) {
    logger.error(
      { err, notionPageId, lane: lane.key, newStatus },
      'Failed to flip Notion row — mission still marked terminal locally',
    );
  }
}

// ── Notion-side Dispatch Log mirror ───────────────────────────────────

/**
 * Mirror a local dispatch_log row into Notion's Dispatch Log DB. Best
 * effort — if it fails, the local row stays authoritative.
 */
export async function mirrorDispatchToNotion(opts: {
  dispatchId: string;
  actionDb: DispatchActionDb;
  actionPageId: string;
  agent: string;
  runId: string;                               // mission_tasks.id
  status: 'Queued' | 'Executing' | 'Executed' | 'Failed';
  startedAt?: Date;
  finishedAt?: Date;
  error?: string;
}): Promise<string | null> {
  try {
    const properties: Record<string, any> = {
      Status: props.status(opts.status),
      'Action DB': props.select(opts.actionDb),
      'Action Page ID': props.richText(opts.actionPageId),
      'Run ID': props.richText(opts.runId),
      Agent: props.select(opts.agent),
      'Write Source': props.select('Agent'),
      'Last Synced At': props.date(new Date().toISOString()),
    };
    if (opts.startedAt) properties['Started At'] = props.date(opts.startedAt.toISOString());
    if (opts.finishedAt) properties['Finished At'] = props.date(opts.finishedAt.toISOString());
    if (opts.error) properties['Error'] = props.richText(opts.error);
    // Title-typed name property — Dispatch Log's title is usually "Name".
    properties['Name'] = props.title(`${opts.actionDb}/${opts.actionPageId.slice(0, 8)} (${opts.status})`);

    const page = await createPageInDatabase(DISPATCH_LOG_DB, properties);
    return page.id;
  } catch (err) {
    logger.warn({ err, dispatchId: opts.dispatchId }, 'Failed to mirror dispatch to Notion');
    return null;
  }
}

// ── Boot ──────────────────────────────────────────────────────────────

let pollTimer: ReturnType<typeof setInterval> | null = null;
let booted = false;

/**
 * Start the reconciliation cron. Idempotent — calling twice is a no-op.
 * Returns true if this call actually started the loop, false if disabled
 * or already running.
 */
export function startNotionSync(): boolean {
  if (booted) return false;
  const role = (process.env.CLAUDECLAW_ROLE || '').trim();
  if (role !== 'primary') {
    logger.info(
      { role },
      'CLAUDECLAW_ROLE != primary — notion-sync disabled (correct on Mac dev / secondary VPS)',
    );
    return false;
  }
  if (!isConfigured()) {
    logger.warn('NOTION_TOKEN not set — notion-sync disabled despite primary role');
    return false;
  }

  booted = true;
  logger.info(
    { lanes: LANES.map((l) => l.key), intervalMs: POLL_INTERVAL_MS },
    'notion-sync booted (CLAUDECLAW_ROLE=primary)',
  );

  // Fire one pass immediately on boot, then on interval.
  reconcileOnce().catch((err) => logger.error({ err }, 'Initial reconcile failed'));
  pollTimer = setInterval(() => {
    reconcileOnce().catch((err) => logger.error({ err }, 'Reconcile interval failed'));
  }, POLL_INTERVAL_MS);
  return true;
}

export function stopNotionSync(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  booted = false;
}

/** Test seam — fail a dispatch row locally if Notion echo never resolves. */
export function failDispatchLocally(dispatchId: string, error: string): void {
  markDispatchFailed(dispatchId, error);
}

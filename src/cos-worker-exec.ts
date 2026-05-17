/**
 * cos-worker shell-out wrapper.
 *
 * Phase 6 Wave 0 — ClaudeClaw delegates certain Notion-side operations to
 * the deployed cos-worker (Notion Workers runtime) by shelling out to the
 * `ntn workers exec` CLI from a directory containing `workers.json`.
 *
 * Two env vars control behavior:
 *   - COS_WORKER_DIR: cwd containing workers.json. If unset, all calls
 *     become no-ops (returns null) — used so Mac/dev runs don't fail.
 *   - NTN_BIN: path to the `ntn` binary. Defaults to `ntn` on PATH.
 *
 * Failure mode: best-effort. Worker call failures log a warning and return
 * null; they do not propagate up into the reconcile loop.
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readEnvFile } from './env.js';
import { logger } from './logger.js';

const execFileAsync = promisify(execFile);

// Read from process.env first, then fall back to ~/claudeclaw/.env — same
// pattern as notion-sync.ts. On VPS the systemd user unit may not set
// EnvironmentFile=, so .env-only configs would otherwise be invisible.
const envFile = readEnvFile(['NTN_BIN', 'COS_WORKER_DIR']);
const NTN_BIN = (process.env.NTN_BIN || envFile.NTN_BIN || 'ntn').trim();
const COS_WORKER_DIR = (process.env.COS_WORKER_DIR || envFile.COS_WORKER_DIR || '').trim();
const WORKER_EXEC_TIMEOUT_MS = 30_000;

type ReleaseStaleClaimWorkerOutput = {
  scanned?: number;
  released?: number;
  dry_run?: boolean;
  released_run_ids?: string[];
};

type ReleaseStaleClaimResult = {
  released: number;
  scanned: number;
};

// Notion Workers schema-builder validates ALL keys present — `.nullable()`
// ≠ `.optional()`. Pass explicit nulls or values for every declared field.
const STALE_AFTER_MINUTES = 30;

export async function releaseStaleClaimViaWorker(): Promise<ReleaseStaleClaimResult | null> {
  if (!COS_WORKER_DIR) return null;
  const payload = JSON.stringify({
    stale_after_minutes: STALE_AFTER_MINUTES,
    dry_run: false,
  });
  try {
    const { stdout } = await execFileAsync(
      NTN_BIN,
      ['workers', 'exec', 'releaseStaleClaim', '-d', payload],
      { cwd: COS_WORKER_DIR, timeout: WORKER_EXEC_TIMEOUT_MS },
    );
    const result = JSON.parse(stdout) as ReleaseStaleClaimWorkerOutput;
    return {
      released: typeof result.released === 'number' ? result.released : 0,
      scanned: typeof result.scanned === 'number' ? result.scanned : 0,
    };
  } catch (err) {
    logger.warn({ err }, 'releaseStaleClaim worker call failed');
    return null;
  }
}

// ── Phase A: validateAgentReadyRow pre-claim gate ────────────────────
//
// Read-only. Before ClaudeClaw commits a local claim, ask the governed
// cos-worker tool whether the Notion row is in a claim-eligible state.
// We only act on UNAMBIGUOUS reject states (terminal / claimed /
// drafting) — we deliberately do NOT reject on missing Phase 4 schema
// props (legacy rows ClaudeClaw legitimately claims) or
// write_source=Agent (ClaudeClaw's content-hash echo check is more
// precise). Purely additive: blocks only clearly-wrong claims earlier,
// with a governed audit note. Best-effort — worker failure ⇒ null ⇒
// caller falls back to today's behavior.

type ValidateAgentReadyRowWorkerOutput = {
  row_id?: string;
  title?: string;
  valid?: boolean;
  status?: string | null;
  write_source?: string | null;
  claim_state?: string;
  ready_for_claim?: boolean;
  notes?: string[];
};

export type RowGateVerdict = {
  /** true ⇒ caller should NOT claim; false ⇒ proceed as normal */
  reject: boolean;
  claim_state: string;
  status: string | null;
  notes: string[];
};

/** Claim states that unambiguously mean "do not claim this row". */
const HARD_REJECT_CLAIM_STATES = new Set(['terminal', 'claimed', 'drafting']);

export async function validateRowViaWorker(
  pageId: string,
): Promise<RowGateVerdict | null> {
  if (!COS_WORKER_DIR) return null;
  const payload = JSON.stringify({ row_id: pageId });
  try {
    const { stdout } = await execFileAsync(
      NTN_BIN,
      ['workers', 'exec', 'validateAgentReadyRow', '-d', payload],
      { cwd: COS_WORKER_DIR, timeout: WORKER_EXEC_TIMEOUT_MS },
    );
    const result = JSON.parse(stdout) as ValidateAgentReadyRowWorkerOutput;
    const claimState = typeof result.claim_state === 'string' ? result.claim_state : 'unknown';
    return {
      reject: HARD_REJECT_CLAIM_STATES.has(claimState),
      claim_state: claimState,
      status: result.status ?? null,
      notes: Array.isArray(result.notes) ? result.notes : [],
    };
  } catch (err) {
    logger.warn({ err, pageId }, 'validateAgentReadyRow worker call failed');
    return null;
  }
}

// ── Phase B: createDispatchReceipt terminal receipt ──────────────────
//
// Fills a real gap: ClaudeClaw mirrors the Notion Dispatch Log row as
// "Executing" at the claim→executing transition but never updates it to
// Executed/Failed at terminal (only the local sqlite dispatch_log gets
// the terminal update). createDispatchReceipt is idempotent by Run ID,
// so calling it at terminal UPDATEs the same receipt row to its final
// state instead of leaving it orphaned at Executing.
//
// Purely additive + best-effort: ClaudeClaw's local dispatch_log +
// vault transcript remain the canonical execution audit (ARCHITECTURE-V2
// authority split). Worker failure ⇒ null ⇒ no-op, local state intact.
//
// schema-builder validates ALL keys present (`.nullable()` ≠
// `.optional()`) — every field below is sent explicitly, null when N/A.

export type DispatchReceiptInput = {
  run_id: string;
  action_title: string;
  action_db: string;
  action_page_id: string;
  actor: string;
  status: 'Queued' | 'Executing' | 'Executed' | 'Failed';
  action_type: string | null;
  agent: string | null;
  target: string | null;
  details: string | null;
  result: string | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  vault_slug: string | null;
  content_hash: string | null;
};

type CreateDispatchReceiptWorkerOutput = {
  receipt_page_id?: string;
  created?: boolean;
  run_id?: string;
  status?: string;
};

export type DispatchReceiptResult = {
  receipt_page_id: string;
  created: boolean;
  status: string;
};

export async function createDispatchReceiptViaWorker(
  input: DispatchReceiptInput,
): Promise<DispatchReceiptResult | null> {
  if (!COS_WORKER_DIR) return null;
  const payload = JSON.stringify(input);
  try {
    const { stdout } = await execFileAsync(
      NTN_BIN,
      ['workers', 'exec', 'createDispatchReceipt', '-d', payload],
      { cwd: COS_WORKER_DIR, timeout: WORKER_EXEC_TIMEOUT_MS },
    );
    const result = JSON.parse(stdout) as CreateDispatchReceiptWorkerOutput;
    return {
      receipt_page_id: typeof result.receipt_page_id === 'string' ? result.receipt_page_id : '',
      created: result.created === true,
      status: typeof result.status === 'string' ? result.status : '',
    };
  } catch (err) {
    logger.warn({ err, runId: input.run_id }, 'createDispatchReceipt worker call failed');
    return null;
  }
}

// ── Phase C: claimApprovedTicket claim-time Notion write ─────────────
//
// Replaces the silently-failing per-agent mirrorDispatchToNotion(
// status:'Executing') call. claimApprovedTicket runs in Notion's infra
// with its own token, so it actually lands (the inline mirror failed
// because the per-agent scheduler process lacks Notion access).
//
// It also stamps the SOURCE row Write Source=Agent + Last Synced At at
// claim time — which ClaudeClaw's local-first claim never did. That
// surfaces the claim in Notion and strengthens echo prevention. The
// tool rejects if the row isn't claim-eligible (claim_state must be
// "unclaimed") and is idempotent: an already-claimed row returns the
// existing Dispatch Log row instead of double-claiming.
//
// Best-effort: local dispatch_log (markDispatchExecuting) remains the
// canonical execution audit. Worker failure ⇒ null ⇒ no-op.

type ClaimApprovedTicketWorkerOutput = {
  claimed?: boolean;
  run_id?: string;
  dispatch_log_page_id?: string;
  action_page_id?: string;
};

export type ClaimApprovedTicketResult = {
  claimed: boolean;
  run_id: string;
  dispatch_log_page_id: string;
};

export async function claimApprovedTicketViaWorker(input: {
  action_page_id: string;
  action_db: string;
  claimed_by: string;
  run_id: string;
}): Promise<ClaimApprovedTicketResult | null> {
  if (!COS_WORKER_DIR) return null;
  const payload = JSON.stringify({
    action_page_id: input.action_page_id,
    action_db: input.action_db,
    claimed_by: input.claimed_by,
    run_id: input.run_id,
  });
  try {
    const { stdout } = await execFileAsync(
      NTN_BIN,
      ['workers', 'exec', 'claimApprovedTicket', '-d', payload],
      { cwd: COS_WORKER_DIR, timeout: WORKER_EXEC_TIMEOUT_MS },
    );
    const result = JSON.parse(stdout) as ClaimApprovedTicketWorkerOutput;
    return {
      claimed: result.claimed === true,
      run_id: typeof result.run_id === 'string' ? result.run_id : input.run_id,
      dispatch_log_page_id:
        typeof result.dispatch_log_page_id === 'string' ? result.dispatch_log_page_id : '',
    };
  } catch (err) {
    logger.warn({ err, runId: input.run_id }, 'claimApprovedTicket worker call failed');
    return null;
  }
}

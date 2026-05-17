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

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

type ReleaseStaleClaimResult = {
  released: number;
  checked: number;
};

export async function releaseStaleClaimViaWorker(): Promise<ReleaseStaleClaimResult | null> {
  if (!COS_WORKER_DIR) return null;
  try {
    const { stdout } = await execFileAsync(
      NTN_BIN,
      ['workers', 'exec', 'releaseStaleClaim', '-d', '{}'],
      { cwd: COS_WORKER_DIR, timeout: WORKER_EXEC_TIMEOUT_MS },
    );
    const result = JSON.parse(stdout) as Partial<ReleaseStaleClaimResult>;
    return {
      released: typeof result.released === 'number' ? result.released : 0,
      checked: typeof result.checked === 'number' ? result.checked : 0,
    };
  } catch (err) {
    logger.warn({ err }, 'releaseStaleClaim worker call failed');
    return null;
  }
}

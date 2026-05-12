import fs from 'fs';
import path from 'path';

import { CLAUDECLAW_CONFIG } from './config.js';
import { logger } from './logger.js';

// Directory where per-turn scratchpad files live.
// Mirrors src/media.ts UPLOADS_DIR posture: one constant, ensured on module load.
// Routed through CLAUDECLAW_CONFIG (never os.homedir()) so tests can override
// via the same env var the rest of the project respects.
export const SCRATCH_DIR = path.join(CLAUDECLAW_CONFIG, 'scratch');

// Ensure scratch dir exists on module load.
fs.mkdirSync(SCRATCH_DIR, { recursive: true });

/**
 * Sanitize a filename component: replace anything outside [a-zA-Z0-9.-] with _.
 * Mirrors src/media.ts:sanitizeFilename — blocks path traversal in agentId/chatId
 * (chatIds are numeric in practice but Slack thread_ts contains dots and we
 * must never let a "../" shaped value escape SCRATCH_DIR).
 */
function sanitizeComponent(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-]/g, '_');
}

/**
 * Create a fresh scratchpad file for one agent turn.
 *
 * Returns the absolute path. Filename is `${agentId}-${chatId}-${ts}.md` so
 * `ls ~/.claudeclaw/scratch/` groups by persona, and Date.now() guarantees
 * uniqueness across rapid back-to-back turns within the same chat.
 */
export function createScratchpad(agentId: string, chatId: string): string {
  const safeAgent = sanitizeComponent(agentId);
  const safeChat = sanitizeComponent(chatId);
  const filename = `${safeAgent}-${safeChat}-${Date.now()}.md`;
  const fullPath = path.join(SCRATCH_DIR, filename);
  fs.writeFileSync(
    fullPath,
    `# Scratchpad for ${safeAgent} / chat ${safeChat}\n\n`,
    'utf-8',
  );
  return fullPath;
}

/**
 * Best-effort delete. Never throws — if the file is gone or unwritable, the
 * sweep at process startup will catch it later. Mirrors src/index.ts:releaseLock.
 */
export function deleteScratchpad(file: string): void {
  try {
    fs.unlinkSync(file);
  } catch {
    /* ignore — sweep will handle it */
  }
}

/**
 * Delete scratchpad files older than maxAgeMs (default 24h).
 * Copy of src/media.ts:cleanupOldUploads, retargeted to SCRATCH_DIR.
 */
export function cleanupOldScratchpads(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  let entries: string[];
  try {
    entries = fs.readdirSync(SCRATCH_DIR);
  } catch {
    return;
  }

  const now = Date.now();
  let deleted = 0;

  for (const entry of entries) {
    const fullPath = path.join(SCRATCH_DIR, entry);
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(fullPath);
        deleted++;
      }
    } catch {
      // Skip files we can't stat or delete
    }
  }

  if (deleted > 0) {
    logger.info({ deleted, dir: SCRATCH_DIR }, 'Cleaned up old scratchpads');
  }
}

import fs from 'fs';
import os from 'os';
import path from 'path';

import { readEnvFile } from './env.js';
import { logger } from './logger.js';

/**
 * Phase 4.1 — vault transcript contract.
 *
 * Every Notion-originated mission task MUST write a transcript to the vault
 * subtree `_execution/durable/queue/<lane>/<page_id>.md` BEFORE being marked
 * terminal (completed/failed) in SQLite or flipped in Notion. The scheduler
 * treats a failed transcript write as a hard precondition failure and keeps
 * the mission in `running` so the next boot reclaims it.
 *
 * The vault subtree is single-writer (VPS only — see queue/README.md). gbrain
 * indexes the markdown produced here; the corresponding Notion row carries
 * the same path in its `Vault Slug` property so Notion ↔ vault round-trips.
 */

export type TranscriptStatus = 'executed' | 'failed' | 'acknowledged';
export type TranscriptLane = 'comms' | 'execution' | 'decisions' | 'signals';

export interface TranscriptRecord {
  notionPageId: string;
  notionDb: TranscriptLane;
  dispatchLogId: string;
  runId: string;                  // mission_tasks.id
  agent: string;                  // agent id (poe/hopper/vera/ezra)
  startedAt: Date;
  finishedAt: Date;
  status: TranscriptStatus;
  prompt: string;                 // the agent's input
  output: string;                 // the agent's final text response
  errorMessage?: string;          // populated when status=failed
}

export class VaultRootMissingError extends Error {
  constructor(public readonly resolvedPath: string) {
    super(`Vault root does not exist on disk: ${resolvedPath}`);
    this.name = 'VaultRootMissingError';
  }
}

/**
 * Test seam — resolve the vault root from env or default. Exported so
 * scheduler tests can verify the path. Throws VaultRootMissingError if the
 * resolved directory does not exist (hard fail on VPS).
 */
export function resolveVaultRoot(): string {
  const env = readEnvFile(['VAULT_ROOT']);
  let raw = env.VAULT_ROOT ?? '';
  if (!raw) {
    raw = path.join(os.homedir(), 'NoahBrain');
  } else if (raw.startsWith('~')) {
    raw = path.join(os.homedir(), raw.slice(1).replace(/^[/\\]/, ''));
  }
  const resolved = path.resolve(raw);
  if (!fs.existsSync(resolved)) {
    throw new VaultRootMissingError(resolved);
  }
  return resolved;
}

function composeMarkdown(record: TranscriptRecord): string {
  const lines: string[] = [];
  lines.push('---');
  lines.push(`notion_page_id: ${record.notionPageId}`);
  lines.push(`notion_db: ${record.notionDb}`);
  lines.push(`dispatch_log_id: ${record.dispatchLogId}`);
  lines.push(`run_id: ${record.runId}`);
  lines.push(`agent: ${record.agent}`);
  lines.push(`started_at: ${record.startedAt.toISOString()}`);
  lines.push(`finished_at: ${record.finishedAt.toISOString()}`);
  lines.push(`status: ${record.status}`);
  lines.push('---');
  lines.push('');
  lines.push(`# Mission run · ${record.agent} · ${record.finishedAt.toISOString()}`);
  lines.push('');
  lines.push('## Prompt');
  lines.push('');
  lines.push(record.prompt.trim().length > 0 ? record.prompt : '_(no prompt captured)_');
  lines.push('');
  lines.push('## Output');
  lines.push('');
  lines.push(record.output.trim().length > 0 ? record.output : '_(no output captured)_');
  if (record.status === 'failed') {
    lines.push('');
    lines.push('## Error');
    lines.push('');
    lines.push(record.errorMessage && record.errorMessage.trim().length > 0
      ? record.errorMessage
      : '_(no error message captured)_');
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Write a transcript file to the vault. Throws on filesystem failure.
 * Returns the absolute file path written.
 *
 * Path: <VAULT_ROOT>/_execution/durable/queue/<notionDb>/<notionPageId>.md
 *
 * Body: YAML frontmatter (full TranscriptRecord) + the prompt + the output
 *       (or error) in two markdown sections.
 *
 * Writes are atomic: a sibling `.tmp` is written first, then renamed over
 * the final path. This prevents gbrain from reading a torn write mid-flush.
 */
export function writeVaultTranscript(record: TranscriptRecord): string {
  const root = resolveVaultRoot();
  const dir = path.join(root, '_execution', 'durable', 'queue', record.notionDb);
  const finalPath = path.join(dir, `${record.notionPageId}.md`);
  const tmpPath = `${finalPath}.tmp`;

  fs.mkdirSync(dir, { recursive: true });

  const body = composeMarkdown(record);
  fs.writeFileSync(tmpPath, body, { encoding: 'utf-8' });
  fs.renameSync(tmpPath, finalPath);

  logger.info(
    { path: finalPath, runId: record.runId, status: record.status },
    'Vault transcript written',
  );
  return finalPath;
}

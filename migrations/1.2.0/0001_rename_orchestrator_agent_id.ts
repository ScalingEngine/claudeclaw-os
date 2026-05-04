/**
 * 1.2.0 / 0001 — Rename orchestrator + specialist agent_id values
 *
 * Background: The fork moved from function-named agent IDs (main, research,
 * comms, content, ops, code) to single-name persona-based IDs (ezra, vera,
 * poe, cole, hopper, archie). This migration backfills historical rows in
 * the SQLite store so old conversations, audit entries, and token usage
 * continue to attribute correctly under the new IDs.
 *
 * Tables touched (per `grep PRAGMA table_info` of agent_id columns):
 *   - sessions            (PRIMARY KEY chat_id+agent_id, so we delete-then-insert
 *                          to avoid PRIMARY KEY collisions when both old + new
 *                          rows exist for the same chat — extremely unlikely
 *                          in practice but defensive.)
 *   - conversation_log
 *   - token_usage
 *   - audit_log
 *   - hive_mind
 *   - memories            (preserved attribution for hive-mind memory)
 *   - scheduled_tasks     (cron-scheduled tasks routed to old IDs)
 *
 * Empty tables included for completeness — UPDATE on an empty table is a
 * no-op, so listing them costs nothing and protects against future seed
 * data.
 *
 * Schema column DEFAULT clauses were updated separately in src/db.ts
 * (DEFAULT 'ezra'). Existing rows are not affected by DEFAULT changes; this
 * migration handles them.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const STORE_DIR = path.join(PROJECT_ROOT, 'store');
const DB_PATH = path.join(STORE_DIR, 'claudeclaw.db');

export const description =
  'Rename agent_id values: main→ezra, research→vera, comms→poe, content→cole, ops→hopper, code→archie';

const ID_MAPPINGS: ReadonlyArray<readonly [string, string]> = [
  ['main', 'ezra'],
  ['research', 'vera'],
  ['comms', 'poe'],
  ['content', 'cole'],
  ['ops', 'hopper'],
  ['code', 'archie'],
];

// Tables with an `agent_id` column (verified by introspection on 2026-05-04).
const SIMPLE_TABLES = [
  'conversation_log',
  'token_usage',
  'audit_log',
  'hive_mind',
  'memories',
  'scheduled_tasks',
  'meet_sessions',
  'agent_file_history',
  'skill_usage',
];

// inter_agent_tasks has both from_agent and to_agent columns
const FROM_TO_TABLES: Array<{ table: string; cols: string[] }> = [
  { table: 'inter_agent_tasks', cols: ['from_agent', 'to_agent'] },
  { table: 'agent_suggestions', cols: ['from_agent'] },
];

export async function run(): Promise<void> {
  if (!require('fs').existsSync(DB_PATH)) {
    console.log(`No DB at ${DB_PATH} — fresh install, nothing to migrate.`);
    return;
  }
  const db = new Database(DB_PATH);
  try {
    db.pragma('foreign_keys = OFF');
    const tx = db.transaction(() => {
      let totalUpdated = 0;

      // sessions has PRIMARY KEY (chat_id, agent_id) so a vanilla UPDATE
      // could fail if both old + new rows happen to coexist for one chat.
      // Resolve by deleting any new-id row that conflicts BEFORE the update.
      // (In practice no row currently uses the new IDs, so this is a defensive
      // belt-and-suspenders against a partially-migrated install.)
      const sessionsStmt = db.prepare(
        `DELETE FROM sessions WHERE chat_id IN (SELECT chat_id FROM sessions WHERE agent_id = ?) AND agent_id = ?`,
      );
      const sessionsUpdate = db.prepare(`UPDATE sessions SET agent_id = ? WHERE agent_id = ?`);
      for (const [oldId, newId] of ID_MAPPINGS) {
        sessionsStmt.run(oldId, newId);
        const info = sessionsUpdate.run(newId, oldId);
        if (info.changes > 0) {
          console.log(`  sessions: ${oldId} → ${newId}: ${info.changes} rows`);
          totalUpdated += info.changes;
        }
      }

      for (const table of SIMPLE_TABLES) {
        const tableExists = db
          .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
          .get(table);
        if (!tableExists) continue;
        const stmt = db.prepare(`UPDATE ${table} SET agent_id = ? WHERE agent_id = ?`);
        for (const [oldId, newId] of ID_MAPPINGS) {
          const info = stmt.run(newId, oldId);
          if (info.changes > 0) {
            console.log(`  ${table}.agent_id: ${oldId} → ${newId}: ${info.changes} rows`);
            totalUpdated += info.changes;
          }
        }
      }

      for (const { table, cols } of FROM_TO_TABLES) {
        const tableExists = db
          .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
          .get(table);
        if (!tableExists) continue;
        for (const col of cols) {
          const stmt = db.prepare(`UPDATE ${table} SET ${col} = ? WHERE ${col} = ?`);
          for (const [oldId, newId] of ID_MAPPINGS) {
            const info = stmt.run(newId, oldId);
            if (info.changes > 0) {
              console.log(`  ${table}.${col}: ${oldId} → ${newId}: ${info.changes} rows`);
              totalUpdated += info.changes;
            }
          }
        }
      }

      // warroom_meetings has pinned_agent (default 'main')
      const wrExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get('warroom_meetings');
      if (wrExists) {
        const stmt = db.prepare(`UPDATE warroom_meetings SET pinned_agent = ? WHERE pinned_agent = ?`);
        for (const [oldId, newId] of ID_MAPPINGS) {
          const info = stmt.run(newId, oldId);
          if (info.changes > 0) {
            console.log(`  warroom_meetings.pinned_agent: ${oldId} → ${newId}: ${info.changes} rows`);
            totalUpdated += info.changes;
          }
        }
      }

      console.log(`Total rows updated: ${totalUpdated}`);
    });
    tx();
    db.pragma('foreign_keys = ON');
  } finally {
    db.close();
  }
}

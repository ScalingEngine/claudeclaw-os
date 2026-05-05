# ClaudeClaw Migrations

Use this reference when changing SQLite schema, migration files, or queue/state tables.

## Existing System

Migration code lives in:

- `src/migrations.ts`
- `scripts/migrate.ts`
- `migrations/version.json`
- `migrations/<version>/*.ts`

Local applied state is `migrations/.applied.json` and must not be committed.

There is also a repo-local `add-migration` skill at `.agents/skills/add-migration/SKILL.md` for creating a versioned migration file and updating `migrations/version.json`, `package.json`, and `CHANGELOG.md`.

## Development Rules

For schema changes:

1. Add or update focused migration tests.
2. Make migrations idempotent where practical.
3. Avoid destructive changes unless there is a backup and rollback plan.
4. Keep production data compatibility in mind because the VPS has the real conversation, memory, task, and usage history.

## Production Migration Flow

Before `npm run migrate` on the VPS:

```bash
cp /home/devuser/claudeclaw/store/claudeclaw.db \
  /home/devuser/claudeclaw/store/claudeclaw.db.pre-$(date +%Y%m%d-%H%M%S).bak
```

Then:

```bash
cd /home/devuser/claudeclaw
npm run migrate
```

After migration:

```bash
sqlite3 /home/devuser/claudeclaw/store/claudeclaw.db ".schema <table_name>"
```

## Milestone 2 Delegation Queue Notes

The planned cross-process queue should likely model:

- producer transport: Telegram or Slack
- origin identifiers: `chat_id`, Slack `channel`, Slack `thread_ts`
- target agent ID
- status: `pending`, `in_progress`, `completed`, `delivered`, plus failure state if implemented
- claim metadata: claimed by, claimed at, stale-claim TTL
- result payload and delivery timestamps

Test atomic claim behavior. SQLite concurrency is the core risk.

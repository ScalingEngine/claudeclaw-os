# ClaudeClaw Local Development

Use this reference when coding in the local repo, planning a phase, reviewing source, or preparing a change for VPS deployment.

## Local Loop

Start from the repo root:

```bash
git status --short --branch
npm test
npm run typecheck
npm run build
```

Use narrower tests while iterating:

```bash
npx vitest run src/memory-ingest.test.ts
npx vitest run src/migrations.test.ts
```

## Branching

Use `codex/` branches for non-trivial work:

```bash
git switch -c codex/<short-topic>
```

Keep commits deployable. The VPS should deploy a commit or branch, not a hand-copied collection of files.

## What Belongs In Git

Usually safe:

- `src/**`
- `web/**`
- `migrations/**`
- `scripts/**`
- `.planning/**`
- `agents/*/*.example`
- docs and tests

Usually unsafe:

- `.env`
- `store/**`
- `*.db`, `*.db-wal`, `*.db-shm`
- `migrations/.applied.json`
- `agents/*/agent.yaml`
- `agents/*/CLAUDE.md`
- OAuth tokens and personal vault data

## Before Editing

Read the nearby code and tests. Prefer existing patterns over new abstractions. If a change touches shared behavior, add or update focused tests. For Milestone 2 delegation work, inspect at least:

- `src/bot.ts`
- `src/slack-bot.ts`
- `src/index.ts`
- `src/db.ts`
- `src/migrations.ts`
- `src/message-queue.ts`
- `src/conversation-log-tailer.ts`

## Before Handing Off

Report:

- files changed
- tests run
- deploy implications
- migration or restart requirements

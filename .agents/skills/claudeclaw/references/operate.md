# ClaudeClaw Operations

Use this reference for live status checks, logs, smoke tests, and debugging the running VPS fleet.

## Services

Live production services:

- `claudeclaw-ezra.service`
- `claudeclaw-vera.service`
- `claudeclaw-poe.service`
- `claudeclaw-cole.service`
- `claudeclaw-hopper.service`
- `claudeclaw-archie.service`

Status:

```bash
systemctl --user status 'claudeclaw-*'
```

Logs:

```bash
journalctl --user -u claudeclaw-ezra.service -f
journalctl --user -u claudeclaw-vera.service -n 120 --no-pager
```

## Runtime State

Production runtime state is on the VPS:

- repo: `/home/devuser/claudeclaw`
- env: `/home/devuser/claudeclaw/.env`
- DB: `/home/devuser/claudeclaw/store/claudeclaw.db`
- agent configs: `/home/devuser/.claudeclaw/agents/*`
- NoahBrain vault path in VPS configs: `/home/devuser/NoahBrain/Memory`

Do not overwrite these from local.

## Smoke Tests

After deploy or restart:

1. Check all six services are active.
2. Send Ezra a simple Telegram message.
3. If Slack-related code changed, test Ezra in Slack.
4. If dashboard code changed, check chat tabs and memory health badge.
5. If delegation changed, test an `@vera:` or other specialist handoff and confirm the row/state in SQLite.

## SQLite Inspection

Use read-only queries for diagnosis:

```bash
sqlite3 /home/devuser/claudeclaw/store/claudeclaw.db \
  "select agent_id, role, created_at from conversation_log order by id desc limit 10;"
```

For queue work, inspect both current and new tables as applicable:

```bash
sqlite3 /home/devuser/claudeclaw/store/claudeclaw.db \
  "select * from inter_agent_tasks order by id desc limit 10;"
```

Avoid ad hoc writes to production SQLite unless explicitly doing a planned repair with backup.

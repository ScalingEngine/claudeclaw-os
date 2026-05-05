---
name: claudeclaw
description: Develop, deploy, operate, and debug Noah Wessel's ClaudeClaw multi-agent fleet. Use when working on ClaudeClaw repo code, planning Milestone 2+ work, coordinating local development with the VPS production fleet, managing agent persona/config boundaries, running migrations, deploying or restarting systemd services, checking Telegram/Slack/dashboard behavior, or answering how to use the live Ezra/Vera/Poe/Cole/Hopper/Archie agents safely.
---

# ClaudeClaw

Use this skill as the root router for ClaudeClaw work. ClaudeClaw is developed locally in the repo, while the live agents run on the VPS as six user-systemd services with gitignored config and runtime state.

## First Moves

1. Read `.planning/STATE.md`, `.planning/ROADMAP.md`, and `.planning/HANDOFF.md` before starting roadmap work.
2. Check `git status --short --branch` and preserve user changes.
3. Keep the production mental model explicit:
   - Local repo: development and tests.
   - VPS repo: production runtime.
   - Git commits: deployment artifact.
   - VPS `.env`, SQLite DB, and `~/.claudeclaw/agents/*` files: production-local state.

## Subskills

Load only the reference needed for the current task:

- Local development and code changes: `references/develop.md`
- VPS deployment and rollback: `references/deploy.md`
- Live operations and debugging: `references/operate.md`
- Agent config, personas, and NoahBrain scope: `references/agents.md`
- Database migrations and schema changes: `references/migrations.md`

## Non-Negotiables

- Do not edit `src/` directly on the VPS except for a true emergency hotfix; if that happens, immediately bring the diff back into local git.
- Do not copy local `.env`, local DB files, OAuth tokens, or agent runtime config over production.
- Do not commit runtime state: `store/`, `*.db*`, `.env`, `migrations/.applied.json`, or `agents/*/agent.yaml`.
- Before production migrations, back up `/home/devuser/claudeclaw/store/claudeclaw.db`.
- Restart all affected services after deploy, then verify with `systemctl --user status` and `journalctl --user`.

## Useful Project Facts

- Local repo path: `/Users/nwessel/ClaudeCode/claudeclaw`
- VPS repo path: `/home/devuser/claudeclaw`
- VPS host label from planning: `srv1310498`
- Live services: `claudeclaw-{ezra,vera,poe,cole,hopper,archie}.service`
- Shared production DB: `/home/devuser/claudeclaw/store/claudeclaw.db`
- VPS agent configs: `/home/devuser/.claudeclaw/agents/{ezra,vera,poe,cole,hopper,archie}/agent.yaml`
- Current roadmap focus from planning: Milestone 2, Phase 1, cross-process delegation queue.

## Command Style

Prefer exact, reviewable commands. Use `rg`/`rg --files` for local discovery. For remote commands, use SSH with an explicit host/user only after confirming the accessible alias if it is not already known in the session.

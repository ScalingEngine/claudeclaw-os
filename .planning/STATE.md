---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Archon Workflow Engine
status: human_needed
last_updated: "2026-05-05T19:58:21Z"
last_activity: 2026-05-05 -- Phase 01 execution complete; VPS verification required
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 1
  completed_plans: 1
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-05)

**Core value:** One front door (Ezra) for the whole knowledge-work surface, with five specialists, persistent memory, and unified dashboard.
**Current focus:** Milestone 2 Phase 1 — VPS Archon Runtime Surface

## Current Position

Phase: 1 of 5 in Milestone 2 (Archon Workflow Engine)
Plan: 1 of 1
Status: Human verification required
Last activity: 2026-05-05 -- Phase 01 execution complete; VPS verification required

## Next Action

Repair SSH host-key trust for `srv1310498`, then run the VPS verification items in `.planning/phases/01-vps-archon-runtime-surface/01-HUMAN-UAT.md`.

## Recent Commits (since milestone bootstrap)

| Commit | Phase | Summary |
|---|---|---|
| `8be5ea0` | M1.1 | refactor(fleet): collapse function/persona dual naming |
| `286f861` | M1.3 | fix(memory): bump extractViaClaude timeout 15s → 45s |
| `102bd8d` | M1.5 | feat(chat-stream): cross-process Telegram → dashboard streaming |
| `74c8e3c` | M1.5 | fix(chat-ui): reverse history to chronological |
| `c213572` | M1.6 | feat(dashboard): show memory-ingestion-paused state in sidebar footer |
| `4bda72b` | M1.4 | refactor(memory): drop Gemini fallback from ingestion path |

## Open Questions / Watchpoints

- **Memory accumulation rate** — first verified memory landed 2026-05-04 (importance 0.75, AI agent pricing). Watch memories table for one week before deciding on bidirectional sync.
- **Persona over-execution** — Vera shipped `notify.sh` for a "confirm" prompt. Whether the other 4 specialists have the same bias is unmeasured.
- **VPS-only deploy** — local Mac fleet config exists at `~/.claudeclaw/agents/` but isn't actively running. If we ever spin up a local mirror, the obsidian `vault:` paths point at the macOS vault; VPS yaml were patched on 2026-05-04 but local is untouched.
- **Archon PATH gap** — `/home/devuser/remote-coding-agent` works via `bun run cli`, but `archon` is not on the non-interactive PATH. ClaudeClaw systemd agents need a reliable invocation surface before personas can depend on it.
- **Archon legacy workflow path** — VPS has `~/.archon/.archon/workflows/se-strategy-ingest.yaml`; Archon warns that workflows should now live under `~/.archon/workflows/`.

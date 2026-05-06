---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Archon Workflow Engine
status: verifying
last_updated: "2026-05-06T01:30:24.046Z"
last_activity: 2026-05-06
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 3
  completed_plans: 3
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-05)

**Core value:** One front door (Ezra) for the whole knowledge-work surface, with five specialists, persistent memory, and unified dashboard.
**Current focus:** Phase 03 complete — agent-workflow-routing-policy

## Current Position

Phase: 03 (agent-workflow-routing-policy) — COMPLETE
Plan: 1 of 1
Status: Phase complete — ready for verification
Last activity: 2026-05-06

## Next Action

Verify Phase 3 routing policy, then continue to Phase 4 workflow pack planning.

## Decisions

- Archon coding workflows must use `/home/devuser/claudeclaw-worktrees/<run-id>`, while discovery may still inspect `/home/devuser/claudeclaw`.
- Deploy remains commit-based; loose file copying from worktrees into production is explicitly forbidden.
- Direct answer remains the first routing lane; skills/react loops handle quick bounded actions; Archon is reserved for durable gated workflows.
- Ambiguous external effects require Noah approval before sending, posting, deploying, closing issues, or mutating production data.
- Archon coding workflows must follow docs/archon-workspaces.md and must not run against /home/devuser/claudeclaw.

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|---|---:|---:|---:|---:|
| 02 | 02 | 216s | 4 | 3 |
| 03 | 03 | 261s | 3 | 6 |

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

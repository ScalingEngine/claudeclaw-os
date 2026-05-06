---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Archon Workflow Engine
status: in_progress
last_updated: "2026-05-06T17:18:17Z"
last_activity: 2026-05-06 -- Phase 04 VPS workflow-pack verification passed
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 5
  completed_plans: 5
  percent: 80
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-05)

**Core value:** One front door (Ezra) for the whole knowledge-work surface, with five specialists, persistent memory, and unified dashboard.
**Current focus:** Phase 05 planning — workflow observability and cleanup

## Current Position

Phase: 04 (claudeclaw-workflow-pack) — VERIFIED COMPLETE
Plan: 2 of 2
Status: Complete
Last activity: 2026-05-06 -- VPS install/list verification passed; six `claudeclaw-*` workflows live in Archon runtime

## Next Action

Plan Phase 05 workflow observability and cleanup.

## Decisions

- Archon coding workflows must use `/home/devuser/claudeclaw-worktrees/<run-id>`, while discovery may still inspect `/home/devuser/claudeclaw`.
- Deploy remains commit-based; loose file copying from worktrees into production is explicitly forbidden.
- Direct answer remains the first routing lane; skills/react loops handle quick bounded actions; Archon is reserved for durable gated workflows.
- Ambiguous external effects require Noah approval before sending, posting, deploying, closing issues, or mutating production data.
- Archon coding workflows must follow docs/archon-workspaces.md and must not run against /home/devuser/claudeclaw.
- [Phase 04]: ClaudeClaw workflow sources live in archon/workflows/ and install into ~/.archon/workflows on the VPS.
- [Phase 04]: Local workflow pack validation is deterministic and grep-based; VPS Archon schema/list validation remains an operator install step.
- [Phase 04]: Coding and bugfix workflows require /home/devuser/claudeclaw-worktrees/<run-id> plus scripts/archon-workspace-guard.sh before implementation.
- [Phase 04]: VPS verification passed with `home_workflows_loaded: 7`, `workflows_discovery_completed: 27`, `errorCount: 0`, and all six `claudeclaw-*` workflows present.
- [Phase 04 GAP-01]: Workflow installs require clean staged and unstaged archon/workflows/claudeclaw-*.yaml sources before runtime copy or removal.
- [Phase 04 GAP-01]: Installer synchronization removes stale installed claudeclaw-*.yaml files only inside the owned runtime namespace.
- [Phase 04 GAP-01]: Local validation preserves the required modern Bash installer contract while adding Bash 3 compatibility fallbacks for macOS.

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|---|---:|---:|---:|---:|
| 02 | 02 | 216s | 4 | 3 |
| 03 | 03 | 261s | 3 | 6 |
| 04 | 04 | 325s | 3 | 10 |
| 04 | GAP-01 | 347s | 3 | 3 |

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
- **Workflow observability gap** — workflows now install and load correctly, but agents still need a standard way to surface run state, failures, and stale-run cleanup in user-visible responses.

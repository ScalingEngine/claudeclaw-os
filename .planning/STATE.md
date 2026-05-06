---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Archon Workflow Engine
status: milestone_complete
last_updated: "2026-05-06T19:02:22Z"
last_activity: 2026-05-06
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 6
  completed_plans: 6
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-06)

**Core value:** One front door (Ezra) for the whole knowledge-work surface, with five specialists, persistent memory, and unified dashboard.
**Current focus:** Milestone v1.1 implementation complete — workflow observability and cleanup ready for VPS/manual verification

## Current Position

Phase: 05 (workflow-observability-and-cleanup) — COMPLETE
Plan: 1 of 1
Status: Milestone implementation complete
Last activity: 2026-05-06

## Next Action

Run VPS/manual checks from `05-USER-SETUP.md`, then complete Milestone v1.1.

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
- [Phase 05]: Archon workflow events use `recordArchonWorkflowEvent()` to write durable hive_mind rows and emit live chat/dashboard events.
- [Phase 05]: Failed workflow reports require workflow name, run ID or branch, failing node, and recovery action.
- [Phase 05]: Archie/Hopper stale-run cleanup uses `scripts/archon-runs.sh`, defaults to dry-run, refuses dirty worktrees, and refuses `/home/devuser/claudeclaw`.

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
| Phase 05 P01 | 8 min | 3 tasks | 19 files |

## Open Questions / Watchpoints

- **Memory accumulation rate** — first verified memory landed 2026-05-04 (importance 0.75, AI agent pricing). Watch memories table for one week before deciding on bidirectional sync.
- **Persona over-execution** — Vera shipped `notify.sh` for a "confirm" prompt. Whether the other 4 specialists have the same bias is unmeasured.
- **VPS-only deploy** — local Mac fleet config exists at `~/.claudeclaw/agents/` but isn't actively running. If we ever spin up a local mirror, the obsidian `vault:` paths point at the macOS vault; VPS yaml were patched on 2026-05-04 but local is untouched.
- **Phase 05 VPS verification** — after deploy, run `scripts/archon-runs.sh list`, `stale --older-than-hours 24`, and dry-run `cleanup --older-than-hours 24` before any forced cleanup.

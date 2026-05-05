# Project State

## Project Reference

See: .planning/PROJECT.md (created 2026-05-04)

**Core value:** One front door (Ezra) for the whole knowledge-work surface, with five specialists, persistent memory, and unified dashboard.
**Current focus:** Milestone 2 Phase 1 — Cross-Process Delegation Queue

## Current Position

Phase: 1 of 5 in Milestone 2 (cross-process delegation queue)
Plan: Not started
Status: Ready to `/gsd-plan-phase` against Milestone 2 Phase 1
Last activity: 2026-05-04 — Milestone 1 (Fleet Foundation) complete; `.planning/` bootstrapped

Progress: ░░░░░░░░░░ 0% (Milestone 2)

## Next Action

When ready to start: `/gsd-plan-phase 1` to draft `PLAN.md` for the cross-process delegation queue against the Stage 2 spec at `Business/scaling-engine-ops/work-logs/2026/05/2026-05-04-claudeclaw-delegation-memory-prd.md` §"Stage 2 plan".

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

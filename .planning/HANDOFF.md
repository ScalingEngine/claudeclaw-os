# Handoff Notes

Cross-session context for whichever agent picks ClaudeClaw up next. Update when pausing mid-phase.

## Status

No active phase in flight. Milestone 1 closed clean on 2026-05-04. `.planning/` was bootstrapped at the same time. Next concrete action is queued in `STATE.md` under "Next Action."

## Active Branch

`main` — clean, no uncommitted local changes at handoff time.

## Active Workspaces / Worktrees

None. All Milestone 1 work landed on `main` directly.

## VPS Deploy State

- `claudeclaw-{ezra,vera,poe,cole,hopper,archie}.service` all `active`
- Latest deployed commit: tip of `main`
- `.env` on VPS at `/home/devuser/claudeclaw/.env` (do not commit)
- Specialist `agent.yaml` files at `/home/devuser/.claudeclaw/agents/{id}/agent.yaml` (gitignored — VPS-local config; vault paths patched to `/home/devuser/NoahBrain/Memory` on 2026-05-04)

## Things In Progress That Aren't In a Phase

None. The list below is *queued forward work* — not WIP — and lives in `ROADMAP.md`:

- Cross-process delegation queue (M2.1)
- Persona prompt tuning (M2.2)
- Quota-suspension dead-code cleanup (M2.3)
- Linear awareness pack maintenance (M2.4)

## Watch Items

- `inter_agent_tasks` row count — was 1 at handoff (the verification delegation). Expect this to climb as Slack delegation usage grows once M2.1 ships.
- `memories.count` — was 1 at handoff. If it stays low after a week of normal use, the EXTRACTION_PROMPT bar might be too high; revisit before promoting to NoahBrain bidirectional sync.
- Vera persona — flagged for over-execution on 2026-05-04. M2.2 should fix this; until then, prefer `@vera:` prompts that explicitly say "reply with" not "confirm" or "verify".

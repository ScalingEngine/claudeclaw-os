# Phase 6: Scratchpad / Compaction Recovery — Context

**Gathered:** 2026-05-11
**Status:** Ready for planning
**Source:** PRD Express Path (`.planning/debug/resolved/archie-compact-silent.md`)
**Milestone:** M3 (Cross-Process Delegation + Polish, v1.2)

<domain>
## Phase Boundary

Solve the underlying research-loss problem behind the 2026-05-11 silent-failure
incident. The honesty patch (commit `c6756d7`) makes failures visible; this
phase makes long research tasks survive context auto-compaction.

**In scope:**
- Per-turn scratchpad file infrastructure (path convention, lifecycle, cleanup)
- Persona-prompt rules added to all six agents (Ezra, Vera, Archie, Cole, Poe, Hopper)
  telling them to append findings to the scratchpad on a role-appropriate cadence
- Wrapper plumbing so the scratchpad path is exposed to the model in the prompt
  envelope each turn
- Reordering the compaction warning so it fires *before* the empty-reply fallback
  rather than after (today: correct but useless)
- Optional: background sweep for orphaned scratchpad files

**Out of scope:**
- Raising `AGENT_MAX_TURNS` (separate decision; band-aid not solution)
- Per-agent turn budgets via `agent.yaml` (separate phase)
- Switching engine to SDK (M4)
- Changing the compaction trigger threshold (Anthropic SDK config; not ours)

</domain>

<decisions>
## Implementation Decisions

### Scratchpad Location & Naming
- **Decision:** `~/.claudeclaw/scratch/{agentName}-{chatId}-{ts}.md` — flat, easy to grep, agent name first so `ls` groups by persona.
- **Why:** `~/.claudeclaw/` is already the agent home (per `Ezra loads ~/.claudeclaw/CLAUDE.md` memory note). `scratch/` is a sibling of existing config dirs, gitignored by default. Per-turn freshness avoids cross-conversation bleed.

### Lifecycle
- **Decision:** Wrapper creates the file before the agent loop starts; deletes it after `result` event with `subtype === 'success'`. On any error subtype the file stays so the next turn can re-Read it OR a sweep can age it out.
- **Why:** Successful turn → no need to keep. Failed turn → preserves whatever the agent did dump for the next attempt.

### Sweep
- **Decision:** Add to existing periodic cleanup if one exists; otherwise run on agent startup, deleting `scratch/*.md` older than 24h.
- **Why:** Cheap insurance against process kills mid-turn. Don't over-engineer.

### Persona Prompt Rules — Per Agent Class
Two classes, mapped to the existing fleet roster:
- **Research-class** (Vera, Archie): "After every 3 tool calls during a research
  task, append a short bulleted findings block to your scratchpad. Include URLs,
  endpoint names, payload shapes, anything you'd lose if this conversation reset.
  After context compaction, re-Read the scratchpad before continuing."
- **Draft-class** (Cole, Poe): "Use the scratchpad to outline drafts in sections.
  Append each section as you finalize it so partial drafts survive compaction."
- **Coordinator/ops** (Ezra, Hopper): Lighter rule — "Use the scratchpad if you
  expect more than 5 tool calls in this turn." Avoids forcing scratchpad usage
  on quick routing/triage turns.

### Warning Ordering
- **Decision:** When `compact_boundary` fires AND result text is empty/null,
  emit the actionable warning to the model in a continuation prompt that also
  injects the scratchpad path. Then re-run the turn (max 1 retry to avoid loops).
- **Why:** Today's order — reply, then warn user — is broken. The model is the
  one with leverage to recover; warn it, not the human.

### Scratchpad Path Injection
- **Decision:** Inject as a system-level message at turn start: `Your scratchpad
  for this turn is {absolute_path}. Use the Write tool to append findings.` The
  model already has Write/Read access; no new tool needed.
- **Why:** Reuses existing tool surface. Path is deterministic so the model
  doesn't have to guess.

### Claude's Discretion
- Exact wording of per-class persona rules (the planner should propose drafts)
- Whether scratchpad files go in `~/.claudeclaw/scratch/` (default) or under
  `~/.claudeclaw/agents/{name}/scratch/` (more isolation, more dirs to watch)
- Whether the retry-after-compaction loop is built in this phase or deferred
- How to surface "agent recovered from compaction successfully" to the dashboard

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Debug investigation (full root cause + fix history)
- `.planning/debug/resolved/archie-compact-silent.md` — investigation, evidence,
  honesty-patch resolution, scratchpad option deferred to this phase

### Code touched by the honesty patch (commit c6756d7) — start here
- `src/agent.ts` — agent loop, `compact_boundary` detection at :273, UsageInfo
  shape with new `subtype` and `numTurns` fields
- `src/bot.ts` — Telegram path (:637) and dashboard path (:1675), `formatEmptyReply`
  helper, compaction warning at :81 and :750
- `src/config.ts` — `AGENT_MAX_TURNS` at :177, cost-footer mode at :249

### Persona files (all six need per-class rule additions)
- `agents/ezra/CLAUDE.md` (or `~/.claudeclaw/CLAUDE.md` — verify load path; per
  MEMORY note Ezra loads the root file, not `agents/ezra/`)
- `agents/vera/CLAUDE.md`
- `agents/archie/CLAUDE.md`
- `agents/cole/CLAUDE.md`
- `agents/poe/CLAUDE.md`
- `agents/hopper/CLAUDE.md`
- `agents/_template/CLAUDE.md` if it exists (shared rules)

### Roadmap context
- `.planning/ROADMAP.md` — M3 Phase 6 entry
- `.planning/REQUIREMENTS.md` — SCRATCH-01..05

</canonical_refs>

<specifics>
## Specific Ideas

- The wrapper already plumbs `subtype` and `numTurns` through `UsageInfo`
  (commit `c6756d7`). The recovery loop should use those signals.
- A "compaction-survived" success metric would be valuable for the dashboard:
  `did_compact && result.text.length > 0` = recovered; `did_compact && empty`
  = lost. Defer to follow-up if it bloats this phase.
- The persona rule wording matters. A bad rule ("write to your scratchpad
  often") makes agents waste turns on housekeeping. A good rule ("after every
  3 tool calls during research") gives a clear trigger.
- Ezra is the COS — its scratchpad pattern is different from Vera's research
  framing. Don't force a single rule across all six.

</specifics>

<deferred>
## Deferred Ideas

- Raising `AGENT_MAX_TURNS` from 30 to 60 (separate decision — band-aid)
- Per-agent turn budgets via `agent.yaml` overrides (separate phase)
- "Compaction-survived" dashboard metric (nice-to-have)
- Shared scratchpad across multiple turns of the same conversation (would
  require thread tracking — out of scope)
- Moving to SDK engine (M4) — this phase must work with the current CLI engine

</deferred>

---

*Phase: 06-scratchpad-compaction-recovery*
*Context gathered: 2026-05-11 via PRD Express Path from debug session*

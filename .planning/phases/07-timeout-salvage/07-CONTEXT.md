# Phase 7: Timeout-Aware Reply with Subagent + Scratchpad Salvage — Context

**Gathered:** 2026-05-12
**Status:** Ready for planning
**Source:** PRD Express Path (`.planning/debug/archie-subagent-timeout-loss.md`)
**Milestone:** M3 (Cross-Process Delegation + Polish, v1.2)

<domain>
## Phase Boundary

When `AGENT_TIMEOUT_MS` (default 900s) fires at `bot.ts:658`, the AbortController
propagates into the SDK subprocess and `agent.ts:runAgent` returns
`{ text: null, aborted: true }`. The bot callsites at `bot.ts:717-726` (Telegram)
and `bot.ts:1810-1815` (dashboard) see only `text: null` and emit a static
"Timed out after 900s. The task may have been too complex…" message that
discards everything the agent already produced.

This phase makes the timeout reply *useful* by surfacing whatever real work
the agent already produced — completed Task subagent reports + scratchpad
contents + partial assistant text — instead of throwing it all away.

**Real-world evidence (2026-05-12 14:14 ET):** Archie's `archie-5005645513-1778594387139.md`
scratchpad (2.7KB) contained substantive GHL workflows API research (V2/V1
base URLs, auth scheme, 3 endpoints, payload shapes, rate limits, sources)
sitting on disk while the user saw the bare timeout message.

**In scope:**
- Capture `tool_result` blocks on `user` events in the agent loop (currently ignored)
- Extend `AgentResult` interface with `subagentResults: SubagentResult[]`
- New `formatTimeoutReply(result, scratchpadPath)` helper in bot.ts
- Wire helper into both abort branches (`bot.ts:721` Telegram, `bot.ts:1812` dashboard)
- Graceful fallback to static message when all salvage sources are empty
- Unit tests: tool_result capture on abort, formatter with each combination of sources

**Out of scope:**
- Raising `AGENT_TIMEOUT_MS` (separate decision, band-aid)
- Streaming intermediate subagent results to Telegram during the turn (M3+ work)
- Scratchpad-share between parent and Task subagents (would require SDK `agents:` option work)
- SDK engine swap (M4)

</domain>

<decisions>
## Implementation Decisions (all locked from debug map)

### Where to capture tool_result blocks
**Decision:** New `user`-event handler inserted after `agent.ts:365` in the
for-await SDK message loop. Today the loop inspects `system`/`assistant`/
`stream_event`/`result` events but never `user` events — and Task tool
completions arrive as `tool_result` blocks on user events.

### State held in agent.ts during a turn
**Decision:** Two new closure variables in `runAgent` (around line 227-235):
- `toolUseRegistry: Map<string, { name: string, input: unknown }>` — populated
  from assistant-event `tool_use` blocks keyed by `tool_use_id`; lets us
  identify which results came from `Task` tool use specifically
- `subagentResults: SubagentResult[]` — populated from user-event `tool_result`
  blocks whose tool_use_id maps to a registered `Task` use

### AgentResult interface change
**Decision:** Extend `AgentResult` (currently around `agent.ts:157-162`) with:
```ts
subagentResults?: SubagentResult[]
```
Returned on BOTH the abort path (line 415-418) and the success path (line 432).
No breaking changes — optional field.

### Where to format the timeout reply
**Decision:** New helper `formatTimeoutReply(result: AgentResult, scratchpadPath: string | null): string`
in `bot.ts`, alongside the existing `formatEmptyReply` helper added by the
honesty patch. Called from the two static-message sites at `:721` and `:1812`.

### Formatter precedence + empty fallback
**Decision:** Concatenate in this order, separated by section dividers:
1. Subagent reports (if any completed) — each rendered as a labeled section
2. Scratchpad contents (if file exists and is non-empty)
3. Partial assistant text (`result.streamedText`, if non-empty after trim)
4. Always: a one-line summary footer "Timed out after Xs, recovered Y/Z" with
   counts so user knows what's complete vs incomplete

**Empty fallback:** if (1), (2), and (3) are all empty, emit today's static
message verbatim. Don't invent content.

### Scratchpad path injection into bot.ts
**Decision:** The scratchpad path is already computed at the Telegram envelope
site (`bot.ts:521-546`) and dashboard site (`bot.ts:1648-1669`) where
`createScratchpad()` is called. Pass it into the abort-branch handler
through the existing `let scratchpadPath` variable that already lives in
scope from Phase 6's wiring.

### Tool_result content shape
**Decision:** Per the canonical reference in `warroom-text-orchestrator.ts:1623-1702`,
`tool_result.content` is either a string OR an array of `{type: 'text', text: string}`.
Helper extracts text uniformly: if string, use as-is; if array, join `text` fields with `\n`.

### Test coverage
**Decision:**
- `agent.test.ts` — tool_result capture works on abort (mock SDK stream with assistant
  tool_use → user tool_result → abort signal mid-stream → assert result.subagentResults populated)
- `bot.test.ts` — formatter with all combinations: subagent-only, scratchpad-only,
  text-only, all-three, all-empty (verify static fallback)

### Claude's Discretion
- Exact section divider format (markdown `---` vs `===` vs blank line — planner picks)
- Whether to truncate scratchpad contents if very large (>30KB Telegram limit territory)
- Exact wording of the recovery footer ("Timed out, recovered N findings" vs other phrasings)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Debug investigation (THE PRD)
- `.planning/debug/archie-subagent-timeout-loss.md` — full root-cause map,
  real-world evidence section appended 2026-05-12 with Archie scratchpad capture

### Code to modify
- `src/bot.ts:658` — AbortController wiring (Telegram timeout enforcement)
- `src/bot.ts:717-726` — Telegram abort branch (static timeout message TODAY)
- `src/bot.ts:1788-1793` — AbortController wiring (dashboard timeout enforcement)
- `src/bot.ts:1810-1815` — Dashboard abort branch (static timeout message TODAY)
- `src/bot.ts:521-546` — Telegram prompt envelope (where scratchpadPath is created)
- `src/bot.ts:1648-1669` — Dashboard prompt envelope (where scratchpadPath is created)
- `src/agent.ts:157-162` — AgentResult interface
- `src/agent.ts:227-235` — runAgent closure variables
- `src/agent.ts:289-413` — SDK message for-await loop (needs new user-event handler)
- `src/agent.ts:414-418` — abort return path
- `src/agent.ts:432` — success return path

### Code to read (don't modify)
- `src/scratchpad.ts` — Phase 6 module; expose a `readScratchpad(path)` helper if not already present
- `src/agent.ts:253-289` — Task tool subagent invocation (where subagents are spawned by the SDK)
- `warroom-text-orchestrator.ts:1623-1702` — canonical example of tool_result event shape parsing

### Honesty-patch precedent (commit c6756d7)
- `formatEmptyReply(usage)` in bot.ts — the new `formatTimeoutReply` follows the same shape:
  pure function, no side effects, deterministic from inputs.

</canonical_refs>

<specifics>
## Specific Ideas

- The captured Archie scratchpad (2.7KB GHL findings) is excellent test data
  — could be embedded as a fixture in `bot.test.ts` to verify the formatter
  handles realistic content correctly.
- The recovery footer should include `numTurns` if available (already plumbed
  via UsageInfo by the honesty patch) — "Timed out after 900s, 30/30 turns
  consumed, 2 subagents completed."
- Section labels in the reply should be terse so they don't eat too much of
  the Telegram message budget. "## Subagent: {name}" + content. "## Scratchpad"
  + content. "## Partial work" + streamed text.

</specifics>

<deferred>
## Deferred Ideas

- Streaming subagent results to Telegram as they complete (would require
  refactoring how bot.ts assembles its placeholder message)
- Salvage on errors other than timeout — e.g. `error_during_execution` subtype
  could benefit from the same treatment but the honesty patch already
  surfaces those subtypes well
- Scratchpad-share between parent and Task subagents — would require
  passing `agents:` option to SDK with a custom subagent system prompt
  that injects the parent's scratchpad path; deferred to a later phase

</deferred>

---

*Phase: 07-timeout-salvage*
*Context gathered: 2026-05-12 via PRD Express Path from debug session*

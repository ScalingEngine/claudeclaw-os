---
slug: archie-compact-silent
status: resolved
trigger: |
  Archie agent (Telegram, VPS-hosted) keeps auto-compacting context during a long
  research task and the user can't see what it actually did. Final response is
  just "Done. [sonnet]" with no deliverable. Symptoms visible in screenshot:
  - User asked Archie to reverse-engineer the GHL workflows API
  - Archie ran ~25 tool calls (Fetching page, Running command, Web search, Probe)
  - Hit "Context window was auto-compacted this turn" warning at 4:31 PM
  - When user asked "What'd you come up with?", Archie ran ~10 more commands,
    hit a SECOND compaction warning at 4:44 PM
  - Both turns ended with bare "Done. [sonnet]" — no actual research output
  - System emitted "Context compacted multiple times. Consider /newchat to keep
    response quality high."
created: 2026-05-11
updated: 2026-05-11
resolved: 2026-05-11
---

# Debug Session: archie-compact-silent

## Symptoms

**Expected:** Archie completes a substantive research task (reverse-engineering
the GHL workflows API) and returns a meaningful response containing the findings
— endpoint URLs, payload shapes, auth headers, working examples.

**Actual:** Archie runs a long sequence of tool calls (web fetches, bash probes),
hits the context auto-compaction limit one or more times, then returns the literal
string "Done. [sonnet]" with no research output. Repeated prompting produces more
tool calls and another compaction, with the same empty result.

**Errors / system messages observed:**
- "⚠️ Context window was auto-compacted this turn. Some earlier conversation may
  have been summarized. Consider /newchat + /respin if things feel off."
- "Context compacted multiple times. Consider /newchat to keep response quality
  high."

**Timeline:** Happening now, 2026-05-11 with Archie on Telegram via VPS. Likely
ongoing pattern on long-running tasks — first time user is explicitly flagging
it. Other fleet agents (Ezra, Poe, Cole, etc.) may share the same wrapper and
exhibit the same behavior.

**Reproduction:** Ask Archie a substantive research task that requires many tool
calls (e.g. reverse-engineering an undocumented API). Watch tool-call messages
accumulate. Auto-compaction triggers somewhere mid-flight. Final reply is bare
"Done. [sonnet]" with no actual content.

## Investigation Scope

Archie is part of Noah's ClaudeClaw fleet (roster: Ezra/Poe/Cole/Vera/Hopper/Archie).
- Surface: Telegram bot, hosted on VPS
- Persona / wrapper code lives in this repo (claudeclaw): `agents/`, `archon/`,
  `.claude/`, possibly `claudeclaw.plist`
- Recent commit `f1c03df fix(models): downgrade Ezra to Sonnet, enable smart routing`
  suggests recent model-routing changes
- MEMORY note: "Ezra loads `~/.claudeclaw/CLAUDE.md` (root), NOT `agents/ezra/CLAUDE.md`"
  — same load-path quirk may apply to Archie (verified NOT relevant — see Eliminated).

Two linked failure modes investigated together:
1. **Why compaction triggers so aggressively** — token budget config, max-turns,
   tool-result size caps, system prompt bloat, or Telegram message log being
   re-included on each turn.
2. **Why the final reply is empty after compaction** — output post-processor
   stripping content, response extraction grabbing the wrong message, model
   actually returning a terse "Done." after the compaction summary replaces its
   research, or message-splitter only sending the final small chunk to Telegram.

Hypothesis going in: the two symptoms share a root cause. Compaction destroys
the model's working memory of what it researched, so the post-compaction
continuation has no findings to report and the model itself emits "Done." as
its honest answer. **CONFIRMED — and additionally, the wrapper invents the
literal string "Done." when result.text is empty/null.**

## Current Focus

```yaml
hypothesis: |
  Two cooperating bugs:
  (A) src/bot.ts:637 and src/bot.ts:1675 substitute the literal string "Done."
      when result.text is null or empty. This is the visible "Done. [sonnet]"
      message — the agent did NOT say "Done.", the wrapper made it up.
  (B) The agent has no scratchpad / findings persistence. When compact_boundary
      fires (src/agent.ts:273), the SDK summarizes prior tool results away.
      The post-compaction continuation has no research to report, so result.text
      comes back null/empty, which then triggers Bug (A).
test: confirmed by code reading — no live repro needed.
expecting: confirmed.
next_action: shipped Option 1 (honesty patch). Option 3 (scratchpad pattern)
  deferred to a separate phase.
reasoning_checkpoint: ""
tdd_checkpoint: ""
```

## Evidence

- timestamp: 2026-05-11T16:31
  finding: First compaction warning fired after ~25 tool calls on a single user
    prompt ("reverse-engineer GHL workflows API"). Final reply: bare "Done. [sonnet]".
- timestamp: 2026-05-11T16:44
  finding: Second compaction warning fired on a follow-up "What'd you come up with?"
    after another ~10 tool calls. Same bare "Done. [sonnet]" reply. System added
    "Context compacted multiple times" notice.
- timestamp: 2026-05-11T16:48
  finding: User reports this is blocking — "I can't functionally use these agents
    if they keep doing this context compaction and I can't even understand what
    they actually did."
- timestamp: 2026-05-11T16:48
  finding: Recent commit f1c03df ("downgrade Ezra to Sonnet, enable smart routing")
    suggests model-routing logic was recently touched fleet-wide. May or may not
    be related — Archie's model is shown as [sonnet] in the screenshot.
- timestamp: 2026-05-11T17:05
  finding: |
    src/bot.ts:637 — `let rawResponse = result.text?.trim() || 'Done.';`
    src/bot.ts:1675 — `const rawResponse = result.text?.trim() || 'Done.';`
    Both paths fabricate the literal string "Done." when the SDK returns no text.
    The cost footer (' [sonnet]') is then appended → exactly matches screenshot.
- timestamp: 2026-05-11T17:06
  finding: |
    src/agent.ts:273 detects compact_boundary events and sets didCompact=true,
    but the SDK has already summarized prior tool_result blocks by then. The
    wrapper does NOT instruct the model to re-emit findings before compaction
    nor write tool results to a scratchpad file the model could re-Read.
- timestamp: 2026-05-11T17:06
  finding: |
    src/config.ts:177 — AGENT_MAX_TURNS defaults to 30. A 25-tool-call task
    is right at that ceiling — the SDK may also be returning result.subtype
    === 'error_max_turns' with empty text. agent.ts logs subtype but never
    surfaces it to the user; bot.ts:637 just maps empty text → "Done."
- timestamp: 2026-05-11T17:07
  finding: |
    Compaction-warning UX (bot.ts:81 inline, bot.ts:750 multi-compact notice)
    fires AFTER the reply is sent. By then the model has already lost the
    research and the user has already seen "Done." So the warning is correct
    but useless — it tells you the bug happened, not how to recover.
- timestamp: 2026-05-11T17:07
  finding: |
    No scratchpad pattern in the wrapper — grep for "scratchpad|findings|
    workspace.*file" in src/agent.ts and src/bot.ts returns zero hits. The
    model is the only place tool results live.
- timestamp: 2026-05-11T17:09
  finding: |
    SDK type definitions confirm SDKResultError variants: 'error_max_turns',
    'error_max_budget_usd', 'error_during_execution',
    'error_max_structured_output_retries'. All carry num_turns. Plumbed both
    fields (subtype, numTurns) through UsageInfo so the bot layer can surface
    them in the failure message.

## Eliminated

- **Persona load-path quirk** — `src/agent.ts:233` uses `agentCwd ?? PROJECT_ROOT`
  with `settingSources: ['project','user']`. CLAUDE.md loads correctly. Not
  related to the symptom.
- **Telegram delivery / message splitting** — `splitMessage` and `formatForTelegram`
  are downstream of `rawResponse`; if the SDK returned real text it would be
  delivered. The raw input to the splitter is already "Done."
- **File-marker / cost-footer extraction stripping content** — `extractFileMarkers`
  on input "Done." returns ("Done.", []). The cost footer mode 'compact'
  (src/config.ts:249) renders ' [sonnet]'. Final string matches screenshot exactly.

## Resolution

```yaml
root_cause: |
  Two cooperating bugs in src/bot.ts and src/agent.ts:
  (A) src/bot.ts:637 and src/bot.ts:1675 fabricated the literal string "Done."
      when result.text was empty/null, regardless of WHY it was empty
      (compaction, max-turns hit, model genuinely silent). This made a serious
      failure look like a successful no-op completion.
  (B) The agent has no scratchpad / findings persistence around compaction.
      When src/agent.ts:273 detects compact_boundary, the SDK has already
      summarized prior tool_result blocks. There's no mechanism to (1) instruct
      the model to dump findings to a working file before compaction, (2) raise
      the warning early enough for the model to react, or (3) detect that an
      empty result coincided with compaction and surface that as an error.
  Compounding: AGENT_MAX_TURNS=30 (src/config.ts:177) is right at the ceiling
  for the user's 25-call research task; sonnet (per recent f1c03df) has tighter
  effective working memory than opus on heavy tool-use turns.
fix: |
  Option 1 honesty patch (shipped). Smallest diff that ends the silent-failure
  UX without touching budgets or adding scratchpad infrastructure:

  1. Extended UsageInfo (src/agent.ts) with `subtype` (SDK result subtype:
     'success' | 'error_max_turns' | 'error_max_budget_usd' |
     'error_during_execution' | 'error_max_structured_output_retries') and
     `numTurns` (turns consumed). Both pulled from the SDK 'result' event.
  2. Added formatEmptyReply(usage) helper in src/bot.ts that produces:
       "I came back empty (subtype, hit context compaction, used X/30 turns).
        Re-run with /newchat and break the task into smaller pieces."
     Only the reasons that apply are included; on a normal empty reply with
     no diagnostic info, the message degrades gracefully to just the prompt.
  3. Replaced both `result.text?.trim() || 'Done.'` sites (bot.ts:637 telegram
     path and bot.ts:1675 dashboard path) with the helper call. Telegram and
     dashboard now report the same honest failure message.
  4. Reworded the inline compaction warning (checkContextWarning) and the
     multi-compaction notice to be actionable — they tell the user to
     /newchat and split the task, not just "consider /respin".
  5. Updated src/cost-footer.test.ts fixture with the two new UsageInfo
     fields. All 466 affected tests still pass; typecheck clean.

  Deferred to a separate phase (per user instruction): raising
  AGENT_MAX_TURNS, per-agent turn budgets, scratchpad / findings-file
  pattern, and surfacing the compaction warning BEFORE the empty reply.
verification: |
  - npm run typecheck: clean (no errors)
  - npm test src/bot.test.ts src/cost-footer.test.ts: 38/38 passing
  - Full suite: 466/466 passing on affected paths
    (3 failures in src/schedule-cli.test.ts are pre-existing — require a
    `dist/` build artifact that doesn't exist in this worktree; confirmed
    fail identically on stock HEAD without my patch)
  - git diff src/agent.ts: 39 insertions, 2 deletions
  - git diff src/bot.ts: 38 insertions, 4 deletions
  - git diff src/cost-footer.test.ts: 2 insertions
files_changed:
  - src/agent.ts
  - src/bot.ts
  - src/cost-footer.test.ts
```

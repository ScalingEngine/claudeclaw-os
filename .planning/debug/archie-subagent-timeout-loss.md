---
slug: archie-subagent-timeout-loss
status: root_cause_identified
trigger: |
  Archie agent (Telegram, VPS-hosted) was asked to "Reverse-engineer GHL workflows API…".
  Archie spawned 2 parallel subagents via the Task tool. One subagent completed visibly
  ("✓ Agent 'Search GitHub for GHL workflow API patterns' completed"), the other was
  still running when wall-clock timeout fired. Final reply: "Timed out after 900s.
  The task may have been too complex or a command got stuck. Try breaking it into
  smaller steps." No scratchpad file was created (~/.claudeclaw/scratch/ didn't exist
  after the turn died) — so the kill happened either before agent.ts created it, or
  it was created and then deleted on the kill path. Needs verification.
created: 2026-05-12
updated: 2026-05-12
---

## UPDATE 2026-05-12 14:14 — REAL-WORLD CAPTURE (clean repro)

After rebooting the VPS (which cleared a pre-existing `google-workspace-mcp`
runaway that had pinned the box at 100% CPU since the previous afternoon),
Noah re-sent the original GHL reverse-engineering prompt to Archie on a
healthy box. Same failure mode — but THIS time the scratchpad work shipped
in `e409dbf..1810d2b` was live, and we now have hard evidence the recovery
path is the missing piece.

**Tool-call timeline visible in Telegram:**
- 10:05 ET — Reading file
- 10:06–10:08 — Fetching pages (multiple)
- 10:09 — Writing file (this is Archie writing to its scratchpad per the
  new research-class persona rule "append findings every 3 tool calls")
- 10:09 — Task… (spawned subagent)
- 10:10–10:13 — More fetches, commands, Task tool use
- 10:14 — `Timed out after 900s. The task may have been too complex or a
  command got stuck. Try breaking it into smaller steps.` (bot.ts:721,
  unchanged static message)

**Scratchpad on disk after the kill:**
`~/.claudeclaw/scratch/archie-5005645513-1778594387139.md` — 2730 bytes,
preserved per design (not deleted on the abort path). Contents include:
- Confirmed base URLs (V2 services.leadconnectorhq.com, V1 rest.gohighlevel.com EOL Dec 2025)
- Auth scheme (Bearer JWT + `Version: 2021-07-28` header + locationId)
- Three confirmed endpoint paths (GET `/workflows/`, PUT change-status,
  POST marketplace trigger execute)
- Trigger subscription payload JSON shape
- Rate limit (100 req / 10s per resource)
- Required scopes (`workflows.readonly`)
- Sources checked with URLs
- A "next: need to find" list

**Implication for this debug map:**
The hypothesis is no longer theoretical. We have a captured, in-the-wild
instance of:
1. The scratchpad system working as designed (persona rule fired,
   findings persisted to disk, file survived the abort)
2. The wrapper failing to surface those findings on timeout (`bot.ts:721`
   emits the static message)
3. The cost: ~90% of a useful research task delivered as 2.7KB of
   findings on disk, while the user sees only "Timed out after 900s"

The c557005 / SCRATCH-TIMEOUT-* phase is now justified by concrete
evidence, not just code-path analysis. The fix is exactly as scoped:
`formatTimeoutReply(result, scratchpadPath)` reads the file (when
present) and concatenates it with subagent results into the Telegram
message, falling back to today's static text only when all sources
are empty.



# Debug Session: archie-subagent-timeout-loss

## Symptoms

**Expected:** When Archie's wall-clock timeout fires mid-flight, the user receives
a reply that contains whatever real work the agent already produced — completed
subagent reports, intermediate findings, scratchpad contents — instead of just a
generic "timed out" message. Even partial salvage is better than total loss.

**Actual:** Generic timeout message ("Timed out after 900s. The task may have been
too complex or a command got stuck. Try breaking it into smaller steps.") that
discards everything the agent did during the 15 minutes before the kill, including
the visibly-completed subagent's output that was already streamed through bot.ts.

**Errors / system messages observed:**
- Telegram (mid-turn): "✓ Agent 'Search GitHub for GHL workflow API patterns' completed"
- Telegram (final): "Timed out after 900s. The task may have been too complex or
  a command got stuck. Try breaking it into smaller steps."
- User reports `~/.claudeclaw/scratch/` did not exist after the turn died.
  See "Scratchpad-dir-missing reconciliation" in Evidence below.

**Reproduction:** Send Archie a substantive multi-step research prompt that triggers
parallel subagent dispatch via Task tool (e.g. "Reverse-engineer GHL workflows API
across docs and GitHub"). Wait for AGENT_TIMEOUT_MS=900000ms. Observe generic
timeout message replaces all in-flight progress.

**Started:** 2026-05-12. Distinct failure mode from the silent-compaction bug fixed
in commit c6756d7 (see resolved/archie-compact-silent.md). The honesty patch and
scratchpad infrastructure together fixed the "Done." case but did not cover the
wall-clock-timeout case.

## Investigation Scope

This is a DIAGNOSE-ONLY pass. User has already chosen the fix shape ("salvage
subagent results + scratchpad contents on timeout, ~100-150 lines"). Goal is to
produce a clean root-cause map for tomorrow's `/gsd-plan-phase` PRD. NO code
changes proposed here.

Six scoping questions to answer with file:line references:

1. Where exactly is the wall-clock timeout enforced?
2. What state lives in the agent loop at timeout time? Where do streamed events accumulate?
3. What does the SDK emit on subagent (Task tool) completion? tool_use → tool_result pairing?
4. What does the scratchpad lifecycle do on the kill path?
5. Where in bot.ts does the timeout-handler decide what to send to Telegram?
6. Does the Task tool subagent inherit the parent's scratchpad path or get its own / none?

## Current Focus

```yaml
hypothesis: |
  Root cause is structural, not a bug: agent.ts:runAgent loops over SDK events
  and writes its observations into LOCAL CLOSURE VARIABLES (resultText,
  streamedText, lastCallInputTokens). When abortController fires, those locals
  are abandoned and runAgent returns { text: null, aborted: true }. The
  callsite in bot.ts (line 718-726) then emits a generic timeout message that
  contains zero salvaged state. Three independent state sources exist that
  COULD be salvaged on the timeout boundary but are not currently captured:
    (a) SDK tool_result blocks streamed during the turn (completed Task
        subagent payloads land here)
    (b) The streamedText buffer (outermost-assistant deltas)
    (c) The scratchpad file on disk (NOT deleted on abort path — sweep handles)
  The "no scratchpad" observation is reconciled below.
test: confirmed by code reading — no live repro needed for this scoping pass.
expecting: confirmed.
next_action: |
  hand the Evidence + Implementation surface area sections to /gsd-plan-phase
  tomorrow as the PRD input for the ~100-150-line salvage patch.
reasoning_checkpoint: ""
tdd_checkpoint: ""
```

## Evidence

- timestamp: 2026-05-12
  checked: src/config.ts:167-170
  finding: |
    `AGENT_TIMEOUT_MS` defaults to 900000 (15 min). Env-overridable. Used by
    bot.ts in TWO places only (telegram + dashboard paths).
  implication: |
    Single source of truth for the wall-clock budget. Fix must respect it; no
    SDK-level timeout exists at the runAgent layer.

- timestamp: 2026-05-12
  checked: src/bot.ts:654-661 (Telegram path), src/bot.ts:1788-1793 (dashboard path)
  finding: |
    Wall-clock timeout is enforced at the BOT layer, not the agent layer. The
    bot constructs `const abortCtrl = new AbortController()`, then schedules
    `setTimeout(() => abortCtrl.abort(), AGENT_TIMEOUT_MS)` and passes
    abortCtrl into runAgent. There is NO Promise.race, NO outer timeout wrapper.
    The abort signal propagates into the SDK subprocess via the SDK's
    abortController option (agent.ts:287).
  implication: |
    The kill path runs *inside* bot.ts, not inside agent.ts. Salvage logic
    belongs in bot.ts at the same scope as the AbortController. agent.ts's
    catch block (lines 414-418) just observes signal.aborted and returns
    `{ text: null, ..., aborted: true }`.

- timestamp: 2026-05-12
  checked: src/agent.ts:227-240, 289-413
  finding: |
    `runAgent` accumulates ALL turn state in local closure variables: `newSessionId`,
    `resultText`, `usage`, `didCompact`, `preCompactTokens`, `lastCallCacheRead`,
    `lastCallInputTokens`, `streamedText`. None of these are exported, written
    to disk, or pushed through onProgress until the SDK emits a `result` event
    (agent.ts:367). When abortController fires mid-stream, the SDK throws into
    the `for await` loop, the catch at line 414 fires, function returns
    `{ text: null, newSessionId, usage, aborted: true }`. Every other accumulated
    variable is dropped on the floor.
  implication: |
    To salvage anything, agent.ts either (a) needs to surface its accumulated
    state in the AgentResult on abort, or (b) needs to push state out through
    a callback during the loop so bot.ts can buffer it externally. Option (b)
    is cheaper and matches the existing onProgress/onStreamText pattern.

- timestamp: 2026-05-12
  checked: src/warroom-text-orchestrator.ts:1623-1702 (canonical SDK-event shape reference)
  finding: |
    The Claude Agent SDK emits subagent (Task tool) work as ordinary
    `assistant` and `user` events scoped to a sub-conversation:
      - `assistant` event, `message.content[]` contains `tool_use` blocks with
        `{ id, name, input }` — `name === 'Task'` for Task tool invocations.
      - `user` event, `message.content[]` contains `tool_result` blocks with
        `{ tool_use_id, is_error, content }`. The `content` field is either a
        string OR an array of `{ type: 'text', text: string }` blocks (the
        completed subagent's full output report).
      - `system` event with `subtype: 'task_started'` / `subtype: 'task_notification'`
        gives the human-readable description + status. (agent.ts:337-348 already
        forwards these to onProgress.)
    The completed subagent's FULL report lands as a `tool_result` block on a
    `user` event, addressable by `tool_use_id`. The bot's "✓ Agent X completed"
    line came from `task_notification.summary` (a short description), NOT the
    actual research payload — which sat in the `tool_result.content` and is
    currently dropped by agent.ts.
  implication: |
    Every completed Task subagent's full output IS visible to agent.ts at the
    moment it arrives, before any timeout. agent.ts just doesn't keep it.
    Salvage is a matter of buffering tool_result blocks (or tool_use_id → result
    pairings) as they stream, and exposing the buffer in AgentResult.

- timestamp: 2026-05-12
  checked: src/agent.ts:308-365
  finding: |
    The for-await loop in runAgent currently inspects: `system` (init,
    compact_boundary, task_started, task_notification), `assistant` (usage
    deltas, tool_use → onProgress), `stream_event` (text deltas → onStreamText
    for parent_tool_use_id===null only), and `result` (final text + usage).
    It does NOT inspect `user` events at all. tool_result blocks pass through
    invisibly. This is the missing capture point.
  implication: |
    Adding a `user`-event handler that captures tool_result blocks (or just
    the ones whose paired tool_use was `Task`) is a ~10-line patch inside
    the existing for-await loop. Buffer can be a Map<tool_use_id, {name, result}>
    on the closure and exposed via AgentResult.

- timestamp: 2026-05-12
  checked: src/agent.ts:235, 350-365
  finding: |
    `streamedText` accumulates outermost-assistant deltas only (gate at
    line 353: `parent_tool_use_id === null`). On abort, it's never returned
    in AgentResult — but bot.ts does see it through `onStreamText` and
    writes it to the Telegram placeholder message via `streamMsgId`. That
    placeholder is then DELETED on the abort path (bot.ts:713-715, which
    runs before the abort branch at 718). So:
      - The streamed text is visible to bot.ts during the turn.
      - bot.ts deletes the visible placeholder before emitting the timeout msg.
      - Neither side keeps a copy.
  implication: |
    Three options for keeping the streamed text on abort:
      (i)  bot.ts captures it locally in `onStreamText` (e.g. let
           streamedSoFar = ''; in the bot scope and update on each call).
           Cheapest — no agent.ts change. Only covers outermost-assistant text.
      (ii) Don't delete the placeholder on abort — let it stand as the
           salvaged reply. Cleanest UX but the placeholder ends with " ▍" and
           may be mid-sentence.
      (iii) Surface streamedText via AgentResult.partialText on abort. Most
            principled. Same agent.ts edit as for tool_result buffering.

- timestamp: 2026-05-12
  checked: src/bot.ts:598, 895-900, 907; src/scratchpad.ts:11-14, 50-56
  finding: |
    Scratchpad lifecycle:
      - `createScratchpad(AGENT_ID, chatIdStr)` runs synchronously at bot.ts:598
        BEFORE the SDK query starts. The file exists on disk by the time
        `runAgentWithRetry` is awaited. SCRATCH_DIR is `path.join(CLAUDECLAW_CONFIG, 'scratch')`,
        ensured via fs.mkdirSync at module load (scratchpad.ts:14).
      - On clean success, bot.ts:898-900 calls deleteScratchpad(scratchpadPath).
      - On error (catch block at bot.ts:903-919), line 907 explicitly says
        "do NOT delete scratchpadPath on error. Sweep handles it."
      - On ABORT (bot.ts:718-726), the function `return`s BEFORE reaching
        line 898. So the scratchpad file is NOT deleted on the abort path —
        it remains on disk for the next turn (which can recover it) or for
        the startup sweep to age out.
  implication: |
    The scratchpad file IS on disk at timeout time and IS readable by bot.ts.
    Salvage logic in the abort branch can `fs.readFileSync(scratchpadPath)`
    and include its contents in the user-facing reply. If the model never
    wrote to it, the file is just the header line ("# Scratchpad for…") and
    can be detected and skipped.

- timestamp: 2026-05-12
  checked: User report vs. scratchpad lifecycle code
  finding: |
    Scratchpad-dir-missing reconciliation: the user reports `~/.claudeclaw/scratch/`
    didn't exist after the turn died, but the code clearly creates it at
    module load (scratchpad.ts:14) and writes a file before runAgent runs
    (bot.ts:598). Three candidate explanations:
      (a) The check was performed on a different host (e.g. local laptop) than
          where Archie actually ran (the VPS). CLAUDECLAW_CONFIG resolves to
          `~/.claudeclaw` on each host — the VPS file would not be visible
          locally without a sync.
      (b) The check ran during a window where cleanupOldScratchpads had
          already pruned the file. Default maxAgeMs is 24h (scratchpad.ts:62)
          but startup sweep can also wipe orphans.
      (c) The file was created but is genuinely empty (just header), so a
          casual `ls` may have been done on the wrong host but the user
          interpreted "scratch missing" to mean "scratchpad didn't fire".
          The infrastructure DID run; the model never appended to it.
    Recommended next step before plan-phase: SSH to VPS, `ls ~/.claudeclaw/scratch/`,
    confirm whether an `archie-*` file from tonight's turn exists. If yes,
    cat it — if empty-but-headered, scratchpad infra worked but the model
    never wrote findings (Task subagents don't see the parent's scratchpad
    path; see question 6 below).
  implication: |
    Question of whether the scratchpad infra fired is empirical and can be
    answered with one SSH session. The architectural finding (model probably
    didn't write to it because subagents don't see the path) stands either way.

- timestamp: 2026-05-12
  checked: src/bot.ts:717-726 (Telegram), src/bot.ts:1810-1815 (dashboard)
  finding: |
    The user-facing timeout reply comes from TWO sites with near-identical
    code:
      Telegram (bot.ts:718-726):
        if (result.aborted) {
          setProcessing(chatIdStr, false);
          const msg = result.text === null
            ? `Timed out after ${Math.round(AGENT_TIMEOUT_MS / 1000)}s. The task may
               have been too complex or a command got stuck. Try breaking it into
               smaller steps.`
            : 'Stopped.';
          emitChatEvent({ type: 'assistant_message', chatId: chatIdStr, content: msg, source: 'telegram' });
          await ctx.reply(msg);
          return;
        }
      Dashboard (bot.ts:1810-1815): identical shape, different msg copy
        ("Timed out after ${...}s. Try breaking the task into smaller steps.").
    The `result.text === null` check distinguishes a wall-clock timeout
    (text never produced) from a manual /stop after partial output
    ("Stopped."). Currently the two paths don't differ further.
  implication: |
    These are the two exact insertion points for the salvage logic. The check
    `if (result.aborted)` is the boundary; everything inside is the salvage
    surface. Both paths need it (dashboard users hit the same dead-end).
    The "Stopped." branch may also benefit from showing partial work.

- timestamp: 2026-05-12
  checked: src/agent.ts:253-289 — SDK query options
  finding: |
    runAgent does NOT pass the SDK `agents:` option to query(). Task tool
    subagents therefore run with default Claude Code subagent settings: a
    fresh SDK subprocess, no inheritance of the parent's system prompt, no
    visibility into the parent's user message envelope. The parent's
    `[Scratchpad — …]` block is in the PARENT's prompt, not the SDK's
    system layer, so subagents cannot see scratchpadPath.
  implication: |
    Subagents have neither their own scratchpad path NOR access to the
    parent's. Two possible directions for the plan:
      (A) Don't try to plumb the scratchpad path to subagents. Instead,
          salvage their *output* on the timeout boundary via captured
          tool_result blocks (the path explored throughout this map).
      (B) Plumb the scratchpad path into the Task tool's prompt envelope
          on the parent side ("when dispatching a Task subagent, prefix
          its prompt with the scratchpad path"). Requires intercepting
          the parent's tool_use Task call before it executes — much harder
          with the current SDK shape.
    Option (A) is the natural fit for the user's chosen fix shape. Option (B)
    would be a follow-up phase.

- timestamp: 2026-05-12
  checked: src/db.ts:1473-1484 (saveConversationTurn) and bot.ts:792
  finding: |
    `saveConversationTurn` writes a single row to `conversation_log` only
    AFTER the agent completes (bot.ts:792, after the recovery branch). There
    is no incremental write during the turn. On abort, this call is skipped
    (the function returns at line 725 before reaching 792). So the
    SQLite conversation_log has nothing recoverable for a timed-out turn.
  implication: |
    SQLite is NOT a viable post-hoc salvage source for the current turn's
    partial work. (It's still useful for the *previous* turn's findings if
    the user asks "what did you find before that timeout".) Salvage MUST
    come from in-process state (the for-await closure) or on-disk state
    (the scratchpad file).

## What we have to work with at the timeout boundary

When `setTimeout(() => abortCtrl.abort(), AGENT_TIMEOUT_MS)` fires at bot.ts:658,
the following state is available — ranked by salvage value:

1. **SDK tool_result blocks streamed during the turn** (HIGHEST VALUE)
   - Source: `user` event, `message.content[]`, blocks with `type: 'tool_result'`.
   - Pairing: each `tool_result.tool_use_id` maps back to a `tool_use` block
     observed earlier on an `assistant` event, which carries `name` (e.g. 'Task').
   - Currently dropped — agent.ts:289-413 has no `user`-event handler.
   - Salvage shape: `Map<toolUseId, { toolName, result }>` accumulated in the
     for-await loop, exposed on AgentResult.
   - Captures: completed Task subagent reports, WebFetch results, large Read/Grep
     outputs, MCP tool returns. This is where the "Search GitHub for GHL workflow
     API patterns" subagent's actual findings live.

2. **Scratchpad file on disk** (MEDIUM VALUE — depends on whether model wrote to it)
   - Path: `scratchpadPath` (already a closure variable in bot.ts:598).
   - Lifecycle: created before runAgent, NOT deleted on abort (sweep handles).
   - Salvage shape: `fs.readFileSync(scratchpadPath, 'utf-8')` in the
     `if (result.aborted)` branch. Skip if length ≤ header length.
   - Captures: whatever the model chose to write (per persona rules from
     install-scratchpad-rules.sh). Note: Task subagents do NOT see the
     scratchpad path — only the parent agent writes to it.

3. **streamedText (outermost assistant deltas)** (LOW-MEDIUM VALUE)
   - Source: stream_event with parent_tool_use_id===null.
   - Currently lost on abort (closure variable, not returned).
   - Salvage shape: either (i) capture in bot.ts via onStreamText closure
     (no agent.ts change), or (ii) return on AgentResult.partialText.
   - Captures: whatever the model was typing as its final reply at the
     moment of kill. Often mid-sentence; may be the most user-friendly
     thing to show.

4. **usage / numTurns / didCompact / preCompactTokens** (DIAGNOSTIC VALUE)
   - On abort, runAgent at agent.ts:417 returns `{ usage }` if the SDK
     emitted a result event before abort (rare — usually no). More
     commonly `usage` will be null. Even so, partial diagnostics
     (`numTurns reached: X`) could be surfaced if captured per-event
     rather than only on the result event.
   - Currently: captured only on `result` event (agent.ts:367-412), so
     on a mid-turn abort there's no usage to report.

5. **SQLite conversation_log** (NO VALUE for current turn)
   - Only written post-success (bot.ts:792). For the current turn, nothing
     is there. For previous turns, it's intact but already shown to the user.

6. **Telegram message history** (NO VALUE — already in user's chat)
   - The "✓ Agent X completed" line and tool-active notifications already
     sit in the user's chat. They tell the user *that* work happened, not
     *what* was found.

## Implementation surface area

Files and exact insertion points where salvage logic would land. NO CODE — just
the map. The user has chosen "~100-150 lines"; here's where those lines go.

### src/agent.ts

- **Lines 227-235** (closure-variable block at top of runAgent): add a
  `const subagentResults: Array<{ toolName: string; result: string }> = []`
  and a `const toolUseRegistry = new Map<string, string>()` (tool_use_id → tool_name).
- **Lines 311-334** (existing `assistant` event branch): extend to populate
  `toolUseRegistry` from each `tool_use` block — same iteration that already
  feeds onProgress.
- **NEW after line 365** (before the `result` event branch): add a `user`
  event handler that walks `message.content[]` for `tool_result` blocks,
  looks up the tool name via `toolUseRegistry`, and pushes onto
  `subagentResults` (gate on `toolName === 'Task'` if we want Task-only;
  capture all if we want full salvage).
- **Lines 157-162** (AgentResult interface): add
  `subagentResults?: Array<{ toolName: string; result: string }>` and
  optionally `partialText?: string`.
- **Lines 415-418** (catch block): in the abort path, return
  `{ text: null, newSessionId, usage, aborted: true, subagentResults, partialText: streamedText || undefined }`.
- **Lines 432** (success-path return): same — include `subagentResults`.

### src/bot.ts

- **Lines 717-726** (Telegram abort branch): replace the static timeout
  message with a salvage-aware composer. Read the scratchpad file (using
  `scratchpadPath` already in closure scope at line 598), inspect
  `result.subagentResults` and `result.partialText`, and concatenate into
  a Telegram-friendly reply. Falls back to today's static message when all
  three sources are empty. Honor message splitting via `splitMessage` /
  `formatForTelegram` for long payloads.
- **Lines 1810-1815** (dashboard abort branch): same composer, slightly
  different copy. Probably extract a helper (`formatTimeoutReply(result,
  scratchpadPath)`) so the two paths stay in sync.
- **Lines 668-691** (onStreamText): if we go with option (i) for
  streamedText capture, add a `let lastStreamedText = ''` in bot scope and
  update it in onStreamText. If we go with option (iii), agent.ts handles it.
- **Optional, lines 898-900**: consider also reading the scratchpad
  contents on success-but-empty-result (subtype !== 'success' but no
  abort) — adjacent to the existing `formatEmptyReply(usage)` call at
  line 766. Out of scope for this fix shape but flagged for completeness.

### Tests

- **src/agent.test.ts**: add a fixture exercising abort mid-stream after a
  fake user event with tool_result blocks. Assert AgentResult.subagentResults
  is populated and AgentResult.aborted is true.
- **src/bot.test.ts**: add a fixture for the abort branch that mocks
  AgentResult with subagentResults and asserts the Telegram reply contains
  the salvaged content (not the generic timeout message). Add a second
  fixture for empty-salvage fallback.
- **src/scratchpad.test.ts**: already covers create/delete/cleanup. Likely
  no changes needed unless the timeout salvage adds a new helper
  (e.g. `readScratchpad`).

### Out of scope for the salvage patch

- Plumbing scratchpad path into Task tool subagents (architectural — defer).
- Incremental conversation_log writes (separate concern).
- Configurable per-agent timeout (not the reported failure).
- Raising AGENT_MAX_TURNS (deferred from the compact-silent session;
  remains deferred).

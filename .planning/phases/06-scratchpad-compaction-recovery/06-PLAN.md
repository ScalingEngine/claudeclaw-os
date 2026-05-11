---
phase: 06-scratchpad-compaction-recovery
plans: 5
waves: 5
milestone: M3
status: ready-for-execution
created: 2026-05-11
source: 06-CONTEXT.md + 06-PATTERNS.md + .planning/debug/resolved/archie-compact-silent.md
requirements: [SCRATCH-01, SCRATCH-02, SCRATCH-03, SCRATCH-04, SCRATCH-05]
---

# Phase 6 — Scratchpad / Compaction Recovery — Plan

## Goal-Backward Frame

**Goal (outcome, not task):** When Vera or Archie spends 25+ tool calls on a research task and the SDK auto-compacts mid-flight, the user receives a substantive reply containing the actual research findings — not a fabricated "Done." or an honest-but-empty `formatEmptyReply` message.

**Observable truths required for the goal:**
1. After the wrapper starts an agent turn, a deterministic scratchpad file exists at `~/.claudeclaw/scratch/{agentId}-{chatId}-{ts}.md`.
2. The model receives the scratchpad path in its prompt envelope (Telegram, dashboard, AND delegation paths).
3. Each persona has a class-appropriate rule telling it WHEN to write to the scratchpad.
4. When `compact_boundary` fires AND `result.text` comes back empty, the wrapper retries the same `sessionId` exactly once with a continuation prompt that re-injects the scratchpad path and tells the model to Read it.
5. After a successful turn (`subtype === 'success'`), the scratchpad file is deleted.
6. After a failed turn (any non-success subtype, abort, or process kill), the file remains and is aged out by a startup sweep at >24h.
7. The user-facing reply on the recovered turn contains the model's findings, not `formatEmptyReply`'s graceful-failure string.

---

## Wave & Plan Map

| Wave | Plan | Title | Files | Requirement(s) | Autonomous |
|------|------|-------|-------|----------------|------------|
| 1 | 06-01 | Scratchpad module + lifecycle helpers + tests | `src/scratchpad.ts` (NEW), `src/scratchpad.test.ts` (NEW) | SCRATCH-01 | yes |
| 2 | 06-02 | Inject scratchpad into all 3 prompt envelopes + per-turn lifecycle wiring | `src/bot.ts`, `src/orchestrator.ts` | SCRATCH-01, SCRATCH-05 | yes |
| 3 | 06-03 | Retry-after-compaction loop + reorder warning | `src/bot.ts` | SCRATCH-03, SCRATCH-04 | yes |
| 4 | 06-04 | Persona rules — repo template + live `~/.claudeclaw/` migration script | `agents/_template/CLAUDE.md`, `scripts/install-scratchpad-rules.sh` (NEW) | SCRATCH-02 | **no — checkpoint** |
| 5 | 06-05 | Startup sweep wiring + end-to-end verification | `src/index.ts` | SCRATCH-05 | **no — checkpoint** |

**Wave dependencies (file ownership — zero overlap within a wave):**
- W2 depends on W1 (imports `createScratchpad`/`deleteScratchpad`).
- W3 depends on W2 (uses the scratchpad path injected by W2 in the continuation prompt).
- W4 is independent of code waves (touches persona/template files only) but is sequenced last-before-verification because the rules only matter once the path injection is live.
- W5 depends on W1 (calls `cleanupOldScratchpads()`) and is the verification gate.

---

## Persona-File Decision (CONTEXT discretion item)

**Approach chosen: bake into `agents/_template/CLAUDE.md` + ship a one-shot migration script.**

Rationale:
- The repo ships zero per-agent CLAUDE.md files (`find agents -name CLAUDE.md` returns only `_template/CLAUDE.md`). Editing repo persona paths would be a no-op for the live fleet (per `src/agent-config.ts:78-88` `resolveAgentClaudeMd()` checks `~/.claudeclaw/agents/{id}/CLAUDE.md` first; `~/.claudeclaw/CLAUDE.md` is the live source for Ezra per `src/index.ts:74-87`).
- Direct `Edit` of `~/.claudeclaw/agents/*/CLAUDE.md` from a worktree-scoped agent is a side-effect on Noah's home dir that won't propagate back to the repo. A migration script Noah runs once is auditable, idempotent, reversible (it backs up `*.md.pre-scratch.bak`), and makes the rule's source-of-truth the template — so future fleet rebuilds inherit it.
- Sub-agent loader (`agent-config.ts:78-88`) already checks repo `agents/{id}/CLAUDE.md` as fallback. A future "create agent" flow that copies from `_template` will get the rule for free.

---

## Plan 06-01 — Scratchpad Module + Lifecycle + Tests (Wave 1)

**Requirement:** SCRATCH-01 (deterministic per-turn working file at a known path).

### Read first
- `src/media.ts:11-15, 119, 171-199` — exact analog: dir constant, ensure-dir on load, filename pattern, sweep function.
- `src/config.ts:139-153` — `expandHome` + `CLAUDECLAW_CONFIG` (path policy: never call `os.homedir()` directly).
- `src/index.ts:123-125` — `releaseLock()` shape for try/unlink/ignore lifecycle.
- `src/avatars.test.ts:41` and `src/warroom-text-orchestrator.test.ts:10` — `CLAUDECLAW_CONFIG` env-override pattern in tests.

### Tasks

#### Task 1.1 — Create `src/scratchpad.ts`
- **File:** `src/scratchpad.ts` (NEW, ~60 lines).
- **Action:** Mirror `src/media.ts` structure verbatim, retargeted to scratchpads. Export:
  - `SCRATCH_DIR = path.join(CLAUDECLAW_CONFIG, 'scratch')` (NOT `os.homedir()` — policy per pattern map).
  - Module-load `fs.mkdirSync(SCRATCH_DIR, { recursive: true })`.
  - `createScratchpad(agentId: string, chatId: string): string` — writes `${agentId}-${chatId}-${Date.now()}.md` with a header line `# Scratchpad for ${agentId} / chat ${chatId}\n\n` and returns the absolute path. Sanitize `agentId` and `chatId` via the same regex `src/media.ts:78-80` `sanitizeFilename` uses (`[^a-zA-Z0-9.\-]/g → '_'`) — chatIds are numeric in practice but slack thread_ts can contain dots, and we must never let a path-traversal-shaped chatId escape the dir.
  - `deleteScratchpad(file: string): void` — best-effort `try { fs.unlinkSync } catch { /* swept later */ }`. Never throws. Mirror `src/index.ts:123-125`.
  - `cleanupOldScratchpads(maxAgeMs: number = 24 * 60 * 60 * 1000): void` — copy `cleanupOldUploads` from `src/media.ts:171-199` byte-for-byte, swap `UPLOADS_DIR` → `SCRATCH_DIR` and the log message → `'Cleaned up old scratchpads'`. Same `try { stat } catch { skip }`.
  - Use `logger` from `./logger.js` — same posture as `media.ts:6`.
- **Avoid:** Don't add `SCRATCHPAD_DIR` env override or `SCRATCHPAD_ENABLED` toggle. Per pattern map: kill switches are over-engineering for a 60-line module. If we ever need one, the `kill-switches.ts` `requireEnabled('LLM_SPAWN_ENABLED')` precedent is already in the codebase.
- **Verify:** `npm run typecheck` clean; `node -e "import('./dist/scratchpad.js').then(m => console.log(Object.keys(m)))"` lists the four exports (after `npm run build`).
- **Done:** Module exports `SCRATCH_DIR`, `createScratchpad`, `deleteScratchpad`, `cleanupOldScratchpads`. Importing the module idempotently creates `~/.claudeclaw/scratch/`.

#### Task 1.2 — Tests for scratchpad lifecycle
- **File:** `src/scratchpad.test.ts` (NEW).
- **Action:** Vitest suite mirroring `src/avatars.test.ts:41` env-override pattern. Set `CLAUDECLAW_CONFIG` to a `fs.mkdtempSync(path.join(os.tmpdir(), 'scratch-test-'))` per test. Cases:
  1. `createScratchpad('vera', '12345')` returns a path matching `/scratch/vera-12345-\d+\.md$/`, the file exists, and contents start with `# Scratchpad for vera / chat 12345`.
  2. Two consecutive `createScratchpad` calls with the same args produce two distinct paths (timestamp differs — sleep 2ms or use `vi.useFakeTimers`).
  3. `createScratchpad('../../etc', 'evil')` sanitizes to `_.._.._etc-evil-...md` inside `SCRATCH_DIR` (no path escape).
  4. `deleteScratchpad(path)` removes the file; calling it again on the same path does NOT throw (swept-later semantics).
  5. `cleanupOldScratchpads(0)` deletes everything in the dir; on a non-existent dir it returns silently (matches `media.ts:172-177`).
  6. `cleanupOldScratchpads(60_000)` leaves a just-created file alone but deletes one whose `mtime` is forced to `Date.now() - 120_000` via `fs.utimesSync`.
- **Avoid:** Don't mock `fs` — use real tmpdir. The pattern in this repo is real-fs-with-tmpdir-override (see `avatars.test.ts:41`), not fs mocks.
- **Verify:** `npm test src/scratchpad.test.ts` — 6/6 passing.
- **Done:** All 6 cases green; running the suite leaves no files in `os.tmpdir()` (each test's tmpdir is cleaned in `afterEach`).

### Atomic commit message
```
feat(scratchpad): add per-turn working-file module with sweep

Mirrors src/media.ts shape: SCRATCH_DIR via CLAUDECLAW_CONFIG, ensure-dir
on module load, create/delete/sweep with best-effort fs error swallowing.
Path sanitization on agentId/chatId blocks traversal. 6 tests cover
happy-path, dedup, sanitization, idempotent delete, and TTL-based sweep.

Refs SCRATCH-01.
```

---

## Plan 06-02 — Prompt-Envelope Injection + Per-Turn Lifecycle (Wave 2)

**Requirement:** SCRATCH-01 (path reaches the model), SCRATCH-05 (file deleted on success).

### Read first
- `src/bot.ts:521-546` — Telegram envelope assembly site.
- `src/bot.ts:1648-1675` — Dashboard envelope assembly site.
- `src/orchestrator.ts:185-213` — Cross-agent delegation envelope assembly site.
- `src/agent.ts:241-430` — `runAgent` shape (so the lifecycle wrapper at the caller knows what events it returns; specifically `result.usage.subtype`).
- `src/bot.ts:631-671` — current `runAgentWithRetry` call site + post-result handling. The lifecycle try/finally goes around this block.

### Tasks

#### Task 2.1 — Inject scratchpad system message at all 3 sites; create file before agent call; delete on success
- **Files:** `src/bot.ts` (Telegram path ~ln 521-680, dashboard path ~ln 1648-1710), `src/orchestrator.ts` (~ln 185-220).
- **Action:** At each of the three envelope assembly sites:
  1. After the existing `parts.push(memCtx)` / `dashParts.push(memCtx)` / `contextParts.push(...)`, BUT BEFORE the final `parts.push(message)` user-message push, call `const scratchpadPath = createScratchpad(AGENT_ID, chatIdStr)` (orchestrator: use the delegated `agentId` and synthesize a chatId of `'delegation-${taskId}'`).
  2. Push a labeled envelope block matching the project's `[Label — body]\n[End label]` convention used everywhere (see `src/bot.ts:526, 537`, `src/orchestrator.ts:191`):
     ```
     [Scratchpad — append findings here so they survive context compaction]
     Your scratchpad for this turn is ${scratchpadPath}.
     Use the Write tool to append findings as you go. After context compaction
     fires, Read this file before continuing so your prior research survives.
     [End scratchpad]
     ```
  3. Wrap the `runAgentWithRetry` (Telegram + dashboard) or `runAgent` (orchestrator) call in `try { ... } finally { ... }` so the scratchpad lifecycle is owned by the caller — NOT inside `runAgent`. Per pattern map and CONTEXT decision: delete only when `result.usage?.subtype === 'success'`. Leave the file in place on any non-success subtype, abort, throw, or timeout — the sweep will age it out (per CONTEXT lifecycle decision).
  4. Concrete shape (Telegram path):
     ```ts
     const scratchpadPath = createScratchpad(AGENT_ID, chatIdStr);
     try {
       const result = await runAgentWithRetry(/* ... fullMessage ... */);
       // ... existing post-result handling unchanged ...
       if (result.usage?.subtype === 'success') {
         deleteScratchpad(scratchpadPath);
       }
       // else: leave for retry-after-compaction (Plan 06-03) or sweep
     } catch (err) {
       // file stays — sweep handles it; do NOT add a finally-delete
       throw err;
     }
     ```
  5. Pass `scratchpadPath` out of the try-block via a `let` so Plan 06-03's retry continuation prompt can reference the same file (do NOT create a new scratchpad on retry — the model needs to read what it wrote pre-compaction).
- **Avoid:**
  - Do NOT inject the scratchpad block before `agentSystemPrompt` — order matters; persona-class rule (Plan 06-04) lives in agentSystemPrompt and references the scratchpad block by name. Push memCtx → scheduled-task context → memory nudge → scratchpad → user message (scratchpad is the LAST framing block before the user prompt so it's freshest in the model's attention).
  - Do NOT make this conditional on `!sessionId` like `agentSystemPrompt` is. The scratchpad path is per-turn, not per-session — every turn needs a new path.
  - Do NOT put the lifecycle inside `runAgent` (CONTEXT and pattern map both flag this — the caller owns the file because the caller knows when a retry is happening).
- **Verify:**
  - `npm run typecheck` clean.
  - `grep -n "createScratchpad\|deleteScratchpad" src/bot.ts src/orchestrator.ts` shows 3 create sites and 3 delete sites (Telegram, dashboard, orchestrator).
  - `grep -n "\[Scratchpad —" src/bot.ts src/orchestrator.ts` shows 3 envelope blocks.
  - Targeted bot test: `npm test src/bot.test.ts` — must still be 38/38 (no regression on the existing path; current bot.test.ts doesn't cover the envelope assembly so no new assertions needed here, those come in Plan 06-05's e2e check).
- **Done:** All 3 envelope sites create a scratchpad pre-call and delete on success. The file persists across the subprocess SDK call (so the model's mid-turn `Write` calls hit the same path). Existing tests still pass.

#### Task 2.2 — Smoke test: real fs round-trip through bot envelope assembly
- **File:** `src/bot.test.ts` (extend existing — DO NOT create a new file; the project keeps tests adjacent to source per existing convention).
- **Action:** Add ONE test case (mirror existing test setup in the same file): mock `runAgentWithRetry` to (a) read the scratchpad path out of the envelope text via regex `\[Scratchpad — [^\]]+\]\n.*?Your scratchpad for this turn is ([^\s]+)`, (b) `fs.writeFileSync(path, '- finding: foo')` mid-call, (c) return `{ text: 'ok', usage: { subtype: 'success', ... } }`. Assert: file is created before the runAgent mock fires (mock runs synchronously in the test, so check inside the mock), file is deleted after the call returns, and the regex match succeeds (proves the envelope contains a real path the model could `Read`).
- **Avoid:** Don't try to simulate compaction here — that's Plan 06-03's territory. This test only verifies the lifecycle wiring.
- **Verify:** `npm test src/bot.test.ts` — 39/39 passing (was 38).
- **Done:** Test asserts envelope contains a usable scratchpad path AND lifecycle deletes on success.

### Atomic commit message
```
feat(scratchpad): inject per-turn path into all 3 prompt envelopes

Telegram (bot.ts:521), dashboard (bot.ts:1648), and orchestrator
(orchestrator.ts:185) now create a scratchpad before runAgent and
delete it on result.usage.subtype === 'success'. File persists on
any non-success subtype so retry/sweep can recover. Envelope uses
the project's [Label — body] convention so the model can segment it
from memCtx and the user message.

Refs SCRATCH-01, SCRATCH-05.
```

---

## Plan 06-03 — Retry-After-Compaction + Warning Reorder (Wave 3)

**Requirement:** SCRATCH-03 (re-read after compaction), SCRATCH-04 (warning fires BEFORE empty-reply fallback).

### Read first
- `src/agent.ts:298-306` — `compact_boundary` detection (already exists; do NOT add a parallel detector).
- `src/agent.ts:367-410` — `result` event handler that populates `usage.subtype` and `usage.didCompact`.
- `src/agent.ts:450-510` — `runAgentWithRetry` retry harness (the structural analog; this plan adds a SECOND retry layer at the bot.ts caller).
- `src/bot.ts:90-117` — `formatEmptyReply` and `checkContextWarning`.
- `src/bot.ts:631-680` (Telegram), `src/bot.ts:1660-1710` (dashboard) — current call site flow: result → format → send. The retry inserts between "result" and "format".
- `src/bot.ts:775-786` — multi-compaction notice (stays — useful tail signal).

### Tasks

#### Task 3.1 — Add compaction-recovery retry (max 1) at the bot.ts caller
- **Files:** `src/bot.ts` (Telegram + dashboard call sites; same logic, wrap in a small helper to avoid copy-paste).
- **Action:**
  1. Add a private helper near the top of `bot.ts` (NOT exported — internal):
     ```ts
     async function recoverFromCompactionIfNeeded(
       result: AgentResult,
       sessionId: string | undefined,
       scratchpadPath: string,
       runAgent: (msg: string, sid: string | undefined) => Promise<AgentResult>,
     ): Promise<AgentResult> {
       const isEmpty = !result.text || result.text.trim() === '';
       const compacted = !!result.usage?.didCompact;
       if (!isEmpty || !compacted) return result;
       const continuation =
         `[Scratchpad — recover findings after context compaction]\n` +
         `Your context just auto-compacted and your prior research was summarized away. ` +
         `Read ${scratchpadPath} now using the Read tool, then re-emit your findings to ` +
         `the user. Do not say "Done." — produce the actual findings from the scratchpad.\n` +
         `[End scratchpad]`;
       logger.warn({ scratchpadPath, sessionId }, 'Compaction-recovery retry firing');
       const retried = await runAgent(continuation, sessionId);
       return retried;
     }
     ```
  2. At each of the two call sites (Telegram ~ln 631, dashboard ~ln 1660), AFTER `runAgentWithRetry` returns and BEFORE the existing `let rawResponse = result.text?.trim() || formatEmptyReply(...)` line, call:
     ```ts
     const finalResult = await recoverFromCompactionIfNeeded(
       result,
       result.newSessionId ?? sessionId,  // post-compaction the SDK preserves session
       scratchpadPath,
       (msg, sid) => runAgent(msg, sid, () => sendTyping(...), onProgress, effectiveModel, abortCtrl, onStreamText, agentMcpAllowlist),
     );
     ```
     Then change the next line to `let rawResponse = finalResult.text?.trim() || formatEmptyReply(finalResult.usage);`.
  3. Use `runAgent` directly (NOT `runAgentWithRetry`) inside the recovery helper — the existing retry harness retries on transient errors with backoff/model-switch, which is wrong semantics here. Compaction recovery is one-shot; if it fails again, fall through to `formatEmptyReply` honestly.
  4. **Hard cap of 1 retry.** Per CONTEXT decision. The helper has no loop — it's a single `if (compacted && empty) → retry once`. If the retry ALSO comes back empty, `formatEmptyReply` runs as today.
  5. The existing `checkContextWarning` (`bot.ts:115-117`) and multi-compact notice (`bot.ts:775-786`) STAY — they're tail-end signals to the user, not the primary recovery path. Per pattern map.
- **Avoid:**
  - Do NOT put the retry inside `runAgent` or `runAgentWithRetry`. CONTEXT decision: lives at bot.ts layer where session state and prompt assembly live.
  - Do NOT loop. Max 1 retry. A loop on compaction would burn turns and money on a model that's already failing.
  - Do NOT pass a fresh sessionId. Per SDK behavior the post-compaction session preserves the summarized context — re-using the same `sessionId` lets the model see what was summarized + the new continuation prompt.
  - Do NOT delete the scratchpad before the retry. The retry needs to Read it.
- **Verify:**
  - `npm run typecheck` clean.
  - `grep -n "recoverFromCompactionIfNeeded" src/bot.ts` shows 1 definition + 2 call sites.
  - Bot test (extend `src/bot.test.ts`): mock first `runAgent` call to return `{ text: '', usage: { subtype: 'success', didCompact: true } }`, second to return `{ text: 'real findings', usage: { subtype: 'success', didCompact: false } }`. Assert: `runAgent` was called twice, the second call's prompt contains `'Read ${scratchpadPath}'`, and the final user-facing reply is `'real findings'` (not `formatEmptyReply` output).
  - Negative case: same mock setup but second call ALSO returns empty. Assert: `formatEmptyReply` is invoked once, retry is NOT called a third time.
- **Done:** When `didCompact && empty`, the wrapper retries once with a continuation prompt that names the scratchpad path. The recovered text reaches the user verbatim. If the retry also fails, `formatEmptyReply` produces the honest failure message (Plan 06-03 of the original honesty patch behavior preserved).

#### Task 3.2 — Update tests + verify warning ordering
- **Files:** `src/bot.test.ts` (the two new cases above).
- **Action:** Add the two cases described in Task 3.1's verify block. Also add a third case asserting that on a NON-compaction empty reply (`didCompact: false`), the recovery helper is short-circuited and `runAgent` is called only once — proves we don't burn retries on every empty reply.
- **Verify:** `npm test src/bot.test.ts` — 41/41 passing (was 39 after Plan 06-02).
- **Done:** Three new test cases prove: (a) compaction+empty → retry → use retried text, (b) compaction+empty → retry+empty → formatEmptyReply, (c) non-compaction empty → no retry.

### Atomic commit message
```
feat(scratchpad): retry once after compaction empties result.text

When result.usage.didCompact && result.text is empty/null, fire a
continuation prompt at the same sessionId that names the scratchpad
path and tells the model to Read it. Bypasses the runAgentWithRetry
backoff layer (different semantics: this is one-shot recovery, not
transient-error retry). Hard cap of 1 retry. If the retry is also
empty, formatEmptyReply takes over honestly. Three new test cases
cover the success path, the give-up path, and the non-compaction
short-circuit.

Refs SCRATCH-03, SCRATCH-04.
```

---

## Plan 06-04 — Persona Rules (Wave 4) — **HAS CHECKPOINT**

**Requirement:** SCRATCH-02 (per-class persona prompts).
**Autonomous: false** — final task is `checkpoint:human-action` because Noah needs to run the migration script against `~/.claudeclaw/` (this worktree can't safely splice live persona files unattended).

### Read first
- `agents/_template/CLAUDE.md` (entire file, 6.5KB) — only in-repo persona file. Has a `## Rules` section starting at the bottom (per pattern map line 105-109).
- `~/.claudeclaw/CLAUDE.md` — Ezra's live persona (read-only reference; the script edits this).
- `~/.claudeclaw/agents/{vera,archie,cole,poe,hopper}/CLAUDE.md` — sub-agent live personas.
- `src/agent-config.ts:78-88` — `resolveAgentClaudeMd()` load order, confirms repo files are no-op for live agents.

### Per-class rule blocks (locked wording — derived from CONTEXT.md decisions section)

**Research-class (Vera, Archie):**
```markdown
## Scratchpad

Each turn you receive a scratchpad path inside a `[Scratchpad — ...]` block in
your prompt. Treat it as durable memory across context compaction.

- After every 3 tool calls during a research task, append a short bulleted
  findings block to the scratchpad using the Write tool. Include URLs,
  endpoint names, payload shapes, auth headers, error messages — anything
  you would lose if this conversation reset.
- After context compaction fires (you'll see a system message about it,
  or your earlier tool output will feel summarized), Read the scratchpad
  before doing any more work. Re-emit those findings in your reply to the
  user.
- Do NOT spend turns on scratchpad housekeeping. Append, don't reorganize.
```

**Draft-class (Cole, Poe):**
```markdown
## Scratchpad

Each turn you receive a scratchpad path inside a `[Scratchpad — ...]` block in
your prompt. Use it as a durable outline for drafts.

- Outline your draft in sections (e.g. hook, body, CTA for content; subject,
  body, sign-off for comms) at the start of the turn.
- As you finalize each section, append it to the scratchpad with the Write
  tool. Partial drafts then survive any mid-turn context compaction.
- After context compaction, Read the scratchpad and continue from the last
  finalized section instead of starting over.
```

**Coordinator/ops (Ezra, Hopper):**
```markdown
## Scratchpad

Each turn you receive a scratchpad path inside a `[Scratchpad — ...]` block in
your prompt. Use it only on heavy turns.

- If you expect more than 5 tool calls in this turn (e.g. Linear sync,
  cross-agent dispatch with fan-out, multi-step ops triage), dump the
  decision tree and intermediate results to the scratchpad as you go.
- For quick routing/triage turns (1-3 tool calls), skip it. The point is
  recovery from compaction, not housekeeping.
- After context compaction, Read the scratchpad if you used it; otherwise
  continue normally.
```

### Tasks

#### Task 4.1 — Append research-class block to `agents/_template/CLAUDE.md`
- **File:** `agents/_template/CLAUDE.md`.
- **Action:** Append a new top-level `## Scratchpad` section at the END of the file (after the existing `## Rules` block at line 105-109). Use the **research-class** wording (the template should default to the most thorough variant — coordinators and draft-class personas downgrade by overriding their own file). Add a one-line comment above the section: `<!-- Per-class variant — research/draft/coordinator. See scripts/install-scratchpad-rules.sh for live splice. -->`.
- **Avoid:** Don't edit the `## Rules` block — append a new section. Don't reorder existing content.
- **Verify:** `grep -n "## Scratchpad" agents/_template/CLAUDE.md` returns one match. `wc -l agents/_template/CLAUDE.md` shows ~30-35 line increase.
- **Done:** Template carries the canonical research-class block as the default for any future agent created from it.

#### Task 4.2 — Create `scripts/install-scratchpad-rules.sh`
- **File:** `scripts/install-scratchpad-rules.sh` (NEW), executable.
- **Action:** A bash script Noah runs once on his machine and once on the VPS. Behavior:
  1. Defines three heredocs (RESEARCH_BLOCK, DRAFT_BLOCK, COORDINATOR_BLOCK) with the locked wording above.
  2. Defines the agent → class map:
     - `~/.claudeclaw/CLAUDE.md` → coordinator (Ezra)
     - `~/.claudeclaw/agents/vera/CLAUDE.md` → research
     - `~/.claudeclaw/agents/archie/CLAUDE.md` → research
     - `~/.claudeclaw/agents/cole/CLAUDE.md` → draft
     - `~/.claudeclaw/agents/poe/CLAUDE.md` → draft
     - `~/.claudeclaw/agents/hopper/CLAUDE.md` → coordinator
  3. For each (file, class) pair:
     - If file does not exist: log a warning and skip (don't fail the script — Noah may run it before all agents have personas seeded).
     - If file already contains `## Scratchpad`: log "already installed, skipping" (idempotent).
     - Otherwise: backup as `${file}.pre-scratch.bak`, append a `\n\n${BLOCK}` for the matching class.
  4. Final summary line: `Installed: N | Skipped (already present): M | Skipped (missing file): K | Backups in *.pre-scratch.bak`.
  5. Accepts `--dry-run` flag that prints what it would do without writing.
  6. Accepts `--revert` flag that restores `*.pre-scratch.bak` over the live file (Noah's safety net).
- **Avoid:**
  - Do NOT execute the script from this worktree. Do NOT call it from any test. Do NOT add a postinstall hook. It's a manual one-shot Noah runs after the phase ships.
  - Do NOT use `sed -i` to splice — heredoc append is simpler, idempotent, and reviewable.
  - Do NOT touch repo `agents/{id}/CLAUDE.md` files — they're a no-op for live agents (per pattern map's "Persona load path — VERIFIED" section). The template is the only repo file edited.
- **Verify:**
  - `bash scripts/install-scratchpad-rules.sh --dry-run` against the worktree's `~/.claudeclaw/` prints the planned action for each of the 6 files (or "missing file" if Noah's running this in CI/test where no live config exists).
  - `shellcheck scripts/install-scratchpad-rules.sh` clean (project policy: shellcheck on every shell script per existing scripts in `scripts/`).
- **Done:** Script exists, is executable (`chmod +x`), passes shellcheck, runs in `--dry-run` without errors, and produces a summary line listing all 6 target files.

#### Task 4.3 — checkpoint:human-action — Noah runs the script
- **Type:** `checkpoint:human-action`.
- **What's built:** Template updated; migration script ready.
- **What Noah does:**
  1. From `~/ClaudeCode/claudeclaw/`, run: `bash scripts/install-scratchpad-rules.sh --dry-run` — review the planned actions. Confirm 6 files listed.
  2. Run: `bash scripts/install-scratchpad-rules.sh` — apply on local machine.
  3. SSH to VPS and run the same: `ssh vps "cd ~/claudeclaw && bash scripts/install-scratchpad-rules.sh"` — apply on VPS.
  4. Sanity check: `grep -l "## Scratchpad" ~/.claudeclaw/CLAUDE.md ~/.claudeclaw/agents/*/CLAUDE.md` should list all 6 files (Ezra root + 5 sub-agents).
  5. Restart the fleet for the new persona content to load: `ssh vps "sudo systemctl restart 'claudeclaw-*'"` (or `claudeclaw-ezra` etc. if restarting individually).
- **Resume signal:** Noah replies `installed` (or `installed local only` if VPS is deferred until Plan 06-05 verification).

### Atomic commit message (covers tasks 4.1 + 4.2 only — checkpoint is not a code change)
```
feat(scratchpad): persona rules + one-shot live-config migration script

Append research-class scratchpad rule to agents/_template/CLAUDE.md so
future-created agents inherit it. New scripts/install-scratchpad-rules.sh
splices the right per-class block (research / draft / coordinator) into
each live persona file at ~/.claudeclaw/, with --dry-run and --revert
safety. The repo agents/{id}/CLAUDE.md paths are not edited because
src/agent-config.ts:78-88 reads ~/.claudeclaw/agents/{id}/CLAUDE.md
first; editing repo paths would no-op live behavior.

Refs SCRATCH-02.
```

---

## Plan 06-05 — Startup Sweep + End-to-End Verification (Wave 5) — **HAS CHECKPOINT**

**Requirement:** SCRATCH-05 (orphaned files aged out) + integration verification of SCRATCH-01..04.
**Autonomous: false** — final task is `checkpoint:human-verify` (controlled compaction trigger via Telegram).

### Read first
- `src/index.ts:206` — `cleanupOldUploads()` call site (the analog).
- `src/index.ts:170-205` — surrounding context (decay sweep, AGENT_ID-gated periodic; explains why scratchpad sweep does NOT need the gate).

### Tasks

#### Task 5.1 — Wire `cleanupOldScratchpads()` at startup
- **File:** `src/index.ts`.
- **Action:** Add `cleanupOldScratchpads();` immediately after the existing `cleanupOldUploads();` call at `src/index.ts:206`. Add the import: `import { cleanupOldScratchpads } from './scratchpad.js';` near the other `media`/util imports at the top of the file.
- **Why no AGENT_ID gate:** Each agent process owns its own scratchpads (filename includes `agentId`). Per-process startup sweep is sufficient because no two processes will race over the same file. This matches `cleanupOldUploads()` posture (also un-gated). Don't add a `setInterval` — startup-only is enough for a 24h TTL on a low-volume directory.
- **Avoid:**
  - Do NOT gate behind `MAIN_AGENT_ID === AGENT_ID` (per above — wrong semantics, would leave 5 processes' files un-swept).
  - Do NOT add a periodic interval. Cheap insurance, not a janitor process.
- **Verify:**
  - `npm run typecheck` clean.
  - `grep -n "cleanupOldScratchpads" src/index.ts` shows the import + the call.
  - Manual: `mkdir -p ~/.claudeclaw/scratch && touch -d '2 days ago' ~/.claudeclaw/scratch/old-file-test.md && npm run build && node dist/index.js --agent ezra` (Ctrl-C after init log) — log shows `Cleaned up old scratchpads { deleted: 1 }`. Restore by `touch ~/.claudeclaw/scratch/keepme.md` and re-running — should log nothing (file is fresh).
- **Done:** Sweep runs at every agent process startup, deletes scratchpads older than 24h, no errors on missing dir.

#### Task 5.2 — checkpoint:human-verify — controlled compaction trigger
- **Type:** `checkpoint:human-verify`.
- **What was built:** Scratchpad module, envelope injection at all 3 sites, retry-after-compaction at the bot layer, persona rules installed live, startup sweep wired.
- **How to verify (Noah runs this on VPS after deploy + persona-script run from Plan 06-04):**
  1. **Pre-check:** `ssh vps "ls ~/.claudeclaw/scratch/"` — should be empty or only contain unrelated old files.
  2. **Trigger compaction on Vera (research-class):** From Telegram, message Vera: `"Reverse-engineer the GHL workflows API the way Archie tried last week. Find every endpoint, payload shape, auth requirement, and rate limit. Don't stop until you have a complete reference document."` This is the same shape that triggered the 2026-05-11 incident.
  3. **Watch the live scratchpad:** `ssh vps "watch -n 2 'ls -la ~/.claudeclaw/scratch/ && tail -50 ~/.claudeclaw/scratch/vera-*.md 2>/dev/null'"`. Within ~3 tool calls, you should see the file get content appended (per the research-class rule).
  4. **Watch the agent log for compaction:** `ssh vps "sudo journalctl -fu claudeclaw-vera | grep -E 'compact_boundary|Compaction-recovery'"`. When the SDK auto-compacts, you'll see `'Context window compacted'`. If `result.text` came back empty, the next log line should be `'Compaction-recovery retry firing'`.
  5. **Read the Telegram reply.** PASS if it contains the actual GHL endpoint findings (URLs, payload shapes, headers). FAIL if it's a bare `formatEmptyReply` honest-failure message OR (the original bug) "Done. [sonnet]".
  6. **Verify lifecycle:** `ssh vps "ls ~/.claudeclaw/scratch/"` after the turn returns. The Vera scratchpad should be GONE if `subtype === 'success'`. If a scratchpad remains, check `~/.claudeclaw/scratch/vera-*.md` content — that's evidence the model was using it AND that the turn ended in non-success (worth capturing for the SUMMARY).
  7. **Repeat with Archie** for the same task (research-class). Both should behave identically.
  8. **Spot-check sweep:** `ssh vps "touch -d '2 days ago' ~/.claudeclaw/scratch/old-test.md && sudo systemctl restart claudeclaw-ezra && sleep 5 && ls ~/.claudeclaw/scratch/old-test.md"` — file should be gone (sweep ran).
  9. **Spot-check Cole/Poe (draft-class):** Ask Cole: `"Draft a 3-section LinkedIn post about ClaudeClaw shipping the scratchpad fix."` Watch `~/.claudeclaw/scratch/cole-*.md` — should accumulate sections, then disappear on success.
  10. **Spot-check Ezra (coordinator):** Ask Ezra a quick routing question (`"What's on my plate today?"`). Scratchpad file SHOULD NOT contain meaningful content beyond the header — coordinator rule says skip on light turns. File should still be created and deleted (lifecycle is wrapper-owned, not model-discretionary).
- **Resume signal:** Noah replies `verified — research / draft / coordinator / sweep all PASS` to ship the phase, OR lists which lane(s) failed for a follow-up plan.

### Atomic commit message (Task 5.1 only)
```
feat(scratchpad): sweep orphaned scratchpads at process startup

Mirrors src/index.ts:206 cleanupOldUploads posture — un-gated,
one-shot at startup, runs in every agent process. Per-process
ownership (agentId in filename) means no cross-process race.
24h TTL inherited from cleanupOldScratchpads default.

Refs SCRATCH-05.
```

---

## End-of-Phase Verification (rolls up SCRATCH-01..05)

After all 5 plans land + Noah's two checkpoints clear, the phase is DONE if:

| Requirement | Verifiable how |
|-------------|----------------|
| **SCRATCH-01** | `grep -n createScratchpad src/bot.ts src/orchestrator.ts` returns 3 sites; manual prompt envelope inspection shows `[Scratchpad — ...]` block with absolute path. |
| **SCRATCH-02** | `grep -l "## Scratchpad" ~/.claudeclaw/CLAUDE.md ~/.claudeclaw/agents/*/CLAUDE.md` returns 6 files; each contains the right per-class wording. |
| **SCRATCH-03** | Plan 06-05 Step 5 PASS: Vera/Archie reply contains research findings after compaction. Log shows `'Compaction-recovery retry firing'`. |
| **SCRATCH-04** | `git log -p src/bot.ts` shows `formatEmptyReply` is now downstream of `recoverFromCompactionIfNeeded` (warning fires inside the retry's continuation prompt, not after the user reply). |
| **SCRATCH-05** | Plan 06-05 Step 8 PASS: 2-day-old scratchpad gone after process restart. |

## Out of Scope (do NOT touch in this phase)
- `AGENT_MAX_TURNS` (deferred — band-aid, not solution).
- Per-agent turn budgets via `agent.yaml` (deferred phase).
- SDK engine swap (M4).
- Compaction-trigger threshold (Anthropic SDK config — not ours).
- "Compaction-survived" dashboard metric (CONTEXT defers as nice-to-have).
- Shared scratchpad across multiple turns of the same conversation (would require thread tracking — out of scope per CONTEXT).

## Source Audit
| Source item | Plan covering it |
|---|---|
| GOAL: research findings survive auto-compaction (ROADMAP M3 P6) | All 5 plans (end-to-end goal) |
| REQ SCRATCH-01 | 06-01, 06-02 |
| REQ SCRATCH-02 | 06-04 |
| REQ SCRATCH-03 | 06-03, 06-04 (persona rule tells model to Read post-compact) |
| REQ SCRATCH-04 | 06-03 |
| REQ SCRATCH-05 | 06-02 (delete on success), 06-05 (sweep orphans) |
| CONTEXT D-scratchpad-location | 06-01 (`SCRATCH_DIR = path.join(CLAUDECLAW_CONFIG, 'scratch')`, agent-name-first filename) |
| CONTEXT D-lifecycle | 06-02 (delete only on `subtype === 'success'`, leave on error) |
| CONTEXT D-sweep | 06-05 (startup sweep, no interval) |
| CONTEXT D-persona-rules-per-class | 06-04 (research/draft/coordinator wording locked above) |
| CONTEXT D-warning-ordering | 06-03 (retry-with-warning before `formatEmptyReply`) |
| CONTEXT D-path-injection | 06-02 (`[Scratchpad — ...]` envelope at all 3 sites) |
| CONTEXT discretion: persona-file approach | 06-04 (template + migration script — justified above) |
| CONTEXT discretion: retry-after-compaction in this phase or deferred | Built in Plan 06-03 (CONTEXT decision section explicitly includes warning ordering, which requires the retry; deferring would leave SCRATCH-04 unmet) |
| CONTEXT discretion: dashboard "recovered" surfacing | Deferred per CONTEXT (would bloat phase) |
| RESEARCH N/A | No RESEARCH.md for this phase — pattern map served the role |
| PATTERNS analog: src/media.ts → src/scratchpad.ts | 06-01 |
| PATTERNS analog: 3 envelope sites | 06-02 |
| PATTERNS analog: runAgentWithRetry shape | 06-03 |
| PATTERNS analog: cleanupOldUploads at index.ts:206 | 06-05 |
| PATTERNS analog: agents/_template/CLAUDE.md as the only repo persona | 06-04 |

**No unplanned items. No PHASE SPLIT recommended.** Total scope fits cleanly in 5 small plans, each ≤ 3 tasks, each producing one atomic commit (Plans 4 and 5 have a non-commit checkpoint task).

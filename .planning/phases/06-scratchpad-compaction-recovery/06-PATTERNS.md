# Phase 6: Scratchpad / Compaction Recovery — Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 3 modified (`src/agent.ts`, `src/bot.ts`, `src/config.ts`) + 6 persona CLAUDE.md files + 1 new module (scratchpad lifecycle/sweep)
**Analogs found:** 5 / 5 — every concern this phase introduces has a near-exact existing analog

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|----------------|---------------|
| **NEW** `src/scratchpad.ts` (path constants + create/delete/sweep) | utility | file-I/O + lifecycle | `src/media.ts` (`UPLOADS_DIR`, `cleanupOldUploads`) | **exact** — same shape, same lifetime semantics |
| `src/agent.ts` (compact_boundary loop + retry-after-compaction) | service | event-driven (SDK events) | existing `runAgentWithRetry` retry loop in same file (lines 450–510) | **exact** — already a retry harness; add new error category |
| `src/bot.ts` (Telegram path :637, dashboard path :1675, warning ordering) | controller | request-response | the two existing prompt-envelope assembly sites in `bot.ts` (`parts.push(...)` at :525-545 and :1655-1668) | **exact** — same place we'd inject the scratchpad system message |
| `src/config.ts` (any new env vars, e.g. `SCRATCHPAD_DIR`, `SCRATCHPAD_MAX_AGE_HOURS`) | config | static | existing `CLAUDECLAW_CONFIG` and `AGENT_MAX_TURNS` blocks (:147, :176) | **exact** — copy the env-read + default pattern verbatim |
| `agents/{ezra,vera,archie,cole,poe,hopper}/CLAUDE.md` (persona rules) | config | static | `agents/_template/CLAUDE.md` (only in-repo persona file) + `~/.claudeclaw/agents/{id}/CLAUDE.md` (where the live ones live) | **role-match** — see "Persona load path" below; this one needs the planner to be careful |
| Sweep registration on startup | wiring | event-driven | `src/index.ts:175` (decay sweep `setInterval`) and `src/index.ts:206` (`cleanupOldUploads()`) | **exact** |

---

## Persona load path — VERIFIED

The MEMORY note ("Ezra loads `~/.claudeclaw/CLAUDE.md`, NOT `agents/ezra/CLAUDE.md`") is **correct for the main agent only** and the rule generalizes differently for sub-agents. From `src/index.ts` and `src/agent-config.ts`:

| Agent | What gets read as system prompt | Source |
|-------|--------------------------------|--------|
| `ezra` (MAIN_AGENT_ID) | **`~/.claudeclaw/CLAUDE.md`** (the root file) | `src/index.ts:74-87` — main bot reads `path.join(CLAUDECLAW_CONFIG, 'CLAUDE.md')` |
| `vera`, `archie`, `cole`, `poe`, `hopper` | **`~/.claudeclaw/agents/{id}/CLAUDE.md`** if it exists, else `agents/{id}/CLAUDE.md` in repo | `src/agent-config.ts:78-88` `resolveAgentClaudeMd()` — checks external first, falls back to `PROJECT_ROOT/agents/{id}/CLAUDE.md` |

**Concrete consequences for the planner:**

1. The repo only ships `agents/_template/CLAUDE.md`. There are NO per-agent CLAUDE.md files in the repo (`find ... -name CLAUDE.md` returns just the template + `CLAUDE.md.example`).
2. Live persona files ARE at `~/.claudeclaw/agents/{ezra,vera,archie,cole,poe,hopper}/` (confirmed via `ls`). For ezra specifically, the persona file is `~/.claudeclaw/CLAUDE.md`, not `~/.claudeclaw/agents/ezra/CLAUDE.md` (which the loader doesn't even consult for the main agent).
3. The phase task says "modify `agents/ezra/CLAUDE.md`, ..., possibly `agents/_template/CLAUDE.md`". The planner should treat those repo paths as **wrong for live behavior** — edits there would not affect any running agent. The planner needs to either:
   - (a) Edit the live files at `~/.claudeclaw/CLAUDE.md` and `~/.claudeclaw/agents/{id}/CLAUDE.md`, **OR**
   - (b) Add the per-class rules to `agents/_template/CLAUDE.md` (so future-created agents get them) AND ship a one-shot migration / instructions for the user to splice the rules into existing `~/.claudeclaw/agents/*/CLAUDE.md` files.
4. There is no shared "rules" or partial that gets concatenated into all personas. Each `CLAUDE.md` is read whole. If we want one canonical rule block across all six, the cleanest move is a small included snippet (e.g. `<scratchpad-rule/>` placeholder the loader expands), but that's net-new infra. Simpler: just append the per-class block to each file once.

---

## Pattern Assignments

### `src/scratchpad.ts` (NEW — utility, file-I/O + lifecycle)

**Analog:** `src/media.ts` — same shape (constant for dir, ensure-dir on module load, lifecycle function, sweep function with `maxAgeMs`).

**Path constant + ensure-dir** — copy from `src/media.ts:11-15`:
```typescript
import { CLAUDECLAW_CONFIG } from './config.js';

export const SCRATCH_DIR = path.join(CLAUDECLAW_CONFIG, 'scratch');

// Ensure scratch dir exists on module load
fs.mkdirSync(SCRATCH_DIR, { recursive: true });
```
Same `mkdirSync(..., { recursive: true })` posture media.ts uses. Use `CLAUDECLAW_CONFIG` (already resolves `~/.claudeclaw`, respects the env override) — do NOT call `os.homedir()` directly. Voice.ts shows the same convention with `path.resolve(__dirname, '..', 'workspace', 'uploads')` for repo-local data; for per-user scratch we want `CLAUDECLAW_CONFIG`.

**Filename convention** — analog from `src/media.ts:119`:
```typescript
const localFilename = `${Date.now()}_${filename}`;
```
For scratchpads use `${agentId}-${chatId}-${Date.now()}.md` per CONTEXT decision. Same `Date.now()` timestamp posture.

**Sweep function** — copy from `src/media.ts:171-199` verbatim, retargeted:
```typescript
export function cleanupOldScratchpads(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  let entries: string[];
  try {
    entries = fs.readdirSync(SCRATCH_DIR);
  } catch {
    return;
  }
  const now = Date.now();
  let deleted = 0;
  for (const entry of entries) {
    const fullPath = path.join(SCRATCH_DIR, entry);
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(fullPath);
        deleted++;
      }
    } catch {
      // Skip files we can't stat or delete
    }
  }
  if (deleted > 0) {
    logger.info({ deleted, dir: SCRATCH_DIR }, 'Cleaned up old scratchpads');
  }
}
```
Same `try { stat } catch { skip }` posture, same logger shape, same default `24 * 60 * 60 * 1000`. Don't reinvent.

**Per-turn create + delete** — best precedent is `src/media.ts:66` for the unlink-on-error pattern (`fs.unlink(dest, () => { /* ignore cleanup error */ })`) and PID lifecycle in `src/index.ts:109-125` (`acquireLock` / `releaseLock`):
```typescript
// Create
export function createScratchpad(agentId: string, chatId: string): string {
  const file = path.join(SCRATCH_DIR, `${agentId}-${chatId}-${Date.now()}.md`);
  fs.writeFileSync(file, `# Scratchpad for ${agentId} / chat ${chatId}\n\n`, 'utf-8');
  return file;
}

// Delete (best-effort, never throw)
export function deleteScratchpad(file: string): void {
  try { fs.unlinkSync(file); } catch { /* ignore — sweep will get it */ }
}
```
`releaseLock()` at `src/index.ts:123-125` is the exact `try { fs.unlinkSync } catch { ignore }` shape.

---

### `src/agent.ts` (modified — service, event-driven)

**Compact-boundary detection already exists** at `src/agent.ts:298-306`:
```typescript
if (ev['type'] === 'system' && ev['subtype'] === 'compact_boundary') {
  didCompact = true;
  const meta = ev['compact_metadata'] as { trigger: string; pre_tokens: number } | undefined;
  preCompactTokens = meta?.pre_tokens ?? null;
  logger.warn({ trigger: meta?.trigger, preCompactTokens }, 'Context window compacted');
}
```
**Don't add a parallel detector.** The phase needs to pipe `didCompact` + `resultText === null/empty` out of the loop (already happens via `UsageInfo.didCompact` and the returned `text`) and re-enter the loop with a continuation prompt.

**Retry harness analog** — `runAgentWithRetry` at `src/agent.ts:450-510`:
- Existing pattern: `for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) { try { return await runAgent(...) } catch (err) { ... } }`
- It branches on `err.recovery.shouldRetry` from classified `AgentError`.
- The compaction-recovery loop should sit **at this layer**, not inside `runAgent`. After `runAgent` returns, check `result.usage?.didCompact && (!result.text || result.text.trim() === '')`, and if so, re-call `runAgent` once with the same `sessionId` (the SDK preserves the post-compaction context) plus a continuation prompt that injects the scratchpad path and tells the model to re-Read it.
- Use `MAX_RETRIES = 1` for compaction-recovery (CONTEXT decision: max 1 retry). Don't reuse the existing `MAX_RETRIES = 2` constant — they have different semantics.

**Where to inject the scratchpad system message into the prompt envelope:**
The agent loop itself (`runAgent`) takes `message: string` — the assembled envelope. The injection happens at the **caller** (`bot.ts`), which already does prompt assembly. See next section.

---

### `src/bot.ts` (modified — controller, request-response)

**Two existing prompt-envelope assembly sites** — these are where the scratchpad path gets injected:

**Telegram path** (`src/bot.ts:521-546`):
```typescript
const sessionId = getSession(chatIdStr, AGENT_ID);
const { contextText: memCtx, ... } = await buildMemoryContext(chatIdStr, message, AGENT_ID);
const parts: string[] = [];
if (agentSystemPrompt && !sessionId) parts.push(`[Agent role — follow these instructions]\n${agentSystemPrompt}\n[End agent role]`);
if (memCtx) parts.push(memCtx);
// ... recent task context, memory nudge ...
parts.push(message);
const fullMessage = parts.join('\n\n');
```

**Dashboard path** (`src/bot.ts:1652-1669`):
```typescript
const sessionId = getSession(chatIdStr, AGENT_ID);
const { contextText: memCtx, ... } = await buildMemoryContext(chatIdStr, text, AGENT_ID);
const dashParts: string[] = [];
if (agentSystemPrompt && !sessionId) dashParts.push(`[Agent role — follow these instructions]\n${agentSystemPrompt}\n[End agent role]`);
if (memCtx) dashParts.push(memCtx);
// ... recent task context ...
dashParts.push(text);
const fullMessage = dashParts.join('\n\n');
```

**Plus a third site** in `src/orchestrator.ts:189-197` (cross-agent delegation). Same `[Agent role — follow these instructions]\n...\n[End agent role]` envelope pattern. If sub-agent delegations should also get scratchpads (probably yes, since Vera/Archie research often goes through delegation), inject there too.

**Pattern to copy for the scratchpad system message** (matches the existing `[label — body]\n[End label]` envelope style used everywhere):
```typescript
const scratchpadPath = createScratchpad(AGENT_ID, chatIdStr);
parts.push(
  `[Scratchpad — append findings here so they survive context compaction]\n` +
  `Your scratchpad for this turn is ${scratchpadPath}. ` +
  `Use the Write tool to append findings. After context compaction, Read it back.\n` +
  `[End scratchpad]`
);
```

**Empty-reply handling** (`src/bot.ts:90-106`, `:671`, `:1709`) — `formatEmptyReply()` is the single place to retire if compaction-recovery succeeds. CONTEXT decision is to fire the warning to the model in a continuation prompt (in `runAgent` caller) BEFORE the empty-reply fallback runs. So the order becomes:
1. `runAgent` returns with `didCompact=true && empty`.
2. Caller detects this, builds continuation prompt with scratchpad path, calls `runAgent` again with same `sessionId`.
3. Only if the retry ALSO comes back empty does `formatEmptyReply` get called.

The "warn user about compaction" string at `src/bot.ts:783-785` (`'Context compacted multiple times this session...'`) and `src/bot.ts:115-117` (`checkContextWarning`'s `didCompact` branch) stay — they're useful tail-end signals, not the primary recovery path.

**Lifecycle wiring** — wrap the `runAgent` call site (and its retry) in try/finally:
```typescript
const scratchpadPath = createScratchpad(AGENT_ID, chatIdStr);
try {
  const result = await runAgentWithRetry(/* ... fullMessage with path injected ... */);
  // delete only on success subtype (CONTEXT decision)
  if (result.usage?.subtype === 'success') {
    deleteScratchpad(scratchpadPath);
  }
  // else leave it — next turn or sweep handles it
  // ... existing handling ...
} catch (err) {
  // leave file in place on error so a retry/sweep can use it
  throw err;
}
```
The existing `try { ... } finally { clearInterval(typingInterval); }` shape inside `runAgent` (`src/agent.ts:241-430`) shows the project's convention for "always run cleanup, even on throw." Use the same shape but at the bot.ts layer where the scratchpad is owned.

---

### `src/config.ts` (modified — config, static)

**Existing analog** — env-read with default + optional override:
- `CLAUDECLAW_CONFIG` at `:146-153` is the exact shape if you want a `SCRATCHPAD_DIR` override (probably not needed — `path.join(CLAUDECLAW_CONFIG, 'scratch')` is enough).
- `AGENT_MAX_TURNS` at `:176-179` is the shape for a tunable like `SCRATCHPAD_MAX_AGE_HOURS`:
```typescript
export const SCRATCHPAD_MAX_AGE_HOURS = parseInt(
  process.env.SCRATCHPAD_MAX_AGE_HOURS || envConfig.SCRATCHPAD_MAX_AGE_HOURS || '24',
  10,
);
```
And add the var name to the `readEnvFile([...])` array at `:7-42`. Same posture as every other tunable in this file. Boolean toggles use the `(... || 'true').toLowerCase() === 'true'` form (see `SMART_ROUTING_ENABLED` at `:240-241`).

**Don't add a new `SCRATCHPAD_ENABLED` toggle.** This phase is small and the lifecycle is cheap; a kill switch is over-engineering. If we ever need one, the `kill-switches.ts` `requireEnabled('LLM_SPAWN_ENABLED')` pattern at `src/agent.ts:216` is the right precedent.

---

### Persona files (modified — config, static)

**Analog:** `agents/_template/CLAUDE.md` (the ONLY in-repo persona file). It already has structured `## Rules` sections and per-action narrative. Pattern to copy is "section heading + 2–4 sentence rule + a do-not list."

**Concrete excerpt to mirror** (`agents/_template/CLAUDE.md:105-109`):
```markdown
## Rules
- You have access to all global skills in ~/.claude/skills/
- Keep responses tight and actionable
- Use /model opus if a task is too complex for your default model
- Log meaningful actions to the hive mind
```

**Per-class rule blocks** — the planner should write three short `## Scratchpad` sections (research-class, draft-class, coordinator-class) per CONTEXT decision and append the right one to each persona file. Wording belongs to the planner; suggested skeleton:

```markdown
## Scratchpad

Each turn you get a scratch file at the path injected via `[Scratchpad — ...]` in your prompt.

[per-class trigger rule — see CONTEXT.md "Persona Prompt Rules"]

If your context resets mid-turn, Read the scratchpad before continuing.
```

**See "Persona load path — VERIFIED" above** for which files actually get loaded. Editing repo `agents/{id}/CLAUDE.md` files for ezra/vera/archie/cole/poe/hopper is a no-op for any currently running agent; the planner needs to either edit the live `~/.claudeclaw/...` files or document the splice for the user.

---

### Sweep registration (wiring — event-driven)

**Analog 1** — `src/index.ts:206`:
```typescript
cleanupOldUploads();
```
One-shot at startup, no interval. Cheap, runs in every process (main + every specialist).

**Analog 2** — `src/index.ts:175`:
```typescript
setInterval(() => { runDecaySweep(); cleanupOldMissionTasks(7); }, 24 * 60 * 60 * 1000);
```
Periodic, gated to `AGENT_ID === MAIN_AGENT_ID` to avoid multi-process overlap.

**Recommendation for scratchpad sweep:** copy the `cleanupOldUploads()` posture (one-shot at startup, no interval, runs in every process). Per-process startup sweep is sufficient because each agent process owns its own scratchpads (filename includes `agentId`), so there's no cross-process duplicate-cleanup risk. Add one line near `cleanupOldUploads()` at `src/index.ts:206`:
```typescript
cleanupOldUploads();
cleanupOldScratchpads();
```

---

## Shared Patterns

### File path convention
**Source:** `src/config.ts:139-153` (`expandHome`, `CLAUDECLAW_CONFIG`)
**Apply to:** scratchpad path constant
**Rule:** never call `os.homedir()` or hardcode `~/.claudeclaw` — always go through `CLAUDECLAW_CONFIG` so `CLAUDECLAW_CONFIG=/some/test/dir` overrides work in tests (`src/avatars.test.ts:41` and `src/warroom-text-orchestrator.test.ts:10` both use this override). This is project policy.

### Best-effort file lifecycle
**Source:** `src/index.ts:123-125` (releaseLock), `src/media.ts:66`, `src/media.ts:182-194`
**Apply to:** scratchpad delete + sweep
**Rule:** every `fs.unlinkSync` and `fs.statSync` in a cleanup path is wrapped in `try { ... } catch { /* ignore */ }`. Never let cleanup throw.

### Prompt envelope labels
**Source:** `src/bot.ts:526`, `src/bot.ts:537`, `src/bot.ts:1656`, `src/orchestrator.ts:191`
**Apply to:** scratchpad system message injection
**Rule:** every injected context block uses `[Label — short description]\n<body>\n[End label]` so the model can visually segment them. Match this format for the scratchpad block.

### Compaction signal flow
**Source:** `src/agent.ts:298-306` (detect), `src/agent.ts:386` (propagate via `UsageInfo.didCompact`), `src/db.ts:1757-1764` (persist), `src/bot.ts:115` (warn user), `src/bot.ts:775-786` (track repeats)
**Apply to:** retry-after-compaction loop
**Rule:** the signal already flows end-to-end. Only thing missing is the **retry** step in between "detect" and "warn user". Insert it at the bot.ts layer (where session state and prompt assembly live), not inside `runAgent`.

---

## No Analog Found

No file lacks an analog. The closest miss is the persona-rule distribution mechanism — there's no existing "shared partial included into every persona file" pattern, but copy-paste-per-persona is the established convention and is fine for six files.

---

## Metadata

**Analog search scope:** `src/`, `agents/`, `~/.claudeclaw/`
**Files scanned:** ~25 source files; full reads of `src/agent.ts`, `src/bot.ts` (relevant sections), `src/config.ts`, `src/agent-config.ts`, `src/index.ts`, `src/media.ts`, `agents/_template/CLAUDE.md`
**Pattern extraction date:** 2026-05-11

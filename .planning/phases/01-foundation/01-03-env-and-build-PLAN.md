---
phase: 01-foundation
plan: 03
type: execute
wave: 2
depends_on: [01]
files_modified:
  - .env
external_paths:
  - node_modules/
  - dist/
autonomous: false
requirements: [FOUN-03, FOUN-04]
tags: [env, build, setup, dependencies, typescript]

must_haves:
  truths:
    - ".env exists at repo root with all D-10 required keys populated (non-blank for core keys)"
    - "No ANTHROPIC_API_KEY line has a value (local uses OAuth per D-09)"
    - "No WARROOM_ENABLED=true or SLACK_USER_TOKEN entries present"
    - "npm install completed — node_modules/ exists"
    - "npm run build completed — dist/index.js exists"
    - "tsc compiles with zero errors"
  artifacts:
    - path: ".env"
      provides: "Runtime config for Phase 1 bot + dashboard + optional features"
      contains: "TELEGRAM_BOT_TOKEN="
    - path: "dist/index.js"
      provides: "Compiled bot entry point (npm start runs this)"
    - path: "node_modules/@anthropic-ai/claude-agent-sdk"
      provides: "Claude Agent SDK installed (core dependency)"
  key_links:
    - from: "scripts/setup.ts"
      to: ".env"
      via: "Interactive wizard — auto-generates DASHBOARD_TOKEN, DB_ENCRYPTION_KEY; prompts for TELEGRAM_BOT_TOKEN, ALLOWED_CHAT_ID, GOOGLE_API_KEY, GROQ_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID"
      pattern: "fs.writeFileSync(envPath, lines.join"
    - from: ".env"
      to: "src/config.ts readEnvFile()"
      via: "Explicit key list in envConfig"
      pattern: "readEnvFile\\(\\["
---

<objective>
Run the existing `scripts/setup.ts` wizard to populate `.env` with the Phase 1 key set per D-10, install npm dependencies, and compile the TypeScript project so `dist/index.js` exists and is runnable. This satisfies FOUN-03 (dependencies installed + TypeScript compiles) and FOUN-04 (.env configured with all required vars).

Purpose: Implement D-10 (Phase 1 .env key set), D-09 (no ANTHROPIC_API_KEY — local uses `claude login` OAuth), D-11 (single ALLOWED_CHAT_ID), D-12 (voice keys wired but not validated), D-13 (use existing wizard, do NOT write a new flow). Phase 1 success for dashboard (Plan 04) and Telegram (Plan 05) both depend on a working build + valid .env.

Output: `.env` at repo root with D-10 keys populated, `node_modules/` installed, `dist/index.js` built.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation/01-CONTEXT.md
@scripts/setup.ts
@src/config.ts
@package.json

<interfaces>
<!-- .env schema enforced by src/config.ts readEnvFile(). Full list of keys config.ts reads: -->
<!-- TELEGRAM_BOT_TOKEN, ALLOWED_CHAT_ID, GROQ_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, -->
<!-- WHATSAPP_ENABLED, SLACK_USER_TOKEN, CONTEXT_LIMIT, DASHBOARD_PORT, DASHBOARD_TOKEN, DASHBOARD_URL, -->
<!-- CLAUDECLAW_CONFIG, DB_ENCRYPTION_KEY, GOOGLE_API_KEY, AGENT_TIMEOUT_MS, AGENT_MAX_TURNS, -->
<!-- SECURITY_PIN_HASH, IDLE_LOCK_MINUTES, EMERGENCY_KILL_PHRASE, MODEL_FALLBACK_CHAIN, -->
<!-- SMART_ROUTING_ENABLED, SMART_ROUTING_CHEAP_MODEL, SHOW_COST_FOOTER, DAILY_COST_BUDGET, -->
<!-- HOURLY_TOKEN_BUDGET, MEMORY_NUDGE_INTERVAL_TURNS, MEMORY_NUDGE_INTERVAL_HOURS, -->
<!-- EXFILTRATION_GUARD_ENABLED, PROTECTED_ENV_VARS, WARROOM_ENABLED, WARROOM_PORT, STREAM_STRATEGY -->

<!-- Phase 1 minimum key set (D-10, distilled): -->
<!-- TELEGRAM_BOT_TOKEN, ALLOWED_CHAT_ID, DASHBOARD_TOKEN, DB_ENCRYPTION_KEY, DASHBOARD_PORT=3141, -->
<!-- GOOGLE_API_KEY, GROQ_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, CLAUDECLAW_CONFIG=~/.claudeclaw -->
<!-- Explicitly NOT SET: ANTHROPIC_API_KEY, WARROOM_ENABLED=true, SLACK_USER_TOKEN -->

<!-- Wizard flow (scripts/setup.ts) sequence the executor will follow in Task 2: -->
<!-- 1. Intro + "Ready to continue?" → Y -->
<!-- 2. System checks (Node 20+, Claude CLI, git config, build) -->
<!-- 3. Feature selection: Voice input Y, Voice output Y, Video analysis Y, War Room N, WhatsApp N -->
<!-- 4. CLAUDECLAW_CONFIG path → default ~/.claudeclaw (Plan 02 already created it) -->
<!-- 5. Skills section (informational) -->
<!-- 6. Telegram bot token → Noah pastes TOKEN from Plan 05 BotFather registration IF already registered; -->
<!--    otherwise the wizard is re-run after Plan 05. Task 2 notes this handshake. -->
<!-- 7. ALLOWED_CHAT_ID auto-detect (requires bot token to work; if skipped, Plan 05 backfills) -->
<!-- 8. Security: PIN (skip per D-10 — optional), kill phrase (auto-generated — fine) -->
<!-- 9. Voice keys: GROQ_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID → Noah pastes -->
<!-- 10. Google key → Noah pastes GOOGLE_API_KEY -->
<!-- 11. Claude API key → SKIP (press Enter) — D-09 -->
<!-- 12. Writes .env -->
<!-- 13. Auto-start service → SKIP (Phase 1 does not deploy launchd — per phase boundary) -->
<!-- 14. Specialist agents → SKIP ("done" immediately) — Phase 4 -->
<!-- 15. "Start the bot now?" → N (Plan 04 handles start + health check) -->

<!-- Build: `npm run build` → tsc → dist/index.js. The wizard runs build in system checks if dist/ missing. -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install npm dependencies</name>
  <files>package-lock.json (if absent, npm install creates it)</files>
  <read_first>
    - package.json (confirm Node engines ≥ 20 requirement and dependency list)
  </read_first>
  <action>
    From repo root (/Users/nwessel/ClaudeCode/claudeclaw-os), run:
    ```
    npm install
    ```
    Do NOT use `npm ci` (lockfile may not exist yet or may be out of sync after upstream churn). If `npm install` reports peer-dep warnings for optional dependencies (puppeteer, warroom Python bindings), those are acceptable. Hard errors (missing modules, incompatible Node version) are blocking.

    Verify Node version is ≥ 20 before install:
    ```
    node --version
    ```
    Expected: `v20.x.x` or higher. If not, STOP and surface to Noah (this is a system prereq Phase 1 cannot auto-fix).
  </action>
  <verify>
    <automated>node --version | awk -F. '{gsub(/v/,"",$1); exit ($1+0 >= 20) ? 0 : 1}' && test -d node_modules && test -d node_modules/@anthropic-ai/claude-agent-sdk && test -d node_modules/grammy && test -d node_modules/hono && test -d node_modules/better-sqlite3 && test -f node_modules/.package-lock.json</automated>
  </verify>
  <acceptance_criteria>
    - `node --version` major >= 20
    - `test -d node_modules` passes
    - `test -d node_modules/@anthropic-ai/claude-agent-sdk` passes (Claude Agent SDK installed)
    - `test -d node_modules/grammy` passes (Telegram bot framework)
    - `test -d node_modules/hono` passes (dashboard HTTP framework)
    - `test -d node_modules/better-sqlite3` passes (SQLite bindings built)
    - `test -f package-lock.json` passes
    - `npm ls --depth=0 --omit=dev 2>/dev/null | grep -q '@anthropic-ai/claude-agent-sdk@'` returns 0
  </acceptance_criteria>
  <done>Dependencies installed, lockfile generated, critical runtime packages present.</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 2: Run npm run setup wizard interactively</name>
  <what-built>`npm install` completed (Task 1). Now Noah drives the existing `scripts/setup.ts` wizard to populate `.env` with D-10 keys. The wizard prompts for several values only Noah can provide (voice keys from his ElevenLabs / Groq accounts, Google API key, Telegram bot token). Per D-13, we do NOT replace or skip this wizard.</what-built>
  <how-to-verify>
    Noah, from the repo root, run:
    ```
    npm run setup
    ```
    Answer the prompts EXACTLY as follows (per CONTEXT.md D-09, D-10, D-11, D-12):

    | Prompt | Answer |
    |---|---|
    | "Ready to continue?" | **Y** |
    | System checks — Node/Claude CLI/Git/Build | Let them pass. If build fails, STOP and report. |
    | "Voice input? (send voice messages instead of typing)" | **Y** (enables GROQ_API_KEY prompt — D-12) |
    | "Voice output? (the bot talks back to you)" | **Y** (enables ELEVENLABS_* prompts — D-12) |
    | "Video analysis?" | **Y** (enables GOOGLE_API_KEY prompt — D-10 Gemini) |
    | "War Room?" | **N** (Out of Scope per PROJECT.md + Deferred) |
    | "WhatsApp bridge?" | **N** (Out of Scope) |
    | Config directory | **Enter** (keeps `~/.claudeclaw` — Plan 02 already created it) |
    | CLAUDE.md personalization note | Read, continue |
    | "Paste your bot token" | **Paste TELEGRAM_BOT_TOKEN from BotFather registration (Plan 05 handles registration if not done yet)**. If you have not registered `@ezra_claudeclaw_bot` yet, skip by Ctrl+C, run Plan 05 first, then re-run `npm run setup`. |
    | "Ready? Send a message to your bot" | Open Telegram, message `@ezra_claudeclaw_bot`, reply **Y**. Wizard auto-detects ALLOWED_CHAT_ID. |
    | "Choose a PIN" | **Enter** to skip (PIN optional per D-10) |
    | "Kill phrase" | **Enter** to accept auto-generated (fine per D-10) |
    | "Groq API key" | **Paste GROQ_API_KEY from console.groq.com** (D-10 voice input) |
    | "ElevenLabs API key" | **Paste ELEVENLABS_API_KEY from elevenlabs.io** |
    | "ElevenLabs Voice ID" | **Paste ELEVENLABS_VOICE_ID** (the string ID from Voice Lab, not the name) |
    | "Google API key" | **Paste GOOGLE_API_KEY from aistudio.google.com** |
    | "Anthropic API key — optional" | **Enter to skip** (D-09: local uses `claude login` OAuth, NOT API key) |
    | Auto-start service prompt | **N** (Phase 1 does not deploy launchd — Phase 7 scope) |
    | "Set up specialist agents?" | **N** (Phase 4 scope) |
    | "Start the bot now?" | **N** (Plan 04 handles start + health check) |

    After the wizard completes, `.env` exists at repo root with all D-10 keys populated. Reply **done** to unblock Task 3 verification.
  </how-to-verify>
  <resume-signal>Reply "done" once the setup wizard has exited cleanly and .env exists. Reply "blocked: {reason}" if any prompt cannot be answered (e.g., missing account).</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Verify .env contents match D-10 and ensure build is current</name>
  <files>.env (read-only verification — no modifications unless Task 3b remediation required)</files>
  <read_first>
    - .env (post-wizard contents)
    - .planning/phases/01-foundation/01-CONTEXT.md (D-09, D-10, D-11, D-12)
    - src/config.ts lines 7-40 (env key schema)
  </read_first>
  <action>
    Validate `.env` against D-10 specification. Run the following checks (fail fast — any missing required key = STOP and surface to Noah to re-run wizard):

    1. Required keys present + non-empty (core):
       - `TELEGRAM_BOT_TOKEN` — any non-empty value
       - `ALLOWED_CHAT_ID` — numeric string
       - `DASHBOARD_TOKEN` — hex string, length ≥ 48 chars (wizard generates 24 bytes = 48 hex)
       - `DB_ENCRYPTION_KEY` — hex string, length 64 chars (32 bytes)
       - `DASHBOARD_PORT=3141` (exact)
       - `CLAUDECLAW_CONFIG` — expands to absolute path of `~/.claudeclaw`

    2. Required keys present + non-empty (voice + video per D-10/D-12):
       - `GOOGLE_API_KEY`
       - `GROQ_API_KEY`
       - `ELEVENLABS_API_KEY`
       - `ELEVENLABS_VOICE_ID`

    3. Absence checks (D-09 + CONTEXT.md Deferred):
       - `ANTHROPIC_API_KEY=` line either absent OR present with empty value (`ANTHROPIC_API_KEY=`)
       - `WARROOM_ENABLED=true` NOT present (may appear as `# WARROOM_ENABLED=false` comment — that's fine)
       - `SLACK_USER_TOKEN=` with a value NOT present

    4. `.env` must not be tracked by git:
       `git check-ignore .env` should exit 0 (file is gitignored)
       `git ls-files --error-unmatch .env 2>/dev/null` should exit nonzero (file not tracked)

    5. Build is current. Run build explicitly to make sure dist/ matches src/ after any wizard-triggered updates:
       ```
       npm run build
       ```
       Exit code must be 0. `dist/index.js` must exist.

    If any check fails with missing D-10 keys, do NOT hand-edit `.env`. Instead surface back to Noah with the missing key name and have him re-run `npm run setup`.

    If only the absence checks fail (e.g., ANTHROPIC_API_KEY has a value), edit `.env` directly to clear that line (set to `ANTHROPIC_API_KEY=` with empty value). Do not touch any other line.
  </action>
  <verify>
    <automated>test -f .env && grep -q '^TELEGRAM_BOT_TOKEN=..*' .env && grep -q '^ALLOWED_CHAT_ID=[0-9]' .env && grep -q '^DASHBOARD_TOKEN=[a-f0-9]\{48,\}' .env && grep -q '^DB_ENCRYPTION_KEY=[a-f0-9]\{64\}' .env && grep -q '^DASHBOARD_PORT=3141' .env && grep -q '^GOOGLE_API_KEY=..*' .env && grep -q '^GROQ_API_KEY=..*' .env && grep -q '^ELEVENLABS_API_KEY=..*' .env && grep -q '^ELEVENLABS_VOICE_ID=..*' .env && ! grep -q '^ANTHROPIC_API_KEY=..*' .env && ! grep -q '^WARROOM_ENABLED=true' .env && ! grep -q '^SLACK_USER_TOKEN=..*' .env && git check-ignore .env && npm run build && test -f dist/index.js</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c '^TELEGRAM_BOT_TOKEN=..*' .env` returns `1` (key present, non-empty)
    - `grep -Pq '^ALLOWED_CHAT_ID=-?\d+$' .env` returns 0 (numeric chat ID; may be negative for groups but Noah uses personal DM so expect positive integer)
    - `grep -Pq '^DASHBOARD_TOKEN=[a-f0-9]{48,}$' .env` returns 0 (≥ 48 hex chars)
    - `grep -Pq '^DB_ENCRYPTION_KEY=[a-f0-9]{64}$' .env` returns 0 (exactly 64 hex chars = 32 bytes)
    - `grep -c '^DASHBOARD_PORT=3141$' .env` returns `1`
    - `grep -c '^GOOGLE_API_KEY=..*' .env` returns `1`
    - `grep -c '^GROQ_API_KEY=..*' .env` returns `1`
    - `grep -c '^ELEVENLABS_API_KEY=..*' .env` returns `1`
    - `grep -c '^ELEVENLABS_VOICE_ID=..*' .env` returns `1`
    - `grep -c '^ANTHROPIC_API_KEY=..*' .env` returns `0` (empty-value line OK, non-empty forbidden — D-09)
    - `grep -c '^WARROOM_ENABLED=true' .env` returns `0`
    - `grep -c '^SLACK_USER_TOKEN=..*' .env` returns `0`
    - `git check-ignore .env` exits 0 (.env is gitignored)
    - `git ls-files .env` output is empty (file not tracked)
    - `npm run build` exits 0
    - `test -f dist/index.js` passes
    - `node --check dist/index.js` exits 0 (syntactically valid JavaScript)
    - No TypeScript errors: `npm run typecheck` exits 0
  </acceptance_criteria>
  <done>.env matches D-10 spec, OAuth-only auth confirmed (no ANTHROPIC_API_KEY), no deferred keys leaked, npm run build completes with zero errors, dist/index.js exists.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| BotFather/3rd-party consoles → .env | API tokens for Telegram, Groq, ElevenLabs, Google cross into local filesystem. |
| .env → source control | .env must NEVER be staged or committed (gitignored). |
| process.env → arbitrary dependencies | Secrets never loaded into process.env; readEnvFile() keeps them scoped. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-09 | Information disclosure | .env committed to git | mitigate | Acceptance `git check-ignore .env` must exit 0; `git ls-files .env` must be empty. Existing .gitignore contains .env (verify). |
| T-01-10 | Information disclosure | Secrets logged by setup.ts | accept | Wizard prints ok/warn status only; does not echo token values. Source-verified. |
| T-01-11 | Tampering | DB_ENCRYPTION_KEY weak entropy | mitigate | Wizard uses `crypto.randomBytes(32)` — 256 bits. Acceptance checks 64-hex-char length. |
| T-01-12 | Elevation of privilege | ANTHROPIC_API_KEY leak path on local Mac | mitigate | D-09: no ANTHROPIC_API_KEY in Phase 1 .env. Absence explicitly asserted in acceptance criteria. |
| T-01-13 | Spoofing | Invalid TELEGRAM_BOT_TOKEN | mitigate | Wizard calls `https://api.telegram.org/bot{TOKEN}/getMe`; Plan 05 re-verifies on send. |
| T-01-14 | Tampering | Build cache stale vs .env changes | mitigate | Task 3 runs `npm run build` after .env write to ensure dist/ is current. |
</threat_model>

<verification>
- `.env` exists at repo root with D-10 keys populated (core + voice + gemini)
- No `ANTHROPIC_API_KEY=<value>` line (D-09 — OAuth only locally)
- No `WARROOM_ENABLED=true` or `SLACK_USER_TOKEN=<value>` (deferred scope)
- `.env` is gitignored and not tracked
- `npm install` completed, `node_modules/` populated
- `npm run build` exits 0; `dist/index.js` exists and passes `node --check`
- `npm run typecheck` exits 0
</verification>

<success_criteria>
FOUN-03 satisfied: npm dependencies installed, TypeScript compiles without errors.
FOUN-04 satisfied: .env configured with all required Phase 1 vars per D-10 (bot token, ALLOWED_CHAT_ID, DASHBOARD_TOKEN, DB_ENCRYPTION_KEY, voice keys, Gemini key). Note: FOUN-04 original text mentions `ANTHROPIC_API_KEY` — D-09 explicitly omits this locally; Phase 7 will add for VPS. Plan summary must document this divergence.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-03-SUMMARY.md` noting: exact .env key set written, ANTHROPIC_API_KEY divergence from FOUN-04 text (D-09 rationale), any wizard handshake with Plan 05 (who ran first).
</output>

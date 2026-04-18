---
phase: 01-foundation
plan: 05
type: execute
wave: 4
depends_on: [02, 03, 04]
files_modified:
  - .env
external_paths:
  - /tmp/claudeclaw-phase1-bot.log
autonomous: false
requirements: [FOUN-06]
tags: [telegram, botfather, runtime-verification, foundation]

must_haves:
  truths:
    - "A permanent BotFather bot is registered with handle @ezra_claudeclaw_bot (or the documented _io fallback if taken)"
    - ".env TELEGRAM_BOT_TOKEN matches the registered bot's token (Telegram API /getMe returns the same username)"
    - ".env ALLOWED_CHAT_ID equals Noah's personal Telegram chat ID (single value per D-11)"
    - "A test message from Noah's allowed chat produces a reply from the bot in the same chat"
    - "Plan 05 runs strictly AFTER Plan 04 — no concurrent binding of port 3141"
  artifacts:
    - path: ".env"
      provides: "TELEGRAM_BOT_TOKEN + ALLOWED_CHAT_ID for main bot"
      contains: "TELEGRAM_BOT_TOKEN="
    - path: "/tmp/claudeclaw-phase1-bot.log"
      provides: "Bot runtime log capturing message handling during verification"
      contains: "message"
    - path: ".planning/phases/01-foundation/01-05-bot-identity.txt"
      provides: "Persistent record of registered bot username + user_id + chat ID"
      contains: "bot_username"
  key_links:
    - from: "@ezra_claudeclaw_bot (BotFather)"
      to: ".env TELEGRAM_BOT_TOKEN"
      via: "Token pasted into setup wizard (Plan 03 Task 2) or directly into .env (Task 2 here)"
      pattern: "getMe.username matches ^ezra_claudeclaw(_io)?_bot$"
    - from: "Noah's Telegram DM"
      to: ".env ALLOWED_CHAT_ID"
      via: "Single numeric chat ID (D-11)"
      pattern: "ALLOWED_CHAT_ID=\\d+"
    - from: "npm start (src/index.ts)"
      to: "Telegram Bot API"
      via: "grammy Bot instance polling getUpdates"
      pattern: "Telegram bot started"
---

<objective>
Register the permanent main Telegram bot at the handle targeted by D-06, ensure its token lives in .env under TELEGRAM_BOT_TOKEN (D-08), confirm Noah's personal Telegram DM chat ID is stored as ALLOWED_CHAT_ID (D-11), then start ClaudeClaw and prove FOUN-06 by exchanging a real test message.

Purpose: This is the Phase 1 acceptance test for FOUN-06. The bot handle is intentionally permanent (D-06) — no throwaway dev bot. Naming convention from D-07 is established here so Phase 4 specialists can follow it.

Concurrency note: Plans 04 and 05 both bind port 3141. This plan's `depends_on: [02, 03, 04]` and `wave: 4` force strict sequential execution — Plan 05 cannot run until Plan 04 releases the port.

Output: The permanent bot registered on BotFather, .env populated with token + chat ID, proof-of-reply captured as artifacts under .planning/phases/01-foundation/.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation/01-CONTEXT.md
@src/config.ts
@scripts/setup.ts

<interfaces>
Telegram API /getMe response shape used for validation:
  GET https://api.telegram.org/bot{TOKEN}/getMe
  Returns JSON { ok: true, result: { id, is_bot, first_name, username, ... } }

src/config.ts exports ALLOWED_CHAT_ID as a single string value. Runtime enforces the allowlist in src/index.ts via grammy middleware that compares ctx.chat.id against the env value.

BotFather registration flow (Telegram UI, no CLI):
  1. Open Telegram, DM @BotFather
  2. Send /newbot
  3. Display name prompt: reply "Ezra"
  4. Username prompt: reply "ezra_claudeclaw_bot" (D-06 target; must end in _bot)
     Fallback if taken: "ezra_claudeclaw_io_bot" per CONTEXT.md specifics (exactly one _io variant)
  5. BotFather returns a token of form "123456789:AAF..." — copy it

Accepted username regex (tightened per revision): `^ezra_claudeclaw(_io)?_bot$`
This accepts exactly two values: `ezra_claudeclaw_bot` OR `ezra_claudeclaw_io_bot`. Anything else fails (e.g., `ezra_foo_claudeclaw_bot` is rejected).

Handshake with Plan 03:
  IF Plan 03 setup wizard was run BEFORE this plan AND Noah already pasted the token → .env already has TELEGRAM_BOT_TOKEN + ALLOWED_CHAT_ID. Task 2 here just verifies.
  IF Noah skipped the token prompt in Plan 03 → TELEGRAM_BOT_TOKEN is blank. Task 2 writes it in-place; ALLOWED_CHAT_ID still requires a message exchange.

Concurrency with Plan 04: Plan 04 (dashboard health) also binds port 3141. This plan declares `depends_on: [02, 03, 04]` and `wave: 4` so execution is strictly sequential. Task 3 still pre-flights the port as belt-and-suspenders.
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Register the permanent main bot on BotFather</name>
  <what-built>Nothing yet. BotFather runs inside Telegram and has no CLI/API that Claude can drive, so Noah performs the registration manually. The token lives inside Noah's Telegram chat with BotFather after creation.</what-built>
  <how-to-verify>
    Noah, do the following in Telegram:

    1. Open Telegram, search @BotFather, tap Start if first time.
    2. Send /newbot
    3. Display name prompt → reply: Ezra
    4. Username prompt → reply: ezra_claudeclaw_bot
       If taken, fall back to exactly: ezra_claudeclaw_io_bot (the only accepted fallback — the regex rejects anything else). Record the final chosen handle.
    5. BotFather replies with a token of form "1234567890:AAFxxxxxxxxxxxxx". Copy it.
    6. Optional: /setdescription and /setabouttext with a short bio; /setcommands to register /start, /dashboard, /status, /lock, /help. Not required for FOUN-06.

    Reply in this plan with ONE of:
      registered: @{final_username} + paste the token value
      OR
      already-registered: @{username} token-in-env: yes (if Plan 03 wizard already captured it)
  </how-to-verify>
  <resume-signal>Reply "registered: @{username}" + token, OR "already-registered: @{username} token-in-env: yes".</resume-signal>
</task>

<task type="auto">
  <name>Task 2: Validate token via Telegram API and ensure .env is correct</name>
  <files>.env</files>
  <read_first>
    - .env (current TELEGRAM_BOT_TOKEN and ALLOWED_CHAT_ID values)
    - .planning/phases/01-foundation/01-CONTEXT.md (D-06, D-08, D-11)
    - Task 1 reply (token + username)
  </read_first>
  <action>
    1. Read current TELEGRAM_BOT_TOKEN from .env. If empty or different from Task 1's token, update only the TELEGRAM_BOT_TOKEN line using a macOS-compatible in-place edit:
       ```
       sed -i.bak "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=${NEW_TOKEN}|" .env && rm .env.bak
       ```
       Preserve all other lines byte-for-byte.

    2. Validate the token against Telegram's /getMe API:
       ```
       TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' .env | head -1 | cut -d= -f2-)
       curl -sS "https://api.telegram.org/bot${TOKEN}/getMe" > /tmp/ezra-getme.json
       node -e "const d=JSON.parse(require('fs').readFileSync('/tmp/ezra-getme.json','utf8'));if(!d.ok||!d.result.is_bot)throw new Error('invalid');console.log(d.result.username, d.result.id);"
       ```
       The response must have ok=true, result.is_bot=true, and result.username matching the regex `^ezra_claudeclaw(_io)?_bot$` (tightened — only the D-06 handle or the D-06 documented _io fallback).

    3. Verify ALLOWED_CHAT_ID is numeric and non-empty:
       ```
       grep -Pq '^ALLOWED_CHAT_ID=-?\d+$' .env
       ```
       If missing/blank, surface to Noah: "Re-run npm run setup and complete the send-a-message step so ALLOWED_CHAT_ID gets auto-detected." Do NOT hand-fabricate a chat ID.

    4. Capture verified identity (metadata only, no secrets) for the plan summary:
       ```
       BOT_JSON=$(cat /tmp/ezra-getme.json)
       USERNAME=$(node -e "console.log(JSON.parse(process.env.J).result.username)" J="$BOT_JSON")
       USER_ID=$(node -e "console.log(JSON.parse(process.env.J).result.id)" J="$BOT_JSON")
       CHAT_ID=$(grep '^ALLOWED_CHAT_ID=' .env | cut -d= -f2-)
       cat > .planning/phases/01-foundation/01-05-bot-identity.txt <<EOF
       bot_username: @${USERNAME}
       bot_user_id: ${USER_ID}
       allowed_chat_id: ${CHAT_ID}
       verified_at: $(date -u +%FT%TZ)
       EOF
       ```

    5. Remove the temp response file:
       ```
       rm -f /tmp/ezra-getme.json
       ```
  </action>
  <verify>
    <automated>TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' .env | head -1 | cut -d= -f2-) && [ -n "$TOKEN" ] && curl -sS "https://api.telegram.org/bot${TOKEN}/getMe" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));process.exit((d.ok&&d.result.is_bot&&/^ezra_claudeclaw(_io)?_bot$/.test(d.result.username))?0:1)" && grep -Pq '^ALLOWED_CHAT_ID=-?\d+$' .env && test -f .planning/phases/01-foundation/01-05-bot-identity.txt</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c '^TELEGRAM_BOT_TOKEN=..*' .env` returns 1 (key present and non-empty)
    - `grep -c '^TELEGRAM_BOT_TOKEN=' .env` returns 1 (exactly one token line; sed did not duplicate)
    - Telegram API /getMe returns ok=true, is_bot=true, and username matches exactly `^ezra_claudeclaw(_io)?_bot$` (tightened regex — only D-06 handle or the one documented _io fallback)
    - `grep -Pq '^ALLOWED_CHAT_ID=-?\d+$' .env` exits 0 (single numeric value per D-11)
    - `test -f .planning/phases/01-foundation/01-05-bot-identity.txt` passes with bot_username, bot_user_id, allowed_chat_id, verified_at lines
    - `test -f /tmp/ezra-getme.json` returns nonzero (temp file cleaned)
  </acceptance_criteria>
  <done>Token validates, handle matches the tightened D-06/D-07 convention, ALLOWED_CHAT_ID populated, identity artifact saved.</done>
</task>

<task type="auto">
  <name>Task 3: Start ClaudeClaw and await Noah's test message</name>
  <files>/tmp/claudeclaw-phase1-bot.log</files>
  <read_first>
    - dist/index.js (Plan 03 build output)
    - .env (token + chat ID from Task 2)
  </read_first>
  <action>
    Plan 04 is a dependency (see `depends_on: [02, 03, 04]`) so its process should already be stopped when this plan runs. Still pre-flight to catch anomalies (e.g., Plan 04 retry that left a dangling process):

    1. Pre-flight:
       ```
       lsof -i :3141 -sTCP:LISTEN | grep -q node && { echo "Port 3141 busy — Plan 04 process still running? Stop it first."; exit 1; } || true
       test -f dist/index.js
       ```

    2. Start ClaudeClaw in background:
       ```
       nohup npm start > /tmp/claudeclaw-phase1-bot.log 2>&1 &
       echo $! > /tmp/claudeclaw-phase1-bot.pid
       ```

    3. Poll up to 15s for startup lines:
       ```
       for i in {1..30}; do
         if grep -q 'Telegram bot started' /tmp/claudeclaw-phase1-bot.log && \
            grep -q 'Dashboard server running' /tmp/claudeclaw-phase1-bot.log; then
           break
         fi
         sleep 0.5
       done
       ```

    4. Confirm the process is still alive:
       ```
       kill -0 "$(cat /tmp/claudeclaw-phase1-bot.pid)" || { tail -50 /tmp/claudeclaw-phase1-bot.log; exit 1; }
       ```
  </action>
  <verify>
    <automated>test -f /tmp/claudeclaw-phase1-bot.pid && kill -0 "$(cat /tmp/claudeclaw-phase1-bot.pid)" && grep -q 'Telegram bot started' /tmp/claudeclaw-phase1-bot.log && grep -q 'Dashboard server running' /tmp/claudeclaw-phase1-bot.log</automated>
  </verify>
  <acceptance_criteria>
    - `test -f /tmp/claudeclaw-phase1-bot.pid` passes
    - `kill -0 "$(cat /tmp/claudeclaw-phase1-bot.pid)"` returns 0 (process alive)
    - `grep -c 'Telegram bot started' /tmp/claudeclaw-phase1-bot.log` returns >= 1
    - `grep -c 'Dashboard server running' /tmp/claudeclaw-phase1-bot.log` returns >= 1
    - `grep -ic 'fatal\|ENOTFOUND\|401 Unauthorized' /tmp/claudeclaw-phase1-bot.log` returns 0 (no auth/network failures)
  </acceptance_criteria>
  <done>Bot process running, Telegram polling active, dashboard listening, log file capturing activity.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Noah sends test message and confirms bot reply</name>
  <what-built>ClaudeClaw is running (Task 3). grammy is polling Telegram getUpdates with the registered bot's token and routes messages from ALLOWED_CHAT_ID to the Claude Agent SDK. Noah exercises the full path: Telegram message → ClaudeClaw → Claude CLI → reply back on Telegram.</what-built>
  <how-to-verify>
    Noah:

    1. Open Telegram on your phone, find your bot (e.g. @ezra_claudeclaw_bot), tap Start or send a message.
    2. Send a test message, e.g.:
       "Phase 1 smoke test. Reply briefly."
    3. Wait up to 60 seconds. First-message latency is higher because the Claude CLI session cold-starts.
    4. The bot should reply in the same chat. What matters is that ANY reply arrives from the bot (not the exact text).

    Optional allowlist smoke: have a second Telegram account DM the bot. It should NOT reply — ALLOWED_CHAT_ID enforcement rejects unauthorized chats. Skip if you don't have a second account handy.

    Capture evidence (optional but recommended): screenshot the exchange and save as .planning/phases/01-foundation/01-05-telegram-proof.png

    Reply with:
      approved: reply received at {timestamp}
      OR
      fail: no reply within 60s
      OR
      fail: {other reason}

    If you reply approved, paste any relevant log line from /tmp/claudeclaw-phase1-bot.log showing the message being handled — helps the SUMMARY cite real evidence.
  </how-to-verify>
  <resume-signal>Reply "approved: reply received" (plus optional log snippet) or "fail: {details}".</resume-signal>
</task>

<task type="auto">
  <name>Task 5: Stop bot process cleanly and preserve log</name>
  <files></files>
  <read_first>
    - /tmp/claudeclaw-phase1-bot.pid
    - /tmp/claudeclaw-phase1-bot.log
    - .env (to extract current TELEGRAM_BOT_TOKEN for leak-scrub check)
  </read_first>
  <action>
    1. SIGTERM the bot process with grace period, then SIGKILL if needed:
       ```
       PID=$(cat /tmp/claudeclaw-phase1-bot.pid)
       kill -TERM "$PID" || true
       for i in {1..20}; do
         kill -0 "$PID" 2>/dev/null || break
         sleep 0.5
       done
       kill -0 "$PID" 2>/dev/null && kill -KILL "$PID" || true
       ```

    2. Preserve final 80 lines of the bot log under the phase directory (captures message-exchange evidence):
       ```
       tail -80 /tmp/claudeclaw-phase1-bot.log > .planning/phases/01-foundation/01-05-bot-runtime.log
       ```

    3. Scrub any accidental token leak from the preserved log. The raw TELEGRAM_BOT_TOKEN must NOT appear in the committed artifact:
       ```
       TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' .env | cut -d= -f2-)
       if grep -qF "$TOKEN" .planning/phases/01-foundation/01-05-bot-runtime.log; then
         sed -i.bak "s|$TOKEN|[REDACTED_TELEGRAM_BOT_TOKEN]|g" .planning/phases/01-foundation/01-05-bot-runtime.log
         rm .planning/phases/01-foundation/01-05-bot-runtime.log.bak
       fi
       ```

    4. Clean up temp pid file (keep /tmp log for natural 24h rotation):
       ```
       rm -f /tmp/claudeclaw-phase1-bot.pid
       ```

    5. Confirm port 3141 is free:
       ```
       ! lsof -i :3141 -sTCP:LISTEN | grep -q node
       ```
  </action>
  <verify>
    <automated>TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' .env | cut -d= -f2-) && ! lsof -i :3141 -sTCP:LISTEN 2>/dev/null | grep -q node && test -f .planning/phases/01-foundation/01-05-bot-runtime.log && ! grep -qF "$TOKEN" .planning/phases/01-foundation/01-05-bot-runtime.log && ! test -f /tmp/claudeclaw-phase1-bot.pid</automated>
  </verify>
  <acceptance_criteria>
    - `lsof -i :3141 -sTCP:LISTEN | grep -q node` returns nonzero (port released)
    - `test -f .planning/phases/01-foundation/01-05-bot-runtime.log` passes
    - Preserved log does NOT contain the raw TELEGRAM_BOT_TOKEN value (`grep -qF "$TOKEN" 01-05-bot-runtime.log` exits nonzero)
    - `test -f /tmp/claudeclaw-phase1-bot.pid` returns nonzero (temp pid cleaned)
    - Evidence of graceful shutdown preferred: `grep -qi 'SIGKILL' .planning/phases/01-foundation/01-05-bot-runtime.log` returns nonzero
    - If approved in Task 4: preserved log contains >= 1 line referencing the chat ID or a message-handling event (e.g., grep -Eic "chat|message|handled" is > 0)
  </acceptance_criteria>
  <done>Process stopped cleanly, port released, preserved log scrubbed of tokens, evidence artifacts saved under .planning/phases/01-foundation/.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| BotFather (Telegram) → .env | Bot token crosses into local filesystem via Noah's manual paste. |
| Telegram API → ClaudeClaw process | getUpdates long-poll over TLS; grammy validates token on connect. |
| Non-Noah Telegram chat → bot | Must be rejected by ALLOWED_CHAT_ID middleware. |
| Runtime log → committed artifact | Log may accidentally contain token or message bodies; must be scrubbed. |
| Identity artifact (01-05-bot-identity.txt) → git | File contains bot_username, bot_user_id, allowed_chat_id — low-value metadata, no token. Committed intentionally as evidence. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-19 | Spoofing | Fake TELEGRAM_BOT_TOKEN | mitigate | Task 2 calls /getMe — an invalid token returns ok=false and fails acceptance. |
| T-01-20 | Information disclosure | Token leaked into preserved log artifact | mitigate | Task 5 scrubs committed log with sed substitution before it becomes a plan artifact. |
| T-01-21 | Elevation of privilege | Non-allowed chat can invoke bot | mitigate | grammy middleware checks ctx.chat.id against ALLOWED_CHAT_ID (existing runtime code). Optional smoke test in Task 4. |
| T-01-22 | Tampering | Hand-edit of .env clobbers other keys | mitigate | Task 2 sed is line-anchored (^TELEGRAM_BOT_TOKEN=) so it touches only that one line; acceptance checks `grep -c '^TELEGRAM_BOT_TOKEN='` is exactly 1. |
| T-01-23 | Denial of service | Leftover process holds port 3141 | mitigate | Task 5 SIGTERM with 10s grace and SIGKILL fallback; acceptance verifies port released. Also: `wave: 4` + `depends_on: [04]` prevents concurrent Plan 04/05 execution. |
| T-01-24 | Repudiation | Bot registered on wrong account | accept | Noah registers personally via Telegram; identity tied to his account by construction. |
| T-01-25 | Information disclosure | `.planning/phases/01-foundation/01-05-bot-identity.txt` committed to git | accept | Severity LOW. File contains only metadata: `bot_username`, `bot_user_id`, `allowed_chat_id`, `verified_at`. No TELEGRAM_BOT_TOKEN present (only the one sed line in Task 2 touches the token; identity artifact is written by Task 2 step 4 with variable substitutions excluding the token). Task 2 acceptance verifies `/tmp/ezra-getme.json` is deleted so raw getMe response (which also has no token) is not retained. Accept-risk: disclosure of these three fields does not enable impersonation — the bot token is the only auth factor and it's not here. Mitigation note: if future phases add more fields, re-evaluate. |
</threat_model>

<verification>
- BotFather registration completed, permanent handle recorded in 01-05-bot-identity.txt
- /getMe validates token and username matches the tightened regex `^ezra_claudeclaw(_io)?_bot$`
- .env has non-empty TELEGRAM_BOT_TOKEN and numeric ALLOWED_CHAT_ID
- Noah's test message produced a bot reply in the same chat (checkpoint approval recorded in SUMMARY)
- Preserved runtime log contains no raw token
- Port 3141 freed after plan completes
- Plan 05 ran strictly after Plan 04 (wave: 4, depends_on includes 04)
</verification>

<success_criteria>
FOUN-06 satisfied: main Telegram bot responds to a test message from Noah's allowed chat ID. D-06 (permanent handle), D-07 (naming convention, tightened regex), D-08 (token env key), D-11 (single allowed chat) all implemented. No concurrent port 3141 contention with Plan 04 (enforced via wave 4 + depends_on).
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-05-SUMMARY.md` noting: final registered bot handle, whether fallback (`ezra_claudeclaw_io_bot`) was used, approved timestamp of test reply, artifact paths (01-05-bot-identity.txt, 01-05-bot-runtime.log, optional 01-05-telegram-proof.png), confirmation that Plan 04 completed before this plan started.
</output>

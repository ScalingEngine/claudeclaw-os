---
phase: 01-foundation
plan: 04
type: execute
wave: 3
depends_on: [02, 03]
files_modified: []
external_paths:
  - /tmp/claudeclaw-phase1.log
autonomous: false
requirements: [FOUN-05]
tags: [dashboard, health, hono, runtime-verification]

must_haves:
  truths:
    - "ClaudeClaw bot + dashboard process starts cleanly (npm start reaches 'Dashboard server running')"
    - "curl http://localhost:3141/api/health returns HTTP 200"
    - "Response body is valid JSON containing numeric 'contextPct' and 'turns' fields"
    - "Dashboard process is stoppable cleanly (SIGTERM → graceful shutdown)"
  artifacts:
    - path: "/tmp/claudeclaw-phase1.log"
      provides: "Startup log capture — proof of 'Dashboard server running' line"
      contains: "Dashboard server running"
  key_links:
    - from: "npm start (node dist/index.js)"
      to: "src/dashboard.ts createDashboardServer()"
      via: "Hono HTTP server bound to DASHBOARD_PORT (3141)"
      pattern: "app.get\\('/api/health'"
    - from: ".env DASHBOARD_PORT=3141"
      to: "Hono listener"
      via: "process binding on 127.0.0.1:3141"
      pattern: "serve\\(.*port"
---

<objective>
Start the freshly-built ClaudeClaw process, verify the dashboard server binds to port 3141, and prove FOUN-05 by hitting `curl http://localhost:3141/api/health` and receiving HTTP 200 with a valid JSON response. Per D-14, the actual route is `/api/health` (not `/health` as ROADMAP success criterion states); this plan uses the correct path and documents the mismatch in the phase summary.

Purpose: Satisfy FOUN-05 with zero new code (D-14 preferred option — do not add a `/health` alias that would violate the project CLAUDE.md "do NOT rewrite src/dashboard.ts" rule). The dashboard route already exists at `src/dashboard.ts:935`; Phase 1 just exercises it.

Output: Startup proof in log file, HTTP 200 response captured, process running during check and stopped cleanly at the end of the plan.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation/01-CONTEXT.md
@src/dashboard.ts
@src/index.ts

<interfaces>
<!-- /api/health handler (extracted from src/dashboard.ts:935): -->
```typescript
app.get('/api/health', (c) => {
  const chatId = c.req.query('chatId') || '';
  const sessionId = getSession(chatId);
  let contextPct = 0;
  let turns = 0;
  let compactions = 0;
  let sessionAge = '-';
  // ... populates from token_usage table if session exists
  return c.json({
    contextPct,
    turns,
    // additional fields
  });
});
```

<!-- Expected success response (for a fresh install with no chat sessions yet): -->
<!-- HTTP 200, JSON body with contextPct=0, turns=0, compactions=0, sessionAge='-' -->
<!-- Route accepts no auth — it's a plain health endpoint (NOT token-gated like '/' main dashboard). -->

<!-- Start command (from package.json scripts): -->
<!-- "start": "node dist/index.js" -->
<!-- Expected log lines (from CLAUDE.md.example + src/index.ts): -->
<!--   "Telegram bot started" -->
<!--   "Dashboard server running" (port 3141) -->

<!-- Startup may take 2-5 seconds on first run due to SQLite WAL init + Hono listener bind. -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Start ClaudeClaw in background and capture startup log</name>
  <files>/tmp/claudeclaw-phase1.log</files>
  <read_first>
    - .env (confirm DASHBOARD_PORT=3141 and TELEGRAM_BOT_TOKEN is set)
    - dist/index.js (confirm build output exists; Plan 03 produced this)
  </read_first>
  <action>
    From repo root (/Users/nwessel/ClaudeCode/claudeclaw-os):

    1. Pre-flight sanity checks (fail fast):
       ```
       test -f dist/index.js || { echo "dist/index.js missing — re-run Plan 03 build"; exit 1; }
       test -f .env || { echo ".env missing — re-run Plan 03 setup"; exit 1; }
       lsof -i :3141 && { echo "Port 3141 already bound — another ClaudeClaw instance running?"; exit 1; } || true
       ```

    2. Start the bot + dashboard in background, capturing stdout + stderr to a log file (use `/tmp` per project CLAUDE.md launchd rules — paths with spaces break things, /tmp is always safe):
       ```
       nohup npm start > /tmp/claudeclaw-phase1.log 2>&1 &
       echo $! > /tmp/claudeclaw-phase1.pid
       ```

    3. Wait up to 15 seconds for the dashboard line to appear. Poll (do NOT use fixed `sleep 15`):
       ```
       for i in {1..30}; do
         if grep -q 'Dashboard server running' /tmp/claudeclaw-phase1.log; then
           break
         fi
         sleep 0.5
       done
       ```

    4. Confirm the process is still alive:
       ```
       kill -0 "$(cat /tmp/claudeclaw-phase1.pid)" || { echo "Process died during startup"; tail -50 /tmp/claudeclaw-phase1.log; exit 1; }
       ```

    5. Print the captured startup log tail to stdout so the executor's result includes it verbatim:
       ```
       echo "=== /tmp/claudeclaw-phase1.log (tail -30) ==="
       tail -30 /tmp/claudeclaw-phase1.log
       ```

    Do NOT run this in foreground. Task 2 (curl) runs while this process is live. Task 3 stops the process cleanly.
  </action>
  <verify>
    <automated>test -f /tmp/claudeclaw-phase1.pid && kill -0 "$(cat /tmp/claudeclaw-phase1.pid)" && grep -q 'Dashboard server running' /tmp/claudeclaw-phase1.log</automated>
  </verify>
  <acceptance_criteria>
    - `test -f /tmp/claudeclaw-phase1.pid` passes
    - `kill -0 "$(cat /tmp/claudeclaw-phase1.pid)"` returns 0 (process alive)
    - `grep -c 'Dashboard server running' /tmp/claudeclaw-phase1.log` returns ≥ 1
    - `lsof -i :3141 -sTCP:LISTEN | grep -q node` returns 0 (node process listening on 3141)
    - `grep -c 'Error' /tmp/claudeclaw-phase1.log` returns 0 OR any Error lines are pre-startup warnings (e.g., "Error: voice disabled" — not fatal)
    - `grep -qi 'Telegram bot started' /tmp/claudeclaw-phase1.log` returns 0 (bot connected to Telegram API)
  </acceptance_criteria>
  <done>ClaudeClaw process running in background, dashboard bound to port 3141, startup log captured.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Verify /api/health returns 200 and valid JSON</name>
  <what-built>Process is running from Task 1. The dashboard exposes `/api/health` on localhost:3141 (per src/dashboard.ts:935). FOUN-05 success criterion requires the route to respond 200. This task runs the curl check and captures the exact response for the SUMMARY.</what-built>
  <how-to-verify>
    Run this exact command and check the output:
    ```
    curl -sS -o /tmp/claudeclaw-health.json -w "HTTP_CODE:%{http_code}\nCONTENT_TYPE:%{content_type}\n" http://localhost:3141/api/health
    echo "--- body ---"
    cat /tmp/claudeclaw-health.json
    echo
    ```

    **Expected result:**
    - `HTTP_CODE:200`
    - `CONTENT_TYPE: application/json; charset=UTF-8` (or similar with `application/json`)
    - Body is valid JSON with numeric `contextPct`, `turns`, `compactions` fields

    **If HTTP_CODE != 200:**
    - 000 = connection refused → dashboard didn't bind (restart Task 1)
    - 404 = route missing → rebuild broke? `grep -n "/api/health" src/dashboard.ts` must match
    - 500 = handler error → check `/tmp/claudeclaw-phase1.log` for stack trace

    **D-14 note:** The ROADMAP success criterion text says `curl localhost:3141/health` (singular) but the actual route is `/api/health`. This plan uses the correct path. Do NOT add a `/health` alias — that would require editing `src/dashboard.ts` which violates the project CLAUDE.md "do NOT rewrite" rule. The SUMMARY.md records this decision.

    Additionally run a JSON-structure check:
    ```
    node -e "const d=JSON.parse(require('fs').readFileSync('/tmp/claudeclaw-health.json','utf8'));['contextPct','turns','compactions'].forEach(k=>{if(typeof d[k]!=='number')throw new Error('missing numeric field: '+k)});console.log('OK:',JSON.stringify(d))"
    ```
    Expected: `OK: {"contextPct":0,"turns":0,...}` (zeros are fine — no session yet).

    Reply **approved** once HTTP 200 confirmed + JSON parses with the three numeric fields. Reply **fail: {details}** if anything differs.
  </how-to-verify>
  <resume-signal>Reply "approved" or "fail: {details}"</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Stop ClaudeClaw process cleanly and save log artifact</name>
  <files></files>
  <read_first>
    - /tmp/claudeclaw-phase1.pid (from Task 1)
    - /tmp/claudeclaw-phase1.log (from Task 1)
    - /tmp/claudeclaw-health.json (from Task 2)
  </read_first>
  <action>
    1. Send SIGTERM to the process and wait for graceful shutdown:
       ```
       PID=$(cat /tmp/claudeclaw-phase1.pid)
       kill -TERM "$PID" || true
       for i in {1..20}; do
         kill -0 "$PID" 2>/dev/null || break
         sleep 0.5
       done
       # If still running, SIGKILL
       if kill -0 "$PID" 2>/dev/null; then
         echo "Process did not exit cleanly; sending SIGKILL"
         kill -KILL "$PID"
       fi
       ```

    2. Confirm port 3141 is free:
       ```
       ! lsof -i :3141 -sTCP:LISTEN | grep -q node
       ```

    3. Preserve the health-check response and the last 50 lines of startup log in the SUMMARY directory so Plan 05 and future debugging have a reference:
       ```
       cp /tmp/claudeclaw-health.json .planning/phases/01-foundation/01-04-health-response.json
       tail -50 /tmp/claudeclaw-phase1.log > .planning/phases/01-foundation/01-04-startup.log
       ```
       These two artifacts are plain observations (not secrets) — safe to commit with the plan SUMMARY.

    4. Clean up temp files:
       ```
       rm -f /tmp/claudeclaw-phase1.pid /tmp/claudeclaw-health.json
       # Keep /tmp/claudeclaw-phase1.log for 24h debugging window; it'll rotate via /tmp cleanup naturally.
       ```
  </action>
  <verify>
    <automated>! lsof -i :3141 -sTCP:LISTEN 2>/dev/null | grep -q node && test -f .planning/phases/01-foundation/01-04-health-response.json && test -f .planning/phases/01-foundation/01-04-startup.log && grep -q 'Dashboard server running' .planning/phases/01-foundation/01-04-startup.log && node -e "const d=JSON.parse(require('fs').readFileSync('.planning/phases/01-foundation/01-04-health-response.json','utf8'));process.exit((typeof d.contextPct==='number'&&typeof d.turns==='number')?0:1)"</automated>
  </verify>
  <acceptance_criteria>
    - `lsof -i :3141 -sTCP:LISTEN` returns no node rows (port released)
    - `test -f .planning/phases/01-foundation/01-04-health-response.json` passes (captured body preserved)
    - `test -f .planning/phases/01-foundation/01-04-startup.log` passes
    - `grep -c 'Dashboard server running' .planning/phases/01-foundation/01-04-startup.log` returns ≥ 1
    - JSON structure check: contextPct and turns fields are numeric in the preserved health-response.json
    - No leftover pid/health temp files in /tmp (`test -f /tmp/claudeclaw-phase1.pid` returns nonzero)
    - No SIGKILL in recent shutdown (`grep -qi 'SIGKILL' .planning/phases/01-foundation/01-04-startup.log` should return nonzero — graceful SIGTERM preferred)
  </acceptance_criteria>
  <done>Process stopped cleanly, port released, evidence artifacts saved under .planning/phases/01-foundation/.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| External HTTP → localhost:3141 | Phase 1 binds to localhost only (default Hono config). No external exposure. |
| /api/health → SQLite (store/claudeclaw.db) | Handler reads session/token_usage tables. Read-only from this route. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-15 | Information disclosure | /api/health leaking session data | accept | Route returns only aggregate numerics (contextPct, turns, compactions); no PII or token content. Source verified. |
| T-01-16 | Denial of service | Port 3141 already bound | mitigate | Task 1 pre-flight `lsof -i :3141` check; fail fast if conflict. |
| T-01-17 | Tampering | Dashboard token bypass via /api/health | accept | /api/health has no auth (intentional — lightweight health probe). DASHBOARD_TOKEN guards `/` (main dashboard) per existing src/dashboard.ts logic. Phase 7 will add Cloudflare Access. |
| T-01-18 | Elevation of privilege | Leftover process after plan ends | mitigate | Task 3 sends SIGTERM with 10s grace, falls back to SIGKILL; acceptance verifies port released. |
</threat_model>

<verification>
- `curl http://localhost:3141/api/health` returns HTTP 200 (captured in 01-04-health-response.json)
- Response body is valid JSON with numeric `contextPct`, `turns`, `compactions`
- Startup log confirms `Dashboard server running` and `Telegram bot started`
- Process exited cleanly on SIGTERM
</verification>

<success_criteria>
FOUN-05 satisfied: dashboard loads on localhost:3141 and responds to health check. Note on D-14: route is `/api/health`, not `/health` as ROADMAP says; plan uses actual route per project CLAUDE.md "do NOT rewrite src/dashboard.ts" rule. SUMMARY documents the path correction.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-04-SUMMARY.md` noting: actual route used (/api/health), captured response body, D-14 path correction recorded, startup log artifact preserved at 01-04-startup.log.
</output>

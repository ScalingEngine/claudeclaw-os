# Phase 1: Foundation - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure the forked ClaudeClaw OS repo so Noah's local workflow is ready to build on: fork remotes wired, `noah/main` branch cut, `~/.claudeclaw/` overlay seeded (Ezra-ready CLAUDE.md, `agents/ezra/` stub, empty `hooks/`), project compiles, dashboard health endpoint responds, and the permanent `@ezra_claudeclaw_bot` Telegram bot replies to Noah's allowed chat.

Phase 1 is **local Mac** validation only. VPS deployment (systemd, Cloudflare Access, API-key auth, RAM budget) is Phase 7. Ezra persona is seeded but Slack wiring is Phase 2. Specialist agents, vault access, integrations, routing are all later phases.

</domain>

<decisions>
## Implementation Decisions

### Branch & Remote Strategy

- **D-01:** Cut `noah/main` branch in Phase 1. Move `.planning/` commits onto `noah/main`. Leave `main` as a verbatim upstream mirror so `git fetch upstream && git merge upstream/main` onto `main` stays a clean fast-forward. All Noah-specific work (planning, overlay references, future source overrides) lives on `noah/main`. Working branch for day-to-day is `noah/main`.
- **D-02:** Upstream sync cadence = weekly reminder. A scheduled nudge (Slack or Telegram — wired in Phase 2+) tells Noah to run the upstream fast-forward. No auto-cron. Manual merge so Noah can inspect breaking changes. Phase 1 only wires the reminder pattern if trivial; otherwise the reminder lives as a Deferred Idea until Phase 5/6.

### Overlay Seeding (`~/.claudeclaw/`)

- **D-03:** `~/.claudeclaw/CLAUDE.md` contains Ezra's **real** persona, copied from the existing NoahBrain Ezra Slack bot config. Phase 1 writes the full persona; Phase 2 only wires channels (Slack primary, Telegram secondary). No generic "your assistant" placeholder.
- **D-04:** `~/.claudeclaw/hooks/` is created empty. Satisfies FOUN-02 literally. No hook wiring, no copied NoahBrain scripts. Hooks ship when there's work for them.
- **D-05:** First agent stub lives at `~/.claudeclaw/agents/ezra/` with an `agent.yaml` containing `name: Ezra`, `telegram_bot_token_env: TELEGRAM_BOT_TOKEN`, and a default model (Sonnet 4.6 or Opus 4.7 — planner's call). Persona body is a pointer to `~/.claudeclaw/CLAUDE.md` in Phase 1; Phase 2 fleshes the agent-specific CLAUDE.md.

### Main Telegram Bot

- **D-06:** Register a permanent BotFather bot for the main agent in Phase 1. Handle: `@ezra_claudeclaw_bot`. This is the bot that gets carried through every phase (local → VPS). No throwaway dev bot, no handle rename.
- **D-07:** Naming convention for the 6-bot fleet (established now so specialists follow the pattern in Phase 4): `@{agent}_claudeclaw_bot`. Specialists will register as `@cos_claudeclaw_bot`, `@research_claudeclaw_bot`, `@comms_claudeclaw_bot`, `@content_claudeclaw_bot`, `@archie_claudeclaw_bot` (names subject to BotFather availability). Phase 1 only registers Ezra.
- **D-08:** Main bot token stored in `.env` under the existing `TELEGRAM_BOT_TOKEN` key (matches `src/config.ts` convention). Specialist bot tokens get their own env vars later per `agents/_template/agent.yaml.example` pattern.

### Auth & `.env` Scope

- **D-09:** Local Mac dev uses Claude OAuth (`claude login`). No `ANTHROPIC_API_KEY` in the Phase 1 `.env`. This **intentionally diverges** from VPS, which will use `ANTHROPIC_API_KEY` (PROJECT.md constraint — headless VPS can't browser-re-auth). Phase 7 will add the key for VPS only. Divergence is accepted trade-off: faster local onboarding now, VPS-specific auth wiring later.
- **D-10:** Phase 1 `.env` keys (minimum for FOUN-04 through FOUN-06 plus pre-wired optional features Noah already has keys for):
  - Core: `TELEGRAM_BOT_TOKEN`, `ALLOWED_CHAT_ID`, `DASHBOARD_TOKEN`, `DB_ENCRYPTION_KEY`, `DASHBOARD_PORT=3141`
  - Gemini: `GOOGLE_API_KEY` (enables video analysis, memory consolidation, later auto-assign — Phase 5)
  - Voice: `GROQ_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
  - Not included: `ANTHROPIC_API_KEY` (local uses OAuth), `WARROOM_ENABLED`/`WARROOM_PORT` (out of scope), `SLACK_USER_TOKEN` (Phase 2), `SECURITY_PIN_HASH` (setup wizard can still generate; not required for Phase 1 success).
- **D-11:** Chat allowlist = single chat (Noah's personal Telegram DM). `ALLOWED_CHAT_ID` holds one value per the existing `src/config.ts` single-value convention. No multi-chat support in Phase 1.
- **D-12:** Voice features are **wired** in `.env` in Phase 1 but **not validated**. Phase 1 success criteria (FOUN-01..06) don't test voice transcription/TTS. "Available for later phases" is the posture.

### Setup Flow

- **D-13:** Use the existing `scripts/setup.ts` interactive wizard for `.env` generation, token validation, and initial build. Do NOT write a new setup flow. Wizard auto-generates `DASHBOARD_TOKEN`, `DB_ENCRYPTION_KEY`, and `SECURITY_PIN`. Plan should document the exact wizard inputs Noah provides (bot token, chat ID, which optional features to enable).
- **D-14:** Dashboard health validation via existing `/api/health` route in `src/dashboard.ts:935`. FOUN-05 test: `curl localhost:3141/api/health` returns 200. (Note: roadmap mentions `/health` — the real path is `/api/health`. Plan should align success criteria with the actual route or document the alias decision.)

### Claude's Discretion

- Exact default model for the Ezra agent stub in `agent.yaml` (Sonnet 4.6 recommended; Opus 4.7 acceptable). Pick based on which is already wired in `src/config.ts` model fallback chain.
- Whether Phase 1 wires the upstream-sync weekly reminder (via `dist/schedule-cli.js create`) or defers to Phase 2. If trivial, include; otherwise defer.
- Exact contents of the `ezra/agent.yaml` Obsidian section — can be left commented (template default) in Phase 1 since vault integration is Phase 3.
- Whether to create a `~/.claudeclaw` symlink strategy for future launchd path-with-spaces defense (per project CLAUDE.md launchd rules) — only if the planner sees it's needed for Phase 7 prep.
- Whether to pre-add specialist bot token env var **names** (as blank entries) to `.env.example` in Phase 1 so Phase 4 has a stub to fill, or leave them out entirely until Phase 4.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` — vision, 16 active requirements, 9 locked key decisions, explicit Out of Scope list (War Room, WhatsApp, multi-user auth, dashboard rewrites)
- `.planning/REQUIREMENTS.md` — FOUN-01 through FOUN-06 with full text
- `.planning/ROADMAP.md` §Phase 1 — goal and the 5 success criteria
- `CLAUDE.md` — project overlay instructions (launchd rules, Send-File markers, memory system, schedule-cli patterns)
- `CLAUDE.md.example` — overlay template Noah's `~/.claudeclaw/CLAUDE.md` replaces
- `docs/rfc-sdk-engine.md` — upcoming SDK engine rewrite RFC (awareness; may affect file stability in future phases, not actionable in Phase 1)

### Existing code (reuse, do not rewrite)
- `scripts/setup.ts` — interactive wizard, generates tokens, writes `.env`, builds. Phase 1 drives from this.
- `src/config.ts` — env key loading (lines 7-40 enumerate the complete supported key set), `AGENT_ID` default, `TELEGRAM_BOT_TOKEN`/`ALLOWED_CHAT_ID`/`DASHBOARD_TOKEN`/`DB_ENCRYPTION_KEY` exports
- `src/env.ts` — `readEnvFile(keys[])` helper that keeps secrets out of `process.env`
- `src/dashboard.ts:935` — `/api/health` Hono route (FOUN-05 target)
- `src/index.ts` — main entry, multi-agent `--agent <id>` flag wiring
- `agents/_template/agent.yaml.example` — agent config template Noah's `~/.claudeclaw/agents/ezra/agent.yaml` follows
- `agents/_template/CLAUDE.md` — per-agent persona template for Phase 2+

### State & planning
- `.planning/STATE.md` — current position (Phase 1, ready to plan), prior accumulated decisions, VPS-03 clarification blocker, Phase 6 parallel opportunity note
- `package.json` — Node 20+, scripts (`dev`, `build`, `start`, `setup`, `migrate`, `status`, `agent:create`, `test`), dependency list (grammY, Hono, better-sqlite3, Claude Agent SDK)
- `.planning/config.json` — GSD workflow config (model profile balanced, workflow toggles)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`scripts/setup.ts`** — interactive setup wizard; Phase 1 drives the `.env` generation from this, do not write a new flow
- **`src/config.ts` env schema** — 30+ supported env keys already defined in `readEnvFile([...])`; Phase 1 just populates values
- **`src/dashboard.ts:935` `/api/health` route** — satisfies FOUN-05 without any new code
- **`agents/_template/`** — agent config template (`agent.yaml.example` + `CLAUDE.md`); Phase 1 copies + fills for Ezra
- **`src/skill-registry.ts`** — auto-scans `~/.claude/skills/` (relevant Phase 3, mentioned for awareness)
- **`scripts/notify.sh`** — Telegram notification helper for mid-task updates (Phase 2+ use)

### Established Patterns

- **Config via `readEnvFile`** — never load secrets into `process.env`; callers read explicit key list. Phase 1 `.env` must align with the `envConfig` key list in `src/config.ts`.
- **Agent-per-directory** — `agents/{id}/{agent.yaml,CLAUDE.md}` in repo OR `~/.claudeclaw/agents/{id}/...` in overlay. Phase 1 uses overlay path per D-05.
- **ESM TypeScript, build to `dist/`** — `npm run build` compiles; runtime uses `dist/`. Don't bypass the build.
- **Hive-mind logging via SQLite** — agents log completed actions to `hive_mind` table. Not required Phase 1 but Phase 2+ uses it.

### Integration Points

- **`.env` at project root** — read by `src/env.ts` via `readEnvFile`. Phase 1 writes here (not to overlay).
- **`~/.claudeclaw/` overlay** — separate from repo, sourced by `index.ts`/`config.ts` when agent-specific. Phase 1 creates the directory tree and seed files.
- **Git remotes** — `origin` (ScalingEngine) and `upstream` (earlyaidopters) already configured; verified via `git remote -v`. Phase 1 adds the `noah/main` branch; remotes untouched.
- **Existing Mac state** — `~/.claudeclaw/` does NOT exist yet (verified); Phase 1 creates it fresh.

</code_context>

<specifics>
## Specific Ideas

- Dashboard port `3141` (ClaudeClaw default, matches `scripts/setup.ts`). Keep unless conflicts.
- Success criterion wording in ROADMAP.md says `curl localhost:3141/health`; the implemented route is `/api/health`. The plan should either (a) use `/api/health` and note the mismatch in phase verification, or (b) add a `/health` alias to the Hono app. Prefer (a) — the alias is new code for a spec mismatch.
- Bot handle target: `@ezra_claudeclaw_bot`. If taken on BotFather, Noah picks at registration — plan should list a fallback (e.g., `@ezra_claudeclaw_io_bot`) and note it as his choice.
- Ezra persona source: copy from the existing NoahBrain Ezra Slack bot config living on the VPS (Noah to provide the file path / content; plan should include a task that reads/fetches it).

</specifics>

<deferred>
## Deferred Ideas

- **War Room voice boardroom** — Out of Scope per PROJECT.md. Mac-only, browser/mic, not VPS-compatible. Not added to `.env` in Phase 1. Revisit only if PROJECT.md Out of Scope is updated.
- **WhatsApp bridge** — Out of Scope per PROJECT.md. Puppeteer-heavy, experimental upstream. Do not wire.
- **Specialist bot tokens (COS, Research, Comms, Ops/Content, Archie)** — Phase 4. Do not register their BotFather bots in Phase 1.
- **Slack integration** — Phase 2 (Ezra primary channel). Do not wire `SLACK_USER_TOKEN` in Phase 1.
- **Vault integration (Obsidian folders in `agent.yaml`)** — Phase 3. Leave commented in the Phase 1 `ezra/agent.yaml`.
- **Weekly upstream-sync reminder implementation** — defer to Phase 2 or Phase 5 if the scheduler wiring isn't trivial. Phase 1 captures the decision only.
- **Cloudflare Access for dashboard** — Phase 7 (VPS deployment). Phase 1 local dashboard runs on localhost with bearer token only.
- **`ANTHROPIC_API_KEY` wiring** — Phase 7 (VPS only). Local stays on `claude login` OAuth.
- **Nightly SQLite backup cron** — Phase 7.
- **Symlink strategy for launchd paths** — Phase 7 if needed (current project path `/Users/nwessel/ClaudeCode/claudeclaw-os` has no spaces).

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-18 via /gsd-discuss-phase*

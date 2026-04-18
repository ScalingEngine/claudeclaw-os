# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 01-foundation
**Areas discussed:** Branch strategy timing, Overlay seeding depth, Main Telegram bot identity, Local auth + .env scope

---

## Gray-area selection

Presented 4 gray areas. Noah selected all 4 for discussion.

| Area | Selected |
|------|----------|
| Branch strategy timing | ✓ |
| Overlay seeding depth | ✓ |
| Main Telegram bot identity | ✓ |
| Local auth + .env scope | ✓ |

---

## Branch strategy timing

### Q1 — Where does planning / Noah-specific work live?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep main as working branch | main stays working branch with .planning/ on it; upstream fast-forwards become merges | |
| Cut noah/main now | Move to noah/main, rebase .planning/ onto it, leave main as verbatim upstream mirror | ✓ |
| Lazy cut noah/main | Stay on main for Phase 1; cut noah/main when first real repo-file patch lands | |

**User's choice:** Cut noah/main now (Recommended)

### Q2 — Upstream sync workflow?

| Option | Description | Selected |
|--------|-------------|----------|
| Manual on demand | Noah runs git fetch+merge when he wants | |
| Weekly reminder | Scheduled nudge (Slack/Telegram), manual merge | ✓ |
| Auto fast-forward cron | VPS cron tries git pull upstream main nightly | |

**User's choice:** Weekly reminder (Recommended)
**Notes:** User started a comment ("isnt it al") that was cut off. Flagged in-session; user did not follow up — treated as non-blocking.

---

## Overlay seeding depth

### Q1 — ~/.claudeclaw/CLAUDE.md depth for Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Slim placeholder | Generic persona from CLAUDE.md.example with name filled in | |
| Real Ezra persona now | Copy existing NoahBrain Ezra Slack bot persona in Phase 1 | ✓ |
| Minimal named stub | Name + 3-4 key rules, full persona Phase 2 | |

**User's choice:** Real Ezra persona now (Recommended)

### Q2 — ~/.claudeclaw/hooks/ for Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Empty directory only | Satisfies FOUN-02 literally; no hook wiring | ✓ |
| Seed one NoahBrain hook | Copy scripts/notify.sh to prove end-to-end | |

**User's choice:** Empty directory only (Recommended)

### Q3 — First agent config stub — generic 'main' or named 'ezra'?

| Option | Description | Selected |
|--------|-------------|----------|
| Named 'ezra' | ~/.claudeclaw/agents/ezra/ with token env var + model, fleshed out Phase 2 | ✓ |
| Generic 'main' stub | ~/.claudeclaw/agents/main/ renamed in Phase 2 | |

**User's choice:** Named 'ezra' (Recommended)

---

## Main Telegram bot identity

### Q1 — What Telegram bot does the main agent use in Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Register permanent Ezra bot now | Create @ezra_claudeclaw_bot on BotFather, same token through Phase 7 | ✓ |
| Temp dev bot for Phase 1 | Throwaway dev bot locally; permanent bot at VPS cutover | |
| Reuse existing personal bot | Noah's existing personal Telegram bot token | |

**User's choice:** Register permanent Ezra bot now (Recommended)

### Q2 — Handle convention for the permanent bot?

| Option | Description | Selected |
|--------|-------------|----------|
| @ezra_claudeclaw_bot | Agent name + product name; scales to specialists | ✓ |
| @noah_ezra_bot | Owner + agent name | |
| Pick at BotFather (you decide) | Defer exact handle to registration time | |

**User's choice:** @ezra_claudeclaw_bot (Recommended)

---

## Local auth + .env scope

### Q1 — Local Claude auth mode for Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| ANTHROPIC_API_KEY locally too | Mirror VPS from day 1 | |
| Claude OAuth (claude login) locally | Fastest local start; diverges from VPS | ✓ |
| Either works (you decide) | Defer choice to setup wizard | |

**User's choice:** Claude OAuth (claude login) locally
**Notes:** User overrode the "mirror VPS" recommendation in favor of local speed. Divergence from VPS (ANTHROPIC_API_KEY) is intentional and accepted; documented in D-09.

### Q2 — Which optional features in .env for Phase 1? (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| GOOGLE_API_KEY (Gemini) | Video analysis, memory consolidation, auto-assign (Phase 5) | ✓ |
| Voice (Groq + ElevenLabs) | Transcription + TTS via Telegram | ✓ |
| War Room (voice boardroom) | Mac-only browser/mic feature | ✓ (initially, reversed below) |
| None — core only | Bare minimum keys, features flip on per-phase | |

**User's initial choice:** GOOGLE_API_KEY, Voice, War Room

### Q2-follow-up — War Room scope-creep check

Flagged that War Room is listed Out of Scope in PROJECT.md.

| Option | Description | Selected |
|--------|-------------|----------|
| Just wire the env var stub | WARROOM_ENABLED=false reserved; feature off | |
| Enable War Room in Phase 1 (override PROJECT.md) | Set WARROOM_ENABLED=true, update Out of Scope | |
| Drop War Room — keep it deferred | Leave Out of Scope intact, no WAR_ROOM env keys | ✓ |

**User's choice:** Drop War Room — keep it deferred

---

## Claude's Discretion

Areas where the planner/executor has latitude (per CONTEXT.md `### Claude's Discretion`):
- Ezra `agent.yaml` default model (Sonnet 4.6 vs Opus 4.7 — pick based on existing model fallback chain)
- Whether to wire the weekly upstream-sync reminder in Phase 1 or defer
- Exact Obsidian block in `ezra/agent.yaml` (commented default acceptable for Phase 1)
- Symlink strategy for future launchd paths
- Pre-adding specialist bot token env var names (as blanks) to `.env.example`

## Deferred Ideas

Captured in CONTEXT.md `<deferred>`:
- War Room (Out of Scope — stays)
- WhatsApp bridge (Out of Scope)
- Specialist bot tokens (Phase 4)
- Slack integration (Phase 2)
- Vault Obsidian wiring (Phase 3)
- Weekly upstream-sync reminder implementation (Phase 2 or 5 if non-trivial)
- Cloudflare Access (Phase 7)
- ANTHROPIC_API_KEY wiring (Phase 7)
- Nightly SQLite backup cron (Phase 7)
- launchd symlink strategy (Phase 7)

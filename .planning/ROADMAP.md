# Roadmap: ClaudeClaw

## Overview

ClaudeClaw is a personal multi-agent fleet running on a VPS. This roadmap covers the path from the May 4, 2026 fleet-shipping milestone forward through cross-process delegation, persona tuning, and the SDK Engine rebuild.

**Target:** Stage 2 cross-process delegation + persona polish in v1.1, SDK Engine rebuild as v2.0.

## Domain Expertise

None required beyond Node.js / TypeScript / SQLite / systemd / Anthropic SDK fluency.

## Current Milestone

**Milestone 2: Cross-Process Delegation + Polish (v1.1)** — extend in-process delegation to cross-process queue + Slack continuity, tighten the personas, and clean up dead code from the Gemini retirement.

## Milestones

### Milestone 1: Fleet Foundation (v1.0) ✓
**Goal:** Six-process fleet on VPS with in-process delegation, working memory extraction, and unified dashboard streaming.
**Status:** Complete (2026-05-04 session)

Phases:
- [x] Phase 1: Function/persona naming collapse — single-name agent IDs everywhere (commit `8be5ea0`)
- [x] Phase 2: Fleet rename deploy on VPS — systemd unit rename, .env token rename, DB migration backfill, registry verified
- [x] Phase 3: Memory extraction unblocked — Haiku via OAuth at 45s timeout (commit `286f861`)
- [x] Phase 4: Drop Gemini fallback — Haiku-only ingestion (commit `4bda72b`)
- [x] Phase 5: Cross-process Telegram → dashboard streaming — `conversation-log-tailer.ts` re-emits non-main rows on the main process bus, web Chat tabs pick up agent labels (commits `102bd8d`, `74c8e3c`)
- [x] Phase 6: Memory ingestion health badge — sidebar footer surfaces `getIngestionQuotaStatus` (commit `c213572`)
- [x] Phase 7: Obsidian vault path fix on specialists — yaml `vault:` paths swapped from macOS to VPS path; per-minute warning spam stopped
- [x] Phase 8: Linear v1 awareness pack install — appended to `~/.claudeclaw/CLAUDE.md` on local + VPS so all personas know `/linear:drop` vs inter-agent task, slim 3+3, prefix convention
- [x] Phase 9: Stale role-named agents removed from dashboard — deleted leftover `agents/{code,comms,content,ops,research}/agent.yaml` on VPS, registry now clean

### Milestone 2: Cross-Process Delegation + Polish (v1.1)
**Goal:** Slack delegation works (cross-process), specialist personas reply-vs-execute correctly, dead code from Gemini retirement is gone.
**Status:** Pending

Phases:
- [ ] Phase 1: Cross-process delegation queue — `delegated_tasks` table; producer in `bot.ts` + `slack-bot.ts` writes row + immediate "dispatched" reply; consumer in each specialist's `index.ts` polls + atomically claims; result delivery via Ezra's bot back to original transport (Slack `thread_ts` or Telegram `chat_id`); state machine `pending → in_progress → completed → delivered` with stale-claim TTL. (~3-4 hrs. Spec: `Business/scaling-engine-ops/work-logs/2026/05/2026-05-04-claudeclaw-delegation-memory-prd.md` §"Stage 2 plan".)
- [ ] Phase 2: Specialist persona prompt tuning — audit each of 5 specialist `agent.yaml`/`CLAUDE.md` for over-execution bias. Vera shipped `notify.sh` as a "confirm one line" reply on 2026-05-04; likely the others have similar reply-vs-action ambiguity. Add explicit "reply-only unless explicitly told to execute" guidance. (~1-2 hrs.)
- [ ] Phase 3: Quota-suspension dead-code cleanup — with Gemini fallback gone, `_ingestSuspendedUntil`, `_last429At`, `INGEST_QUOTA_BACKOFF_MS`, and `isQuotaError` in `src/memory-ingest.ts` are unreachable. Remove them and simplify `getIngestionQuotaStatus()` (or drop it + the dashboard badge plumbing). (~30 min.)
- [ ] Phase 4: Linear awareness pack maintenance — six new `/linear:*` skills landed after the pack was written (`plan-project`, `plan-sprint`, `refine-project`, `evaluate`, `dashboard`, `help`). Update the pack to either include them or explicitly mark them Noah-only. Also remove `/make:work` and `/cos:refine*` from the deprecated list (no longer on disk). (~30 min.)
- [ ] Phase 5: Auto-route inbound messages — Ezra inspects each incoming message and routes to the right specialist without requiring `@vera:` prefix. Heuristic + LLM-classifier hybrid; falls back to Ezra-handles-it on ambiguity. (Stage 3 of original FULL fleet plan. ~3-4 hrs. Depends on Phase 1 being live.)

### Milestone 3: SDK Engine (v2.0)
**Goal:** Optional `ENGINE=sdk` backend that calls the Anthropic Messages API directly, bypassing the `claude` CLI subprocess. Lower latency, in-process token accounting, direct streaming. CLI engine remains the default.
**Status:** Pending — RFC drafted (`docs/rfc-sdk-engine.md`)

Phases follow the RFC's existing 5-phase breakdown:

- [ ] Phase 1: Engine interface + cli adapter — extract the current `runAgent()` shape into an `Engine` interface; wrap existing CLI path as `CliEngine`. No behavior change.
- [ ] Phase 2: SDK adapter scaffolding — `SdkEngine` class with `query()` / `stream()` against `@anthropic-ai/sdk`. Mock Bash/Read/Write tool execution behind the same shape the agent loop expects.
- [ ] Phase 3: Tool execution loop — wire SDK tool-use messages into the existing tool registry (Bash, Read, Write, Glob, Grep, MCP servers). Round-trip tool results back through the loop.
- [ ] Phase 4: Token accounting + cost capture — hook usage events into existing `token_usage` writes. Streaming progress events emit `progress` ChatEvents the same way CLI does.
- [ ] Phase 5: Production toggle — `ENGINE=sdk` in `.env` flips per-process; per-agent `agent.yaml` override (e.g. Archie on SDK, others on CLI) for incremental rollout.

### Backlog (deferred, no milestone yet)

- [ ] Bidirectional memory sync — promote distilled SQLite memories into NoahBrain knowledge files via the Python `memory_compile.py` pipeline. Per the original PRD: defer until a week of real use, then re-evaluate.
- [ ] Ezra `obsidian:` block — main agent currently reaches the vault only via the Read tool. Could formalize scoping (root + `_strategy/` + `_meetings/` + `briefs/` + `knowledge/`) for parity with specialists.
- [ ] Pay for Gemini API key — only matters if we re-introduce Gemini as an extractor or a different feature. Deferred unless that resurrection comes up.

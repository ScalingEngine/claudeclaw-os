# Roadmap: ClaudeClaw

## Overview

ClaudeClaw is a personal multi-agent fleet running on a VPS. This roadmap now prioritizes making Archon the durable workflow engine for all ClaudeClaw agents before extending cross-process delegation or rebuilding the execution engine.

**Target:** Archon-backed agent workflows in v1.1, cross-process delegation and polish in v1.2, SDK Engine rebuild as v2.0.

## Domain Expertise

Node.js / TypeScript / SQLite / systemd / Anthropic SDK fluency, plus Archon workflow authoring and VPS operational discipline.

## Current Milestone

**Milestone 2: Archon Workflow Engine (v1.1)** — make Archon callable from ClaudeClaw's VPS agents, define safe workspace boundaries, teach every persona when to use workflows, and ship a starter workflow pack for coding and business processes.

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
- [x] Phase 8: Linear v1 awareness pack install — appended to `~/.claudeclaw/CLAUDE.md` on local + VPS so all personas know `/linear:drop` vs inter-agent tasks, slim 3+3 protocol, prefix conventions
- [x] Phase 9: Stale role-named agents removed from dashboard — deleted leftover `agents/{code,comms,content,ops,research}/agent.yaml` on VPS, registry now clean

### Milestone 2: Archon Workflow Engine (v1.1)
**Goal:** All ClaudeClaw agents can use Archon as the durable workflow engine for coding and business processes while keeping skills/react loops for quick one-off work.
**Status:** Pending

VPS analysis from 2026-05-05:
- Archon source checkout exists at `/home/devuser/remote-coding-agent`.
- `bun run cli workflow list --cwd /home/devuser/claudeclaw` works and discovers 20 bundled workflows.
- `archon` is not currently on the non-interactive PATH used by SSH/systemd.
- `~/.archon/.archon/workflows/` still exists and triggers Archon's legacy-path warning; current path should be `~/.archon/workflows/`.
- ClaudeClaw production checkout is `/home/devuser/claudeclaw`; all six `claudeclaw-*` systemd services are active.

Phases:
- [ ] Phase 1: VPS Archon runtime surface — create a reliable Archon invocation path for systemd-run ClaudeClaw agents; verify `workflow list` against `/home/devuser/claudeclaw`; fix legacy global workflow path warning; document environment and credential loading. Requirements: ARCH-01, ARCH-02, ARCH-03, ARCH-04.
- [ ] Phase 2: Safe workspace and deploy boundary — establish non-production Archon workspaces/worktrees for agent work; document forbidden production state; preserve commit-based deploy and rollback rules. Requirements: SAFE-01, SAFE-02, SAFE-03, SAFE-04.
- [ ] Phase 3: Agent workflow routing policy — update Ezra, Vera, Poe, Cole, Hopper, and Archie personas with direct-answer vs skill/react-loop vs Archon-workflow guidance, including external-effect approval rules. Requirements: ROUT-01, ROUT-02, ROUT-03, ROUT-04, ROUT-05.
- [ ] Phase 4: ClaudeClaw workflow pack — add and validate starter workflows for coding plan-to-PR, bugfix, strategy/business ingestion, ops triage, comms/content drafting, and workflow authoring. Requirements: FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-06.
- [ ] Phase 5: Workflow observability and cleanup — surface workflow runs in agent responses or hive_mind-style activity, standardize failure reports, and give Archie/Hopper safe inspection and cleanup paths for active/stale runs. Requirements: OBS-01, OBS-02, OBS-03.

### Milestone 3: Cross-Process Delegation + Polish (v1.2)
**Goal:** Slack delegation works cross-process, specialist personas reply-vs-execute correctly, dead code from Gemini retirement is gone.
**Status:** Pending

Phases:
- [ ] Phase 1: Cross-process delegation queue — `delegated_tasks` table; producer in `bot.ts` + `slack-bot.ts` writes row + immediate "dispatched" reply; consumer in each specialist's `index.ts` polls + atomically claims; result delivery via Ezra's bot back to original transport (Slack `thread_ts` or Telegram `chat_id`); state machine `pending → in_progress → completed → delivered` with stale-claim TTL. Spec: `Business/scaling-engine-ops/work-logs/2026/05/2026-05-04-claudeclaw-delegation-memory-prd.md` §"Stage 2 plan".
- [ ] Phase 2: Specialist persona prompt tuning — audit each of 5 specialist `agent.yaml`/`CLAUDE.md` for over-execution bias. Vera shipped `notify.sh` as a "confirm one line" reply on 2026-05-04; likely the others have similar reply-vs-action ambiguity.
- [ ] Phase 3: Quota-suspension dead-code cleanup — with Gemini fallback gone, `_ingestSuspendedUntil`, `_last429At`, `INGEST_QUOTA_BACKOFF_MS`, and `isQuotaError` in `src/memory-ingest.ts` are unreachable.
- [ ] Phase 4: Linear awareness pack maintenance — six new `/linear:*` skills landed after the pack was written (`plan-project`, `plan-sprint`, `refine-project`, `evaluate`, `dashboard`, `help`). Update the pack to either include them or explicitly mark them Noah-only.
- [ ] Phase 5: Auto-route inbound messages — Ezra inspects each incoming message and routes to the right specialist without requiring `@vera:` prefix. Heuristic + LLM-classifier hybrid; falls back to Ezra-handles-it on ambiguity. Depends on the delegation queue and should account for Archon workflow routing.

### Milestone 4: SDK Engine (v2.0)
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

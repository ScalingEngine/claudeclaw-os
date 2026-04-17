# ClaudeClaw OS — Noah's Agent Fleet

## What This Is

A forked agent operating system (from earlyaidopters/claudeclaw-os) that gives Noah a visual dashboard ("Mission Control"), always-on multi-agent fleet, and task orchestration layer on his VPS — with Ezra promoted to the main agent and the full NoahBrain stack (Obsidian vault, 200+ skills, heartbeat, COS workflows, Notion/Linear/Slack integrations) flowing through the fleet. Accessible via dashboard on phone, Telegram for personal/mobile, and Slack for team-visible work.

## Core Value

Noah can see, command, and delegate to his entire agent fleet from a single dashboard on his phone — and the right agent picks up the right work without manual routing.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — inherited from upstream ClaudeClaw OS -->

- ✓ Dashboard serves on Hono with agent cards, cost tracking, memory landscape — existing
- ✓ SQLite hive-mind with 22 tables, AES-256-GCM field encryption — existing
- ✓ Telegram bot integration via grammY — existing
- ✓ Scheduled tasks with cron-parser — existing
- ✓ Mission Control kanban with task assignment — existing
- ✓ Inter-agent delegation via @agent: syntax — existing
- ✓ Memory system with embeddings, decay, consolidation — existing
- ✓ Agent creation wizard (Telegram bot provisioning) — existing
- ✓ Hive Mind cross-agent activity feed — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Ezra (main agent) runs as ClaudeClaw's primary agent with Slack as home channel
- [ ] NoahBrain vault (~/ClaudeCode/NoahBrain/Memory/) readable by all agents via Obsidian integration
- [ ] All 200+ existing ~/.claude/skills/ auto-registered and available to agents
- [ ] COS agent runs morning briefs, blocker tracking, pulse checks, handoff routing
- [ ] Research agent handles deep-dive investigations, competitor analysis, domain research
- [ ] Comms agent drafts emails, Slack messages, meeting follow-ups
- [ ] Ops/Content agent handles client work, content drafting, social posts, campaign ops
- [ ] Archie (Developer) agent handles code tasks, PR reviews, build monitoring
- [ ] Dashboard accessible on phone via Cloudflare Access-protected URL
- [ ] Telegram as second channel for personal/mobile agent interaction
- [ ] Slack integration for team-visible work and Ezra's primary interface
- [ ] Heartbeat (30-min) coexists — either kept as launchd/systemd or migrated to ClaudeClaw scheduler
- [ ] Notion DB integration (handoff queue, comms queue, briefs) available as skills/hooks
- [ ] Linear integration available to agents for task tracking
- [ ] VPS deployment with systemd, ANTHROPIC_API_KEY (not OAuth), nightly SQLite backup
- [ ] Upstream tracking — main branch stays clean for fast-forward merges from earlyaidopters/claudeclaw-os

### Out of Scope

- WhatsApp bridge — experimental upstream, memory-heavy Puppeteer, not needed — defer
- War Room voice boardroom — requires browser/mic, Mac-only feature, not VPS-compatible — defer
- Google Meet bot integration — complex, not core to agent fleet — defer
- Replacing NoahBrain vault with ClaudeClaw's memory system — vault is the source of truth, ClaudeClaw memory is additive
- Multi-user auth / RBAC — single-user system, Noah only
- Custom dashboard UI components — upstream dashboard is a 152KB inline HTML string, don't fork it yet

## Context

**Upstream repo:** earlyaidopters/claudeclaw-os (purchased, no license concerns)
- 8 commits, 2 days old, one author, pre-1.0
- Node 20+ / TypeScript / ESM / better-sqlite3 / Hono / grammY
- Expects breaking changes — overlay + feature-branch strategy to minimize merge pain
- RFC for SDK engine rewrite exists (docs/rfc-sdk-engine.md) — architectural changes likely

**Noah's existing stack:**
- NoahBrain: Obsidian vault + Python scripts + SQLite on Mac, syncs via git to VPS every 2 min
- Ezra: Slack bot on VPS (systemd), Python + Slack Bolt, ~150-200 MB RAM
- Heartbeat: launchd (Mac) every 30 min — pulse delivery, fire watch, sitrep, queue update
- Skills: 200+ in ~/.claude/skills/ — auto-scanned by ClaudeClaw's skill-registry.ts
- Integrations: Notion, Linear, Gmail, Slack, GHL, Make.com, Metricool, Fireflies via MCP + Python scripts

**VPS considerations:**
- ANTHROPIC_API_KEY required (not OAuth — headless re-auth is a known pain point)
- Dashboard behind Cloudflare Access only (bearer token auth alone is insufficient)
- store/claudeclaw.db on VPS local disk, NOT in vault git sync (SQLite + git = corruption)
- Nightly sqlite3 .backup to private GitHub repo
- 5 agents idle ≈ 1 GB RAM; coexists with Ezra if VPS has ≥2 GB free

**Fork strategy:**
- Fork at ScalingEngine/claudeclaw-os with upstream remote
- `main` branch: verbatim fast-forward from upstream
- `noah/main` branch: Noah-specific patches (core edits only when overlay isn't enough)
- `~/.claudeclaw/` overlay: agents, CLAUDE.md, hooks — external to repo, no merge conflicts
- Never edit: src/dashboard-html.ts, src/dashboard.ts, src/db.ts (guaranteed upstream conflicts)

## Constraints

- **VPS RAM**: Agent fleet + Ezra must fit within available VPS memory (~4 GB total)
- **Upstream churn**: 3-day-old repo, expect breaking changes — minimize core file edits
- **Telegram bot tokens**: Each agent needs its own BotFather token (6 bots total)
- **Slack integration**: ClaudeClaw's Slack support is basic (xoxp token) — may need enhancement for Ezra's full capability
- **No OAuth on VPS**: Must use ANTHROPIC_API_KEY for all Claude API calls
- **Dashboard security**: Must be behind Cloudflare Access — raw DASHBOARD_TOKEN exposure = full RCE risk

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork to ScalingEngine/claudeclaw-os | Paid repo, need upstream tracking + Noah customization | — Pending |
| Overlay strategy (~/.claudeclaw/) over core edits | Minimize merge conflicts, upstream ships fast | — Pending |
| VPS as primary host, Mac as optional second instance | Always-on agents need always-on host; Ezra already there | — Pending |
| Ezra as main agent (not separate) | Consolidate, don't fragment — one fleet, one dashboard | — Pending |
| Slack primary + Telegram secondary + Dashboard | Slack for team visibility, Telegram for personal mobile, Dashboard for oversight | — Pending |
| 6-agent fleet: Ezra (main), COS, Research, Comms, Ops/Content, Archie (Dev) | Cover all of Noah's operational modes | — Pending |
| ANTHROPIC_API_KEY not OAuth | Headless VPS can't re-auth via browser | — Pending |
| Cloudflare Access for dashboard | Bearer token alone insufficient for internet-facing dashboard | — Pending |
| Keep heartbeat as launchd/systemd (don't migrate to scheduler) | Heartbeat is Python-native, battle-tested, simpler to keep separate | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-17 after initialization*

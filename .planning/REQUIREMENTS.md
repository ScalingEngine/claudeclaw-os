# Requirements: ClaudeClaw OS — Noah's Agent Fleet

**Defined:** 2026-04-17
**Core Value:** Noah can see, command, and delegate to his entire agent fleet from a single dashboard on his phone — and the right agent picks up the right work without manual routing.

## v1 Requirements

### Foundation

- [ ] **FOUN-01**: Fork configured with noah/main branch and upstream remote for fast-forward merges
- [ ] **FOUN-02**: ~/.claudeclaw/ overlay directory created with Noah-specific CLAUDE.md, agent configs, and hooks
- [ ] **FOUN-03**: npm dependencies installed and TypeScript project compiles without errors
- [ ] **FOUN-04**: .env configured with required vars per D-10 (bot token, chat ID, dashboard token, DB encryption key, dashboard port, and pre-wired optional Gemini/Groq/ElevenLabs keys). ANTHROPIC_API_KEY deferred to Phase 7 (VPS-only) per D-09.
- [ ] **FOUN-05**: Dashboard loads on localhost:3141 and responds to health check
- [ ] **FOUN-06**: Main Telegram bot responds to a test message from Noah's allowed chat ID

### Ezra Integration

- [ ] **EZRA-01**: Ezra configured as ClaudeClaw's main agent with his existing persona/CLAUDE.md
- [ ] **EZRA-02**: Slack is Ezra's primary channel — messages in Slack workspace reach the main agent
- [ ] **EZRA-03**: Telegram available as secondary channel for personal/mobile interaction
- [ ] **EZRA-04**: NoahBrain vault (~/ClaudeCode/NoahBrain/Memory/) readable by Ezra via Obsidian integration config
- [ ] **EZRA-05**: All ~/.claude/skills/ auto-registered and callable by Ezra via skill-registry.ts
- [ ] **EZRA-06**: Ezra can read and act on queue/BLOCKERS.md, queue/DECISIONS.md, 00-today.md

### Agent Fleet

- [ ] **FLEET-01**: COS agent configured with morning brief, blocker tracking, pulse check, handoff routing capabilities
- [ ] **FLEET-02**: Research agent configured for deep-dive investigations, competitor analysis, domain research
- [ ] **FLEET-03**: Comms agent configured for email drafts, Slack messages, meeting follow-ups
- [ ] **FLEET-04**: Ops/Content agent configured for client work, content drafting, social posts, campaign ops
- [ ] **FLEET-05**: Archie (Developer) agent configured for code tasks, PR reviews, build monitoring
- [ ] **FLEET-06**: Each agent has its own Telegram bot token and responds independently
- [ ] **FLEET-07**: Inter-agent delegation works — main agent can route tasks to specialists via @agent: syntax
- [ ] **FLEET-08**: Gemini-Flash auto-assign routes unassigned Mission Control tasks to the right agent

### Integrations

- [ ] **INTG-01**: Notion DB access (handoff queue, comms queue, briefs) available as skills or hooks
- [ ] **INTG-02**: Linear integration available for task tracking, blocker detection, sprint queries
- [ ] **INTG-03**: Heartbeat output (30-min pulse) readable by agents — sitreps, queue state, briefs
- [ ] **INTG-04**: Gmail/Calendar access via existing Google MCP or skill wiring
- [ ] **INTG-05**: Slack integration for team-visible work across SE/CCP/Vektr workspaces
- [ ] **INTG-06**: All existing MCP servers from Noah's Claude Code config available to agents

### VPS Deployment

- [ ] **VPS-01**: ClaudeClaw runs on VPS via systemd --user services (main + sub-agents)
- [ ] **VPS-02**: Dashboard accessible via Cloudflare Access-protected URL from phone
- [ ] **VPS-03**: OAuth token auth working for Claude API calls on VPS
- [ ] **VPS-04**: Nightly sqlite3 .backup cron pushes DB snapshot to private GitHub repo
- [ ] **VPS-05**: store/claudeclaw.db on VPS local disk — NOT in vault git sync
- [ ] **VPS-06**: VPS has enough RAM headroom for 6 agents + existing Ezra process

### Observability

- [ ] **OBS-01**: Dashboard shows all 6 agents with status (running/stopped), model, today's turns and cost
- [ ] **OBS-02**: Hive Mind feed displays cross-agent activity in real time
- [ ] **OBS-03**: Token cost tracking visible per-agent and aggregate on dashboard
- [ ] **OBS-04**: Scheduled tasks visible with next-run countdown and last-result status
- [ ] **OBS-05**: Mission Control kanban shows task inbox, per-agent columns, and completed history

### Morning Brief

- [ ] **BRIEF-01**: COS agent produces a morning brief combining vault state, Linear blockers, calendar, and overnight activity
- [ ] **BRIEF-02**: Morning brief delivered via Slack (primary) and viewable on dashboard
- [ ] **BRIEF-03**: Noah can route tasks from the brief to specialist agents via dashboard or Telegram

## v2 Requirements

### Enhanced Dashboard

- **DASH-01**: Live log tail / terminal stream per agent (not just hive-mind summaries)
- **DASH-02**: File-change diffs showing what agents wrote to disk
- **DASH-03**: MCP server status panel showing connected/failed tools per agent
- **DASH-04**: Latency histograms and error rates per agent

### War Room

- **WAR-01**: Voice boardroom with per-agent Cartesia/Gemini voices (Mac only)
- **WAR-02**: Hand-raise routing with Gemini router

### Mobile

- **MOB-01**: Progressive web app wrapper for dashboard on iPhone
- **MOB-02**: Push notifications for urgent agent activity

## Out of Scope

| Feature | Reason |
|---------|--------|
| WhatsApp bridge | Experimental upstream, Puppeteer memory-heavy, not needed |
| Google Meet bot | Complex integration, not core to agent fleet |
| Multi-user auth / RBAC | Single-user system, Noah only |
| Custom dashboard UI rewrites | 152KB inline HTML string — don't fork until upstream stabilizes |
| Replacing NoahBrain vault | Vault is source of truth; ClaudeClaw memory is additive |
| Mac second instance | Defer — VPS is primary, Mac optional later |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUN-01 | Phase 1 | Pending |
| FOUN-02 | Phase 1 | Pending |
| FOUN-03 | Phase 1 | Pending |
| FOUN-04 | Phase 1 | Pending |
| FOUN-05 | Phase 1 | Pending |
| FOUN-06 | Phase 1 | Pending |
| EZRA-01 | Phase 2 | Pending |
| EZRA-02 | Phase 2 | Pending |
| EZRA-03 | Phase 2 | Pending |
| EZRA-04 | Phase 3 | Pending |
| EZRA-05 | Phase 3 | Pending |
| EZRA-06 | Phase 3 | Pending |
| FLEET-01 | Phase 4 | Pending |
| FLEET-02 | Phase 4 | Pending |
| FLEET-03 | Phase 4 | Pending |
| FLEET-04 | Phase 4 | Pending |
| FLEET-05 | Phase 4 | Pending |
| FLEET-06 | Phase 4 | Pending |
| FLEET-07 | Phase 5 | Pending |
| FLEET-08 | Phase 5 | Pending |
| INTG-01 | Phase 6 | Pending |
| INTG-02 | Phase 6 | Pending |
| INTG-03 | Phase 6 | Pending |
| INTG-04 | Phase 6 | Pending |
| INTG-05 | Phase 6 | Pending |
| INTG-06 | Phase 6 | Pending |
| VPS-01 | Phase 7 | Pending |
| VPS-02 | Phase 7 | Pending |
| VPS-03 | Phase 7 | Pending |
| VPS-04 | Phase 7 | Pending |
| VPS-05 | Phase 7 | Pending |
| VPS-06 | Phase 7 | Pending |
| OBS-01 | Phase 8 | Pending |
| OBS-02 | Phase 8 | Pending |
| OBS-03 | Phase 8 | Pending |
| OBS-04 | Phase 8 | Pending |
| OBS-05 | Phase 8 | Pending |
| BRIEF-01 | Phase 9 | Pending |
| BRIEF-02 | Phase 9 | Pending |
| BRIEF-03 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-17*
*Last updated: 2026-04-18 — FOUN-04 text aligned with D-09 (local OAuth, no ANTHROPIC_API_KEY in Phase 1)*

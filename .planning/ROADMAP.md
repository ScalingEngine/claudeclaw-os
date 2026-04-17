# Roadmap: ClaudeClaw OS — Noah's Agent Fleet

## Overview

This is a brownfield configuration and integration project forking the ClaudeClaw OS codebase into Noah's operational stack. The underlying engine already works — the work is wiring Ezra and five specialist agents into a unified fleet, connecting the NoahBrain vault and all integrations, deploying to VPS with proper security, and verifying the dashboard gives full visibility from a phone. The roadmap runs from repo setup through a live morning brief.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Repo configured, overlay created, env wired, dashboard and Telegram verified locally
- [ ] **Phase 2: Ezra Core** - Ezra running as main agent with Slack primary and Telegram secondary channels active
- [ ] **Phase 3: Ezra Vault & Skills** - NoahBrain vault readable, all 200+ skills registered, queue files accessible
- [ ] **Phase 4: Specialist Agents** - COS, Research, Comms, Ops/Content, and Archie agents configured with independent Telegram bots
- [ ] **Phase 5: Agent Routing** - Inter-agent delegation working and Gemini auto-assign routing unassigned tasks
- [ ] **Phase 6: Integrations** - Notion, Linear, Heartbeat, Gmail, Slack, and MCP wired to all agents
- [ ] **Phase 7: VPS Deployment** - Fleet running on VPS via systemd with Cloudflare Access, API key, backup, and RAM verified
- [ ] **Phase 8: Observability** - Dashboard shows all agents live with costs, hive mind feed, scheduled tasks, and kanban
- [ ] **Phase 9: Morning Brief** - COS agent produces and delivers morning brief; Noah can route tasks from it

## Phase Details

### Phase 1: Foundation
**Goal**: The forked repo is configured for Noah's workflow, the overlay is in place, the project compiles, and both the dashboard and Telegram bot respond to basic checks
**Depends on**: Nothing (first phase)
**Requirements**: FOUN-01, FOUN-02, FOUN-03, FOUN-04, FOUN-05, FOUN-06
**Success Criteria** (what must be TRUE):
  1. `git remote -v` shows both origin (ScalingEngine/claudeclaw-os) and upstream (earlyaidopters/claudeclaw-os) with noah/main as working branch
  2. `~/.claudeclaw/` directory exists with Noah-specific CLAUDE.md, at least one agent config stub, and a hooks directory
  3. `npm run build` (or equivalent) completes without TypeScript errors
  4. `curl localhost:3141/health` returns a success response
  5. Sending a message to the main Telegram bot from Noah's allowed chat ID produces a reply
**Plans**: TBD

### Phase 2: Ezra Core
**Goal**: Ezra is the active main agent in ClaudeClaw with Slack as his primary interface and Telegram as secondary — Noah can reach Ezra through either channel
**Depends on**: Phase 1
**Requirements**: EZRA-01, EZRA-02, EZRA-03
**Success Criteria** (what must be TRUE):
  1. ClaudeClaw's main agent card shows Ezra's name, persona, and model on the dashboard
  2. A Slack message in the configured workspace channel is received and answered by Ezra
  3. A Telegram message to the main bot receives an Ezra-branded reply
  4. Ezra's CLAUDE.md persona (from existing NoahBrain config) is active — not the default agent persona
**Plans**: TBD

### Phase 3: Ezra Vault & Skills
**Goal**: Ezra can read Noah's NoahBrain vault files and invoke any of the 200+ existing skills — he has full operational context before receiving a task
**Depends on**: Phase 2
**Requirements**: EZRA-04, EZRA-05, EZRA-06
**Success Criteria** (what must be TRUE):
  1. Asking Ezra to summarize today's plan returns content from `00-today.md` in the NoahBrain vault
  2. Asking Ezra to list available skills returns a count consistent with `~/.claude/skills/` (200+ skills)
  3. Asking Ezra "what are the current blockers?" returns content sourced from `queue/BLOCKERS.md`
  4. `skill-registry.ts` scan covers `~/.claude/skills/` and registers without errors in the startup log
**Plans**: TBD

### Phase 4: Specialist Agents
**Goal**: All five specialist agents (COS, Research, Comms, Ops/Content, Archie) are configured and reachable on their own Telegram bots — each responds to a domain-relevant test message
**Depends on**: Phase 3
**Requirements**: FLEET-01, FLEET-02, FLEET-03, FLEET-04, FLEET-05, FLEET-06
**Success Criteria** (what must be TRUE):
  1. The dashboard shows six agent cards (Ezra + 5 specialists), each with correct name and model
  2. Each of the five specialist Telegram bots replies to a test message with a response consistent with their role (COS briefs, Research investigates, Comms drafts, Ops/Content operates, Archie codes)
  3. `~/.claudeclaw/agents/` (or equivalent overlay dir) contains a config file per specialist agent
  4. No agent conflicts with another's Telegram token — six distinct BotFather tokens in use
**Plans**: TBD

### Phase 5: Agent Routing
**Goal**: Ezra can delegate tasks to specialist agents using @agent: syntax, and unassigned Mission Control tasks are automatically routed to the right agent by Gemini Flash
**Depends on**: Phase 4
**Requirements**: FLEET-07, FLEET-08
**Success Criteria** (what must be TRUE):
  1. Sending Ezra a message starting with `@research:` triggers the Research agent and the task appears in the Research agent's queue
  2. A task added to Mission Control with no agent assigned is picked up and auto-routed within one scheduling cycle
  3. The Hive Mind feed shows the delegation chain — Ezra dispatched, specialist accepted
  4. Noah can inspect which agent handled a delegated task from the dashboard or Telegram
**Plans**: TBD

### Phase 6: Integrations
**Goal**: Agents can reach Notion, Linear, Heartbeat output, Gmail, Slack, and all MCP servers — every major operational data source is a callable skill or hook
**Depends on**: Phase 3
**Requirements**: INTG-01, INTG-02, INTG-03, INTG-04, INTG-05, INTG-06
**Success Criteria** (what must be TRUE):
  1. Asking Ezra to check the Notion handoff queue returns the current queue items
  2. Asking Ezra to show open Linear blockers for SE returns a non-empty or confirmed-empty list
  3. Agents can read the latest heartbeat sitrep output file — Ezra reports on it when asked
  4. Asking Ezra to draft an email from Gmail context produces a draft using recent inbox context
  5. A cross-workspace Slack message (SE, CCP, or Vektr) is routable through the Slack integration skill
**Plans**: TBD

### Phase 7: VPS Deployment
**Goal**: The entire fleet runs persistently on the VPS under systemd, is accessible via Cloudflare Access on Noah's phone, uses ANTHROPIC_API_KEY (not OAuth), stores the DB safely off the vault sync, and has enough RAM headroom
**Depends on**: Phase 6
**Requirements**: VPS-01, VPS-02, VPS-03, VPS-04, VPS-05, VPS-06
**Success Criteria** (what must be TRUE):
  1. `systemctl --user status claudeclaw` (and per-agent units) shows active/running after VPS reboot
  2. Noah can open the dashboard URL on his phone and see the agent fleet (Cloudflare Access login, then dashboard)
  3. The running ClaudeClaw process uses ANTHROPIC_API_KEY from env — no OAuth flow, no browser re-auth required
  4. A nightly cron entry exists and a DB snapshot appears in the private GitHub backup repo the morning after deployment
  5. `store/claudeclaw.db` is on VPS local disk and is absent from the vault git repo working tree
  6. `free -h` on VPS with all 6 agents running shows at least 200 MB free (Ezra legacy process + fleet within budget)
**Plans**: TBD

### Phase 8: Observability
**Goal**: The dashboard is the single pane of glass — Noah can see every agent's status, cost, and activity, plus scheduled tasks and the Mission Control kanban, from any device
**Depends on**: Phase 7
**Requirements**: OBS-01, OBS-02, OBS-03, OBS-04, OBS-05
**Success Criteria** (what must be TRUE):
  1. Dashboard shows all 6 agents with current status (running/stopped), model name, and today's turn count + cost per agent
  2. Hive Mind feed updates in real time when any agent processes a message — visible without page refresh
  3. Aggregate token cost across all agents is visible on the dashboard, and individual agent costs match OBS-01 cards
  4. Scheduled tasks (including any COS morning brief cron) show next-run time and last-result status
  5. Mission Control kanban displays task inbox, per-agent columns, and a completed history lane
**Plans**: TBD
**UI hint**: yes

### Phase 9: Morning Brief
**Goal**: Every morning, the COS agent produces a consolidated brief from vault state, Linear blockers, and calendar — delivers it to Slack, and Noah can act on it by routing tasks to specialist agents
**Depends on**: Phase 8
**Requirements**: BRIEF-01, BRIEF-02, BRIEF-03
**Success Criteria** (what must be TRUE):
  1. At the scheduled morning time, COS agent produces a brief containing at least vault daily plan summary, Linear blockers, and any flagged calendar items
  2. The brief message arrives in the configured Slack channel before Noah's workday starts
  3. The brief is also viewable on the dashboard (mission control or a dedicated brief card/panel)
  4. From either Slack or Telegram, Noah can reply with a routing command (e.g. "@research: investigate X from brief") and the task reaches the correct agent
**Plans**: TBD

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/0 | Not started | - |
| 2. Ezra Core | 0/0 | Not started | - |
| 3. Ezra Vault & Skills | 0/0 | Not started | - |
| 4. Specialist Agents | 0/0 | Not started | - |
| 5. Agent Routing | 0/0 | Not started | - |
| 6. Integrations | 0/0 | Not started | - |
| 7. VPS Deployment | 0/0 | Not started | - |
| 8. Observability | 0/0 | Not started | - |
| 9. Morning Brief | 0/0 | Not started | - |

---
*Roadmap created: 2026-04-15*
*Last updated: 2026-04-15 after initialization*

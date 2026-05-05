# ClaudeClaw

## What This Is

Noah Wessel's personal multi-agent fleet — a Telegram/Slack-first AI assistant infrastructure running 24/7 on a VPS. One orchestrator (Ezra, COS) plus five specialists (Vera/research, Poe/comms, Cole/content, Hopper/ops, Archie/code), each with their own Telegram bot, persona prompt, and scoped Obsidian vault access into NoahBrain. The fleet shares a single SQLite store for memory, conversation log, hive-mind action feed, and inter-agent task tracking.

Built on top of the upstream `claudeclaw-os` engine (https://github.com/ScalingEngine/claudeclaw-os). Customization is additive (new agents, new CLAUDE.md content, agents/{id}/) so upstream pulls don't conflict.

## Core Value

Noah can DM Ezra with anything — status pulses, decision-blocked items, comms drafts, ops triage, code work — and the right specialist runs the work with full NoahBrain context, persistent memory across sessions, and visibility in a single dashboard. The promise is *one front door for the whole knowledge-work surface.*

## Current Milestone: v1.1 Archon Workflow Engine

**Goal:** Make Archon the durable workflow engine for all ClaudeClaw agents, while preserving skills and agent react loops for one-off answers and quick repeatable actions.

**Target features:**
- VPS Archon is callable reliably from ClaudeClaw's systemd-run agents, not only from an interactive shell.
- Ezra, Vera, Poe, Cole, Hopper, and Archie share a clear routing policy: skills/react loops for quick tasks; Archon workflows for coding and business processes that need phases, gates, artifacts, or repeatability.
- ClaudeClaw has a safe Archon workspace model that prevents agents from mutating the production checkout or copying production secrets into worktrees.
- Agent persona overlays teach every specialist how and when to invoke Archon workflows, with explicit approval boundaries for external effects.
- Initial ClaudeClaw-specific Archon workflows cover coding, strategy/business ingestion, ops triage, comms/content production, and workflow authoring.

## Architecture (one screen)

- **Engine:** Node.js + `@anthropic-ai/claude-agent-sdk` spawning per-turn `claude` CLI processes (subprocess model). Replacement candidate: SDK Engine RFC (direct Anthropic Messages API, see `docs/rfc-sdk-engine.md`).
- **Transports:** Telegram (per-bot per-agent), Slack (Ezra-only Socket Mode listener), Dashboard (Hono+SSE+Preact SPA on `:8443` via Tailscale).
- **Persistence:** SQLite at `store/claudeclaw.db` — `conversation_log`, `memories`, `inter_agent_tasks`, `hive_mind`, `audit_log`, `token_usage`, `scheduled_tasks`.
- **Memory:** Two layers. Conversational (SQLite, auto-extracted via Haiku per turn) merged at runtime with canonical (NoahBrain vault, Python-compiled, synced via Ezra-Python).
- **Workflow engine:** Archon source checkout exists on the VPS at `/home/devuser/remote-coding-agent`; workflows are discoverable against `/home/devuser/claudeclaw` through `/home/devuser/claudeclaw/scripts/archon-vps.sh`, including from `systemd-run --user`.
- **Deploy:** 6 user-systemd services on `srv1310498` (`claudeclaw-{ezra,vera,poe,cole,hopper,archie}.service`). One shared `.env`, one shared DB, one shared vault.

## Requirements

### Validated

<!-- Shipped and confirmed working. -->

- ✓ Six-process fleet on VPS user systemd
- ✓ Single-name agent IDs everywhere (ezra/vera/poe/cole/hopper/archie) — no role/persona dual naming
- ✓ Per-agent Telegram bots with separate tokens
- ✓ Slack listener gated to main agent only
- ✓ In-process delegation via `@vera:` prefix syntax (writes `inter_agent_tasks`)
- ✓ Memory extraction via Claude Haiku through Agent SDK OAuth (45s timeout)
- ✓ Cross-process Telegram → dashboard streaming via `conversation_log` tailer
- ✓ Per-agent dashboard chat tabs with All view + agent labels
- ✓ Per-specialist Obsidian vault scoping (read_only knowledge, queue/briefs writeable)
- ✓ Memory ingestion health badge in sidebar footer
- ✓ Linear v1 awareness pack at `~/.claudeclaw/CLAUDE.md` — agents know `/linear:drop` vs inter-agent tasks, slim 3+3 protocol, prefix conventions
- ✓ Archon command surface for VPS/systemd contexts — wrapper, status doctor, legacy workflow migration, and credential-file permission check validated in Phase 1

### Active

<!-- Current scope. Building toward these. -->

- [ ] Agent workflow routing — codify when agents should answer directly, use a skill/react loop, or launch an Archon workflow.
- [ ] Safe workspaces — establish non-production Archon worktrees/workspaces and secret boundaries for ClaudeClaw-related work.
- [ ] Persona prompt updates — teach Ezra, Vera, Poe, Cole, Hopper, and Archie the Archon-first workflow policy and approval boundaries.
- [ ] Starter workflow pack — define and validate ClaudeClaw-specific coding and business-process workflows.

### Future (next milestone candidates)

- [ ] Cross-process delegation queue — `delegated_tasks` table + producer/consumer for cross-process Slack delegation with persistent per-chat session continuity (Stage 2 of original FULL fleet plan)
- [ ] Specialist persona prompt tuning — observed Vera over-interpreting "confirm" as "execute via notify.sh"; likely all 5 personas need a reply-vs-execute pass
- [ ] Quota-suspension dead-code cleanup — `_ingestSuspendedUntil` path is unreachable now that the Gemini fallback is gone
- [ ] Auto-route inbound messages to the right specialist without `@vera:` prefix (Stage 3 of original FULL fleet plan)
- [ ] SDK Engine — direct Anthropic Messages API backend, see `docs/rfc-sdk-engine.md` (its own milestone, 5 phases)
- [ ] Bidirectional memory sync — promote distilled SQLite memories into NoahBrain knowledge files
- [ ] Ezra `obsidian:` block — main agent currently reaches the vault via Read tool only

### Out of Scope

<!-- Explicit boundaries. Reasoning included to prevent re-adding. -->

- **Symphony-style ephemeral per-issue agents** — sacrifices persona memory and chat-relationship value; bad fit for ClaudeClaw personas. Symphony pattern reserved for coding work (Implementor/Vektr dev) only.
- **Linear mirror in ClaudeClaw** — agents query `linear-{se,vektr,cnstrux}` MCPs directly. Linear is the source of truth, not a synced shadow.
- **Editing `src/`** — engine code is upstream. All customization stays in `agents/{id}/`, `~/.claudeclaw/CLAUDE.md`, or new agent directories. Direct edits to `src/` break upstream pulls.
- **Custom dashboard re-skinning** — out of scope until upstream stabilizes; hive_mind feed already renders Linear actions automatically.
- **Sandcastle adoption in v1.1** — deferred. Archon is the selected workflow engine for this milestone; Sandcastle can be re-evaluated later for lower-level sandbox orchestration if Archon leaves a gap.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-05 after verifying Phase 1 VPS Archon runtime surface*

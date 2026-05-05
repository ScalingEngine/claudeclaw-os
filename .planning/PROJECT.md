# ClaudeClaw

## What This Is

Noah Wessel's personal multi-agent fleet — a Telegram/Slack-first AI assistant infrastructure running 24/7 on a VPS. One orchestrator (Ezra, COS) plus five specialists (Vera/research, Poe/comms, Cole/content, Hopper/ops, Archie/code), each with their own Telegram bot, persona prompt, and scoped Obsidian vault access into NoahBrain. The fleet shares a single SQLite store for memory, conversation log, hive-mind action feed, and inter-agent task tracking.

Built on top of the upstream `claudeclaw-os` engine (https://github.com/ScalingEngine/claudeclaw-os). Customization is additive (new agents, new CLAUDE.md content, agents/{id}/) so upstream pulls don't conflict.

## Core Value

Noah can DM Ezra with anything — status pulses, decision-blocked items, comms drafts, ops triage, code work — and the right specialist runs the work with full NoahBrain context, persistent memory across sessions, and visibility in a single dashboard. The promise is *one front door for the whole knowledge-work surface.*

## Architecture (one screen)

- **Engine:** Node.js + `@anthropic-ai/claude-agent-sdk` spawning per-turn `claude` CLI processes (subprocess model). Replacement candidate: SDK Engine RFC (direct Anthropic Messages API, see `docs/rfc-sdk-engine.md`).
- **Transports:** Telegram (per-bot per-agent), Slack (Ezra-only Socket Mode listener), Dashboard (Hono+SSE+Preact SPA on `:8443` via Tailscale).
- **Persistence:** SQLite at `store/claudeclaw.db` — `conversation_log`, `memories`, `inter_agent_tasks`, `hive_mind`, `audit_log`, `token_usage`, `scheduled_tasks`.
- **Memory:** Two layers. Conversational (SQLite, auto-extracted via Haiku per turn) merged at runtime with canonical (NoahBrain vault, Python-compiled, synced via Ezra-Python).
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

### Active

<!-- Current scope. Building toward these. -->

- [ ] Cross-process delegation queue — `delegated_tasks` table + producer/consumer for cross-process Slack delegation with persistent per-chat session continuity (Stage 2 of original FULL fleet plan)
- [ ] Specialist persona prompt tuning — observed Vera over-interpreting "confirm" as "execute via notify.sh"; likely all 5 personas need a reply-vs-execute pass
- [ ] Quota-suspension dead-code cleanup — `_ingestSuspendedUntil` path is unreachable now that the Gemini fallback is gone

### Future (next milestone candidates)

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

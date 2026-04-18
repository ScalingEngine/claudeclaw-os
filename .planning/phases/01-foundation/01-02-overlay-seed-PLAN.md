---
phase: 01-foundation
plan: 02
type: execute
wave: 2
depends_on: [01]
files_modified: []
external_paths:
  - ~/.claudeclaw/CLAUDE.md
  - ~/.claudeclaw/agents/ezra/agent.yaml
  - ~/.claudeclaw/agents/ezra/CLAUDE.md
  - ~/.claudeclaw/hooks/
autonomous: false
requirements: [FOUN-02]
tags: [overlay, ezra, persona, agent-config, foundation]

must_haves:
  truths:
    - "~/.claudeclaw/ exists with Noah-specific CLAUDE.md, agents/ezra/ stub, and hooks/ directory"
    - "~/.claudeclaw/CLAUDE.md contains Ezra's real persona from NoahBrain (not the generic [YOUR ASSISTANT NAME] template)"
    - "~/.claudeclaw/agents/ezra/agent.yaml declares name: Ezra, telegram_bot_token_env: TELEGRAM_BOT_TOKEN, and a concrete model"
    - "~/.claudeclaw/hooks/ is a literal empty directory (no files needed)"
  artifacts:
    - path: "~/.claudeclaw/CLAUDE.md"
      provides: "Ezra persona + project instructions loaded by every Claude Code session"
      contains: "Ezra"
      min_lines: 40
    - path: "~/.claudeclaw/agents/ezra/agent.yaml"
      provides: "Ezra agent config (name, token env, model)"
      contains: "name: Ezra"
    - path: "~/.claudeclaw/agents/ezra/CLAUDE.md"
      provides: "Per-agent persona pointer (Phase 2 fills; Phase 1 seeds from template)"
      contains: "Ezra"
    - path: "~/.claudeclaw/hooks"
      provides: "Hooks directory scaffold (empty, ready for Phase 2+ wiring)"
  key_links:
    - from: "src/config.ts readEnvFile() + AGENT_ID resolver"
      to: "~/.claudeclaw/agents/ezra/agent.yaml"
      via: "CLAUDECLAW_CONFIG env path (set by setup.ts in Plan 03)"
      pattern: "CLAUDECLAW_CONFIG=~/.claudeclaw"
    - from: "~/.claudeclaw/agents/ezra/agent.yaml"
      to: ".env TELEGRAM_BOT_TOKEN"
      via: "telegram_bot_token_env: TELEGRAM_BOT_TOKEN"
      pattern: "telegram_bot_token_env:\\s*TELEGRAM_BOT_TOKEN"
---

<objective>
Seed the `~/.claudeclaw/` overlay directory on Noah's Mac with three concrete assets: (1) a Noah-specific `CLAUDE.md` containing Ezra's real persona (fetched from the existing NoahBrain Ezra Slack bot config on the VPS), (2) an `agents/ezra/` stub with `agent.yaml` + `CLAUDE.md`, and (3) an empty `hooks/` directory. This satisfies FOUN-02 literally while fully implementing D-03, D-04, and D-05 from CONTEXT.md.

Purpose: Phase 1 must leave the overlay in a state where Phase 2 can wire Ezra's Slack + Telegram channels without rewriting persona content. Real persona now = zero rework in Phase 2.

Output: Overlay tree at `~/.claudeclaw/` with real Ezra persona seeded, agent stub filled, hooks directory created empty.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation/01-CONTEXT.md
@CLAUDE.md
@CLAUDE.md.example
@agents/_template/agent.yaml.example
@agents/_template/CLAUDE.md

<interfaces>
<!-- Reference agent.yaml schema (extracted from agents/_template/agent.yaml.example) -->
```yaml
name: My Agent
description: What this agent does
telegram_bot_token_env: MYAGENT_BOT_TOKEN
model: claude-sonnet-4-6
# obsidian:
#   vault: /path/to/your/obsidian/vault
#   folders:
#     - FolderA/
#   read_only:
#     - Daily Notes/
```

<!-- Model fallback chain note (from src/config.ts): agentDefaultModel flows from agent.yaml 'model' key. -->
<!-- Per CONTEXT.md Discretion: Sonnet 4.6 recommended as default for Phase 1. -->

<!-- NoahBrain Ezra persona source (per CONTEXT.md specifics):
     Noah must provide either (a) the file path to the Ezra Slack bot config on VPS,
     or (b) paste the persona content directly during Task 1.
     Typical VPS path pattern: ~/.claude/chat/ezra/ or .claude/chat/ in the ClaudeCode repo.
     Per project CLAUDE.md: "Ezra (always-on, VPS systemd): ssh vps 'sudo systemctl {status|restart} ezra'" -->

<!-- Pre-existing state (verified 2026-04-18): ~/.claudeclaw/ does NOT exist yet. Fresh create. -->
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Noah provides Ezra persona source</name>
  <what-built>The plan requires Ezra's real persona content (per D-03) before writing `~/.claudeclaw/CLAUDE.md`. Per CONTEXT.md specifics: "Ezra persona source: copy from the existing NoahBrain Ezra Slack bot config living on the VPS (Noah to provide the file path / content)."</what-built>
  <how-to-verify>
    Noah, provide ONE of the following:

    1. **SSH fetch path** (preferred if persona lives as a file on VPS):
       Give the absolute VPS path to Ezra's CLAUDE.md / persona file. Example reply:
       > `/home/noah/ClaudeCode/.claude/chat/ezra/CLAUDE.md`
       > or
       > `vps:~/ezra/persona.md`

       Executor will then run:
       `scp vps:{path} /tmp/ezra-persona-source.md`
       and read the file as input for Task 2.

    2. **Paste content directly** in your reply:
       Paste the full persona body (the "You are Ezra..." prompt text) in a fenced code block. Executor saves it to `/tmp/ezra-persona-source.md` and uses it for Task 2.

    3. **Local path** (if the persona file is already on this Mac, e.g. in NoahBrain vault):
       Give the absolute local path. Example: `/Users/nwessel/ClaudeCode/NoahBrain/Memory/_reference/ezra-persona.md`
  </how-to-verify>
  <resume-signal>Reply with the persona source (path or pasted content). Executor will fetch/save to /tmp/ezra-persona-source.md before proceeding to Task 2.</resume-signal>
</task>

<task type="auto">
  <name>Task 2: Create ~/.claudeclaw/ overlay tree with real Ezra persona</name>
  <files>
    ~/.claudeclaw/CLAUDE.md,
    ~/.claudeclaw/hooks/.gitkeep
  </files>
  <read_first>
    - /tmp/ezra-persona-source.md (produced by Task 1)
    - CLAUDE.md.example (overlay template; executor references but does NOT copy verbatim)
    - CLAUDE.md (project root instructions; executor reads to know which project-level rules belong in overlay vs project)
  </read_first>
  <action>
    Create the overlay skeleton and seed `~/.claudeclaw/CLAUDE.md` with Ezra's real persona.

    Exact steps:
    1. Create the directory tree:
       ```
       mkdir -p ~/.claudeclaw/agents/ezra
       mkdir -p ~/.claudeclaw/hooks
       ```
    2. Write `~/.claudeclaw/CLAUDE.md` with this structure (use Write tool, not heredoc):

       - Header: `# Ezra — Noah's Main Agent (ClaudeClaw)`
       - Section "About You": copy the persona body from `/tmp/ezra-persona-source.md`. Preserve Ezra's voice, rules, personality verbatim. Do NOT rewrite or soften. If the source uses `[YOUR ASSISTANT NAME]` placeholders, replace them with `Ezra`.
       - Section "About Noah": copy from `/tmp/ezra-persona-source.md` if present there; otherwise include a short factual block: `Noah Wessel runs ScalingEngine (SE), Construx (CCP), and Vektr. He operates from ClaudeCode on macOS with a VPS host. Timezone: America/New_York. Obsidian vault lives at ~/ClaudeCode/NoahBrain/Memory/.`
       - Section "Your Environment": include the standard tool block (Bash, file system, web search, browser automation, MCP servers, `~/.claude/skills/`, Obsidian vault path `~/ClaudeCode/NoahBrain/Memory/`, Gemini key note pointing to `.env GOOGLE_API_KEY`).
       - Section "How You Work": execute-first, no narration, no AI cliches, no em dashes (copy the personality rules block from `/tmp/ezra-persona-source.md`).
       - Section "Channels (Phase 1 scope)": `Telegram primary in Phase 1 — Slack wiring comes in Phase 2.`
       - Include brief pointers to: scheduling (`dist/schedule-cli.js`), mission tasks (`dist/mission-cli.js`), file-send markers (`[SEND_FILE:...]`), notify script (`scripts/notify.sh`). These mirror the project-root CLAUDE.md but live here per D-03.

       File MUST be ≥ 40 lines and MUST contain the literal token `Ezra` in at least two distinct locations (heading + persona body).

    3. Create the empty hooks directory sentinel:
       ```
       touch ~/.claudeclaw/hooks/.gitkeep
       ```
       (`.gitkeep` is a marker file only — the overlay is not inside the repo, but the marker makes the directory visible to `ls -la` and makes intent explicit per D-04: "hooks/ created empty, no wiring".)

    4. Remove `/tmp/ezra-persona-source.md` after use to avoid leaving persona content in /tmp:
       ```
       rm -f /tmp/ezra-persona-source.md
       ```
  </action>
  <verify>
    <automated>test -d ~/.claudeclaw && test -f ~/.claudeclaw/CLAUDE.md && test -d ~/.claudeclaw/hooks && grep -q 'Ezra' ~/.claudeclaw/CLAUDE.md && [ "$(wc -l < ~/.claudeclaw/CLAUDE.md)" -ge 40 ] && ! test -f /tmp/ezra-persona-source.md</automated>
  </verify>
  <acceptance_criteria>
    - `test -d ~/.claudeclaw` passes (directory exists)
    - `test -f ~/.claudeclaw/CLAUDE.md` passes
    - `test -d ~/.claudeclaw/hooks` passes
    - `wc -l < ~/.claudeclaw/CLAUDE.md` outputs a number ≥ 40
    - `grep -c 'Ezra' ~/.claudeclaw/CLAUDE.md` outputs ≥ 2
    - `grep -q '\[YOUR ASSISTANT NAME\]' ~/.claudeclaw/CLAUDE.md` returns nonzero (placeholder NOT present)
    - `grep -q '\[YOUR NAME\]' ~/.claudeclaw/CLAUDE.md` returns nonzero (placeholder NOT present — actual name "Noah" used)
    - `grep -q 'Noah' ~/.claudeclaw/CLAUDE.md` returns 0 (Noah's name appears)
    - `test -f /tmp/ezra-persona-source.md` returns nonzero (temp file cleaned up)
    - Nothing under `~/.claudeclaw/` is tracked by git (`git status` in repo root does not list `.claudeclaw`)
  </acceptance_criteria>
  <done>Overlay exists with real Ezra persona, hooks dir present empty, no placeholder text remains, temp persona file cleaned up.</done>
</task>

<task type="auto">
  <name>Task 3: Create ~/.claudeclaw/agents/ezra/ stub (agent.yaml + CLAUDE.md pointer)</name>
  <files>
    ~/.claudeclaw/agents/ezra/agent.yaml,
    ~/.claudeclaw/agents/ezra/CLAUDE.md
  </files>
  <read_first>
    - agents/_template/agent.yaml.example (schema source)
    - agents/_template/CLAUDE.md (per-agent persona template)
    - .planning/phases/01-foundation/01-CONTEXT.md (D-05, D-08 — telegram_bot_token_env = TELEGRAM_BOT_TOKEN, default model)
  </read_first>
  <action>
    Create Ezra's agent stub by copying `agents/_template/agent.yaml.example` + `agents/_template/CLAUDE.md` and filling the specific values from D-05 + D-08.

    Step 1 — write `~/.claudeclaw/agents/ezra/agent.yaml` with exactly this content:
    ```yaml
    # Ezra — Noah's main agent (ClaudeClaw)
    # Phase 1: Telegram primary. Phase 2 wires Slack primary, Telegram secondary.
    # Persona body lives at ~/.claudeclaw/CLAUDE.md (project overlay) — this file is a pointer.
    #
    # Start with:
    #   npm start -- --agent ezra
    # or, since Ezra is the main agent, start with default (AGENT_ID=main) and route through this config in Phase 2.

    name: Ezra
    description: Noah's main agent. Chill, grounded, straight up. Runs ClaudeClaw with full NoahBrain context.

    # The env var name in .env that holds this agent's Telegram bot token.
    # D-08: Main bot token lives under TELEGRAM_BOT_TOKEN (matches src/config.ts convention).
    telegram_bot_token_env: TELEGRAM_BOT_TOKEN

    # Default model. Sonnet 4.6 chosen for Phase 1 (cost/speed balance).
    # Per-chat override available via /model opus in Telegram.
    model: claude-sonnet-4-6

    # Obsidian integration — COMMENTED in Phase 1. Phase 3 wires vault access.
    # obsidian:
    #   vault: /Users/nwessel/ClaudeCode/NoahBrain/Memory
    #   folders:
    #     - queue/
    #     - sitrep/
    #     - _reference/
    #   read_only:
    #     - _logs/
    ```

    Step 2 — write `~/.claudeclaw/agents/ezra/CLAUDE.md` as a thin pointer (Phase 2 replaces this with Ezra's agent-specific persona):
    ```markdown
    # Ezra (Agent Config)

    This is the per-agent persona for Ezra when ClaudeClaw runs with `--agent ezra`.

    In Phase 1, Ezra's full persona lives at `~/.claudeclaw/CLAUDE.md` (the overlay root). This file exists so `agents/ezra/` is a complete template-compatible directory. Phase 2 will flesh this out with Ezra's Slack-specific behavior and secondary-Telegram posture.

    ## Role
    Noah's main agent. Handles personal ops, planning, execution across SE / CCP / Vektr. Full access to NoahBrain vault (Phase 3), all 200+ skills (Phase 3), Notion/Linear/Slack integrations (Phase 6).

    ## Channels
    - Phase 1: Telegram DM (chat allowlist: single Noah chat via `ALLOWED_CHAT_ID`)
    - Phase 2: Slack primary workspace, Telegram secondary
    - Phase 7: VPS deployment via systemd

    ## Notes
    - Default model: `claude-sonnet-4-6` (see agent.yaml). `/model opus` switches per-chat.
    - Hive mind logging: append actions to `store/claudeclaw.db` `hive_mind` table after meaningful work (Phase 2+).
    ```

    Do NOT add placeholder `[Agent Name]` or `[List the vault folders...]` boilerplate from the template. All values are concrete.
  </action>
  <verify>
    <automated>test -f ~/.claudeclaw/agents/ezra/agent.yaml && test -f ~/.claudeclaw/agents/ezra/CLAUDE.md && grep -q '^name: Ezra$' ~/.claudeclaw/agents/ezra/agent.yaml && grep -q '^telegram_bot_token_env: TELEGRAM_BOT_TOKEN$' ~/.claudeclaw/agents/ezra/agent.yaml && grep -q '^model: claude-sonnet-4-6$' ~/.claudeclaw/agents/ezra/agent.yaml && ! grep -q '^\[Agent Name\]' ~/.claudeclaw/agents/ezra/CLAUDE.md</automated>
  </verify>
  <acceptance_criteria>
    - `test -f ~/.claudeclaw/agents/ezra/agent.yaml` passes
    - `grep -c '^name: Ezra$' ~/.claudeclaw/agents/ezra/agent.yaml` returns `1`
    - `grep -c '^telegram_bot_token_env: TELEGRAM_BOT_TOKEN$' ~/.claudeclaw/agents/ezra/agent.yaml` returns `1`
    - `grep -c '^model: claude-sonnet-4-6$' ~/.claudeclaw/agents/ezra/agent.yaml` returns `1`
    - `grep -c '^# obsidian:' ~/.claudeclaw/agents/ezra/agent.yaml` returns `1` (commented block present, D-05 Discretion honored)
    - `test -f ~/.claudeclaw/agents/ezra/CLAUDE.md` passes
    - `grep -q 'Ezra' ~/.claudeclaw/agents/ezra/CLAUDE.md` returns 0
    - `grep -q '\[Agent Name\]' ~/.claudeclaw/agents/ezra/CLAUDE.md` returns nonzero (template placeholder removed)
    - YAML parses cleanly: `node -e "const y=require('js-yaml');const fs=require('fs');y.load(fs.readFileSync(process.env.HOME+'/.claudeclaw/agents/ezra/agent.yaml','utf8'));"` exits 0
  </acceptance_criteria>
  <done>Ezra agent stub is complete, YAML is valid and concrete (no placeholders), obsidian block commented per D-05 Discretion, CLAUDE.md pointer written.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| VPS → local Mac | Ezra persona content crosses when fetched via `scp`. Persona may contain sensitive operational instructions. |
| `/tmp` → filesystem | Temporary persona file is world-readable by default on macOS. |
| Repo → overlay | `~/.claudeclaw/` lives OUTSIDE the git working tree; must never be tracked or committed. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-05 | Information disclosure | `/tmp/ezra-persona-source.md` | mitigate | Delete file immediately after use (Task 2 step 4). |
| T-01-06 | Information disclosure | Overlay persona committed by mistake | mitigate | Overlay lives at `~/.claudeclaw/` outside repo; acceptance criteria includes `git status` absence check. |
| T-01-07 | Tampering | Agent config read by ClaudeClaw runtime | mitigate | `js-yaml` parse check in acceptance criteria ensures file is valid YAML before runtime loads it. |
| T-01-08 | Repudiation | Placeholder bleed-through | mitigate | Acceptance grep for `[YOUR ASSISTANT NAME]` / `[YOUR NAME]` / `[Agent Name]` placeholders returning zero matches. |
</threat_model>

<verification>
- `~/.claudeclaw/` directory tree exists with CLAUDE.md + agents/ezra/{agent.yaml,CLAUDE.md} + hooks/
- Ezra persona is real (not placeholder), ≥ 40 lines
- `agent.yaml` has concrete `name: Ezra`, `telegram_bot_token_env: TELEGRAM_BOT_TOKEN`, `model: claude-sonnet-4-6`
- Obsidian block is commented (Phase 3 will uncomment)
- No overlay content is tracked by git
</verification>

<success_criteria>
FOUN-02 satisfied: `~/.claudeclaw/` overlay directory created with Noah-specific CLAUDE.md, at least one agent config stub, and a hooks directory. D-03, D-04, D-05 fully implemented.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-02-SUMMARY.md` noting: persona source used (VPS path / paste / local), default model selected, obsidian-block disposition.
</output>

---
phase: 3
phase_name: Agent workflow routing policy
plan: 01
title: Agent workflow routing policy and persona guidance
type: execute
wave: 1
depends_on: []
files_modified:
  - docs/agent-workflow-routing.md
  - CLAUDE.md.example
  - agents/_template/CLAUDE.md
  - warroom/personas.py
  - scripts/check-agent-workflow-routing.sh
  - package.json
autonomous: true
requirements:
  - ROUT-01
  - ROUT-02
  - ROUT-03
  - ROUT-04
  - ROUT-05
requirements_addressed:
  - ROUT-01
  - ROUT-02
  - ROUT-03
  - ROUT-04
  - ROUT-05
user_setup:
  - After these committed templates ship to the VPS, apply the routing policy to live `~/.claudeclaw/CLAUDE.md` and `~/.claudeclaw/agents/*/CLAUDE.md` overlays through the dashboard agent file editor or another approved operator path. Do not copy live overlays into git.
must_haves:
  truths:
    - "ROUT-01: Ezra has a written routing rule for direct answer vs skill/react loop vs Archon workflow."
    - "ROUT-02: Vera, Poe, Cole, Hopper, and Archie each have role-specific guidance for when to launch or recommend an Archon workflow."
    - "ROUT-03: Agents use skills and react loops for one-off tasks and quick repeatable actions."
    - "ROUT-04: Agents use Archon workflows for coding and business processes that require phases, gates, artifacts, approvals, retries, or repeatability."
    - "ROUT-05: Ambiguous external-effect workflows require Noah approval before sending, posting, deploying, closing issues, or mutating production data."
  artifacts:
    - "docs/agent-workflow-routing.md"
    - "scripts/check-agent-workflow-routing.sh"
    - "CLAUDE.md.example"
    - "agents/_template/CLAUDE.md"
    - "warroom/personas.py"
  key_links:
    - "docs/agent-workflow-routing.md points coding Archon workflows to docs/archon-workspaces.md before workflow launch."
    - "npm run check:agent-workflow-routing verifies persona coverage, routing lanes, and external-effect approval language."
---

<objective>
Create a committed workflow routing policy for ClaudeClaw agents and wire it into the main template, specialist template, War Room personas, and deterministic validation.

Purpose: Phase 1 made Archon invocable and Phase 2 made Archon coding workspaces safe. Phase 3 teaches Ezra, Vera, Poe, Cole, Hopper, and Archie when to answer directly, when to use skills/react loops, when to use Archon workflows, and when Noah approval is required before external effects.

Output: `docs/agent-workflow-routing.md`, prompt-template updates, War Room compact persona alignment, and `npm run check:agent-workflow-routing`.
</objective>

<execution_context>
@$HOME/.codex/get-shit-done/workflows/execute-plan.md
@$HOME/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-vps-archon-runtime-surface/01-SUMMARY.md
@.planning/phases/02-safe-workspace-and-deploy-boundary/02-SUMMARY.md
@.planning/phases/03-agent-workflow-routing-policy/03-RESEARCH.md
@.planning/phases/03-agent-workflow-routing-policy/03-PATTERNS.md
@.planning/phases/03-agent-workflow-routing-policy/03-VALIDATION.md
@docs/archon-runtime.md
@docs/archon-workspaces.md
@CLAUDE.md.example
@agents/_template/CLAUDE.md
@warroom/personas.py
@package.json
</context>

<must_haves>
<truths>
- ROUT-01: Ezra has a written routing rule for direct answer vs skill/react loop vs Archon workflow.
- ROUT-02: Vera, Poe, Cole, Hopper, and Archie each have role-specific guidance for when to launch or recommend an Archon workflow.
- ROUT-03: Agents use skills and react loops for one-off tasks and quick repeatable actions.
- ROUT-04: Agents use Archon workflows for coding and business processes that require phases, gates, artifacts, approvals, retries, or repeatability.
- ROUT-05: Ambiguous external-effect workflows require Noah approval before sending, posting, deploying, closing issues, or mutating production data.
</truths>
<artifacts>
- `docs/agent-workflow-routing.md`
- `scripts/check-agent-workflow-routing.sh`
- `CLAUDE.md.example`
- `agents/_template/CLAUDE.md`
- `warroom/personas.py`
</artifacts>
<key_links>
- `docs/agent-workflow-routing.md` links Archon coding workflows to `docs/archon-workspaces.md`.
- `package.json` exposes `npm run check:agent-workflow-routing`.
</key_links>
</must_haves>

<threat_model>
<threat id="T-01" severity="high">
Over-routing: agents could send simple answers or one-off actions into Archon, adding latency and unnecessary durable state.
Mitigation: the policy and templates must make "Direct answer" the first lane, "Skill/react loop" the second lane, and "Archon workflow" the third lane reserved for phases, gates, artifacts, approvals, retries, or repeatability.
</threat>
<threat id="T-02" severity="high">
External-effect escalation: an agent could send, post, deploy, close issues, or mutate production data through a skill or workflow when the user's approval is ambiguous.
Mitigation: the policy, templates, and War Room shared rules must require Noah approval before ambiguous external effects. Exact same-turn user approval applies only to the named effect and scope.
</threat>
<threat id="T-03" severity="high">
Unsafe coding workflow launch: persona guidance could recommend Archon coding workflows against `/home/devuser/claudeclaw` instead of a disposable worktree.
Mitigation: `docs/agent-workflow-routing.md` must point coding workflows to `docs/archon-workspaces.md` and require `/home/devuser/claudeclaw-worktrees/<run-id>` plus `scripts/archon-workspace-guard.sh`.
</threat>
<threat id="T-04" severity="medium">
Split-brain prompt behavior: committed templates, War Room compact prompts, and operator docs could disagree about routing lanes.
Mitigation: add `scripts/check-agent-workflow-routing.sh` and `npm run check:agent-workflow-routing` to grep for required lanes, persona names, approval language, and safety links across all relevant artifacts.
</threat>
</threat_model>

<tasks>
<task id="3-01-01" type="execute" wave="1">
<title>Create canonical agent workflow routing policy</title>
<read_first>
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/phases/03-agent-workflow-routing-policy/03-RESEARCH.md`
- `.planning/phases/03-agent-workflow-routing-policy/03-PATTERNS.md`
- `docs/archon-runtime.md`
- `docs/archon-workspaces.md`
</read_first>
<files>
- `docs/agent-workflow-routing.md`
</files>
<action>
Create `docs/agent-workflow-routing.md` with these sections:
- `# Agent Workflow Routing Policy`
- `## Scope`
- `## Routing Ladder`
- `## Persona Matrix`
- `## External-Effect Approval Gate`
- `## Archon Safety Preconditions`
- `## Verification`

The `## Routing Ladder` section must define exactly these three lane headings:
- `### Direct answer`
- `### Skill/react loop`
- `### Archon workflow`

The policy must include these exact requirement strings:
- `ROUT-01`
- `ROUT-02`
- `ROUT-03`
- `ROUT-04`
- `ROUT-05`

The `## Persona Matrix` section must include one row or subsection for each exact persona name: `Ezra`, `Vera`, `Poe`, `Cole`, `Hopper`, and `Archie`.

Use this concrete routing content:
- Ezra: default front door; answers directly first; uses skills/react loops for quick operational actions; recommends or launches Archon for durable gated work.
- Vera: communications; drafts and triages through direct answers or comms skills; uses Archon for larger inbox cleanup, follow-up sequences, or repeatable comms processes; does not send/post without approval when scope is ambiguous.
- Poe: content; drafts or edits directly for one-off writing; uses skills/react loops for asset creation; uses Archon for multi-step campaigns, recurring content systems, or artifact-heavy content pipelines; publishing requires approval when ambiguous.
- Cole: research/strategy; answers from known context when enough is known; uses research skills for focused lookup; uses Archon for research programs that produce canonical docs, planning updates, or repeatable strategy workflows.
- Hopper: operations; uses skills/react loops for calendar/admin checks and safe diagnostics; uses Archon for ops triage workflows, scheduled process changes, or multi-step remediation; production mutations require approval when ambiguous.
- Archie: engineering/workflow authoring; uses skills/react loops for small checks and focused fixes; uses Archon for coding plan-to-PR, bugfix, workflow authoring, and gated implementation; coding workflows must follow `docs/archon-workspaces.md`.

The `## External-Effect Approval Gate` section must contain these exact strings:
- `Noah approval`
- `sending`
- `posting`
- `deploying`
- `closing issues`
- `mutating production data`

The `## Archon Safety Preconditions` section must contain these exact strings:
- `docs/archon-workspaces.md`
- `/home/devuser/claudeclaw-worktrees/<run-id>`
- `scripts/archon-workspace-guard.sh`
- `/home/devuser/claudeclaw`
- `Coding workflows must not run against /home/devuser/claudeclaw.`

The `## Verification` section must document:
- `npm run check:agent-workflow-routing`
- `npm run typecheck`
</action>
<verify>
<automated>
`grep -q '# Agent Workflow Routing Policy' docs/agent-workflow-routing.md`
`grep -q '### Direct answer' docs/agent-workflow-routing.md`
`grep -q '### Skill/react loop' docs/agent-workflow-routing.md`
`grep -q '### Archon workflow' docs/agent-workflow-routing.md`
`grep -q 'ROUT-01' docs/agent-workflow-routing.md`
`grep -q 'ROUT-05' docs/agent-workflow-routing.md`
`grep -q 'Ezra' docs/agent-workflow-routing.md`
`grep -q 'Archie' docs/agent-workflow-routing.md`
`grep -q 'Noah approval' docs/agent-workflow-routing.md`
`grep -q 'Coding workflows must not run against /home/devuser/claudeclaw.' docs/agent-workflow-routing.md`
</automated>
</verify>
<acceptance_criteria>
- `docs/agent-workflow-routing.md` contains `# Agent Workflow Routing Policy`.
- `docs/agent-workflow-routing.md` contains `### Direct answer`.
- `docs/agent-workflow-routing.md` contains `### Skill/react loop`.
- `docs/agent-workflow-routing.md` contains `### Archon workflow`.
- `docs/agent-workflow-routing.md` contains all six persona names: `Ezra`, `Vera`, `Poe`, `Cole`, `Hopper`, and `Archie`.
- `docs/agent-workflow-routing.md` contains all five requirement IDs: `ROUT-01`, `ROUT-02`, `ROUT-03`, `ROUT-04`, and `ROUT-05`.
- `docs/agent-workflow-routing.md` contains `Noah approval`.
- `docs/agent-workflow-routing.md` contains `Coding workflows must not run against /home/devuser/claudeclaw.`.
</acceptance_criteria>
</task>

<task id="3-01-02" type="execute" wave="1">
<title>Wire routing guidance into committed persona templates</title>
<read_first>
- `CLAUDE.md.example`
- `agents/_template/CLAUDE.md`
- `docs/agent-workflow-routing.md`
- `.planning/phases/03-agent-workflow-routing-policy/03-RESEARCH.md`
</read_first>
<files>
- `CLAUDE.md.example`
- `agents/_template/CLAUDE.md`
</files>
<action>
Update `CLAUDE.md.example` with a new section named `## Workflow routing` after the first identity/personality section and before tool-specific details. The section must contain these exact strings:
- `Direct answer`
- `Skill/react loop`
- `Archon workflow`
- `docs/agent-workflow-routing.md`
- `ROUT-01`
- `ROUT-03`
- `ROUT-04`
- `ROUT-05`
- `Noah approval`

The `CLAUDE.md.example` section must state that Ezra/main agents answer directly first, use skills/react loops for quick bounded actions, and use Archon workflows for coding or business processes with phases, gates, artifacts, approvals, retries, or repeatability.

Update `agents/_template/CLAUDE.md` with a new section named `## Workflow routing` after `## Your role`. The section must contain these exact strings:
- `Direct answer`
- `Skill/react loop`
- `Archon workflow`
- `docs/agent-workflow-routing.md`
- `ROUT-02`
- `ROUT-03`
- `ROUT-04`
- `ROUT-05`
- `Noah approval`

The `agents/_template/CLAUDE.md` section must tell specialists to:
- answer directly for conversational or advisory work,
- use skills/react loops for one-off tasks and quick repeatable actions,
- recommend or launch Archon for durable workflows with phases, gates, artifacts, approvals, retries, or repeatability,
- require Noah approval before ambiguous external effects such as sending, posting, deploying, closing issues, or mutating production data.

Do not remove the existing file sending, profile picture, scheduling, or hive mind instructions.
</action>
<verify>
<automated>
`grep -q '## Workflow routing' CLAUDE.md.example`
`grep -q 'docs/agent-workflow-routing.md' CLAUDE.md.example`
`grep -q 'ROUT-01' CLAUDE.md.example`
`grep -q 'Noah approval' CLAUDE.md.example`
`grep -q '## Workflow routing' agents/_template/CLAUDE.md`
`grep -q 'docs/agent-workflow-routing.md' agents/_template/CLAUDE.md`
`grep -q 'ROUT-02' agents/_template/CLAUDE.md`
`grep -q 'Noah approval' agents/_template/CLAUDE.md`
</automated>
</verify>
<acceptance_criteria>
- `CLAUDE.md.example` contains `## Workflow routing`.
- `CLAUDE.md.example` contains `Direct answer`, `Skill/react loop`, and `Archon workflow`.
- `CLAUDE.md.example` contains `ROUT-01`, `ROUT-03`, `ROUT-04`, and `ROUT-05`.
- `agents/_template/CLAUDE.md` contains `## Workflow routing`.
- `agents/_template/CLAUDE.md` contains `ROUT-02`, `ROUT-03`, `ROUT-04`, and `ROUT-05`.
- Both templates contain `Noah approval`.
- Both templates still contain `[SEND_FILE:/absolute/path/to/file.pdf]`.
</acceptance_criteria>
</task>

<task id="3-01-03" type="execute" wave="1">
<title>Align War Room compact personas and add deterministic routing validator</title>
<read_first>
- `warroom/personas.py`
- `src/config.ts`
- `src/agent-config.ts`
- `scripts/archon-status.sh`
- `scripts/archon-workspace-guard.sh`
- `package.json`
- `docs/agent-workflow-routing.md`
- `CLAUDE.md.example`
- `agents/_template/CLAUDE.md`
</read_first>
<files>
- `warroom/personas.py`
- `scripts/check-agent-workflow-routing.sh`
- `package.json`
</files>
<action>
Update `warroom/personas.py` so `SHARED_RULES` includes a compact workflow-routing block with these exact strings:
- `Direct answer`
- `Skill/react loop`
- `Archon workflow`
- `Noah approval`
- `sending`
- `posting`
- `deploying`
- `closing issues`
- `mutating production data`

The War Room routing block must preserve the existing default: answer from own knowledge first and only delegate when needed. It must add that Archon is for durable workflow work with phases, gates, artifacts, approvals, retries, or repeatability.

Update or extend `AGENT_PERSONAS` and/or generated persona guidance so the compact prompt text contains exact persona names `Ezra`, `Vera`, `Poe`, `Cole`, `Hopper`, and `Archie` somewhere in `warroom/personas.py`. Do not remove the existing `main`, `research`, `comms`, `content`, or `ops` keys unless tests and code paths are updated in the same task.

Create `scripts/check-agent-workflow-routing.sh` as an executable bash validator with `#!/usr/bin/env bash` and `set -euo pipefail`. It must define `ROOT="$(git rev-parse --show-toplevel)"`, `FAILED=0`, `check_file_contains`, and `finish` helpers.

The validator must check these files and patterns:
- `docs/agent-workflow-routing.md` contains `Direct answer`, `Skill/react loop`, `Archon workflow`, `Ezra`, `Vera`, `Poe`, `Cole`, `Hopper`, `Archie`, `Noah approval`, `docs/archon-workspaces.md`, and `Coding workflows must not run against /home/devuser/claudeclaw.`
- `CLAUDE.md.example` contains `Workflow routing`, `ROUT-01`, `ROUT-03`, `ROUT-04`, and `ROUT-05`.
- `agents/_template/CLAUDE.md` contains `Workflow routing`, `ROUT-02`, `ROUT-03`, `ROUT-04`, and `ROUT-05`.
- `warroom/personas.py` contains `Direct answer`, `Skill/react loop`, `Archon workflow`, and `Noah approval`.

The validator must not inspect `~/.claudeclaw`, `.env`, SQLite databases, OAuth token files, or live agent configs.

Update `package.json` to add this script:
- `"check:agent-workflow-routing": "bash scripts/check-agent-workflow-routing.sh"`
</action>
<verify>
<automated>
`bash -n scripts/check-agent-workflow-routing.sh`
`grep -q 'check:agent-workflow-routing' package.json`
`npm run check:agent-workflow-routing`
`npm run typecheck`
</automated>
</verify>
<acceptance_criteria>
- `warroom/personas.py` contains `Direct answer`, `Skill/react loop`, `Archon workflow`, and `Noah approval`.
- `warroom/personas.py` contains `Ezra`, `Vera`, `Poe`, `Cole`, `Hopper`, and `Archie`.
- `scripts/check-agent-workflow-routing.sh` starts with `#!/usr/bin/env bash`.
- `scripts/check-agent-workflow-routing.sh` contains `set -euo pipefail`.
- `scripts/check-agent-workflow-routing.sh` contains `git rev-parse --show-toplevel`.
- `package.json` contains `check:agent-workflow-routing`.
- `bash -n scripts/check-agent-workflow-routing.sh` exits 0.
- `npm run check:agent-workflow-routing` exits 0.
- `npm run typecheck` exits 0.
</acceptance_criteria>
</task>
</tasks>

<verification>
<automated>
`grep -q 'ROUT-01' .planning/phases/03-agent-workflow-routing-policy/03-PLAN.md`
`grep -q 'ROUT-02' .planning/phases/03-agent-workflow-routing-policy/03-PLAN.md`
`grep -q 'ROUT-03' .planning/phases/03-agent-workflow-routing-policy/03-PLAN.md`
`grep -q 'ROUT-04' .planning/phases/03-agent-workflow-routing-policy/03-PLAN.md`
`grep -q 'ROUT-05' .planning/phases/03-agent-workflow-routing-policy/03-PLAN.md`
`bash -n scripts/check-agent-workflow-routing.sh`
`npm run check:agent-workflow-routing`
`npm run typecheck`
</automated>
<manual>
- After execution and deploy, use the dashboard agent file editor to apply the committed routing policy to live `~/.claudeclaw` overlays. Confirm no live config files are copied into git.
</manual>
</verification>

<success_criteria>
- `docs/agent-workflow-routing.md` defines Direct answer, Skill/react loop, and Archon workflow lanes.
- Ezra has written routing guidance for direct answer vs skill/react loop vs Archon workflow.
- Vera, Poe, Cole, Hopper, and Archie each have role-specific Archon guidance.
- Skills/react loops remain the recommended path for one-off tasks and quick repeatable actions.
- Archon is reserved for coding and business processes with phases, gates, artifacts, approvals, retries, or repeatability.
- Ambiguous sending, posting, deploying, closing issues, and production-data mutations require Noah approval.
- `npm run check:agent-workflow-routing` verifies policy/template/War Room coverage.
- `npm run typecheck` passes.
</success_criteria>


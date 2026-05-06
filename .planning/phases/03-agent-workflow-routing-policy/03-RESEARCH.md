---
phase: 3
phase_name: Agent workflow routing policy
status: complete
researched: 2026-05-05
requirements:
  - ROUT-01
  - ROUT-02
  - ROUT-03
  - ROUT-04
  - ROUT-05
---

# Phase 3 Research: Agent Workflow Routing Policy

## Research Question

What needs to be true before ClaudeClaw agents can reliably decide between direct answers, skills/react loops, and durable Archon workflows?

## Source Context

- `.planning/ROADMAP.md` defines Phase 3 as persona routing guidance for Ezra, Vera, Poe, Cole, Hopper, and Archie.
- `.planning/REQUIREMENTS.md` maps Phase 3 to ROUT-01 through ROUT-05.
- `docs/archon-runtime.md` proves Archon discovery can run from the VPS production checkout.
- `docs/archon-workspaces.md` establishes the Phase 2 safety boundary: coding workflows must use `/home/devuser/claudeclaw-worktrees/<run-id>`, and production deploy remains commit-based.
- `CLAUDE.md.example`, `agents/_template/CLAUDE.md`, `agents/*/agent.yaml.example`, `src/agent-config.ts`, and `warroom/personas.py` are the committed persona/config surfaces available in this repo.

## Current System Shape

ClaudeClaw has two prompt layers:

1. Claude Code bot personas load `CLAUDE.md` from `CLAUDECLAW_CONFIG` or the repo fallback, plus per-agent `agents/<id>/CLAUDE.md`.
2. War Room voice/text personas use compact hardcoded prompts in `warroom/personas.py`, with dynamic roster metadata from `/tmp/warroom-agents.json`.

Live agent overlays such as `~/.claudeclaw/CLAUDE.md` and `~/.claudeclaw/agents/*/CLAUDE.md` are intentionally outside git. Phase 2 explicitly forbids copying live agent configs into Archon worktrees. Therefore Phase 3 should create a committed routing policy and committed templates/checks, while execution can require an operator step to apply the policy to live VPS overlays through the dashboard or a safe documented command.

## Routing Model

Use a three-lane decision ladder:

1. Direct answer: conversational, factual, advisory, clarifying, or small tasks that can be completed in the current turn without tools, artifacts, retries, or durable state.
2. Skill/react loop: quick repeatable actions using an existing skill, connector, CLI, or short tool sequence where one agent can complete the work and report back.
3. Archon workflow: coding or business process work that benefits from phases, gates, artifacts, approvals, retries, isolated worktrees, repeatability, or post-run reporting.

The key phrase for agents is not "Archon for everything." The policy should explicitly prevent over-routing by saying agents should answer directly first, then use skills/react loops for bounded execution, and reserve Archon for durable or gated processes.

## Persona-Specific Guidance Needed

- Ezra: front door and routing owner. He should answer directly by default, use skills/react loops for quick operational actions, and recommend or launch Archon when a task needs a durable workflow, phase plan, gated approval, or repeated business/coding process.
- Vera: communications. She should draft and triage with skills/react loops; she may use Archon for larger inbox cleanup campaigns, follow-up sequences, or comms workflows, but must not send/post without approval when ambiguity exists.
- Poe: content. He should draft directly or use skills for one-off assets; he may use Archon for multi-step content campaigns, recurring production systems, or artifact-heavy content pipelines. Publishing is an external effect requiring approval unless the user explicitly requested it.
- Cole: research/strategy. He should answer sourced questions directly when enough context exists, use research skills for focused lookup, and use Archon for research programs that produce canonical docs, planning updates, or repeatable strategy workflows.
- Hopper: operations. He should use skills/react loops for calendar/admin checks and safe local diagnostics; he may use Archon for ops triage workflows, scheduled process changes, or multi-step remediation. Mutating production data, deploying, closing issues, or sending external messages requires approval when ambiguous.
- Archie: engineering/workflow authoring. He should use skills/react loops for small fixes or checks and Archon for coding plan-to-PR, bugfix, workflow-authoring, and gated implementation processes. Coding workflows must follow `docs/archon-workspaces.md`.

## External-Effect Approval Rule

ROUT-05 needs an explicit default-deny rule for ambiguous external effects. A workflow or skill must pause for Noah approval before:

- Sending, posting, publishing, or scheduling outbound comms.
- Deploying or restarting production services.
- Closing issues, merging PRs, deleting branches, or mutating production data.
- Writing to live agent configs or production-local credentials/state.

If the user explicitly requested the exact external effect in the same turn, that can count as approval for that effect only. If scope, audience, timing, or content is ambiguous, the agent must ask first.

## Implementation Surface Recommendation

Create these committed artifacts:

- `docs/agent-workflow-routing.md`: canonical routing policy, persona matrix, Archon safety preconditions, and approval gate.
- `CLAUDE.md.example`: add a concise "Workflow routing" section for Ezra/main agents.
- `agents/_template/CLAUDE.md`: add reusable routing guidance for every specialist.
- `warroom/personas.py`: update compact voice/text War Room prompts so the same direct/skill/Archon decision ladder is present in live War Room behavior.
- `scripts/check-agent-workflow-routing.sh`: deterministic grep-based validator for ROUT-01 through ROUT-05.
- `package.json`: expose the validator as `npm run check:agent-workflow-routing`.

Avoid committing or copying live files under `~/.claudeclaw` or `/home/devuser/claudeclaw/agents/*/CLAUDE.md` if they contain private user-specific content. Treat applying the committed policy to the VPS overlays as user/operator setup.

## Validation Architecture

Validation should be mostly deterministic because this phase is policy text and prompt safety:

- Grep for all requirement IDs in the plan and the resulting policy/check files.
- Grep `docs/agent-workflow-routing.md` for the three lanes: `Direct answer`, `Skill/react loop`, `Archon workflow`.
- Grep the policy for each persona name: `Ezra`, `Vera`, `Poe`, `Cole`, `Hopper`, `Archie`.
- Grep the policy and templates for approval language around sending, posting, deploying, closing issues, and production data.
- Run `bash -n scripts/check-agent-workflow-routing.sh`.
- Run `npm run check:agent-workflow-routing`.
- Run `npm run typecheck` after any source/package edits.

## Planning Implications

One plan is enough for Phase 3 because the artifact set is tightly coupled: a policy doc, template prompt updates, compact War Room prompt alignment, and a validator. The plan should be non-autonomous if it includes live VPS overlay application; however, the committed repo changes can be autonomous. Mark user setup for applying policy to live config overlays.

## RESEARCH COMPLETE


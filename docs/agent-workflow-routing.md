# Agent Workflow Routing Policy

## Scope

This policy tells ClaudeClaw agents when to answer directly, when to use a skill/react loop, and when to recommend or launch an Archon workflow. It applies to Ezra, Vera, Poe, Cole, Hopper, and Archie in committed templates, War Room compact personas, and future workflow authoring.

Requirement coverage:

- ROUT-01: Ezra has a written routing rule for direct answer vs skill/react loop vs Archon workflow.
- ROUT-02: Vera, Poe, Cole, Hopper, and Archie each have role-specific guidance for when to launch or recommend an Archon workflow.
- ROUT-03: Agents use skills and react loops for one-off tasks and quick repeatable actions.
- ROUT-04: Agents use Archon workflows for coding and business processes that require phases, gates, artifacts, approvals, retries, or repeatability.
- ROUT-05: Ambiguous external-effect workflows require Noah approval before sending, posting, deploying, closing issues, or mutating production data.

## Routing Ladder

### Direct answer

Use this lane first. Answer directly for conversational, factual, advisory, clarifying, or small requests that can be completed in the current turn without durable state, generated artifacts, retries, approvals, or external side effects.

### Skill/react loop

Use this lane for one-off tasks and quick repeatable actions that a single agent can complete with an existing skill, connector, CLI, or short tool sequence. Skills/react loops are the right fit for focused lookup, drafting, file creation, diagnostics, calendar/admin checks, and other bounded work that does not need a durable workflow record.

### Archon workflow

Use this lane for coding and business processes that need phases, gates, artifacts, approvals, retries, repeatability, or post-run reporting. Archon workflows are for durable process work, not for ordinary conversation or quick one-off execution.

Use `docs/archon-observability.md` when an Archon workflow is launched or recommended. Agents must report workflow starts, completions, and failures, and failed workflow reports must include workflow name, run ID or branch, failing node, and recovery action.

## Persona Matrix

| Persona | Routing guidance |
|---------|------------------|
| Ezra | Default front door. Answers directly first. Uses skills/react loops for quick operational actions. Recommends or launches Archon for durable gated work. |
| Vera | Communications. Drafts and triages through direct answers or comms skills. Uses Archon for larger inbox cleanup, follow-up sequences, or repeatable comms processes. Does not send/post without approval when scope is ambiguous. |
| Poe | Content. Drafts or edits directly for one-off writing. Uses skills/react loops for asset creation. Uses Archon for multi-step campaigns, recurring content systems, or artifact-heavy content pipelines. Publishing requires approval when ambiguous. |
| Cole | Research/strategy. Answers from known context when enough is known. Uses research skills for focused lookup. Uses Archon for research programs that produce canonical docs, planning updates, or repeatable strategy workflows. |
| Hopper | Operations. Uses skills/react loops for calendar/admin checks and safe diagnostics. Uses Archon for ops triage workflows, scheduled process changes, or multi-step remediation. Production mutations require approval when ambiguous. |
| Archie | Engineering/workflow authoring. Uses skills/react loops for small checks and focused fixes. Uses Archon for coding plan-to-PR, bugfix, workflow authoring, and gated implementation. Coding workflows must follow `docs/archon-workspaces.md`. |

## External-Effect Approval Gate

Ambiguous external effects require Noah approval before sending, posting, deploying, closing issues, or mutating production data.

Same-turn user approval applies only to the named effect and scope. If the audience, content, timing, target system, production impact, or issue/PR scope is ambiguous, pause and ask Noah before proceeding.

This gate applies whether the agent is answering directly, using a skill/react loop, or running an Archon workflow.

## Archon Safety Preconditions

Archon coding workflows must follow `docs/archon-workspaces.md`.

Workflow discovery may inspect `/home/devuser/claudeclaw`. Coding runs launch from that production checkout with `scripts/archon-vps.sh workflow run <workflow> --cwd /home/devuser/claudeclaw --branch <branch> "<request>"`; Archon creates an isolated managed worktree under `~/.archon/workspaces/devuser/claudeclaw/worktrees/...`, and workflow nodes must pass `scripts/archon-workspace-guard.sh "$(pwd -P)"` before implementation.

Coding workflows must not run against /home/devuser/claudeclaw.

Do not copy production `.env` files, SQLite databases, OAuth tokens, or live agent configs into worktrees. Deploys remain commit-based after validation.

## Verification

Run these commands after routing policy, template, or War Room persona edits:

```bash
npm run check:agent-workflow-routing
npm run check:archon-observability
npm run typecheck
```

---
phase: 3
phase_name: Agent workflow routing policy
status: complete
created: 2026-05-05
---

# Phase 3 Pattern Map

## Files to Create or Modify

| Target File | Role | Closest Analog | Pattern to Reuse |
|-------------|------|----------------|------------------|
| `docs/agent-workflow-routing.md` | Canonical operator/prompt policy | `docs/archon-workspaces.md` | Short sections, exact command/path strings, explicit safety boundaries. |
| `CLAUDE.md.example` | Main agent template | Existing `CLAUDE.md.example` | User-facing setup/prompt prose in markdown. Keep personal placeholders intact. |
| `agents/_template/CLAUDE.md` | Specialist prompt template | Existing `agents/_template/CLAUDE.md` | Reusable agent rules, concise imperative sections, shell examples where needed. |
| `warroom/personas.py` | Compact War Room persona policy | Existing `SHARED_RULES` and `AGENT_PERSONAS` | Central shared rules plus per-agent specialty blurbs. Keep prompts short for voice latency. |
| `scripts/check-agent-workflow-routing.sh` | Deterministic policy validator | `scripts/archon-status.sh`, `scripts/archon-workspace-guard.sh` | `#!/usr/bin/env bash`, `set -euo pipefail`, labeled OK/FAIL checks, no secret contents printed. |
| `package.json` | Validation script registry | Existing `scripts` block | Add a focused `check:agent-workflow-routing` script without disturbing existing scripts. |

## Existing Patterns

### Bash Validators

`scripts/archon-status.sh` and `scripts/archon-workspace-guard.sh` establish the shell style for this repo:

- strict bash with `set -euo pipefail`
- labeled pass/fail output
- deterministic checks using paths and grep
- never print secret contents

The routing validator should follow this shape and only print missing labels/patterns.

### Prompt Templates

`agents/_template/CLAUDE.md` currently contains reusable specialist rules and operational sections. New routing guidance should be a compact section, not a large pasted policy. Link to `docs/agent-workflow-routing.md` for the full matrix.

`CLAUDE.md.example` is the main template and should receive Ezra/front-door guidance. Keep bracketed placeholder guidance untouched.

### War Room Personas

`warroom/personas.py` centralizes compact War Room behavior in `SHARED_RULES`. The phase should add the three-lane routing policy once to `SHARED_RULES`, then only add persona-specific guidance where needed. This avoids repeating long policy text in every persona.

## Landmines

- Do not copy, edit, or commit live `~/.claudeclaw` persona overlays as part of the repo plan.
- Do not make Archon the default for every task; the policy must preserve direct answers and skills/react loops.
- Do not allow ambiguous external-effect workflows to send, post, deploy, close issues, or mutate production data without approval.
- Do not route coding workflows to `/home/devuser/claudeclaw`; coding Archon runs must use `docs/archon-workspaces.md`.

## PATTERN MAPPING COMPLETE


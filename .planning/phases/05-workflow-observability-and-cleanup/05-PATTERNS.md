---
phase: 5
phase_name: Workflow observability and cleanup
status: complete
created: 2026-05-06
---

# Phase 5 Pattern Map

## Files to Create or Modify

| Target File | Role | Closest Analog | Pattern to Reuse |
|-------------|------|----------------|------------------|
| `src/archon-observability.ts` | Archon event formatter/recorder | `src/orchestrator.ts`, `src/state.ts`, `src/db.ts` | Use `logToHiveMind()` for durable activity and `emitChatEvent()` for live dashboard/chat visibility. |
| `src/archon-observability.test.ts` | Unit tests for workflow reporting contract | `src/agent.test.ts`, `src/skill-health.test.ts`, `src/memory.test.ts` | Vitest module mocks and direct function assertions. |
| `src/archon-observability-cli.ts` | Agent-callable reporting CLI | `src/mission-cli.ts` | Parse simple commands from `process.argv`, initialize DB, print deterministic success/error lines. |
| `scripts/archon-runs.sh` | Safe active/stale worktree inspection and cleanup | `scripts/archon-workspace-guard.sh`, `scripts/install-archon-workflows.sh` | Strict bash, path resolution, labeled output, dry-run default, explicit `--force` for destructive cleanup. |
| `scripts/test-archon-runs.sh` | Regression tests for cleanup safety | `scripts/test-archon-workspace-guard.sh`, `scripts/check-archon-workflow-pack.sh` | Temporary git fixtures, root override env vars, OK/FAIL output, no production paths. |
| `scripts/check-archon-observability.sh` | Deterministic phase validator | `scripts/check-agent-workflow-routing.sh`, `scripts/check-archon-workflow-pack.sh` | Grep stable strings in code/docs/prompts/workflows and run focused tests. |
| `docs/archon-observability.md` | Operator and agent reporting contract | `docs/archon-runtime.md`, `docs/archon-workspaces.md`, `docs/claudeclaw-workflow-pack.md` | Exact commands, required fields, safety rules, manual VPS verification. |
| `docs/agent-workflow-routing.md` | Canonical agent policy update | Existing Phase 3 routing policy | Add observability requirement under Archon workflow lane without changing direct-answer policy. |
| `CLAUDE.md.example` | Ezra/main committed prompt template | Existing workflow routing section | Add exact observability CLI/failure-field instructions. |
| `agents/_template/CLAUDE.md` | Specialist committed prompt template | Existing workflow routing section | Add exact observability CLI/failure-field instructions for Vera/Poe/Cole/Hopper/Archie. |
| `warroom/personas.py` | War Room compact personas | Existing Phase 3 routing strings | Add compact "report Archon starts/completions/failures" rule. |
| `archon/workflows/claudeclaw-*.yaml` | Workflow report-node contracts | Existing Phase 4 report nodes | Report nodes should include workflow name, run ID/branch, failing node, recovery action on failure. |
| `docs/claudeclaw-workflow-pack.md` | Workflow pack docs | Existing install/verify/safety docs | Link to `docs/archon-observability.md` and mention report requirements. |
| `package.json` | Validation script registry | Existing scripts block | Add `check:archon-observability` and `test:archon-runs` without disturbing existing scripts. |

## Existing Patterns

### Live and Durable Activity

`src/orchestrator.ts` records delegation work by calling `logToHiveMind()` with action names such as `delegate`, `delegate_result`, and `delegate_error`. Phase 5 should mirror this with `archon_workflow_started`, `archon_workflow_completed`, and `archon_workflow_failed`.

`src/state.ts` already supports `progress`, `error`, and `hive_mind` events. The Archon recorder should select:

- `progress` for `started`
- `hive_mind` or `progress` for `completed`
- `error` for `failed`

### CLI Shape

`src/mission-cli.ts` is a good analog for agent-callable operational CLIs:

- import `initDatabase()`
- parse flags from `process.argv`
- print deterministic output
- exit non-zero on missing required arguments

The Archon observability CLI should follow that shape and avoid any secret or live-state printing.

### Bash Safety

`scripts/archon-workspace-guard.sh` is the key safety analog:

- `#!/usr/bin/env bash`
- `set -euo pipefail`
- path resolution with `realpath` fallback
- labeled `OK`/`FAIL` output
- refusal when a path resolves to production checkout

`scripts/archon-runs.sh` should reuse those ideas and default cleanup to dry-run.

### Static Validators

`scripts/check-agent-workflow-routing.sh` and `scripts/check-archon-workflow-pack.sh` both validate through stable strings rather than fragile line numbers. `scripts/check-archon-observability.sh` should use the same helper pattern and assert:

- docs include `workflow:`, `run_id:`, `failing_node:`, and `recovery_action:`
- prompts and workflows mention `docs/archon-observability.md`
- code contains `archon_workflow_started`, `archon_workflow_completed`, and `archon_workflow_failed`
- package scripts exist

## Landmines

- Do not create cleanup code that can delete `/home/devuser/claudeclaw`.
- Do not let cleanup delete dirty worktrees by default.
- Do not create a new database table unless the existing `hive_mind` table cannot satisfy OBS-01; it can.
- Do not make workflow visibility depend only on dashboard UI. OBS-01 allows conversation output or hive_mind-style activity records.
- Do not require live VPS Archon state for local tests.
- Do not print `.env`, `~/.archon/.env`, SQLite database contents, OAuth tokens, or live agent configs.
- Do not weaken Phase 3 direct-answer-first routing while adding workflow reporting rules.

## PATTERN MAPPING COMPLETE

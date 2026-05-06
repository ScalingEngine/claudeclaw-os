---
phase: 5
phase_name: Workflow observability and cleanup
plan: 01
title: Archon workflow visibility, failure reporting, and stale-run cleanup
type: execute
wave: 1
depends_on:
  - 01-vps-archon-runtime-surface
  - 02-safe-workspace-and-deploy-boundary
  - 03-agent-workflow-routing-policy
  - 04-claudeclaw-workflow-pack
files_modified:
  - src/archon-observability.ts
  - src/archon-observability.test.ts
  - src/archon-observability-cli.ts
  - scripts/archon-runs.sh
  - scripts/test-archon-runs.sh
  - scripts/check-archon-observability.sh
  - docs/archon-observability.md
  - docs/agent-workflow-routing.md
  - docs/claudeclaw-workflow-pack.md
  - CLAUDE.md.example
  - agents/_template/CLAUDE.md
  - warroom/personas.py
  - archon/workflows/claudeclaw-coding-plan-to-pr.yaml
  - archon/workflows/claudeclaw-bugfix.yaml
  - archon/workflows/claudeclaw-strategy-ingest.yaml
  - archon/workflows/claudeclaw-ops-triage.yaml
  - archon/workflows/claudeclaw-comms-content-draft.yaml
  - archon/workflows/claudeclaw-workflow-authoring.yaml
  - package.json
autonomous: true
requirements:
  - OBS-01
  - OBS-02
  - OBS-03
requirements_addressed:
  - OBS-01
  - OBS-02
  - OBS-03
user_setup:
  - After deploy on the VPS, run `cd /home/devuser/claudeclaw && scripts/archon-runs.sh list`.
  - Run `scripts/archon-runs.sh stale --older-than-hours 24` to inspect stale isolated worktrees.
  - Run `scripts/archon-runs.sh cleanup --older-than-hours 24` first as a dry-run. Use `--force` only after reviewing the dry-run output and confirming the stale worktrees are safe to remove.
must_haves:
  truths:
    - "OBS-01: Archon workflow launches and completions are visible in ClaudeClaw conversation output or hive_mind-style activity records."
    - "OBS-02: Failed Archon workflow runs report the workflow name, run ID or branch, failing node, and next recovery action."
    - "OBS-03: Archie and Hopper can inspect active Archon worktrees/runs and clean up stale isolated work safely."
  artifacts:
    - "src/archon-observability.ts"
    - "src/archon-observability-cli.ts"
    - "scripts/archon-runs.sh"
    - "docs/archon-observability.md"
    - "scripts/check-archon-observability.sh"
  key_links:
    - "`recordArchonWorkflowEvent()` writes durable hive_mind rows and emits live chat/dashboard events."
    - "Failed workflow reports require `workflow:`, `run_id:` or `branch:`, `failing_node:`, and `recovery_action:`."
    - "`scripts/archon-runs.sh cleanup` defaults to dry-run and refuses paths outside `/home/devuser/claudeclaw-worktrees`."
---

<objective>
Add Phase 5 Archon workflow observability and cleanup support.

ClaudeClaw agents need a standard way to report Archon workflow launches, completions, and failures to user-visible surfaces, plus a safe operator path for Archie and Hopper to inspect and clean stale isolated worktrees without touching the production checkout.
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
@.planning/phases/03-agent-workflow-routing-policy/03-SUMMARY.md
@.planning/phases/04-claudeclaw-workflow-pack/04-SUMMARY.md
@.planning/phases/05-workflow-observability-and-cleanup/05-RESEARCH.md
@.planning/phases/05-workflow-observability-and-cleanup/05-PATTERNS.md
@.planning/phases/05-workflow-observability-and-cleanup/05-VALIDATION.md
@docs/archon-runtime.md
@docs/archon-workspaces.md
@docs/agent-workflow-routing.md
@docs/claudeclaw-workflow-pack.md
@scripts/archon-vps.sh
@scripts/archon-workspace-guard.sh
@scripts/check-agent-workflow-routing.sh
@scripts/check-archon-workflow-pack.sh
@src/state.ts
@src/db.ts
@src/dashboard.ts
@src/orchestrator.ts
@src/mission-cli.ts
@package.json
</context>

<must_haves>
<truths>
- OBS-01: Archon workflow launches and completions are visible in ClaudeClaw conversation output or hive_mind-style activity records.
- OBS-02: Failed Archon workflow runs report the workflow name, run ID or branch, failing node, and next recovery action.
- OBS-03: Archie and Hopper can inspect active Archon worktrees/runs and clean up stale isolated work safely.
</truths>
<artifacts>
- `src/archon-observability.ts`
- `src/archon-observability.test.ts`
- `src/archon-observability-cli.ts`
- `scripts/archon-runs.sh`
- `scripts/test-archon-runs.sh`
- `scripts/check-archon-observability.sh`
- `docs/archon-observability.md`
- `package.json`
</artifacts>
<key_links>
- `src/archon-observability.ts` must bridge Archon workflow events into `logToHiveMind()` and `emitChatEvent()`.
- `docs/archon-observability.md` must define required failure fields: `workflow:`, `run_id:` or `branch:`, `failing_node:`, and `recovery_action:`.
- `scripts/archon-runs.sh` must default cleanup to dry-run and refuse `/home/devuser/claudeclaw`.
</key_links>
</must_haves>

<threat_model>
<threat id="T-01" severity="high">
Invisible workflow state: agents could launch Archon workflows while Noah sees only a generic "working" reply and no durable activity trail.
Mitigation: add `recordArchonWorkflowEvent()` and an agent-callable CLI that write `hive_mind` entries and emit live chat/dashboard events for `started`, `completed`, and `failed`.
</threat>
<threat id="T-02" severity="high">
Unrecoverable failure reports: a failed workflow could omit the run ID, branch, failing node, or recovery action, forcing manual archaeology in logs.
Mitigation: implement `formatArchonFailureReport()` with required fields and tests that fail when `workflowName`, `failingNode`, `recoveryAction`, and one of `runId` or `branch` are missing.
</threat>
<threat id="T-03" severity="high">
Secret or live-state leakage: observability output could accidentally print `.env`, `~/.archon/.env`, SQLite contents, OAuth tokens, or live agent config.
Mitigation: docs and validators must include forbidden-state language, and the observability CLI must print only workflow metadata fields.
</threat>
<threat id="T-04" severity="high">
Unsafe cleanup: stale-run cleanup could delete `/home/devuser/claudeclaw` or an unrelated directory if environment variables are wrong.
Mitigation: `scripts/archon-runs.sh` must resolve paths, refuse production checkout, require paths under `${ARCHON_WORKTREE_ROOT:-/home/devuser/claudeclaw-worktrees}`, and default to dry-run.
</threat>
<threat id="T-05" severity="medium">
Dirty worktree loss: cleanup could remove uncommitted Archon work that still needs review.
Mitigation: cleanup must report dirty worktrees and refuse to remove them unless a separately documented explicit override exists. This plan does not require a dirty-delete override.
</threat>
<threat id="T-06" severity="medium">
Prompt drift: committed workflow and persona templates could keep launching workflows without using the new observability contract.
Mitigation: update workflow report nodes, docs, `CLAUDE.md.example`, `agents/_template/CLAUDE.md`, `warroom/personas.py`, and `docs/agent-workflow-routing.md`; validator greps all surfaces.
</threat>
</threat_model>

<tasks>
<task id="5-01-01" type="execute" wave="1">
<title>Add Archon workflow event reporting helper and CLI</title>
<read_first>
- `src/state.ts`
- `src/db.ts`
- `src/orchestrator.ts`
- `src/mission-cli.ts`
- `src/agent.test.ts`
- `src/skill-health.test.ts`
- `.planning/phases/05-workflow-observability-and-cleanup/05-RESEARCH.md`
- `.planning/phases/05-workflow-observability-and-cleanup/05-PATTERNS.md`
</read_first>
<files>
- `src/archon-observability.ts`
- `src/archon-observability.test.ts`
- `src/archon-observability-cli.ts`
</files>
<action>
Create `src/archon-observability.ts` exporting:

- `export type ArchonWorkflowStatus = 'started' | 'completed' | 'failed';`
- `export interface ArchonWorkflowEvent`
- `export function formatArchonWorkflowSummary(event: ArchonWorkflowEvent): string`
- `export function formatArchonFailureReport(event: ArchonWorkflowEvent): string`
- `export function recordArchonWorkflowEvent(event: ArchonWorkflowEvent): void`

`ArchonWorkflowEvent` must include these fields:
- `workflowName: string`
- `status: ArchonWorkflowStatus`
- `agentId: string`
- `chatId: string`
- `runId?: string`
- `branch?: string`
- `nodeId?: string`
- `failingNode?: string`
- `recoveryAction?: string`
- `details?: string`

`formatArchonWorkflowSummary()` must return deterministic strings:
- started: `Archon workflow started: ${workflowName} (${runRef})`
- completed: `Archon workflow completed: ${workflowName} (${runRef})`
- failed: `Archon workflow failed: ${workflowName} (${runRef}) at ${failingNode}. Recovery: ${recoveryAction}`

Use `run ${runId}` when `runId` is present, `branch ${branch}` when only `branch` is present, and `run unknown` only for non-failed events. For failed events, throw an `Error` when both `runId` and `branch` are missing.

`formatArchonFailureReport()` must throw an `Error` unless all of these are present on failed events:
- `workflowName`
- one of `runId` or `branch`
- `failingNode`
- `recoveryAction`

The failure report string must contain these exact labels on separate lines:
- `workflow:`
- `run_id:` or `branch:`
- `failing_node:`
- `recovery_action:`

`recordArchonWorkflowEvent()` must:
- call `logToHiveMind(agentId, chatId, action, summary, artifacts)`
- use action `archon_workflow_started`, `archon_workflow_completed`, or `archon_workflow_failed`
- serialize `artifacts` as JSON containing at least `workflowName`, `status`, `runId`, `branch`, `failingNode`, and `recoveryAction`
- call `emitChatEvent()` with type `progress` for `started`, `hive_mind` for `completed`, and `error` for `failed`
- set the event `description` and `content` to the formatted summary

Create `src/archon-observability-cli.ts` with commands:
- `start`
- `complete`
- `fail`

The CLI must initialize the database with `initDatabase()`, parse these flags, and call `recordArchonWorkflowEvent()`:
- `--workflow`
- `--run-id`
- `--branch`
- `--chat-id`
- `--agent`
- `--node`
- `--recovery`
- `--details`

Required flags:
- `start`: `--workflow`, `--chat-id`, `--agent`, and at least one of `--run-id` or `--branch`
- `complete`: `--workflow`, `--chat-id`, `--agent`, and at least one of `--run-id` or `--branch`
- `fail`: `--workflow`, `--chat-id`, `--agent`, at least one of `--run-id` or `--branch`, `--node`, and `--recovery`

The CLI success output must contain `archon workflow event recorded:` followed by the formatted summary. Missing required args must print usage to stderr and exit non-zero.

Create `src/archon-observability.test.ts` that proves:
- started summaries include `Archon workflow started`, workflow name, and run ID
- completed summaries include `Archon workflow completed`, workflow name, and branch fallback
- failed summaries include `Archon workflow failed`, failing node, and recovery action
- `formatArchonFailureReport()` includes `workflow:`, `run_id:`, `failing_node:`, and `recovery_action:`
- `formatArchonFailureReport()` throws when failed event lacks `failingNode`
- `formatArchonFailureReport()` throws when failed event lacks both `runId` and `branch`
- `recordArchonWorkflowEvent()` calls mocked `logToHiveMind()` with action `archon_workflow_started`
- `recordArchonWorkflowEvent()` calls mocked `emitChatEvent()` with type `error` for failed events
</action>
<verify>
<automated>
`npm test -- src/archon-observability.test.ts`
`npm run typecheck`
`grep -q 'archon_workflow_started' src/archon-observability.ts`
`grep -q 'archon_workflow_completed' src/archon-observability.ts`
`grep -q 'archon_workflow_failed' src/archon-observability.ts`
`grep -q 'archon workflow event recorded:' src/archon-observability-cli.ts`
</automated>
</verify>
<acceptance_criteria>
- `src/archon-observability.ts` exports `recordArchonWorkflowEvent`.
- `src/archon-observability.ts` contains `archon_workflow_started`, `archon_workflow_completed`, and `archon_workflow_failed`.
- `src/archon-observability.ts` contains `workflow:`, `failing_node:`, and `recovery_action:`.
- `src/archon-observability-cli.ts` contains `archon workflow event recorded:`.
- `npm test -- src/archon-observability.test.ts` exits 0.
- `npm run typecheck` exits 0.
</acceptance_criteria>
</task>

<task id="5-01-02" type="execute" wave="1">
<title>Document and enforce the Archon reporting contract across agents and workflows</title>
<read_first>
- `docs/agent-workflow-routing.md`
- `docs/claudeclaw-workflow-pack.md`
- `CLAUDE.md.example`
- `agents/_template/CLAUDE.md`
- `warroom/personas.py`
- `archon/workflows/claudeclaw-coding-plan-to-pr.yaml`
- `archon/workflows/claudeclaw-bugfix.yaml`
- `archon/workflows/claudeclaw-strategy-ingest.yaml`
- `archon/workflows/claudeclaw-ops-triage.yaml`
- `archon/workflows/claudeclaw-comms-content-draft.yaml`
- `archon/workflows/claudeclaw-workflow-authoring.yaml`
- `scripts/check-agent-workflow-routing.sh`
- `scripts/check-archon-workflow-pack.sh`
- `package.json`
</read_first>
<files>
- `docs/archon-observability.md`
- `docs/agent-workflow-routing.md`
- `docs/claudeclaw-workflow-pack.md`
- `CLAUDE.md.example`
- `agents/_template/CLAUDE.md`
- `warroom/personas.py`
- `archon/workflows/claudeclaw-coding-plan-to-pr.yaml`
- `archon/workflows/claudeclaw-bugfix.yaml`
- `archon/workflows/claudeclaw-strategy-ingest.yaml`
- `archon/workflows/claudeclaw-ops-triage.yaml`
- `archon/workflows/claudeclaw-comms-content-draft.yaml`
- `archon/workflows/claudeclaw-workflow-authoring.yaml`
- `scripts/check-archon-observability.sh`
- `package.json`
</files>
<action>
Create `docs/archon-observability.md` with these sections:
- `# Archon Workflow Observability`
- `## Reporting Contract`
- `## CLI Commands`
- `## Failure Report Fields`
- `## Agent Response Requirements`
- `## Safe Inspection and Cleanup`
- `## Validation`
- `## Safety Rules`

`docs/archon-observability.md` must contain these exact strings:
- `OBS-01`
- `OBS-02`
- `OBS-03`
- `node dist/archon-observability-cli.js start`
- `node dist/archon-observability-cli.js complete`
- `node dist/archon-observability-cli.js fail`
- `workflow:`
- `run_id:`
- `branch:`
- `failing_node:`
- `recovery_action:`
- `scripts/archon-runs.sh list`
- `scripts/archon-runs.sh stale --older-than-hours 24`
- `scripts/archon-runs.sh cleanup --older-than-hours 24`
- `/home/devuser/claudeclaw-worktrees`
- `/home/devuser/claudeclaw`
- `.env`
- `~/.archon/.env`
- `SQLite`
- `OAuth tokens`
- `live agent configs`

Update `docs/agent-workflow-routing.md` under the Archon workflow lane so it contains:
- `docs/archon-observability.md`
- `report workflow starts, completions, and failures`
- `workflow name, run ID or branch, failing node, and recovery action`

Update `CLAUDE.md.example` and `agents/_template/CLAUDE.md` so each contains:
- `docs/archon-observability.md`
- `node dist/archon-observability-cli.js`
- `workflow name, run ID or branch, failing node, and recovery action`

Update `warroom/personas.py` so the combined persona text contains:
- `docs/archon-observability.md`
- `workflow name, run ID or branch, failing node, and recovery action`

Update each `archon/workflows/claudeclaw-*.yaml` report node prompt so each workflow source contains:
- `docs/archon-observability.md`
- `workflow name`
- `run ID or branch`

For workflows with failure-prone implementation or runtime nodes (`claudeclaw-coding-plan-to-pr.yaml`, `claudeclaw-bugfix.yaml`, `claudeclaw-ops-triage.yaml`, and `claudeclaw-workflow-authoring.yaml`), report prompts must also contain:
- `failing node`
- `recovery action`

Create `scripts/check-archon-observability.sh` following the existing validator style:
- shebang `#!/usr/bin/env bash`
- `set -euo pipefail`
- `ROOT="$(git rev-parse --show-toplevel)"`
- `FAILED=0`
- helper `check_file_contains()`
- final pass line `Archon observability check passed.`
- final fail line `Archon observability check failed.`

The validator must check:
- `docs/archon-observability.md` exists
- `src/archon-observability.ts` exists
- `src/archon-observability-cli.ts` exists
- `scripts/archon-runs.sh` exists after Task 5-01-03
- all required strings listed above are present
- `package.json` contains `check:archon-observability`
- `package.json` contains `test:archon-runs`

Update `package.json` scripts with:
- `"check:archon-observability": "bash scripts/check-archon-observability.sh"`

Do not remove or rename existing package scripts.
</action>
<verify>
<automated>
`bash -n scripts/check-archon-observability.sh`
`grep -q 'docs/archon-observability.md' docs/agent-workflow-routing.md`
`grep -q 'node dist/archon-observability-cli.js' CLAUDE.md.example`
`grep -q 'node dist/archon-observability-cli.js' agents/_template/CLAUDE.md`
`grep -q 'workflow name, run ID or branch, failing node, and recovery action' warroom/personas.py`
`node -e "const p=require('./package.json'); if(p.scripts['check:archon-observability']!=='bash scripts/check-archon-observability.sh') process.exit(1)"`
</automated>
</verify>
<acceptance_criteria>
- `docs/archon-observability.md` exists and contains `OBS-01`, `OBS-02`, and `OBS-03`.
- `docs/archon-observability.md` contains `node dist/archon-observability-cli.js start`, `complete`, and `fail`.
- `docs/archon-observability.md` contains `workflow:`, `run_id:`, `failing_node:`, and `recovery_action:`.
- `docs/agent-workflow-routing.md` contains `docs/archon-observability.md`.
- `CLAUDE.md.example` contains `node dist/archon-observability-cli.js`.
- `agents/_template/CLAUDE.md` contains `node dist/archon-observability-cli.js`.
- `warroom/personas.py` contains `workflow name, run ID or branch, failing node, and recovery action`.
- Each `archon/workflows/claudeclaw-*.yaml` file contains `docs/archon-observability.md`.
- `scripts/check-archon-observability.sh` passes `bash -n`.
- `package.json` has script `check:archon-observability` equal to `bash scripts/check-archon-observability.sh`.
</acceptance_criteria>
</task>

<task id="5-01-03" type="execute" wave="1">
<title>Add safe Archon run inspection and stale worktree cleanup tooling</title>
<read_first>
- `scripts/archon-workspace-guard.sh`
- `scripts/install-archon-workflows.sh`
- `scripts/test-archon-workspace-guard.sh`
- `docs/archon-workspaces.md`
- `docs/archon-observability.md`
- `package.json`
</read_first>
<files>
- `scripts/archon-runs.sh`
- `scripts/test-archon-runs.sh`
- `scripts/check-archon-observability.sh`
- `docs/archon-observability.md`
- `package.json`
</files>
<action>
Create `scripts/archon-runs.sh` with:
- shebang `#!/usr/bin/env bash`
- `set -euo pipefail`
- `PROD_CLAUDECLAW_CWD="${PROD_CLAUDECLAW_CWD:-/home/devuser/claudeclaw}"`
- `ARCHON_WORKTREE_ROOT="${ARCHON_WORKTREE_ROOT:-/home/devuser/claudeclaw-worktrees}"`
- commands `list`, `stale`, and `cleanup`
- option `--older-than-hours <N>` for `stale` and `cleanup`, default `24`
- option `--force` for `cleanup`
- output labels `RUN_ID`, `PATH`, `BRANCH`, `AGE_HOURS`, `STATUS`
- dry-run cleanup output containing `DRY-RUN: would remove stale Archon worktree`
- forced cleanup output containing `REMOVED: stale Archon worktree`

`scripts/archon-runs.sh` must include a `resolve_path()` helper modeled after `scripts/archon-workspace-guard.sh`.

Safety rules:
- If `${ARCHON_WORKTREE_ROOT}` resolves to `${PROD_CLAUDECLAW_CWD}`, fail with text `refusing production checkout`.
- If a candidate path does not resolve under `${ARCHON_WORKTREE_ROOT}/`, fail or skip with text `outside Archon worktree root`.
- If a candidate path resolves to `${PROD_CLAUDECLAW_CWD}`, fail with text `refusing production checkout`.
- `cleanup` without `--force` must not remove files.
- `cleanup --force` must refuse dirty git worktrees and print `dirty worktree; not removing`.
- `cleanup --force` must remove only stale clean worktrees under the Archon worktree root.
- The script must not print `.env`, `~/.archon/.env`, SQLite contents, OAuth tokens, or live agent config contents.

Create `scripts/test-archon-runs.sh` with:
- shebang `#!/usr/bin/env bash`
- `set -euo pipefail`
- temporary git fixture under `mktemp -d`
- tests for `list`
- tests for `stale --older-than-hours 24`
- tests that `cleanup --older-than-hours 24` prints `DRY-RUN: would remove stale Archon worktree` and leaves files present
- tests that `cleanup --older-than-hours 24 --force` removes a stale clean worktree
- tests that dirty worktrees are not removed and output includes `dirty worktree; not removing`
- tests that setting `ARCHON_WORKTREE_ROOT` equal to `PROD_CLAUDECLAW_CWD` fails with `refusing production checkout`
- final pass line `Archon runs test passed.`
- final fail line `Archon runs test failed.`

Update `package.json` scripts with:
- `"test:archon-runs": "bash scripts/test-archon-runs.sh"`

Update `docs/archon-observability.md` so `## Safe Inspection and Cleanup` contains:
- `scripts/archon-runs.sh list`
- `scripts/archon-runs.sh stale --older-than-hours 24`
- `scripts/archon-runs.sh cleanup --older-than-hours 24`
- `scripts/archon-runs.sh cleanup --older-than-hours 24 --force`
- `dirty worktree; not removing`
- `DRY-RUN: would remove stale Archon worktree`
- `REMOVED: stale Archon worktree`

Update `scripts/check-archon-observability.sh` from Task 5-01-02 so it checks:
- `scripts/archon-runs.sh` exists
- `scripts/test-archon-runs.sh` exists
- `scripts/archon-runs.sh` contains `refusing production checkout`
- `scripts/archon-runs.sh` contains `outside Archon worktree root`
- `scripts/archon-runs.sh` contains `dirty worktree; not removing`
- `scripts/archon-runs.sh` contains `DRY-RUN: would remove stale Archon worktree`
- `scripts/test-archon-runs.sh` contains `Archon runs test passed.`
</action>
<verify>
<automated>
`bash -n scripts/archon-runs.sh`
`bash -n scripts/test-archon-runs.sh`
`npm run test:archon-runs`
`npm run check:archon-observability`
`node -e "const p=require('./package.json'); if(p.scripts['test:archon-runs']!=='bash scripts/test-archon-runs.sh') process.exit(1)"`
</automated>
</verify>
<acceptance_criteria>
- `scripts/archon-runs.sh` passes `bash -n`.
- `scripts/test-archon-runs.sh` passes `bash -n`.
- `npm run test:archon-runs` exits 0.
- `scripts/archon-runs.sh` contains `refusing production checkout`.
- `scripts/archon-runs.sh` contains `outside Archon worktree root`.
- `scripts/archon-runs.sh` contains `dirty worktree; not removing`.
- `scripts/archon-runs.sh` contains `DRY-RUN: would remove stale Archon worktree`.
- `docs/archon-observability.md` contains `scripts/archon-runs.sh cleanup --older-than-hours 24 --force`.
- `package.json` has script `test:archon-runs` equal to `bash scripts/test-archon-runs.sh`.
</acceptance_criteria>
</task>
</tasks>

<verification>
<automated>
`grep -q 'OBS-01' .planning/phases/05-workflow-observability-and-cleanup/05-PLAN.md`
`grep -q 'OBS-02' .planning/phases/05-workflow-observability-and-cleanup/05-PLAN.md`
`grep -q 'OBS-03' .planning/phases/05-workflow-observability-and-cleanup/05-PLAN.md`
`grep -q '<threat_model>' .planning/phases/05-workflow-observability-and-cleanup/05-PLAN.md`
`grep -q 'archon_workflow_started' .planning/phases/05-workflow-observability-and-cleanup/05-PLAN.md`
`grep -q 'workflow name, run ID or branch, failing node, and recovery action' .planning/phases/05-workflow-observability-and-cleanup/05-PLAN.md`
`grep -q 'DRY-RUN: would remove stale Archon worktree' .planning/phases/05-workflow-observability-and-cleanup/05-PLAN.md`
</automated>
<manual>
- On the VPS after implementation and deploy, run `cd /home/devuser/claudeclaw && scripts/archon-runs.sh list`.
- Run `scripts/archon-runs.sh stale --older-than-hours 24`.
- Review stale-run output before running `scripts/archon-runs.sh cleanup --older-than-hours 24 --force`.
- Launch or simulate one small Archon workflow and verify the dashboard/hive_mind feed or agent response includes the workflow name and run ID at start and completion.
</manual>
</verification>

<success_criteria>
- `OBS-01` is satisfied because workflow starts and completions are recorded through `recordArchonWorkflowEvent()` into live chat/dashboard events and durable `hive_mind` activity.
- `OBS-02` is satisfied because failed workflow reports require workflow name, run ID or branch, failing node, and recovery action, with tests enforcing those fields.
- `OBS-03` is satisfied because Archie and Hopper have documented, validated `scripts/archon-runs.sh` commands for safe list/stale/cleanup operations under `/home/devuser/claudeclaw-worktrees`.
- Cleanup is dry-run by default and cannot target `/home/devuser/claudeclaw`.
- `npm run check:archon-observability`, `npm run test:archon-runs`, `npm run typecheck`, and `npm test` are the required local verification path for the phase.
</success_criteria>

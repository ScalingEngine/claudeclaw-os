---
phase: 5
phase_name: Workflow observability and cleanup
status: complete
researched: 2026-05-06
requirements:
  - OBS-01
  - OBS-02
  - OBS-03
---

# Phase 5 Research: Workflow Observability and Cleanup

## Research Question

What needs to be true before ClaudeClaw agents can make Archon workflow runs visible to Noah, report failures in a standard recoverable format, and let Archie/Hopper inspect or clean stale isolated work safely?

## Source Context

- `.planning/ROADMAP.md` defines Phase 5 as workflow observability and cleanup for Archon runs.
- `.planning/REQUIREMENTS.md` maps Phase 5 to `OBS-01`, `OBS-02`, and `OBS-03`.
- `.planning/STATE.md` says workflows install and load, but agents still need a standard way to surface run state, failures, and stale-run cleanup.
- `.planning/phases/04-claudeclaw-workflow-pack/04-SUMMARY.md` confirms all six `claudeclaw-*` workflow files exist and the VPS reported `home_workflows_loaded: 7`, `workflows_discovery_completed: 27`, and `errorCount: 0`.
- `docs/agent-workflow-routing.md`, `CLAUDE.md.example`, `agents/_template/CLAUDE.md`, and `warroom/personas.py` are the committed persona/routing surfaces that teach Ezra, Vera, Poe, Cole, Hopper, and Archie how to use Archon.
- `docs/archon-workspaces.md` and `scripts/archon-workspace-guard.sh` define the safe worktree boundary: coding work runs under `/home/devuser/claudeclaw-worktrees/<run-id>`, not `/home/devuser/claudeclaw`.

## Current System Shape

ClaudeClaw already has the primitives needed for user-visible workflow observability:

- `src/state.ts` exposes `emitChatEvent()`, with event types including `progress`, `error`, and `hive_mind`.
- `src/dashboard.ts` streams `chatEvents` to `/api/chat/stream` and exposes `/api/hive-mind`.
- `src/db.ts` exposes `logToHiveMind()` and `getHiveMindEntries()`. The `hive_mind` table stores `agent_id`, `chat_id`, `action`, `summary`, `artifacts`, and `created_at`.
- `src/orchestrator.ts` already uses `logToHiveMind()` for delegation start/result/error records.
- `src/dashboard-html.ts` already renders recent hive mind activity inside agent detail panels.

There is no Archon-specific event bridge yet. Agents can launch or recommend workflows after Phase 4, but there is no committed helper that turns "workflow started/completed/failed" into both a live chat/dashboard event and a durable hive_mind activity row.

## Recommended Implementation Shape

Use a small repo-local observability module rather than spreading formatting rules through agent prompts:

- `src/archon-observability.ts`
  - Define `ArchonWorkflowEvent` with `workflowName`, `runId`, `status`, `agentId`, `chatId`, `branch`, `nodeId`, `failingNode`, `recoveryAction`, and `details`.
  - Export `formatArchonWorkflowSummary(event)`.
  - Export `formatArchonFailureReport(event)` that always names workflow, run ID or branch, failing node, and recovery action.
  - Export `recordArchonWorkflowEvent(event)` that calls `logToHiveMind()` and emits a live `progress`, `error`, or `hive_mind` chat event through `emitChatEvent()`.
- `src/archon-observability-cli.ts`
  - Provide a simple built artifact agents can call from VPS shells after `npm run build`.
  - Suggested command shape:
    - `node dist/archon-observability-cli.js start --workflow claudeclaw-bugfix --run-id 202605061700-bug --chat-id "$CHAT_ID" --agent archie --branch archon/202605061700-bug`
    - `node dist/archon-observability-cli.js complete --workflow ...`
    - `node dist/archon-observability-cli.js fail --workflow ... --node regression-check --recovery "Run npm test locally and re-enter claudeclaw-bugfix from diagnosis"`
- `docs/archon-observability.md`
  - Define launch/completion/failure reporting contract, exact CLI commands, and Archie/Hopper cleanup commands.
- `scripts/check-archon-observability.sh`
  - Deterministic grep/test validator wired into `package.json`.

This satisfies `OBS-01` without requiring a new database table: workflow events become user-visible live events and durable hive_mind records. A future dashboard can add a first-class workflow run view, but Phase 5 can stay lean and build on the surfaces that already exist.

## Failure Report Contract

Failed workflow output should include these exact fields:

- `workflow:` the Archon workflow name, for example `claudeclaw-bugfix`
- `run_id:` the run/worktree identifier, for example `202605061700-bug`
- `branch:` the review branch when applicable, for example `archon/202605061700-bug`
- `failing_node:` the failed node, for example `regression-check`
- `recovery_action:` the next concrete action, for example `Fix failing tests in the worktree, rerun npm test, then rerun the workflow from regression-check`

The helper should reject a failed event when `workflowName`, `runId` or `branch`, `failingNode`, or `recoveryAction` is missing. This turns `OBS-02` into something tests can prove.

## Safe Inspection and Cleanup

Archie and Hopper need safe inspection and cleanup paths for active/stale runs without mutating production by accident. The safest local abstraction is a script that operates only on the configured worktree root:

- `scripts/archon-runs.sh list`
  - lists directories under `${ARCHON_WORKTREE_ROOT:-/home/devuser/claudeclaw-worktrees}`
  - prints `run_id`, `path`, `branch`, `age`, and a status hint
  - refuses to operate if the root resolves to `/home/devuser/claudeclaw`
- `scripts/archon-runs.sh stale --older-than-hours 24`
  - dry-run report of worktrees older than the threshold
- `scripts/archon-runs.sh cleanup --older-than-hours 24`
  - dry-run by default
- `scripts/archon-runs.sh cleanup --older-than-hours 24 --force`
  - removes stale clean worktrees only
  - refuses dirty worktrees unless an explicit override is implemented and documented
  - uses `git -C "$PROD_CLAUDECLAW_CWD" worktree remove "$path"` when the production checkout exists, falling back to a safe refusal if it cannot verify the git worktree

This satisfies `OBS-03` while preserving Phase 2's safe workspace boundary.

## Security and Approval Constraints

- Workflow observability must never print `.env`, `~/.archon/.env`, OAuth tokens, SQLite database contents, or live agent configs.
- Cleanup must never operate on `/home/devuser/claudeclaw`.
- Cleanup must operate only under `/home/devuser/claudeclaw-worktrees` by default.
- Cleanup must default to dry-run. Destructive removal requires `--force`.
- Dirty worktrees should be reported, not deleted, unless an explicit documented override is added.
- Reporting failures must not restart services, deploy, send messages, close issues, or mutate production data.

## Validation Architecture

Validation should be deterministic and mostly local:

- Unit tests:
  - `src/archon-observability.test.ts` proves started/completed/failed summaries, required failure fields, and emitted event type selection.
- Bash tests:
  - `scripts/test-archon-runs.sh` creates temporary fake worktree roots and proves list/stale/cleanup dry-run, production checkout refusal, root-boundary refusal, and dirty-worktree refusal.
- Static validator:
  - `scripts/check-archon-observability.sh` checks required docs, package scripts, persona/routing surfaces, workflow files, and safety strings.
- Full local command:
  - `npm run check:archon-observability && npm run typecheck && npm test`
- VPS/manual command:
  - after deploy, run `scripts/archon-runs.sh list` and `scripts/archon-runs.sh stale --older-than-hours 24` on `/home/devuser/claudeclaw`.

## Planning Implications

One executable plan is enough. It should create the observability helper and CLI, update agent/workflow reporting contracts, add safe inspection/cleanup tooling, and wire deterministic validation. The plan should remain autonomous for committed repo artifacts. Actual cleanup of stale VPS worktrees should remain dry-run/manual unless Noah explicitly chooses `--force`.

## RESEARCH COMPLETE

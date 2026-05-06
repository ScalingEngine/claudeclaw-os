---
phase: 05-workflow-observability-and-cleanup
plan: 01
subsystem: workflow-observability
tags: [archon, observability, hive-mind, cleanup, bash, workflow-pack]
requires:
  - phase: 01-vps-archon-runtime-surface
    provides: VPS Archon runtime wrapper and workflow discovery surface
  - phase: 02-safe-workspace-and-deploy-boundary
    provides: safe Archon worktree boundary and production checkout protections
  - phase: 03-agent-workflow-routing-policy
    provides: committed agent routing and approval policy
  - phase: 04-claudeclaw-workflow-pack
    provides: ClaudeClaw Archon workflow sources and installer validation
provides:
  - Archon workflow start/completion/failure event bridge into hive_mind and live chat events
  - Agent-callable Archon observability CLI
  - Standard failure report contract across docs, persona templates, and workflow report nodes
  - Safe Archon run list/stale/cleanup tooling with dry-run default and dirty-worktree refusal
affects: [archon-workflows, agent-prompts, warroom-personas, operations, dashboard-activity]
tech-stack:
  added: []
  patterns:
    - TypeScript event formatter and recorder over existing db/state primitives
    - Deterministic grep-based validator for observability contract drift
    - Root-bounded Bash cleanup tooling with dry-run destructive operations
key-files:
  created:
    - src/archon-observability.ts
    - src/archon-observability-cli.ts
    - src/archon-observability.test.ts
    - docs/archon-observability.md
    - scripts/archon-runs.sh
    - scripts/test-archon-runs.sh
    - scripts/check-archon-observability.sh
    - .planning/phases/05-workflow-observability-and-cleanup/05-USER-SETUP.md
  modified:
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
key-decisions:
  - "Reuse existing hive_mind and chat event surfaces instead of adding a workflow-runs table."
  - "Require failed workflow reports to name workflow, run ID or branch, failing node, and recovery action."
  - "Make stale-run cleanup dry-run by default and refuse dirty worktrees or the production checkout."
patterns-established:
  - "Archon observability events use action names archon_workflow_started, archon_workflow_completed, and archon_workflow_failed."
  - "Agent workflow report nodes link to docs/archon-observability.md for the reporting contract."
  - "Operator cleanup commands operate only under /home/devuser/claudeclaw-worktrees."
requirements-completed: [OBS-01, OBS-02, OBS-03]
duration: 8 min
completed: 2026-05-06
---

# Phase 05 Plan 01: Archon Workflow Visibility, Failure Reporting, and Stale-Run Cleanup Summary

**Archon workflow events now surface through live chat/dashboard events and hive_mind records, with failure-report contracts and safe stale-worktree cleanup tooling.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-06T18:49:12Z
- **Completed:** 2026-05-06T18:57:31Z
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments

- Added `recordArchonWorkflowEvent()` plus deterministic summary/failure formatting and CLI commands for `start`, `complete`, and `fail`.
- Documented and propagated the Archon observability contract into routing docs, prompt templates, War Room personas, and all committed `claudeclaw-*` workflow report nodes.
- Added `scripts/archon-runs.sh` and a fixture test for active/stale run listing, dry-run cleanup, forced clean removal, production-checkout refusal, and dirty-worktree refusal.
- Added `npm run check:archon-observability` and `npm run test:archon-runs`.

## Task Commits

Each task was committed atomically:

1. **Task 5-01-01: Add Archon workflow event reporting helper and CLI** - `2f95838` (feat)
2. **Task 5-01-02: Document and enforce the Archon reporting contract across agents and workflows** - `91dca13` (docs)
3. **Task 5-01-03: Add safe Archon run inspection and stale worktree cleanup tooling** - `a5c6534` (feat)

## Files Created/Modified

- `src/archon-observability.ts` - Formats workflow summaries/failure reports and records events to hive_mind plus live chat events.
- `src/archon-observability-cli.ts` - Agent-callable CLI for workflow `start`, `complete`, and `fail` events.
- `src/archon-observability.test.ts` - Contract tests for summaries, failure report required fields, hive_mind action, and failed-event chat type.
- `docs/archon-observability.md` - Canonical reporting, failure-field, validation, and cleanup contract.
- `scripts/archon-runs.sh` - Safe list/stale/cleanup command for Archon isolated worktrees.
- `scripts/test-archon-runs.sh` - Temporary git fixture tests for cleanup safety behavior.
- `scripts/check-archon-observability.sh` - Static validator for docs, prompts, workflow report nodes, package scripts, and safety strings.
- `docs/agent-workflow-routing.md`, `docs/claudeclaw-workflow-pack.md`, `CLAUDE.md.example`, `agents/_template/CLAUDE.md`, `warroom/personas.py`, and `archon/workflows/claudeclaw-*.yaml` - Reporting contract references and required failure-field language.
- `package.json` - Added observability check and Archon runs test scripts.

## Decisions Made

- Reused `logToHiveMind()` and `emitChatEvent()` rather than adding a new persistence table; this meets OBS-01 with existing dashboard/conversation surfaces.
- Standardized failure report labels as `workflow:`, `run_id:` or `branch:`, `failing_node:`, and `recovery_action:` so OBS-02 can be tested.
- Kept cleanup conservative: dry-run by default, root-bounded to `/home/devuser/claudeclaw-worktrees`, production checkout refusal, and dirty-worktree refusal.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None.

## Issues Encountered

- Repo-wide `npm test` still fails in unrelated pre-existing areas: avatar/config mocks missing `MAIN_AGENT_ID`, memory/scheduler tests expecting legacy `main` instead of `ezra`, schedule CLI tests missing `DB_ENCRYPTION_KEY`, dashboard contract mismatches, and local TTS requiring `ffmpeg`. Phase-specific checks, typecheck, and build pass.

## Verification

Passed:

```bash
npm test -- src/archon-observability.test.ts
npm run check:archon-observability
npm run test:archon-runs
npm run typecheck
npm run build
```

Ran with unrelated existing failures:

```bash
npm test
```

## User Setup Required

External VPS verification remains manual. See `.planning/phases/05-workflow-observability-and-cleanup/05-USER-SETUP.md` for:

- `scripts/archon-runs.sh list`
- `scripts/archon-runs.sh stale --older-than-hours 24`
- dry-run cleanup review before optional `--force`

## Self-Check: PASSED

- `OBS-01` is covered by `recordArchonWorkflowEvent()` writing durable hive_mind rows and emitting live chat/dashboard events.
- `OBS-02` is covered by required failure report fields and tests.
- `OBS-03` is covered by documented, validated `scripts/archon-runs.sh` list/stale/cleanup commands.
- Cleanup is dry-run by default and refuses `/home/devuser/claudeclaw`.

## Next Phase Readiness

Milestone v1.1 has implementation coverage for all planned Archon workflow-engine requirements. The remaining work is VPS deploy/manual verification from `05-USER-SETUP.md`, followed by milestone verification or completion.

---
*Phase: 05-workflow-observability-and-cleanup*
*Completed: 2026-05-06*

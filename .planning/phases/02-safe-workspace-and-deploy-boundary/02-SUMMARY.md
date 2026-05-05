---
phase: 02-safe-workspace-and-deploy-boundary
plan: 02
subsystem: infra
tags: [archon, worktrees, deploy, rollback, safety]
requires:
  - phase: 01-vps-archon-runtime-surface
    provides: VPS Archon wrapper and runtime status checks
provides:
  - Archon workspace guard that refuses production checkout paths
  - Safe workspace runbook for disposable worktrees, forbidden state, deploy, and rollback
  - Runtime documentation bridge from workflow discovery to safe coding workspaces
affects: [archon-runtime, deploy-runbook, workflow-routing]
tech-stack:
  added: []
  patterns:
    - strict bash preflight with labeled OK/FAIL checks
    - commit-based deploy and rollback runbook
key-files:
  created:
    - scripts/archon-workspace-guard.sh
    - scripts/test-archon-workspace-guard.sh
    - docs/archon-workspaces.md
  modified:
    - docs/archon-runtime.md
    - package.json
key-decisions:
  - "Archon coding workflows must use /home/devuser/claudeclaw-worktrees/<run-id>, while discovery may still inspect /home/devuser/claudeclaw."
  - "Deploy remains commit-based; loose file copying from worktrees into production is explicitly forbidden, and production install/build steps must run before service restart."
patterns-established:
  - "Workspace guard: resolve paths before boundary checks and print only file paths, never secret contents."
  - "Safe workspace docs: operators create a disposable worktree, run the guard, validate, install dependencies, build, then deploy a known-good git commit."
requirements-completed: [SAFE-01, SAFE-02, SAFE-03, SAFE-04]
duration: 4min
completed: 2026-05-05
---

# Phase 02 Plan 02: Safe Workspace and Deploy Boundary Summary

**Archon coding workflow boundary using disposable git worktrees, forbidden-state guard checks, and commit-based deploy/rollback docs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-05T22:54:30Z
- **Completed:** 2026-05-05T22:58:06Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments

- Added `scripts/archon-workspace-guard.sh`, an executable strict-bash preflight that refuses `/home/devuser/claudeclaw`, requires `/home/devuser/claudeclaw-worktrees/`, checks git worktree status, optionally requires a clean checkout, and blocks forbidden production state paths.
- Added `docs/archon-workspaces.md` with the exact disposable worktree, guard, Archon `--cwd`, validation, deploy, rollback, and cleanup commands.
- Updated `docs/archon-runtime.md` so workflow discovery can still target production while coding workflows are routed to the safe workspace contract.
- Closed code-review findings by adding production `npm ci`/`npm run build` steps to deploy and rollback, plus a committed guard regression test exposed as `npm run test:archon-workspace-guard`.

## Task Commits

Each task was committed atomically:

1. **Task 2-01-01: Add Archon workspace guard** - `9d9d7c0` (feat)
2. **Task 2-01-02: Document safe worktree, deploy, and rollback rules** - `070b8c5` (docs)
3. **Task 2-01-03: Route runtime docs to the safe workspace contract** - `5207a51` (docs)
4. **Task 2-01-04: Run local and VPS safety verification** - `d627dbc` (chore, empty verification commit)

## Files Created/Modified

- `scripts/archon-workspace-guard.sh` - Archon coding workspace safety guard.
- `scripts/test-archon-workspace-guard.sh` - Regression fixture for allowed worktree, production rejection, forbidden state, and clean-worktree enforcement.
- `docs/archon-workspaces.md` - Operator runbook for disposable worktrees, forbidden state, commit-based deploy, rollback, and cleanup.
- `docs/archon-runtime.md` - Runtime bridge section pointing coding workflows to the safe workspace contract.
- `package.json` - Adds the `test:archon-workspace-guard` script.

## Decisions Made

- Archon coding workflows must use `/home/devuser/claudeclaw-worktrees/<run-id>` as the working directory; `/home/devuser/claudeclaw` remains acceptable only for workflow discovery.
- The guard reports only forbidden file paths and labels, not file contents, to avoid exposing secrets while still making failures actionable.
- Task 4 used an empty commit because verification produced no code artifact and planning state/summary changes are reserved for the final metadata commit.

## Deviations from Plan

None - plan implementation executed as written.

## Issues Encountered

- VPS disposable-worktree verification was not run from this local macOS runtime. The plan already marks this as operator setup requiring access to `/home/devuser/claudeclaw`; local automated checks passed and the exact VPS commands are documented in `docs/archon-workspaces.md`.

## Verification

- `bash -n scripts/archon-workspace-guard.sh` - passed
- `bash -n scripts/test-archon-workspace-guard.sh` - passed
- `npm run test:archon-workspace-guard` - passed
- `npm run typecheck` - passed
- `npm run build` - passed
- `grep -q 'SAFE-01' .planning/phases/02-safe-workspace-and-deploy-boundary/02-PLAN.md` - passed
- `grep -q 'SAFE-02' .planning/phases/02-safe-workspace-and-deploy-boundary/02-PLAN.md` - passed
- `grep -q 'SAFE-03' .planning/phases/02-safe-workspace-and-deploy-boundary/02-PLAN.md` - passed
- `grep -q 'SAFE-04' .planning/phases/02-safe-workspace-and-deploy-boundary/02-PLAN.md` - passed
- `grep -q 'docs/archon-workspaces.md' docs/archon-runtime.md` - passed

## User Setup Required

Run VPS disposable-worktree validation after the implementation commit is deployed to `/home/devuser/claudeclaw`:

- Create a worktree under `/home/devuser/claudeclaw-worktrees/<run-id>` and verify the guard exits 0.
- Verify `/home/devuser/claudeclaw/scripts/archon-workspace-guard.sh /home/devuser/claudeclaw` exits non-zero.
- Touch `.env.test-forbidden` inside the disposable worktree and verify the guard exits non-zero, then remove it and clean up the worktree branch.

## Known Stubs

None.

## Auth Gates

None.

## Threat Flags

None - the new safety surface directly implements the plan threat model mitigations for T-01 through T-04.

## Self-Check: PASSED

- Found created/modified files: `scripts/archon-workspace-guard.sh`, `docs/archon-workspaces.md`, `docs/archon-runtime.md`, `.planning/phases/02-safe-workspace-and-deploy-boundary/02-SUMMARY.md`
- Found task commits: `9d9d7c0`, `070b8c5`, `5207a51`, `d627dbc`

## Next Phase Readiness

SAFE-01 through SAFE-04 are documented and locally verified. Persona routing and workflow-pack phases can now refer agents to `docs/archon-workspaces.md` before launching Archon coding workflows.

---
*Phase: 02-safe-workspace-and-deploy-boundary*
*Completed: 2026-05-05*

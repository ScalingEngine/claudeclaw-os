---
phase: 04-claudeclaw-workflow-pack
plan: 04
subsystem: workflow
tags: [archon, workflows, bash, validation, docs]

requires:
  - phase: 01-vps-archon-runtime-surface
    provides: VPS Archon wrapper, workflow discovery, and credential-loading assumptions
  - phase: 02-safe-workspace-and-deploy-boundary
    provides: safe Archon coding workspace boundary and guard script
  - phase: 03-agent-workflow-routing-policy
    provides: direct answer, skill/react loop, Archon workflow, and approval routing policy
provides:
  - ClaudeClaw starter Archon workflow pack covering FLOW-01 through FLOW-06
  - Installer for committed claudeclaw workflow sources into ~/.archon/workflows
  - Deterministic workflow pack validator wired into package.json
affects: [archon-workflows, agent-routing, workflow-observability, vps-operations]

tech-stack:
  added: []
  patterns: [repo-owned workflow sources, dry-run installer, deterministic grep validator]

key-files:
  created:
    - archon/workflows/claudeclaw-coding-plan-to-pr.yaml
    - archon/workflows/claudeclaw-bugfix.yaml
    - archon/workflows/claudeclaw-strategy-ingest.yaml
    - archon/workflows/claudeclaw-ops-triage.yaml
    - archon/workflows/claudeclaw-comms-content-draft.yaml
    - archon/workflows/claudeclaw-workflow-authoring.yaml
    - docs/claudeclaw-workflow-pack.md
    - scripts/install-archon-workflows.sh
    - scripts/check-archon-workflow-pack.sh
  modified:
    - package.json

key-decisions:
  - "ClaudeClaw workflow sources live in archon/workflows/ and install into ~/.archon/workflows on the VPS."
  - "Local validation is deterministic and grep-based; VPS Archon schema/list validation remains an operator install step."
  - "Coding and bugfix workflows require /home/devuser/claudeclaw-worktrees/<run-id> plus scripts/archon-workspace-guard.sh before implementation."

patterns-established:
  - "Workflow pack source files include requirement IDs and safety policy strings for deterministic validation."
  - "Workflow pack installer supports --dry-run and copies only committed claudeclaw-*.yaml source files."
  - "Workflow pack checker follows scripts/check-agent-workflow-routing.sh style with check_file_contains and fixed output."

requirements-completed: [FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-06]

duration: 5m25s
completed: 2026-05-06
---

# Phase 4 Plan 04: ClaudeClaw Workflow Pack Summary

**Repo-owned ClaudeClaw Archon workflow pack with installer, operator docs, and deterministic validation for FLOW-01 through FLOW-06**

## Performance

- **Duration:** 5m25s
- **Started:** 2026-05-06T02:36:40Z
- **Completed:** 2026-05-06T02:42:45Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added six committed `claudeclaw-*` workflow source files covering coding plan-to-PR, bugfix, strategy ingestion, ops triage, comms/content drafting, and workflow authoring.
- Added `scripts/install-archon-workflows.sh` with `--dry-run` and install behavior that copies only committed workflow sources into `~/.archon/workflows`.
- Added `docs/claudeclaw-workflow-pack.md` with workflow inventory, install, verification, safety, rollback, and VPS discovery commands.
- Added `scripts/check-archon-workflow-pack.sh` plus `npm run check:archon-workflow-pack` for deterministic local verification.

## Task Commits

1. **Task 4-01-01: Create committed ClaudeClaw workflow pack sources** - `b664d8d` (feat)
2. **Task 4-01-02: Add workflow pack installer and operator documentation** - `7dc42ac` (feat)
3. **Task 4-01-03: Add deterministic workflow pack validator and package script** - `f6d7be9` (feat)

## Files Created/Modified

- `archon/workflows/claudeclaw-coding-plan-to-pr.yaml` - FLOW-01 plan-to-PR workflow with worktree guard and typecheck/test/build validation.
- `archon/workflows/claudeclaw-bugfix.yaml` - FLOW-02 bugfix workflow with diagnosis, focused fix, regression check, and report output.
- `archon/workflows/claudeclaw-strategy-ingest.yaml` - FLOW-03 strategy ingestion workflow for canonical planning updates with a review gate.
- `archon/workflows/claudeclaw-ops-triage.yaml` - FLOW-04 ops workflow for health checks, log review, recommendations, and Noah approval before effects.
- `archon/workflows/claudeclaw-comms-content-draft.yaml` - FLOW-05 comms/content drafting workflow for Poe, Cole, and Vera with no send/publish without approval.
- `archon/workflows/claudeclaw-workflow-authoring.yaml` - FLOW-06 workflow-authoring workflow tied to docs, validation, and VPS workflow discovery.
- `docs/claudeclaw-workflow-pack.md` - Operator documentation for scope, workflow inventory, install, verification, safety, and rollback.
- `scripts/install-archon-workflows.sh` - Dry-run capable installer for committed `claudeclaw-*.yaml` files.
- `scripts/check-archon-workflow-pack.sh` - Deterministic validator for workflow files, requirement IDs, safety strings, docs, and installer.
- `package.json` - Adds `check:archon-workflow-pack`.

## Decisions Made

- Workflow sources are repo-owned under `archon/workflows/`; runtime installation into `~/.archon/workflows` is explicit operator setup after deploy.
- Local validation checks stable strings and safety boundaries because the live Archon runtime/schema is validated on the VPS after install.
- Coding and bugfix workflows preserve the safe workspace boundary by requiring `/home/devuser/claudeclaw-worktrees/<run-id>` and `scripts/archon-workspace-guard.sh`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None found.

## User Setup Required

After deploying these commits to the VPS:

```bash
cd /home/devuser/claudeclaw
scripts/install-archon-workflows.sh --dry-run
scripts/install-archon-workflows.sh
/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw
systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw
```

Confirm the workflow list includes all six `claudeclaw-*` workflow names.

## Verification

- `bash -n scripts/install-archon-workflows.sh`
- `bash -n scripts/check-archon-workflow-pack.sh`
- `npm run check:archon-workflow-pack`
- `npm run typecheck`
- Plan-level greps for `FLOW-01`, `FLOW-06`, `<threat_model>`, `scripts/archon-workspace-guard.sh`, and `Noah approval`

## Next Phase Readiness

Phase 5 can build workflow observability on top of the committed workflow pack and validator. VPS install/list verification remains manual operator setup because it mutates home-scoped Archon workflow state outside git.

## Self-Check: PASSED

- Verified all created and modified files exist.
- Verified task commits `b664d8d`, `7dc42ac`, and `f6d7be9` exist in git history.

---
*Phase: 04-claudeclaw-workflow-pack*
*Completed: 2026-05-06*

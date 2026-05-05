---
phase: 01-vps-archon-runtime-surface
plan: 01
subsystem: infra
tags: [archon, vps, systemd, bash, runbook]

requires: []
provides:
  - VPS-safe Archon wrapper with explicit runtime defaults
  - Archon status doctor for repo, credential, workflow-path, and workflow-list checks
  - Operator runbook for install, verification, cleanup, rollback, and safety boundaries
affects: [archon-runtime, workflow-routing, safe-workspaces, vps-ops]

tech-stack:
  added: []
  patterns:
    - "Repo-owned bash wrappers for production-adjacent runtime command surfaces"
    - "Credential files are sourced in-process without shell tracing or value logging"

key-files:
  created:
    - scripts/archon-vps.sh
    - scripts/archon-status.sh
    - docs/archon-runtime.md
  modified: []

key-decisions:
  - "Kept Archon integration outside core src/ code for Phase 1."
  - "Did not bypass SSH host key verification while attempting VPS checks."
  - "Committed only SUMMARY.md as plan metadata because this worktree run must not update STATE.md or ROADMAP.md."

patterns-established:
  - "Archon wrapper defaults to /home/devuser/remote-coding-agent and /home/devuser/claudeclaw while allowing environment overrides."
  - "Status checks emit one labeled line per check and fail on legacy workflow warnings or unsafe env permissions."

requirements-completed: [ARCH-01, ARCH-02, ARCH-03, ARCH-04]

duration: 4min
completed: 2026-05-05
---

# Phase 01 Plan 01: Reliable VPS Archon Command Surface Summary

**VPS Archon command surface with explicit wrapper defaults, status doctor, and operator runbook for workflow discovery and credential-safe invocation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-05T19:28:28Z
- **Completed:** 2026-05-05T19:32:18Z
- **Tasks:** 4 completed
- **Files modified:** 4

## Accomplishments

- Added `scripts/archon-vps.sh`, an executable wrapper that uses explicit VPS defaults, sources `~/.archon/.env` without printing values, and defaults no-arg calls to workflow discovery.
- Added `scripts/archon-status.sh`, an executable status doctor that checks Archon repo/package/bun/env/workflow paths and fails on legacy/deprecated workflow-list output.
- Added `docs/archon-runtime.md` with install, verification, legacy workflow cleanup, rollback, and safety notes, including the Phase 1 discovery-only boundary.
- Ran local verification successfully and attempted VPS verification without mutating production state or secrets.

## Task Commits

1. **Task 1: Add VPS-safe Archon wrapper** - `29e58d6` (feat)
2. **Task 2: Add Archon runtime status check** - `5db22dd` (feat)
3. **Task 3: Document install, verification, cleanup, and rollback** - `4907adf` (docs)
4. **Task 4: Run local and VPS verification** - no task commit; verification-only task with no project-file changes

## Files Created/Modified

- `scripts/archon-vps.sh` - VPS-safe Archon wrapper with explicit defaults and env-file sourcing.
- `scripts/archon-status.sh` - Archon runtime doctor for repo, package, bun, env, workflow path, legacy path, and workflow-list checks.
- `docs/archon-runtime.md` - Operator runbook for runtime setup, credential loading, legacy cleanup, verification, rollback, and safety.
- `.planning/phases/01-vps-archon-runtime-surface/01-SUMMARY.md` - Execution summary and verification record.

## Decisions Made

- Kept the runtime surface in shell scripts and docs, avoiding core `src/` edits for this operational integration.
- The status doctor reports only pass/fail details, not captured workflow-list output, to reduce credential/logging risk.
- Did not bypass SSH host key verification for `srv1310498`; the failed VPS attempt is documented as a VPS-only blocker.

## Verification

- `bash -n scripts/archon-vps.sh` - passed
- `bash -n scripts/archon-status.sh` - passed
- `npm run typecheck` - passed
- `scripts/archon-vps.sh` executable bit - verified
- `scripts/archon-status.sh` executable bit - verified
- Required doc command and safety-text greps - passed

## VPS Verification

Attempted via:

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 srv1310498 'cd /home/devuser/claudeclaw && ...'
```

Result: blocked before remote execution with `Host key verification failed.` No VPS commands ran, and no production state, credentials, or secrets were edited.

VPS-only checks still pending after SSH trust is repaired:

- `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`
- `/home/devuser/claudeclaw/scripts/archon-status.sh`
- `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`
- `/tmp/archon-workflow-list.txt` warning scan for `legacy`, `deprecated`, and `.archon/.archon/workflows`
- `stat -c '%a %n' ~/.archon/.env` mode check for `600`, `400`, or `440`

## Deviations from Plan

None - plan executed exactly as written. Task 4 allowed VPS-only failures to be recorded in the summary, and the SSH host-key failure was handled that way.

## Issues Encountered

- VPS verification could not run because SSH host key verification failed for `srv1310498`.
- The worktree contained a pre-existing `.planning/STATE.md` modification. It was left untouched per worktree-mode instructions.

## Known Stubs

None. Stub scan found no TODO/FIXME placeholders or hardcoded empty UI data. The phrase "not available" appears only in operational documentation about `bun` PATH availability.

## Threat Flags

None. The new credential-file sourcing and workflow-path checks are the exact threat surfaces covered by the plan threat model.

## User Setup Required

Repair SSH host-key trust for `srv1310498` before rerunning the VPS-only verification commands. No credential values are required in git or prompts.

## Next Phase Readiness

Phase 2 can build on the wrapper and status doctor to define safe Archon workspaces. Production proof remains blocked until the VPS SSH host key issue is resolved and the committed scripts are available in `/home/devuser/claudeclaw`.

## Self-Check: PASSED

- Verified created files exist: `scripts/archon-vps.sh`, `scripts/archon-status.sh`, `docs/archon-runtime.md`, and this summary.
- Verified task commits exist: `29e58d6`, `5db22dd`, and `4907adf`.
- Re-ran shell syntax checks and executable-bit checks for both scripts.

---
*Phase: 01-vps-archon-runtime-surface*
*Completed: 2026-05-05*

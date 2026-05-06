---
phase: 03-agent-workflow-routing-policy
plan: 03
subsystem: agent-routing
tags: [archon, personas, routing, warroom, validation]
requires:
  - phase: 01-vps-archon-runtime-surface
    provides: VPS Archon wrapper and runtime discovery checks
  - phase: 02-safe-workspace-and-deploy-boundary
    provides: Archon coding workspace boundary and safe worktree documentation
provides:
  - Canonical direct answer vs skill/react loop vs Archon workflow routing policy
  - Committed Ezra/main and specialist persona template routing guidance
  - War Room compact persona routing guidance and deterministic policy validator
affects: [persona-overlays, archon-workflow-pack, warroom]
tech-stack:
  added: []
  patterns:
    - committed prompt policy backed by grep-based validation
    - external-effect approval gate in every committed persona surface
key-files:
  created:
    - docs/agent-workflow-routing.md
    - scripts/check-agent-workflow-routing.sh
  modified:
    - CLAUDE.md.example
    - agents/_template/CLAUDE.md
    - warroom/personas.py
    - package.json
key-decisions:
  - "Direct answer remains the first routing lane; skills/react loops handle quick bounded actions; Archon is reserved for durable gated workflows."
  - "Ambiguous external effects require Noah approval before sending, posting, deploying, closing issues, or mutating production data."
  - "Archon coding workflows must follow docs/archon-workspaces.md and must not run against /home/devuser/claudeclaw."
patterns-established:
  - "Workflow routing policy: policy doc plus compact prompt excerpts plus deterministic validator."
  - "War Room shared rules carry the routing ladder once, while persona blurbs preserve existing agent ids."
requirements-completed: [ROUT-01, ROUT-02, ROUT-03, ROUT-04, ROUT-05]
duration: 4min 21s
completed: 2026-05-06
---

# Phase 03 Plan 03: Agent Workflow Routing Policy Summary

**Direct-answer-first routing policy with persona template guidance, War Room alignment, and deterministic ROUT-01 through ROUT-05 validation**

## Performance

- **Duration:** 4 min 21s
- **Started:** 2026-05-06T01:24:41Z
- **Completed:** 2026-05-06T01:29:02Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added `docs/agent-workflow-routing.md` with the three routing lanes, the six-persona matrix, Noah approval gate, and Archon safe-workspace preconditions.
- Added committed routing sections to `CLAUDE.md.example` and `agents/_template/CLAUDE.md` without removing file sending, profile picture, scheduling, or hive mind instructions.
- Updated `warroom/personas.py` so compact War Room prompts preserve answer-from-knowledge-first behavior while naming Direct answer, Skill/react loop, Archon workflow, and Noah approval.
- Added `scripts/check-agent-workflow-routing.sh` and `npm run check:agent-workflow-routing` for deterministic policy/template/War Room coverage checks.

## Task Commits

Each task was committed atomically:

1. **Task 3-01-01: Create canonical agent workflow routing policy** - `37a460b` (feat)
2. **Task 3-01-02: Wire routing guidance into committed persona templates** - `b7a4d7c` (feat)
3. **Task 3-01-03: Align War Room compact personas and add deterministic routing validator** - `430b3b4` (feat)

## Files Created/Modified

- `docs/agent-workflow-routing.md` - Canonical policy for Direct answer, Skill/react loop, Archon workflow, persona routing, approval gates, and Archon workspace safety.
- `CLAUDE.md.example` - Ezra/main template routing guidance and ROUT-01/03/04/05 coverage.
- `agents/_template/CLAUDE.md` - Specialist template routing guidance and ROUT-02/03/04/05 coverage.
- `warroom/personas.py` - Compact War Room routing rules, exact persona names, and external-effect approval language.
- `scripts/check-agent-workflow-routing.sh` - Strict bash validator for routing coverage in committed artifacts.
- `package.json` - Adds `check:agent-workflow-routing`.

## Decisions Made

- Direct answers are explicitly first to avoid over-routing simple conversation into durable workflow state.
- Skills/react loops are the default execution lane for one-off tasks and quick repeatable actions.
- Archon workflows are reserved for work that benefits from phases, gates, artifacts, approvals, retries, repeatability, or post-run reporting.
- Same-turn approval applies only to the named external effect and scope; ambiguous sending, posting, deploying, closing issues, or production-data mutation pauses for Noah approval.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Verification

- `grep -q 'ROUT-01' .planning/phases/03-agent-workflow-routing-policy/03-PLAN.md` - passed
- `grep -q 'ROUT-02' .planning/phases/03-agent-workflow-routing-policy/03-PLAN.md` - passed
- `grep -q 'ROUT-03' .planning/phases/03-agent-workflow-routing-policy/03-PLAN.md` - passed
- `grep -q 'ROUT-04' .planning/phases/03-agent-workflow-routing-policy/03-PLAN.md` - passed
- `grep -q 'ROUT-05' .planning/phases/03-agent-workflow-routing-policy/03-PLAN.md` - passed
- `bash -n scripts/check-agent-workflow-routing.sh` - passed
- `npm run check:agent-workflow-routing` - passed
- `npm run typecheck` - passed
- `python3 -m py_compile warroom/personas.py` - passed

## User Setup Required

After these committed templates ship to the VPS, apply the routing policy to live `~/.claudeclaw/CLAUDE.md` and `~/.claudeclaw/agents/*/CLAUDE.md` overlays through the dashboard agent file editor or another approved operator path. Do not copy live overlays into git.

## Known Stubs

None.

## Auth Gates

None.

## Threat Flags

None - the new validation script only reads committed policy/template files, and the prompt changes directly implement the plan threat model mitigations for over-routing, external-effect escalation, unsafe coding workflow launch, and split-brain prompt behavior.

## Self-Check: PASSED

- Found created/modified files: `docs/agent-workflow-routing.md`, `scripts/check-agent-workflow-routing.sh`, `CLAUDE.md.example`, `agents/_template/CLAUDE.md`, `warroom/personas.py`, `package.json`, `.planning/phases/03-agent-workflow-routing-policy/03-SUMMARY.md`
- Found task commits: `37a460b`, `b7a4d7c`, `430b3b4`

## Next Phase Readiness

ROUT-01 through ROUT-05 are documented, wired into committed prompt surfaces, and covered by `npm run check:agent-workflow-routing`. Phase 4 workflow-pack plans can now reference the routing policy and the safe workspace preconditions before creating workflow definitions.

---
*Phase: 03-agent-workflow-routing-policy*
*Completed: 2026-05-06*

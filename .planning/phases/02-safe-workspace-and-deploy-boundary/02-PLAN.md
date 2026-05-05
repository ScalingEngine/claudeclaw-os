---
phase: 2
phase_name: Safe workspace and deploy boundary
plan: 01
title: Safe Archon coding workspace boundary
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/archon-workspace-guard.sh
  - docs/archon-workspaces.md
  - docs/archon-runtime.md
autonomous: false
requirements:
  - SAFE-01
  - SAFE-02
  - SAFE-03
  - SAFE-04
requirements_addressed:
  - SAFE-01
  - SAFE-02
  - SAFE-03
  - SAFE-04
user_setup:
  - VPS disposable-worktree validation must be run by an operator with access to `/home/devuser/claudeclaw`.
must_haves:
  truths:
    - "SAFE-01: Archon coding workflows have a documented non-production workspace root at `/home/devuser/claudeclaw-worktrees` and a guard that refuses `/home/devuser/claudeclaw` as a coding workspace."
    - "SAFE-02: The workspace guard and runbook forbid copying `.env`, `.env.*`, SQLite databases, OAuth tokens, and live agent configs into Archon worktrees."
    - "SAFE-03: The runbook preserves commit-based deploy with validation before production pulls a known-good branch or commit."
    - "SAFE-04: The runbook documents verification and rollback commands for production-adjacent workflow changes."
  artifacts:
    - "scripts/archon-workspace-guard.sh"
    - "docs/archon-workspaces.md"
    - "docs/archon-runtime.md"
  key_links:
    - "docs/archon-runtime.md links coding workflow safety to docs/archon-workspaces.md."
    - "docs/archon-workspaces.md invokes scripts/archon-workspace-guard.sh before any Archon coding workflow run."
---

<objective>
Establish the safe boundary for Archon coding workflows by adding a workspace guard, a worktree/deploy/rollback runbook, and an update to the Phase 1 runtime runbook that routes coding workflows away from production.

Purpose: Phase 1 proved Archon can run from ClaudeClaw's VPS environment. Phase 2 makes that power safe by ensuring coding work happens in isolated worktrees and deploys remain commit-based.

Output: `scripts/archon-workspace-guard.sh`, `docs/archon-workspaces.md`, and an updated `docs/archon-runtime.md`.
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
@.planning/phases/01-vps-archon-runtime-surface/01-VERIFICATION.md
@.planning/phases/02-safe-workspace-and-deploy-boundary/02-RESEARCH.md
@.planning/phases/02-safe-workspace-and-deploy-boundary/02-PATTERNS.md
@scripts/archon-vps.sh
@scripts/archon-status.sh
@scripts/pre-commit-check.sh
@docs/archon-runtime.md
@docs/incident-runbook.md
</context>

<must_haves>
<truths>
- SAFE-01: Archon coding workflows have a documented non-production workspace root at `/home/devuser/claudeclaw-worktrees` and a guard that refuses `/home/devuser/claudeclaw` as a coding workspace.
- SAFE-02: The workspace guard and runbook forbid copying `.env`, `.env.*`, SQLite databases, OAuth tokens, and live agent configs into Archon worktrees.
- SAFE-03: The runbook preserves commit-based deploy with validation before production pulls a known-good branch or commit.
- SAFE-04: The runbook documents verification and rollback commands for production-adjacent workflow changes.
</truths>
<artifacts>
- `scripts/archon-workspace-guard.sh`
- `docs/archon-workspaces.md`
- `docs/archon-runtime.md`
</artifacts>
<key_links>
- `docs/archon-runtime.md` links coding workflow safety to `docs/archon-workspaces.md`.
- `docs/archon-workspaces.md` invokes `scripts/archon-workspace-guard.sh` before any Archon coding workflow run.
</key_links>
</must_haves>

<threat_model>
<threat id="T-01" severity="high">
Production mutation: an Archon coding workflow could run against `/home/devuser/claudeclaw` and edit the live production checkout.
Mitigation: add `scripts/archon-workspace-guard.sh` that refuses the production path and requires workspaces to resolve under `/home/devuser/claudeclaw-worktrees/`; document `--cwd /home/devuser/claudeclaw-worktrees/<run-id>` for coding workflows.
</threat>
<threat id="T-02" severity="high">
Secret or live-state leakage: `.env`, OAuth tokens, SQLite databases, or live `agents/*/CLAUDE.md` and `agents/*/agent.yaml` files could be copied into an Archon worktree.
Mitigation: the guard scans for forbidden files and fails; the runbook lists forbidden state and instructs operators to use examples/templates only.
</threat>
<threat id="T-03" severity="medium">
Deploy drift: operators could copy loose files from a worktree into production, bypassing review, validation, and rollback.
Mitigation: the runbook requires commit-based deploy via `git pull --ff-only origin main` or an explicit known-good commit after validation.
</threat>
<threat id="T-04" severity="medium">
Rollback ambiguity: production-adjacent changes could be deployed without recording the previous commit.
Mitigation: the runbook captures `PRE_DEPLOY_COMMIT="$(git rev-parse HEAD)"` before deploy and documents rollback through `git checkout --detach "${ROLLBACK_COMMIT}"` plus service restart and verification.
</threat>
</threat_model>

<tasks>
<task id="2-01-01" type="execute" wave="1">
<title>Add Archon workspace guard</title>
<read_first>
- `scripts/archon-status.sh`
- `scripts/pre-commit-check.sh`
- `.planning/phases/02-safe-workspace-and-deploy-boundary/02-RESEARCH.md`
- `.planning/phases/02-safe-workspace-and-deploy-boundary/02-PATTERNS.md`
</read_first>
<files>
- `scripts/archon-workspace-guard.sh`
</files>
<action>
Create `scripts/archon-workspace-guard.sh` as an executable bash preflight with `#!/usr/bin/env bash` and `set -euo pipefail`.

The script must define these defaults exactly:
- `PROD_CLAUDECLAW_CWD="${PROD_CLAUDECLAW_CWD:-/home/devuser/claudeclaw}"`
- `ARCHON_WORKTREE_ROOT="${ARCHON_WORKTREE_ROOT:-/home/devuser/claudeclaw-worktrees}"`
- `ARCHON_WORKSPACE_CWD="${1:-${ARCHON_WORKSPACE_CWD:-}}"`
- `ARCHON_REQUIRE_CLEAN="${ARCHON_REQUIRE_CLEAN:-0}"`

Implement `report_ok` and `report_fail` functions with the same output shape as `scripts/archon-status.sh`: `Label: OK - detail` and `Label: FAIL - detail`. Accumulate failures in `FAILED=0` and exit 1 at the end if any check failed.

The guard must perform these checks:
- If `ARCHON_WORKSPACE_CWD` is empty, fail with label `Workspace path` and detail `missing; pass a workspace path or set ARCHON_WORKSPACE_CWD`.
- Resolve `PROD_CLAUDECLAW_CWD`, `ARCHON_WORKTREE_ROOT`, and `ARCHON_WORKSPACE_CWD` using `realpath` when available; otherwise use `cd "$path" && pwd -P`.
- Fail with label `Production boundary` if the resolved workspace equals resolved `/home/devuser/claudeclaw`.
- Fail with label `Worktree root` if the resolved workspace is not under resolved `/home/devuser/claudeclaw-worktrees/`.
- Fail with label `Git worktree` unless `git -C "$RESOLVED_WORKSPACE" rev-parse --is-inside-work-tree` prints `true`.
- If `ARCHON_REQUIRE_CLEAN=1`, fail with label `Git status` unless `git -C "$RESOLVED_WORKSPACE" status --porcelain` is empty.
- Fail with label `Forbidden state` if any of these exist inside the workspace: `.env`, `.env.*`, `store/*.db`, `store/*.db-wal`, `store/*.db-shm`, `*.sqlite`, `*.sqlite3`, `agents/*/CLAUDE.md` except `agents/_template/CLAUDE.md`, or `agents/*/agent.yaml` except files ending in `.example`.

The script must not read or print secret file contents.
</action>
<verify>
<automated>
`bash -n scripts/archon-workspace-guard.sh`
`grep -q 'PROD_CLAUDECLAW_CWD="${PROD_CLAUDECLAW_CWD:-/home/devuser/claudeclaw}"' scripts/archon-workspace-guard.sh`
`grep -q 'ARCHON_WORKTREE_ROOT="${ARCHON_WORKTREE_ROOT:-/home/devuser/claudeclaw-worktrees}"' scripts/archon-workspace-guard.sh`
`grep -q 'Production boundary' scripts/archon-workspace-guard.sh`
`grep -q 'Forbidden state' scripts/archon-workspace-guard.sh`
`grep -q 'ARCHON_REQUIRE_CLEAN' scripts/archon-workspace-guard.sh`
</automated>
</verify>
<acceptance_criteria>
- `scripts/archon-workspace-guard.sh` starts with `#!/usr/bin/env bash`.
- `scripts/archon-workspace-guard.sh` contains `set -euo pipefail`.
- `scripts/archon-workspace-guard.sh` contains `PROD_CLAUDECLAW_CWD="${PROD_CLAUDECLAW_CWD:-/home/devuser/claudeclaw}"`.
- `scripts/archon-workspace-guard.sh` contains `ARCHON_WORKTREE_ROOT="${ARCHON_WORKTREE_ROOT:-/home/devuser/claudeclaw-worktrees}"`.
- `scripts/archon-workspace-guard.sh` contains `Production boundary`.
- `scripts/archon-workspace-guard.sh` contains `Forbidden state`.
- `scripts/archon-workspace-guard.sh` contains `.env.*`.
- `scripts/archon-workspace-guard.sh` contains `store/*.db`.
- `scripts/archon-workspace-guard.sh` contains `agents/*/CLAUDE.md`.
- `bash -n scripts/archon-workspace-guard.sh` exits 0.
</acceptance_criteria>
</task>

<task id="2-01-02" type="execute" wave="1">
<title>Document safe worktree, deploy, and rollback rules</title>
<read_first>
- `docs/archon-runtime.md`
- `docs/incident-runbook.md`
- `scripts/archon-vps.sh`
- `scripts/archon-workspace-guard.sh`
- `.planning/REQUIREMENTS.md`
</read_first>
<files>
- `docs/archon-workspaces.md`
</files>
<action>
Create `docs/archon-workspaces.md` with these sections:
- `# Archon Safe Workspaces`
- `## Scope`
- `## Allowed Paths`
- `## Create a Disposable Worktree`
- `## Run the Workspace Guard`
- `## Run Archon Against the Worktree`
- `## Forbidden Production State`
- `## Validate Before Deploy`
- `## Commit-Based Deploy`
- `## Rollback`
- `## Cleanup`

The document must define these exact paths:
- Production checkout: `/home/devuser/claudeclaw`
- Allowed worktree root: `/home/devuser/claudeclaw-worktrees`
- Archon source checkout: `/home/devuser/remote-coding-agent`

The worktree creation command block must contain these exact commands:
- `RUN_ID="$(date +%Y%m%d%H%M%S)-example"`
- `mkdir -p /home/devuser/claudeclaw-worktrees`
- `cd /home/devuser/claudeclaw`
- `git fetch origin`
- `git worktree add -b "archon/${RUN_ID}" "/home/devuser/claudeclaw-worktrees/${RUN_ID}" origin/main`

The guard command block must contain:
- `/home/devuser/claudeclaw/scripts/archon-workspace-guard.sh "/home/devuser/claudeclaw-worktrees/${RUN_ID}"`

The Archon coding invocation example must use the worktree path as `--cwd`, not `/home/devuser/claudeclaw`:
- `ARCHON_PROJECT_CWD="/home/devuser/claudeclaw-worktrees/${RUN_ID}"`
- `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow run coding-plan-to-pr --cwd "/home/devuser/claudeclaw-worktrees/${RUN_ID}"`

The forbidden-state section must list exactly these forbidden items: `.env`, `.env.*`, `store/*.db`, `store/*.db-wal`, `store/*.db-shm`, `*.sqlite`, `*.sqlite3`, `OAuth tokens`, `agents/*/CLAUDE.md`, and `agents/*/agent.yaml`.

The deploy section must preserve commit-based deploy with:
- `PRE_DEPLOY_COMMIT="$(git rev-parse HEAD)"`
- `git pull --ff-only origin main`
- `npm run typecheck`
- `npm test`

The rollback section must include:
- `ROLLBACK_COMMIT="${PRE_DEPLOY_COMMIT}"`
- `git checkout --detach "${ROLLBACK_COMMIT}"`
- `npm run typecheck`
- `systemctl --user restart 'claudeclaw-*'`
</action>
<verify>
<automated>
`grep -q '# Archon Safe Workspaces' docs/archon-workspaces.md`
`grep -q '/home/devuser/claudeclaw-worktrees' docs/archon-workspaces.md`
`grep -q 'git worktree add -b "archon/${RUN_ID}"' docs/archon-workspaces.md`
`grep -q 'archon-workspace-guard.sh "/home/devuser/claudeclaw-worktrees/${RUN_ID}"' docs/archon-workspaces.md`
`grep -q 'workflow run coding-plan-to-pr --cwd "/home/devuser/claudeclaw-worktrees/${RUN_ID}"' docs/archon-workspaces.md`
`grep -q 'git pull --ff-only origin main' docs/archon-workspaces.md`
`grep -q 'git checkout --detach "${ROLLBACK_COMMIT}"' docs/archon-workspaces.md`
</automated>
</verify>
<acceptance_criteria>
- `docs/archon-workspaces.md` contains `# Archon Safe Workspaces`.
- `docs/archon-workspaces.md` contains `Production checkout: /home/devuser/claudeclaw`.
- `docs/archon-workspaces.md` contains `Allowed worktree root: /home/devuser/claudeclaw-worktrees`.
- `docs/archon-workspaces.md` contains `git worktree add -b "archon/${RUN_ID}" "/home/devuser/claudeclaw-worktrees/${RUN_ID}" origin/main`.
- `docs/archon-workspaces.md` contains `workflow run coding-plan-to-pr --cwd "/home/devuser/claudeclaw-worktrees/${RUN_ID}"`.
- `docs/archon-workspaces.md` contains `.env.*`.
- `docs/archon-workspaces.md` contains `OAuth tokens`.
- `docs/archon-workspaces.md` contains `git pull --ff-only origin main`.
- `docs/archon-workspaces.md` contains `git checkout --detach "${ROLLBACK_COMMIT}"`.
</acceptance_criteria>
</task>

<task id="2-01-03" type="execute" wave="2">
<title>Route runtime docs to the safe workspace contract</title>
<read_first>
- `docs/archon-runtime.md`
- `docs/archon-workspaces.md`
- `.planning/phases/01-vps-archon-runtime-surface/01-VERIFICATION.md`
</read_first>
<files>
- `docs/archon-runtime.md`
</files>
<action>
Update `docs/archon-runtime.md` with a new section named `## Coding Workflow Boundary` immediately after the `## Scope` section.

The section must contain these exact sentences:
- `Workflow discovery may still target /home/devuser/claudeclaw.`
- `Coding workflows must not run against /home/devuser/claudeclaw.`
- `Use docs/archon-workspaces.md to create /home/devuser/claudeclaw-worktrees/<run-id> and run scripts/archon-workspace-guard.sh before any Archon coding workflow.`

The section must include this command:
`/home/devuser/claudeclaw/scripts/archon-workspace-guard.sh "/home/devuser/claudeclaw-worktrees/${RUN_ID}"`
</action>
<verify>
<automated>
`grep -q '## Coding Workflow Boundary' docs/archon-runtime.md`
`grep -q 'Workflow discovery may still target /home/devuser/claudeclaw.' docs/archon-runtime.md`
`grep -q 'Coding workflows must not run against /home/devuser/claudeclaw.' docs/archon-runtime.md`
`grep -q 'docs/archon-workspaces.md' docs/archon-runtime.md`
`grep -q 'archon-workspace-guard.sh "/home/devuser/claudeclaw-worktrees/${RUN_ID}"' docs/archon-runtime.md`
</automated>
</verify>
<acceptance_criteria>
- `docs/archon-runtime.md` contains `## Coding Workflow Boundary`.
- `docs/archon-runtime.md` contains `Workflow discovery may still target /home/devuser/claudeclaw.`.
- `docs/archon-runtime.md` contains `Coding workflows must not run against /home/devuser/claudeclaw.`.
- `docs/archon-runtime.md` contains `Use docs/archon-workspaces.md to create /home/devuser/claudeclaw-worktrees/<run-id> and run scripts/archon-workspace-guard.sh before any Archon coding workflow.`.
</acceptance_criteria>
</task>

<task id="2-01-04" type="execute" wave="2">
<title>Run local and VPS safety verification</title>
<read_first>
- `scripts/archon-workspace-guard.sh`
- `docs/archon-workspaces.md`
- `docs/archon-runtime.md`
- `package.json`
- `.planning/phases/02-safe-workspace-and-deploy-boundary/02-VALIDATION.md`
</read_first>
<files>
- `scripts/archon-workspace-guard.sh`
- `docs/archon-workspaces.md`
- `docs/archon-runtime.md`
</files>
<action>
Run local verification:
- `bash -n scripts/archon-workspace-guard.sh`
- `npm run typecheck`
- `grep -q 'SAFE-01' .planning/phases/02-safe-workspace-and-deploy-boundary/02-PLAN.md`
- `grep -q 'SAFE-02' .planning/phases/02-safe-workspace-and-deploy-boundary/02-PLAN.md`
- `grep -q 'SAFE-03' .planning/phases/02-safe-workspace-and-deploy-boundary/02-PLAN.md`
- `grep -q 'SAFE-04' .planning/phases/02-safe-workspace-and-deploy-boundary/02-PLAN.md`

Run VPS verification from `/home/devuser/claudeclaw` after the implementation commit is deployed:
- `RUN_ID="guard-test-$(date +%Y%m%d%H%M%S)"`
- `mkdir -p /home/devuser/claudeclaw-worktrees`
- `cd /home/devuser/claudeclaw`
- `git fetch origin`
- `git worktree add -b "archon/${RUN_ID}" "/home/devuser/claudeclaw-worktrees/${RUN_ID}" HEAD`
- `/home/devuser/claudeclaw/scripts/archon-workspace-guard.sh "/home/devuser/claudeclaw-worktrees/${RUN_ID}"`
- `! /home/devuser/claudeclaw/scripts/archon-workspace-guard.sh /home/devuser/claudeclaw`
- `touch "/home/devuser/claudeclaw-worktrees/${RUN_ID}/.env.test-forbidden"`
- `! /home/devuser/claudeclaw/scripts/archon-workspace-guard.sh "/home/devuser/claudeclaw-worktrees/${RUN_ID}"`
- `rm -f "/home/devuser/claudeclaw-worktrees/${RUN_ID}/.env.test-forbidden"`
- `git worktree remove "/home/devuser/claudeclaw-worktrees/${RUN_ID}"`
- `git branch -D "archon/${RUN_ID}"`

Record any VPS-only failures in the execution summary. Do not copy `.env`, databases, OAuth tokens, or live agent configs into test worktrees.
</action>
<verify>
<automated>
`bash -n scripts/archon-workspace-guard.sh && npm run typecheck`
</automated>
<manual>
VPS verification commands listed above prove that a disposable worktree passes, the production checkout fails, and a forbidden `.env.test-forbidden` file fails.
</manual>
</verify>
<acceptance_criteria>
- `bash -n scripts/archon-workspace-guard.sh` exits 0.
- `npm run typecheck` exits 0.
- The VPS disposable worktree guard command exits 0.
- The VPS production checkout guard command exits non-zero.
- The VPS forbidden `.env.test-forbidden` guard command exits non-zero.
- Cleanup removes `/home/devuser/claudeclaw-worktrees/${RUN_ID}` and deletes branch `archon/${RUN_ID}`.
</acceptance_criteria>
</task>
</tasks>

<verification>
<automated>
- `bash -n scripts/archon-workspace-guard.sh`
- `npm run typecheck`
- `grep -q 'SAFE-01' .planning/phases/02-safe-workspace-and-deploy-boundary/02-PLAN.md`
- `grep -q 'SAFE-02' .planning/phases/02-safe-workspace-and-deploy-boundary/02-PLAN.md`
- `grep -q 'SAFE-03' .planning/phases/02-safe-workspace-and-deploy-boundary/02-PLAN.md`
- `grep -q 'SAFE-04' .planning/phases/02-safe-workspace-and-deploy-boundary/02-PLAN.md`
- `grep -q 'docs/archon-workspaces.md' docs/archon-runtime.md`
</automated>
<manual>
- On VPS, create a disposable worktree under `/home/devuser/claudeclaw-worktrees/<run-id>` and verify `scripts/archon-workspace-guard.sh` exits 0.
- On VPS, verify `scripts/archon-workspace-guard.sh /home/devuser/claudeclaw` exits non-zero.
- On VPS, verify a disposable forbidden file named `.env.test-forbidden` inside the worktree makes the guard exit non-zero.
</manual>
</verification>

<success_criteria>
- SAFE-01 is satisfied when coding workflow docs use `/home/devuser/claudeclaw-worktrees/<run-id>` and the guard refuses `/home/devuser/claudeclaw`.
- SAFE-02 is satisfied when the guard and runbook list `.env`, `.env.*`, SQLite DB files, OAuth tokens, and live agent configs as forbidden worktree state.
- SAFE-03 is satisfied when deploy documentation requires validation followed by `git pull --ff-only origin main` or a known-good commit, not loose file copying.
- SAFE-04 is satisfied when rollback documentation captures `PRE_DEPLOY_COMMIT` and restores with `git checkout --detach "${ROLLBACK_COMMIT}"`, followed by typecheck and service restart verification.
</success_criteria>

<output>
After completion, create `.planning/phases/02-safe-workspace-and-deploy-boundary/02-SUMMARY.md`.
</output>

## PLANNING COMPLETE

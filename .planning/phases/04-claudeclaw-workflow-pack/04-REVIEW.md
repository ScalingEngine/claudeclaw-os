---
phase: 04-claudeclaw-workflow-pack
reviewed: 2026-05-06T02:52:30Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - archon/workflows/claudeclaw-bugfix.yaml
  - archon/workflows/claudeclaw-coding-plan-to-pr.yaml
  - archon/workflows/claudeclaw-comms-content-draft.yaml
  - archon/workflows/claudeclaw-ops-triage.yaml
  - archon/workflows/claudeclaw-strategy-ingest.yaml
  - archon/workflows/claudeclaw-workflow-authoring.yaml
  - docs/claudeclaw-workflow-pack.md
  - package.json
  - scripts/check-archon-workflow-pack.sh
  - scripts/install-archon-workflows.sh
findings:
  critical: 2
  warning: 0
  info: 0
  total: 2
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-06T02:52:30Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed the six Archon workflow definitions, operator docs, package script wiring, and the workflow-pack install/check scripts. The workflow YAML parses and the current validator passes, but the installer does not enforce the committed-source boundary or rollback semantics documented for production Archon workflow state.

## Critical Issues

### CR-01: Installer Can Publish Untracked Workflow Files

**Classification:** BLOCKER
**File:** `scripts/install-archon-workflows.sh:36`
**Issue:** The installer builds `WORKFLOW_FILES` from the filesystem glob `"$SOURCE_DIR"/claudeclaw-*.yaml`, so any untracked, ignored, generated, or locally staged `claudeclaw-*.yaml` under `archon/workflows/` is copied into `~/.archon/workflows`. This contradicts the documented guarantee in `docs/claudeclaw-workflow-pack.md:30` that only committed workflow sources are installed, and it can publish an unreviewed Archon workflow into the runtime discovery path.
**Fix:**
```bash
mapfile -d '' WORKFLOW_FILES < <(
  git -C "$ROOT" ls-files -z 'archon/workflows/claudeclaw-*.yaml'
)

if [ "${#WORKFLOW_FILES[@]}" -eq 0 ]; then
  printf 'ERROR: no committed claudeclaw-*.yaml files found\n' >&2
  exit 1
fi

for i in "${!WORKFLOW_FILES[@]}"; do
  WORKFLOW_FILES[$i]="$ROOT/${WORKFLOW_FILES[$i]}"
done
```
Also extend `scripts/check-archon-workflow-pack.sh` to assert the installed source set comes from `git ls-files` rather than an unconstrained glob.

### CR-02: Reinstall/Rollback Leaves Stale Workflows Discoverable

**Classification:** BLOCKER
**File:** `scripts/install-archon-workflows.sh:52`
**Issue:** The installer only copies current source files and never removes previously installed `claudeclaw-*.yaml` files from `~/.archon/workflows`. If a workflow is renamed, deleted, or rolled back as described in `docs/claudeclaw-workflow-pack.md:73`, the old workflow remains installed and Archon can continue discovering and launching it after the supposed rollback.
**Fix:**
```bash
declare -A DESIRED_WORKFLOWS=()
for workflow_file in "${WORKFLOW_FILES[@]}"; do
  DESIRED_WORKFLOWS["$(basename "$workflow_file")"]=1
done

shopt -s nullglob
for target_file in "$ARCHON_WORKFLOWS_DIR"/claudeclaw-*.yaml; do
  target_name="$(basename "$target_file")"
  if [ -z "${DESIRED_WORKFLOWS[$target_name]+x}" ]; then
    if [ "$DRY_RUN" -eq 1 ]; then
      printf 'DRY-RUN: would remove stale workflow %s\n' "$target_file"
    else
      rm -f "$target_file"
      printf 'REMOVED: stale workflow %s\n' "$target_file"
    fi
  fi
done
shopt -u nullglob
```
Document that the installer synchronizes the owned `claudeclaw-*.yaml` namespace, and add a check using a temporary target directory with a stale workflow file.

---

_Reviewed: 2026-05-06T02:52:30Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_

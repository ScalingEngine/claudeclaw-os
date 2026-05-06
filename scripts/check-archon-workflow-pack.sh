#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
FAILED=0
TMP_DIR=""
CODING_BACKUP=""
STAGED_PROBE="archon/workflows/claudeclaw-staged-validator-probe.yaml"
UNTRACKED_PROBE="archon/workflows/claudeclaw-untracked-validator-probe.yaml"
CREATED_STAGED_PROBE=0
CREATED_UNTRACKED_PROBE=0

cleanup() {
  if [ -n "$CODING_BACKUP" ] && [ -f "$CODING_BACKUP" ]; then
    cp "$CODING_BACKUP" "$ROOT/$CODING_WORKFLOW" || true
  fi

  if [ "$CREATED_STAGED_PROBE" -eq 1 ]; then
    if git -C "$ROOT" diff --cached --name-only -- "$STAGED_PROBE" | grep -q .; then
      git -C "$ROOT" rm --cached -- "$STAGED_PROBE" >/dev/null 2>&1 || \
        git -C "$ROOT" restore --staged -- "$STAGED_PROBE" >/dev/null 2>&1 || true
    fi
    rm -f "$ROOT/$STAGED_PROBE"
  fi

  if [ "$CREATED_UNTRACKED_PROBE" -eq 1 ]; then
    rm -f "$ROOT/$UNTRACKED_PROBE"
  fi

  if [ -n "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}

trap cleanup EXIT

check_file_exists() {
  local file="$1"

  if [ -f "$ROOT/$file" ]; then
    printf 'OK: %s exists\n' "$file"
  else
    printf 'FAIL: %s missing\n' "$file" >&2
    FAILED=1
  fi
}

check_file_contains() {
  local file="$1"
  local pattern="$2"
  local label="${3:-$pattern}"

  if grep -Fq -- "$pattern" "$ROOT/$file"; then
    printf 'OK: %s contains %s\n' "$file" "$label"
  else
    printf 'FAIL: %s missing %s\n' "$file" "$label" >&2
    FAILED=1
  fi
}

run_installer_capture() {
  local target_dir="$1"
  local output_file="$2"
  shift 2

  set +e
  ARCHON_WORKFLOWS_DIR="$target_dir" "$ROOT/$INSTALLER" "$@" >"$output_file" 2>&1
  local status=$?
  set -e

  return "$status"
}

assert_file_exists() {
  local file="$1"
  local label="$2"

  if [ -f "$file" ]; then
    printf 'OK: %s\n' "$label"
  else
    printf 'FAIL: %s\n' "$label" >&2
    FAILED=1
  fi
}

assert_file_missing() {
  local file="$1"
  local label="$2"

  if [ ! -e "$file" ]; then
    printf 'OK: %s\n' "$label"
  else
    printf 'FAIL: %s\n' "$label" >&2
    FAILED=1
  fi
}

assert_output_contains() {
  local output_file="$1"
  local pattern="$2"
  local label="$3"

  if grep -Fq -- "$pattern" "$output_file"; then
    printf 'OK: %s\n' "$label"
  else
    printf 'FAIL: %s\n' "$label" >&2
    FAILED=1
  fi
}

finish() {
  if [ "$FAILED" -ne 0 ]; then
    printf 'Archon workflow pack check failed.\n' >&2
    exit 1
  fi

  printf 'Archon workflow pack check passed.\n'
}

CODING_WORKFLOW="archon/workflows/claudeclaw-coding-plan-to-pr.yaml"
BUGFIX_WORKFLOW="archon/workflows/claudeclaw-bugfix.yaml"
STRATEGY_WORKFLOW="archon/workflows/claudeclaw-strategy-ingest.yaml"
OPS_WORKFLOW="archon/workflows/claudeclaw-ops-triage.yaml"
COMMS_WORKFLOW="archon/workflows/claudeclaw-comms-content-draft.yaml"
AUTHORING_WORKFLOW="archon/workflows/claudeclaw-workflow-authoring.yaml"
WORKFLOW_DOCS="docs/claudeclaw-workflow-pack.md"
INSTALLER="scripts/install-archon-workflows.sh"

for file in \
  "$CODING_WORKFLOW" \
  "$BUGFIX_WORKFLOW" \
  "$STRATEGY_WORKFLOW" \
  "$OPS_WORKFLOW" \
  "$COMMS_WORKFLOW" \
  "$AUTHORING_WORKFLOW" \
  "$WORKFLOW_DOCS" \
  "$INSTALLER"; do
  check_file_exists "$file"
done

check_file_contains "$CODING_WORKFLOW" "FLOW-01"
check_file_contains "$BUGFIX_WORKFLOW" "FLOW-02"
check_file_contains "$STRATEGY_WORKFLOW" "FLOW-03"
check_file_contains "$OPS_WORKFLOW" "FLOW-04"
check_file_contains "$COMMS_WORKFLOW" "FLOW-05"
check_file_contains "$AUTHORING_WORKFLOW" "FLOW-06"
check_file_contains "$CODING_WORKFLOW" "description:"
check_file_contains "$BUGFIX_WORKFLOW" "description:"
check_file_contains "$STRATEGY_WORKFLOW" "description:"
check_file_contains "$OPS_WORKFLOW" "description:"
check_file_contains "$COMMS_WORKFLOW" "description:"
check_file_contains "$AUTHORING_WORKFLOW" "description:"
check_file_contains "$CODING_WORKFLOW" "nodes:"
check_file_contains "$BUGFIX_WORKFLOW" "nodes:"
check_file_contains "$STRATEGY_WORKFLOW" "nodes:"
check_file_contains "$OPS_WORKFLOW" "nodes:"
check_file_contains "$COMMS_WORKFLOW" "nodes:"
check_file_contains "$AUTHORING_WORKFLOW" "nodes:"

check_file_contains "$CODING_WORKFLOW" "scripts/archon-workspace-guard.sh"
check_file_contains "$BUGFIX_WORKFLOW" "scripts/archon-workspace-guard.sh"
check_file_contains "$CODING_WORKFLOW" "/home/devuser/claudeclaw-worktrees/<run-id>"
check_file_contains "$BUGFIX_WORKFLOW" "/home/devuser/claudeclaw-worktrees/<run-id>"
check_file_contains "$CODING_WORKFLOW" "npm run typecheck"
check_file_contains "$BUGFIX_WORKFLOW" "npm run typecheck"
check_file_contains "$CODING_WORKFLOW" "npm test"
check_file_contains "$CODING_WORKFLOW" "npm run build"

check_file_contains "$OPS_WORKFLOW" "Noah approval"
check_file_contains "$COMMS_WORKFLOW" "Noah approval"
check_file_contains "$COMMS_WORKFLOW" "does not send or publish without approval"

if grep -Fq "steps:" "$ROOT/$CODING_WORKFLOW" \
  || grep -Fq "steps:" "$ROOT/$BUGFIX_WORKFLOW" \
  || grep -Fq "steps:" "$ROOT/$STRATEGY_WORKFLOW" \
  || grep -Fq "steps:" "$ROOT/$OPS_WORKFLOW" \
  || grep -Fq "steps:" "$ROOT/$COMMS_WORKFLOW" \
  || grep -Fq "steps:" "$ROOT/$AUTHORING_WORKFLOW"; then
  printf 'FAIL: sequential steps: format detected in ClaudeClaw workflow pack\n' >&2
  FAILED=1
else
  printf 'OK: ClaudeClaw workflow pack uses nodes: DAG format\n'
fi

check_file_contains "$WORKFLOW_DOCS" "scripts/install-archon-workflows.sh --dry-run"
check_file_contains "$WORKFLOW_DOCS" "/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw"

check_file_contains "$INSTALLER" "git -C \"\$ROOT\" ls-files -z 'archon/workflows/claudeclaw-*.yaml'" "committed-source workflow enumeration"
check_file_contains "$INSTALLER" "git -C \"\$ROOT\" diff --name-only -- 'archon/workflows/claudeclaw-*.yaml'" "unstaged workflow source guard"
check_file_contains "$INSTALLER" "git -C \"\$ROOT\" diff --cached --name-only -- 'archon/workflows/claudeclaw-*.yaml'" "staged workflow source guard"
check_file_contains "$INSTALLER" "would remove stale workflow" "dry-run stale workflow removal"
check_file_contains "$INSTALLER" "REMOVED: stale workflow" "install stale workflow removal"

TMP_DIR="$(mktemp -d)"

for probe in "$UNTRACKED_PROBE" "$STAGED_PROBE"; do
  if [ -e "$ROOT/$probe" ] || git -C "$ROOT" ls-files --error-unmatch -- "$probe" >/dev/null 2>&1; then
    printf 'FAIL: validator probe path already exists: %s\n' "$probe" >&2
    FAILED=1
  fi
done

if [ "$FAILED" -ne 0 ]; then
  finish
fi

UNTRACKED_TARGET="$TMP_DIR/untracked-installed"
UNTRACKED_OUTPUT="$TMP_DIR/untracked.out"
cat >"$ROOT/$UNTRACKED_PROBE" <<'YAML'
name: claudeclaw-untracked-validator-probe
description: Validator probe that must never be installed.
YAML
CREATED_UNTRACKED_PROBE=1

if run_installer_capture "$UNTRACKED_TARGET" "$UNTRACKED_OUTPUT"; then
  assert_file_missing "$UNTRACKED_TARGET/claudeclaw-untracked-validator-probe.yaml" "untracked workflow probe was not installed"
else
  printf 'FAIL: installer failed during untracked workflow probe\n' >&2
  cat "$UNTRACKED_OUTPUT" >&2
  FAILED=1
fi
rm -f "$ROOT/$UNTRACKED_PROBE"
CREATED_UNTRACKED_PROBE=0

DIRTY_TARGET="$TMP_DIR/dirty-installed"
DIRTY_OUTPUT="$TMP_DIR/dirty.out"
if ! git -C "$ROOT" diff --quiet -- "$CODING_WORKFLOW"; then
  printf 'FAIL: %s has pre-existing unstaged changes; skipping dirty-source probe\n' "$CODING_WORKFLOW" >&2
  FAILED=1
elif ! git -C "$ROOT" diff --cached --quiet -- "$CODING_WORKFLOW"; then
  printf 'FAIL: %s has pre-existing staged changes; skipping dirty-source probe\n' "$CODING_WORKFLOW" >&2
  FAILED=1
else
  CODING_BACKUP="$TMP_DIR/claudeclaw-coding-plan-to-pr.yaml.backup"
  cp "$ROOT/$CODING_WORKFLOW" "$CODING_BACKUP"
  printf '\n# validator-created dirty source marker\n' >>"$ROOT/$CODING_WORKFLOW"

  if run_installer_capture "$DIRTY_TARGET" "$DIRTY_OUTPUT"; then
    printf 'FAIL: installer succeeded with dirty tracked workflow source\n' >&2
    FAILED=1
  else
    assert_output_contains "$DIRTY_OUTPUT" "unstaged ClaudeClaw workflow source changes" "installer rejected dirty tracked workflow source"
  fi

  assert_file_missing "$DIRTY_TARGET/claudeclaw-coding-plan-to-pr.yaml" "dirty tracked workflow content was not installed"
  cp "$CODING_BACKUP" "$ROOT/$CODING_WORKFLOW"
fi

STAGED_TARGET="$TMP_DIR/staged-installed"
STAGED_OUTPUT="$TMP_DIR/staged.out"
cat >"$ROOT/$STAGED_PROBE" <<'YAML'
name: claudeclaw-staged-validator-probe
description: Validator probe that must fail staged-source installation.
YAML
CREATED_STAGED_PROBE=1
git -C "$ROOT" add -- "$STAGED_PROBE"

if run_installer_capture "$STAGED_TARGET" "$STAGED_OUTPUT"; then
  printf 'FAIL: installer succeeded with staged workflow source\n' >&2
  FAILED=1
else
  assert_output_contains "$STAGED_OUTPUT" "staged ClaudeClaw workflow source changes" "installer rejected staged workflow source"
fi
assert_file_missing "$STAGED_TARGET/claudeclaw-staged-validator-probe.yaml" "staged workflow probe was not installed"
git -C "$ROOT" rm --cached -- "$STAGED_PROBE" >/dev/null
rm -f "$ROOT/$STAGED_PROBE"
CREATED_STAGED_PROBE=0

STALE_TARGET="$TMP_DIR/stale-installed"
STALE_DRY_OUTPUT="$TMP_DIR/stale-dry-run.out"
STALE_INSTALL_OUTPUT="$TMP_DIR/stale-install.out"
mkdir -p "$STALE_TARGET"
printf 'stale\n' >"$STALE_TARGET/claudeclaw-stale-validator-probe.yaml"
printf 'other\n' >"$STALE_TARGET/other-workflow.yaml"

if run_installer_capture "$STALE_TARGET" "$STALE_DRY_OUTPUT" --dry-run; then
  assert_output_contains "$STALE_DRY_OUTPUT" "would remove stale workflow" "dry-run reports stale workflow removal"
  assert_file_exists "$STALE_TARGET/claudeclaw-stale-validator-probe.yaml" "dry-run kept stale workflow file"
else
  printf 'FAIL: installer dry-run failed during stale workflow probe\n' >&2
  cat "$STALE_DRY_OUTPUT" >&2
  FAILED=1
fi

if run_installer_capture "$STALE_TARGET" "$STALE_INSTALL_OUTPUT"; then
  assert_output_contains "$STALE_INSTALL_OUTPUT" "REMOVED: stale workflow" "install reports stale workflow removal"
  assert_file_missing "$STALE_TARGET/claudeclaw-stale-validator-probe.yaml" "install removed stale owned workflow"
  assert_file_exists "$STALE_TARGET/other-workflow.yaml" "install preserved non-owned workflow"
  while IFS= read -r workflow_file; do
    assert_file_exists "$STALE_TARGET/$(basename "$workflow_file")" "installed committed workflow $(basename "$workflow_file")"
  done < <(git -C "$ROOT" ls-files 'archon/workflows/claudeclaw-*.yaml')
else
  printf 'FAIL: installer failed during stale workflow install probe\n' >&2
  cat "$STALE_INSTALL_OUTPUT" >&2
  FAILED=1
fi

finish

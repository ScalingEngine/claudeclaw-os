#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
FAILED=0

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

check_file_contains "$WORKFLOW_DOCS" "scripts/install-archon-workflows.sh --dry-run"
check_file_contains "$WORKFLOW_DOCS" "/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw"

finish

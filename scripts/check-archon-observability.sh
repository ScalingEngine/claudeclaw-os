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
    printf 'Archon observability check failed.\n' >&2
    exit 1
  fi

  printf 'Archon observability check passed.\n'
}

for file in \
  "docs/archon-observability.md" \
  "src/archon-observability.ts" \
  "src/archon-observability-cli.ts" \
  "scripts/archon-runs.sh" \
  "scripts/test-archon-runs.sh" \
  "docs/agent-workflow-routing.md" \
  "docs/claudeclaw-workflow-pack.md" \
  "CLAUDE.md.example" \
  "agents/_template/CLAUDE.md" \
  "warroom/personas.py" \
  "package.json"; do
  check_file_exists "$file"
done

check_file_contains "docs/archon-observability.md" "OBS-01"
check_file_contains "docs/archon-observability.md" "OBS-02"
check_file_contains "docs/archon-observability.md" "OBS-03"
check_file_contains "docs/archon-observability.md" "node dist/archon-observability-cli.js start"
check_file_contains "docs/archon-observability.md" "node dist/archon-observability-cli.js complete"
check_file_contains "docs/archon-observability.md" "node dist/archon-observability-cli.js fail"
check_file_contains "docs/archon-observability.md" "workflow:"
check_file_contains "docs/archon-observability.md" "run_id:"
check_file_contains "docs/archon-observability.md" "branch:"
check_file_contains "docs/archon-observability.md" "failing_node:"
check_file_contains "docs/archon-observability.md" "recovery_action:"
check_file_contains "docs/archon-observability.md" "scripts/archon-runs.sh list"
check_file_contains "docs/archon-observability.md" "scripts/archon-runs.sh stale --older-than-hours 24"
check_file_contains "docs/archon-observability.md" "scripts/archon-runs.sh cleanup --older-than-hours 24"
check_file_contains "docs/archon-observability.md" "~/.archon/workspaces"
check_file_contains "docs/archon-observability.md" "/home/devuser/claudeclaw-worktrees"
check_file_contains "docs/archon-observability.md" "/home/devuser/claudeclaw"
check_file_contains "docs/archon-observability.md" ".env"
check_file_contains "docs/archon-observability.md" "~/.archon/.env"
check_file_contains "docs/archon-observability.md" "SQLite"
check_file_contains "docs/archon-observability.md" "OAuth tokens"
check_file_contains "docs/archon-observability.md" "live agent configs"
check_file_contains "docs/archon-observability.md" "dirty worktree; not removing"
check_file_contains "docs/archon-observability.md" "DRY-RUN: would remove stale Archon worktree"
check_file_contains "docs/archon-observability.md" "REMOVED: stale Archon worktree"

check_file_contains "src/archon-observability.ts" "archon_workflow_started"
check_file_contains "src/archon-observability.ts" "archon_workflow_completed"
check_file_contains "src/archon-observability.ts" "archon_workflow_failed"
check_file_contains "src/archon-observability-cli.ts" "archon workflow event recorded:"

check_file_contains "docs/agent-workflow-routing.md" "docs/archon-observability.md"
check_file_contains "docs/agent-workflow-routing.md" "report workflow starts, completions, and failures"
check_file_contains "docs/agent-workflow-routing.md" "workflow name, run ID or branch, failing node, and recovery action"
check_file_contains "docs/claudeclaw-workflow-pack.md" "docs/archon-observability.md"
check_file_contains "CLAUDE.md.example" "node dist/archon-observability-cli.js"
check_file_contains "agents/_template/CLAUDE.md" "node dist/archon-observability-cli.js"
check_file_contains "warroom/personas.py" "workflow name, run ID or branch, failing node, and recovery action"

for file in "$ROOT"/archon/workflows/claudeclaw-*.yaml; do
  rel="${file#"$ROOT/"}"
  check_file_contains "$rel" "docs/archon-observability.md"
  check_file_contains "$rel" "workflow name"
  check_file_contains "$rel" "run ID or branch"
done

for file in \
  "archon/workflows/claudeclaw-coding-plan-to-pr.yaml" \
  "archon/workflows/claudeclaw-bugfix.yaml" \
  "archon/workflows/claudeclaw-ops-triage.yaml" \
  "archon/workflows/claudeclaw-workflow-authoring.yaml"; do
  check_file_contains "$file" "failing node"
  check_file_contains "$file" "recovery action"
done

check_file_contains "scripts/archon-runs.sh" "refusing production checkout"
check_file_contains "scripts/archon-runs.sh" "outside Archon worktree root"
check_file_contains "scripts/archon-runs.sh" "dirty worktree; not removing"
check_file_contains "scripts/archon-runs.sh" "DRY-RUN: would remove stale Archon worktree"
check_file_contains "scripts/test-archon-runs.sh" "Archon runs test passed."
check_file_contains "package.json" "check:archon-observability"
check_file_contains "package.json" "test:archon-runs"

finish

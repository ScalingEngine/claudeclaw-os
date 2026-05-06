#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
FAILED=0

check_file_contains() {
  local file="$1"
  local pattern="$2"
  local label="${3:-$pattern}"

  if grep -Fq "$pattern" "$ROOT/$file"; then
    printf 'OK: %s contains %s\n' "$file" "$label"
  else
    printf 'FAIL: %s missing %s\n' "$file" "$label" >&2
    FAILED=1
  fi
}

finish() {
  if [ "$FAILED" -ne 0 ]; then
    printf 'Agent workflow routing check failed.\n' >&2
    exit 1
  fi

  printf 'Agent workflow routing check passed.\n'
}

check_file_contains "docs/agent-workflow-routing.md" "Direct answer"
check_file_contains "docs/agent-workflow-routing.md" "Skill/react loop"
check_file_contains "docs/agent-workflow-routing.md" "Archon workflow"
check_file_contains "docs/agent-workflow-routing.md" "Ezra"
check_file_contains "docs/agent-workflow-routing.md" "Vera"
check_file_contains "docs/agent-workflow-routing.md" "Poe"
check_file_contains "docs/agent-workflow-routing.md" "Cole"
check_file_contains "docs/agent-workflow-routing.md" "Hopper"
check_file_contains "docs/agent-workflow-routing.md" "Archie"
check_file_contains "docs/agent-workflow-routing.md" "Noah approval"
check_file_contains "docs/agent-workflow-routing.md" "docs/archon-workspaces.md"
check_file_contains "docs/agent-workflow-routing.md" "Coding workflows must not run against /home/devuser/claudeclaw."

check_file_contains "CLAUDE.md.example" "Workflow routing"
check_file_contains "CLAUDE.md.example" "ROUT-01"
check_file_contains "CLAUDE.md.example" "ROUT-03"
check_file_contains "CLAUDE.md.example" "ROUT-04"
check_file_contains "CLAUDE.md.example" "ROUT-05"

check_file_contains "agents/_template/CLAUDE.md" "Workflow routing"
check_file_contains "agents/_template/CLAUDE.md" "ROUT-02"
check_file_contains "agents/_template/CLAUDE.md" "ROUT-03"
check_file_contains "agents/_template/CLAUDE.md" "ROUT-04"
check_file_contains "agents/_template/CLAUDE.md" "ROUT-05"

check_file_contains "warroom/personas.py" "Direct answer"
check_file_contains "warroom/personas.py" "Skill/react loop"
check_file_contains "warroom/personas.py" "Archon workflow"
check_file_contains "warroom/personas.py" "Noah approval"

finish

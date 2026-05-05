#!/usr/bin/env bash
set -euo pipefail

ARCHON_REPO="${ARCHON_REPO:-/home/devuser/remote-coding-agent}"
ARCHON_PROJECT_CWD="${ARCHON_PROJECT_CWD:-/home/devuser/claudeclaw}"
ARCHON_ENV_FILE="${ARCHON_ENV_FILE:-$HOME/.archon/.env}"
ARCHON_WORKFLOWS_DIR="${ARCHON_WORKFLOWS_DIR:-$HOME/.archon/workflows}"
ARCHON_LEGACY_WORKFLOWS_DIR="${ARCHON_LEGACY_WORKFLOWS_DIR:-$HOME/.archon/.archon/workflows}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARCHON_WRAPPER="${ARCHON_WRAPPER:-$SCRIPT_DIR/archon-vps.sh}"
FAILED=0

report_ok() {
  printf '%s: OK - %s\n' "$1" "$2"
}

report_fail() {
  printf '%s: FAIL - %s\n' "$1" "$2"
  FAILED=1
}

file_mode() {
  if stat -c '%a' "$1" >/dev/null 2>&1; then
    stat -c '%a' "$1"
  else
    stat -f '%Lp' "$1"
  fi
}

workflow_entry_count() {
  awk '
    /^[[:space:]]*$/ { next }
    /^(bun|npm|yarn|pnpm)[[:space:]]/ { next }
    /^[$>]/ { next }
    /workflow|^[[:space:]]*[-*][[:space:]]*[[:alnum:]_.-]+/ { count++ }
    END { print count + 0 }
  '
}

if [ -d "$ARCHON_REPO" ]; then
  report_ok "Archon repo" "$ARCHON_REPO"
else
  report_fail "Archon repo" "missing: $ARCHON_REPO"
fi

if [ -f "$ARCHON_REPO/package.json" ]; then
  report_ok "Archon package" "$ARCHON_REPO/package.json"
else
  report_fail "Archon package" "missing: $ARCHON_REPO/package.json"
fi

if command -v "${BUN_BIN:-bun}" >/dev/null 2>&1; then
  report_ok "bun" "$(command -v "${BUN_BIN:-bun}")"
else
  report_fail "bun" "not found: ${BUN_BIN:-bun}"
fi

if [ -f "$ARCHON_ENV_FILE" ]; then
  report_ok "Archon env file" "$ARCHON_ENV_FILE"
  ENV_MODE="$(file_mode "$ARCHON_ENV_FILE")"
  case "$ENV_MODE" in
    600|400|440)
      report_ok "Archon env permissions" "$ENV_MODE"
      ;;
    *)
      report_fail "Archon env permissions" "$ENV_MODE is broader than 600, 400, or 440"
      ;;
  esac
else
  report_fail "Archon env file" "missing: $ARCHON_ENV_FILE"
  report_fail "Archon env permissions" "cannot verify missing env file"
fi

if [ -d "$ARCHON_WORKFLOWS_DIR" ]; then
  report_ok "Archon workflows dir" "$ARCHON_WORKFLOWS_DIR"
else
  report_fail "Archon workflows dir" "missing: $ARCHON_WORKFLOWS_DIR"
fi

if [ -d "$ARCHON_LEGACY_WORKFLOWS_DIR" ]; then
  report_fail "Legacy workflows dir" "present: $ARCHON_LEGACY_WORKFLOWS_DIR"
else
  report_ok "Legacy workflows dir" "absent: $ARCHON_LEGACY_WORKFLOWS_DIR"
fi

WORKFLOW_OUTPUT="$("$ARCHON_WRAPPER" workflow list --cwd "$ARCHON_PROJECT_CWD" 2>&1)" || {
  report_fail "Workflow list" "command failed"
  exit 1
}

if printf '%s\n' "$WORKFLOW_OUTPUT" | grep -Eiq '(\.archon/\.archon/workflows|legacy|deprecated)'; then
  report_fail "Workflow list" "output mentions legacy or deprecated workflow path"
elif printf '%s\n' "$WORKFLOW_OUTPUT" | grep -Eiq '(no workflows|0 workflows|0 workflow|not found)'; then
  report_fail "Workflow list" "no workflows returned for $ARCHON_PROJECT_CWD"
elif [ "$(printf '%s\n' "$WORKFLOW_OUTPUT" | workflow_entry_count)" -eq 0 ]; then
  report_fail "Workflow list" "no workflow entries returned for $ARCHON_PROJECT_CWD"
else
  report_ok "Workflow list" "workflow discovery succeeded for $ARCHON_PROJECT_CWD"
fi

if [ "$FAILED" -ne 0 ]; then
  exit 1
fi

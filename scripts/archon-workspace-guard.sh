#!/usr/bin/env bash
set -euo pipefail

PROD_CLAUDECLAW_CWD="${PROD_CLAUDECLAW_CWD:-/home/devuser/claudeclaw}"
ARCHON_WORKTREE_ROOT="${ARCHON_WORKTREE_ROOT:-/home/devuser/claudeclaw-worktrees}"
ARCHON_MANAGED_WORKTREE_ROOT="${ARCHON_MANAGED_WORKTREE_ROOT:-$HOME/.archon/workspaces/devuser/claudeclaw}"
ARCHON_WORKSPACE_CWD="${1:-${ARCHON_WORKSPACE_CWD:-}}"
ARCHON_REQUIRE_CLEAN="${ARCHON_REQUIRE_CLEAN:-0}"

FAILED=0

report_ok() {
  printf '%s: OK - %s\n' "$1" "$2"
}

report_fail() {
  printf '%s: FAIL - %s\n' "$1" "$2"
  FAILED=1
}

resolve_path() {
  local path="$1"

  if command -v realpath >/dev/null 2>&1; then
    realpath "$path"
  else
    (cd "$path" && pwd -P)
  fi
}

record_forbidden() {
  local label="$1"
  local path="$2"

  if [ -z "$FOUND_FORBIDDEN" ]; then
    FOUND_FORBIDDEN="${label}: ${path}"
  else
    FOUND_FORBIDDEN="${FOUND_FORBIDDEN}; ${label}: ${path}"
  fi
}

scan_forbidden_state() {
  local workspace="$1"
  local candidate

  FOUND_FORBIDDEN=""

  if [ -e "$workspace/.env" ]; then
    record_forbidden ".env" ".env"
  fi

  while IFS= read -r candidate; do
    [ -n "$candidate" ] || continue
    case "${candidate#"$workspace/"}" in
      .env.example) ;;
      *) record_forbidden ".env.*" "${candidate#"$workspace/"}" ;;
    esac
  done < <(find "$workspace" -maxdepth 1 -name '.env.*' -print)

  if [ -d "$workspace/store" ]; then
    while IFS= read -r candidate; do
      [ -n "$candidate" ] || continue
      record_forbidden "store/*.db" "${candidate#"$workspace/"}"
    done < <(find "$workspace/store" -maxdepth 1 -name '*.db' -print)

    while IFS= read -r candidate; do
      [ -n "$candidate" ] || continue
      record_forbidden "store/*.db-wal" "${candidate#"$workspace/"}"
    done < <(find "$workspace/store" -maxdepth 1 -name '*.db-wal' -print)

    while IFS= read -r candidate; do
      [ -n "$candidate" ] || continue
      record_forbidden "store/*.db-shm" "${candidate#"$workspace/"}"
    done < <(find "$workspace/store" -maxdepth 1 -name '*.db-shm' -print)
  fi

  while IFS= read -r candidate; do
    [ -n "$candidate" ] || continue
    record_forbidden "*.sqlite" "${candidate#"$workspace/"}"
  done < <(find "$workspace" -name '*.sqlite' -print)

  while IFS= read -r candidate; do
    [ -n "$candidate" ] || continue
    record_forbidden "*.sqlite3" "${candidate#"$workspace/"}"
  done < <(find "$workspace" -name '*.sqlite3' -print)

  if [ -d "$workspace/agents" ]; then
    while IFS= read -r candidate; do
      [ -n "$candidate" ] || continue
      if [ "${candidate#"$workspace/"}" != "agents/_template/CLAUDE.md" ]; then
        record_forbidden "agents/*/CLAUDE.md" "${candidate#"$workspace/"}"
      fi
    done < <(find "$workspace/agents" -mindepth 2 -maxdepth 2 -name 'CLAUDE.md' -print)

    while IFS= read -r candidate; do
      [ -n "$candidate" ] || continue
      case "$candidate" in
        *.example) ;;
        *) record_forbidden "agents/*/agent.yaml" "${candidate#"$workspace/"}" ;;
      esac
    done < <(find "$workspace/agents" -mindepth 2 -maxdepth 2 -name 'agent.yaml' -print)
  fi
}

if [ -z "$ARCHON_WORKSPACE_CWD" ]; then
  report_fail "Workspace path" "missing; pass a workspace path or set ARCHON_WORKSPACE_CWD"
else
  report_ok "Workspace path" "$ARCHON_WORKSPACE_CWD"
fi

if RESOLVED_PROD="$(resolve_path "$PROD_CLAUDECLAW_CWD" 2>/dev/null)"; then
  report_ok "Production path" "$RESOLVED_PROD"
else
  report_fail "Production path" "cannot resolve: $PROD_CLAUDECLAW_CWD"
  RESOLVED_PROD="$PROD_CLAUDECLAW_CWD"
fi

if RESOLVED_ROOT="$(resolve_path "$ARCHON_WORKTREE_ROOT" 2>/dev/null)"; then
  report_ok "Manual worktree root path" "$RESOLVED_ROOT"
else
  report_ok "Manual worktree root path" "not present: $ARCHON_WORKTREE_ROOT"
  RESOLVED_ROOT=""
fi

if RESOLVED_MANAGED_ROOT="$(resolve_path "$ARCHON_MANAGED_WORKTREE_ROOT" 2>/dev/null)"; then
  report_ok "Managed worktree root path" "$RESOLVED_MANAGED_ROOT"
else
  report_ok "Managed worktree root path" "not present: $ARCHON_MANAGED_WORKTREE_ROOT"
  RESOLVED_MANAGED_ROOT=""
fi

if [ -n "$ARCHON_WORKSPACE_CWD" ] && RESOLVED_WORKSPACE="$(resolve_path "$ARCHON_WORKSPACE_CWD" 2>/dev/null)"; then
  report_ok "Workspace resolved" "$RESOLVED_WORKSPACE"

  if [ "$RESOLVED_WORKSPACE" = "$RESOLVED_PROD" ]; then
    report_fail "Production boundary" "workspace resolves to production checkout: $RESOLVED_WORKSPACE"
  else
    report_ok "Production boundary" "workspace is not production checkout"
  fi

  if [ -n "$RESOLVED_ROOT" ] && [[ "$RESOLVED_WORKSPACE/" == "$RESOLVED_ROOT"/* ]]; then
    report_ok "Worktree root" "workspace is under manual root $RESOLVED_ROOT"
  elif [ -n "$RESOLVED_MANAGED_ROOT" ] && [[ "$RESOLVED_WORKSPACE/" == "$RESOLVED_MANAGED_ROOT"/* ]]; then
    report_ok "Worktree root" "workspace is under managed root $RESOLVED_MANAGED_ROOT"
  else
    report_fail "Worktree root" "workspace is not under $RESOLVED_ROOT/ or $RESOLVED_MANAGED_ROOT/"
  fi

  if [ "$(git -C "$RESOLVED_WORKSPACE" rev-parse --is-inside-work-tree 2>/dev/null || true)" = "true" ]; then
    report_ok "Git worktree" "workspace is inside a git worktree"
  else
    report_fail "Git worktree" "workspace is not inside a git worktree"
  fi

  if [ "$ARCHON_REQUIRE_CLEAN" = "1" ]; then
    if [ -z "$(git -C "$RESOLVED_WORKSPACE" status --porcelain 2>/dev/null || true)" ]; then
      report_ok "Git status" "workspace is clean"
    else
      report_fail "Git status" "workspace has uncommitted changes"
    fi
  else
    report_ok "Git status" "clean status not required"
  fi

  scan_forbidden_state "$RESOLVED_WORKSPACE"
  if [ -z "$FOUND_FORBIDDEN" ]; then
    report_ok "Forbidden state" "none found"
  else
    report_fail "Forbidden state" "$FOUND_FORBIDDEN"
  fi
elif [ -n "$ARCHON_WORKSPACE_CWD" ]; then
  report_fail "Workspace resolved" "cannot resolve: $ARCHON_WORKSPACE_CWD"
fi

if [ "$FAILED" -ne 0 ]; then
  exit 1
fi

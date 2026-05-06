#!/usr/bin/env bash
set -euo pipefail

PROD_CLAUDECLAW_CWD="${PROD_CLAUDECLAW_CWD:-/home/devuser/claudeclaw}"
ARCHON_WORKTREE_ROOT="${ARCHON_WORKTREE_ROOT:-/home/devuser/claudeclaw-worktrees}"

COMMAND="${1:-list}"
OLDER_THAN_HOURS=24
FORCE=0

usage() {
  cat >&2 <<'USAGE'
Usage:
  scripts/archon-runs.sh list
  scripts/archon-runs.sh stale [--older-than-hours N]
  scripts/archon-runs.sh cleanup [--older-than-hours N] [--force]
USAGE
}

resolve_path() {
  local path="$1"

  if command -v realpath >/dev/null 2>&1; then
    realpath "$path"
  else
    (cd "$path" && pwd -P)
  fi
}

stat_mtime() {
  local path="$1"

  stat -f '%m' "$path" 2>/dev/null || stat -c '%Y' "$path"
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --older-than-hours)
        if [ -z "${2:-}" ]; then
          printf 'Missing value for --older-than-hours\n' >&2
          exit 1
        fi
        OLDER_THAN_HOURS="$2"
        shift 2
        ;;
      --force)
        FORCE=1
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        printf 'Unknown option: %s\n' "$1" >&2
        usage
        exit 1
        ;;
    esac
  done

  case "$OLDER_THAN_HOURS" in
    ''|*[!0-9]*)
      printf 'Invalid --older-than-hours value: %s\n' "$OLDER_THAN_HOURS" >&2
      exit 1
      ;;
  esac
}

ensure_safe_roots() {
  if [ ! -d "$ARCHON_WORKTREE_ROOT" ]; then
    mkdir -p "$ARCHON_WORKTREE_ROOT"
  fi

  if ! RESOLVED_ROOT="$(resolve_path "$ARCHON_WORKTREE_ROOT" 2>/dev/null)"; then
    printf 'ERROR: cannot resolve Archon worktree root: %s\n' "$ARCHON_WORKTREE_ROOT" >&2
    exit 1
  fi

  if RESOLVED_PROD="$(resolve_path "$PROD_CLAUDECLAW_CWD" 2>/dev/null)"; then
    :
  else
    RESOLVED_PROD="$PROD_CLAUDECLAW_CWD"
  fi

  if [ "$RESOLVED_ROOT" = "$RESOLVED_PROD" ]; then
    printf 'ERROR: refusing production checkout: %s\n' "$RESOLVED_ROOT" >&2
    exit 1
  fi
}

path_is_under_root() {
  local path="$1"

  case "$path/" in
    "$RESOLVED_ROOT"/*) return 0 ;;
    *) return 1 ;;
  esac
}

is_dirty_worktree() {
  local path="$1"

  [ -n "$(git -C "$path" status --porcelain 2>/dev/null || true)" ]
}

branch_for_path() {
  local path="$1"

  git -C "$path" rev-parse --abbrev-ref HEAD 2>/dev/null || printf '-'
}

age_hours_for_path() {
  local path="$1"
  local now
  local mtime

  now="$(date +%s)"
  mtime="$(stat_mtime "$path")"
  printf '%s' "$(( (now - mtime) / 3600 ))"
}

print_run_line() {
  local path="$1"
  local status="$2"
  local run_id
  local branch
  local age_hours

  run_id="$(basename "$path")"
  branch="$(branch_for_path "$path")"
  age_hours="$(age_hours_for_path "$path")"
  printf 'RUN_ID=%s PATH=%s BRANCH=%s AGE_HOURS=%s STATUS=%s\n' \
    "$run_id" "$path" "$branch" "$age_hours" "$status"
}

for_each_candidate() {
  find "$RESOLVED_ROOT" -mindepth 1 -maxdepth 1 -type d -print | sort
}

classify_status() {
  local path="$1"
  local age_hours="$2"
  local stale_label="active"

  if [ "$age_hours" -ge "$OLDER_THAN_HOURS" ]; then
    stale_label="stale"
  fi

  if is_dirty_worktree "$path"; then
    printf 'dirty-%s' "$stale_label"
  else
    printf '%s' "$stale_label"
  fi
}

remove_stale_worktree() {
  local path="$1"

  if is_dirty_worktree "$path"; then
    printf 'SKIP: dirty worktree; not removing PATH=%s\n' "$path"
    return
  fi

  if [ "$path" = "$RESOLVED_PROD" ]; then
    printf 'ERROR: refusing production checkout: %s\n' "$path" >&2
    exit 1
  fi

  if [ "$FORCE" -ne 1 ]; then
    printf 'DRY-RUN: would remove stale Archon worktree PATH=%s\n' "$path"
    return
  fi

  if [ -d "$RESOLVED_PROD/.git" ] || [ -f "$RESOLVED_PROD/.git" ]; then
    git -C "$RESOLVED_PROD" worktree remove --force "$path" >/dev/null 2>&1 || rm -rf "$path"
  else
    rm -rf "$path"
  fi

  printf 'REMOVED: stale Archon worktree PATH=%s\n' "$path"
}

case "$COMMAND" in
  list|stale|cleanup) shift || true ;;
  -h|--help) usage; exit 0 ;;
  *) printf 'Unknown command: %s\n' "$COMMAND" >&2; usage; exit 1 ;;
esac
parse_args "$@"
ensure_safe_roots

if [ "$COMMAND" = "list" ]; then
  while IFS= read -r candidate; do
    [ -n "$candidate" ] || continue
    if ! resolved_candidate="$(resolve_path "$candidate" 2>/dev/null)"; then
      continue
    fi
    if ! path_is_under_root "$resolved_candidate"; then
      printf 'SKIP: outside Archon worktree root PATH=%s\n' "$candidate"
      continue
    fi
    if [ "$resolved_candidate" = "$RESOLVED_PROD" ]; then
      printf 'ERROR: refusing production checkout: %s\n' "$resolved_candidate" >&2
      exit 1
    fi
    age_hours="$(age_hours_for_path "$resolved_candidate")"
    print_run_line "$resolved_candidate" "$(classify_status "$resolved_candidate" "$age_hours")"
  done < <(for_each_candidate)
  exit 0
fi

while IFS= read -r candidate; do
  [ -n "$candidate" ] || continue
  if ! resolved_candidate="$(resolve_path "$candidate" 2>/dev/null)"; then
    continue
  fi
  if ! path_is_under_root "$resolved_candidate"; then
    printf 'SKIP: outside Archon worktree root PATH=%s\n' "$candidate"
    continue
  fi
  if [ "$resolved_candidate" = "$RESOLVED_PROD" ]; then
    printf 'ERROR: refusing production checkout: %s\n' "$resolved_candidate" >&2
    exit 1
  fi

  age_hours="$(age_hours_for_path "$resolved_candidate")"
  status="$(classify_status "$resolved_candidate" "$age_hours")"
  if [ "$age_hours" -lt "$OLDER_THAN_HOURS" ]; then
    continue
  fi

  if [ "$COMMAND" = "stale" ]; then
    print_run_line "$resolved_candidate" "$status"
  else
    print_run_line "$resolved_candidate" "$status"
    remove_stale_worktree "$resolved_candidate"
  fi
done < <(for_each_candidate)

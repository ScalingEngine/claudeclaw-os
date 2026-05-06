#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
RUNS="${ROOT_DIR}/scripts/archon-runs.sh"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

fail() {
  printf 'Archon runs test failed.\n' >&2
  printf 'FAIL - %s\n' "$1" >&2
  exit 1
}

assert_contains() {
  local label="$1"
  local output="$2"
  local expected="$3"

  if ! printf '%s' "$output" | grep -Fq -- "$expected"; then
    fail "$label missing $expected"
  fi
  printf 'OK - %s\n' "$label"
}

assert_path_exists() {
  local label="$1"
  local path="$2"

  [ -e "$path" ] || fail "$label"
  printf 'OK - %s\n' "$label"
}

assert_path_missing() {
  local label="$1"
  local path="$2"

  [ ! -e "$path" ] || fail "$label"
  printf 'OK - %s\n' "$label"
}

run_archon_runs() {
  env PROD_CLAUDECLAW_CWD="$PROD" ARCHON_WORKTREE_ROOT="$WORKTREE_ROOT" "$RUNS" "$@"
}

make_stale() {
  local path="$1"

  if touch -t 202001010000 "$path" 2>/dev/null; then
    return
  fi

  touch "$path"
}

PROD="${TMP_DIR}/prod"
WORKTREE_ROOT="${TMP_DIR}/worktrees"
mkdir -p "$PROD" "$WORKTREE_ROOT"

git -C "$TMP_DIR" init -q src
SRC="${TMP_DIR}/src"
git -C "$SRC" config user.email test@example.com
git -C "$SRC" config user.name Test
printf 'fixture\n' > "${SRC}/file.txt"
git -C "$SRC" add file.txt
git -C "$SRC" commit -qm init

OLD_RUN="${WORKTREE_ROOT}/old-run"
DIRTY_RUN="${WORKTREE_ROOT}/dirty-run"
NEW_RUN="${WORKTREE_ROOT}/new-run"

git -C "$SRC" worktree add -q "$OLD_RUN" HEAD
git -C "$SRC" worktree add -q "$DIRTY_RUN" HEAD
git -C "$SRC" worktree add -q "$NEW_RUN" HEAD

make_stale "$OLD_RUN"
make_stale "$DIRTY_RUN"
printf 'dirty\n' >> "${DIRTY_RUN}/file.txt"

list_output="$(run_archon_runs list)"
assert_contains "list includes RUN_ID" "$list_output" "RUN_ID=old-run"
assert_contains "list includes PATH" "$list_output" "PATH="
assert_contains "list includes BRANCH" "$list_output" "BRANCH="
assert_contains "list includes AGE_HOURS" "$list_output" "AGE_HOURS="
assert_contains "list includes STATUS" "$list_output" "STATUS="

stale_output="$(run_archon_runs stale --older-than-hours 24)"
assert_contains "stale includes old run" "$stale_output" "RUN_ID=old-run"
assert_contains "stale includes stale status" "$stale_output" "STATUS=stale"

dry_run_output="$(run_archon_runs cleanup --older-than-hours 24)"
assert_contains "cleanup dry-run reports removal" "$dry_run_output" "DRY-RUN: would remove stale Archon worktree"
assert_path_exists "dry-run leaves stale worktree present" "$OLD_RUN"

force_output="$(run_archon_runs cleanup --older-than-hours 24 --force)"
assert_contains "force cleanup removes stale clean run" "$force_output" "REMOVED: stale Archon worktree"
assert_path_missing "force cleanup removed stale clean worktree" "$OLD_RUN"
assert_contains "force cleanup refuses dirty run" "$force_output" "dirty worktree; not removing"
assert_path_exists "dirty worktree remains present" "$DIRTY_RUN"

set +e
bad_output="$(env PROD_CLAUDECLAW_CWD="$PROD" ARCHON_WORKTREE_ROOT="$PROD" "$RUNS" list 2>&1)"
bad_status=$?
set -e
[ "$bad_status" -ne 0 ] || fail "production checkout equality should fail"
assert_contains "production checkout refusal" "$bad_output" "refusing production checkout"

printf 'Archon runs test passed.\n'

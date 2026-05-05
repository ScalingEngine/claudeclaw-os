#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
GUARD="${ROOT_DIR}/scripts/archon-workspace-guard.sh"
TMP_DIR="$(mktemp -d)"

cleanup() {
  git -C "${TMP_DIR}/src" worktree remove --force "${TMP_DIR}/worktrees/run" >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

fail() {
  printf 'FAIL - %s\n' "$1" >&2
  exit 1
}

assert_pass() {
  local label="$1"
  shift
  "$@" >/dev/null || fail "$label"
  printf 'OK - %s\n' "$label"
}

assert_fail() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    fail "$label"
  fi
  printf 'OK - %s\n' "$label"
}

prod="${TMP_DIR}/prod"
worktree_root="${TMP_DIR}/worktrees"
workspace="${worktree_root}/run"
src="${TMP_DIR}/src"

mkdir -p "$prod" "$worktree_root"
git -C "$TMP_DIR" init -q src
git -C "$src" config user.email test@example.com
git -C "$src" config user.name Test
printf 'fixture\n' > "${src}/file.txt"
git -C "$src" add file.txt
git -C "$src" commit -qm init
git -C "$src" worktree add -q "$workspace" HEAD

assert_pass \
  "accepts clean worktree under allowed root" \
  env PROD_CLAUDECLAW_CWD="$prod" ARCHON_WORKTREE_ROOT="$worktree_root" "$GUARD" "$workspace"

assert_fail \
  "rejects production checkout" \
  env PROD_CLAUDECLAW_CWD="$prod" ARCHON_WORKTREE_ROOT="$worktree_root" "$GUARD" "$prod"

touch "${workspace}/.env.test-forbidden"
assert_fail \
  "rejects forbidden env state" \
  env PROD_CLAUDECLAW_CWD="$prod" ARCHON_WORKTREE_ROOT="$worktree_root" "$GUARD" "$workspace"
rm "${workspace}/.env.test-forbidden"

printf 'dirty\n' >> "${workspace}/file.txt"
assert_fail \
  "rejects dirty worktree when required" \
  env PROD_CLAUDECLAW_CWD="$prod" ARCHON_WORKTREE_ROOT="$worktree_root" ARCHON_REQUIRE_CLEAN=1 "$GUARD" "$workspace"

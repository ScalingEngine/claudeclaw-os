#!/usr/bin/env bash
set -euo pipefail

ARCHON_REPO="${ARCHON_REPO:-/home/devuser/remote-coding-agent}"
ARCHON_PROJECT_CWD="${ARCHON_PROJECT_CWD:-/home/devuser/claudeclaw}"
ARCHON_ENV_FILE="${ARCHON_ENV_FILE:-$HOME/.archon/.env}"
BUN_BIN="${BUN_BIN:-bun}"

# Credentials from the env file must not be able to retarget the wrapper.
WRAPPER_ARCHON_REPO="$ARCHON_REPO"
WRAPPER_ARCHON_PROJECT_CWD="$ARCHON_PROJECT_CWD"
WRAPPER_ARCHON_ENV_FILE="$ARCHON_ENV_FILE"
WRAPPER_BUN_BIN="$BUN_BIN"

if [ -f "$ARCHON_ENV_FILE" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$ARCHON_ENV_FILE"
  set +a
fi

ARCHON_REPO="$WRAPPER_ARCHON_REPO"
ARCHON_PROJECT_CWD="$WRAPPER_ARCHON_PROJECT_CWD"
ARCHON_ENV_FILE="$WRAPPER_ARCHON_ENV_FILE"
BUN_BIN="$WRAPPER_BUN_BIN"

if [ ! -d "$ARCHON_REPO" ]; then
  echo "ARCHON_REPO not found: ${ARCHON_REPO}" >&2
  exit 1
fi

if [ ! -f "$ARCHON_REPO/package.json" ]; then
  echo "Archon package.json not found: ${ARCHON_REPO}/package.json" >&2
  exit 1
fi

if [ "$#" -eq 0 ]; then
  set -- workflow list --cwd "$ARCHON_PROJECT_CWD"
fi

# BUN_BIN defaults to bun, so this executes the Archon CLI as bun run cli.
(cd "$ARCHON_REPO" && exec "$BUN_BIN" run cli "$@")

#!/usr/bin/env bash
set -euo pipefail

ARCHON_REPO="${ARCHON_REPO:-/home/devuser/remote-coding-agent}"
ARCHON_PROJECT_CWD="${ARCHON_PROJECT_CWD:-/home/devuser/claudeclaw}"
ARCHON_ENV_FILE="${ARCHON_ENV_FILE:-$HOME/.archon/.env}"
BUN_BIN="${BUN_BIN:-bun}"

if [ ! -d "$ARCHON_REPO" ]; then
  echo "ARCHON_REPO not found: ${ARCHON_REPO}" >&2
  exit 1
fi

if [ ! -f "$ARCHON_REPO/package.json" ]; then
  echo "Archon package.json not found: ${ARCHON_REPO}/package.json" >&2
  exit 1
fi

if [ -f "$ARCHON_ENV_FILE" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$ARCHON_ENV_FILE"
  set +a
fi

if [ "$#" -eq 0 ]; then
  set -- workflow list --cwd "$ARCHON_PROJECT_CWD"
fi

(cd "$ARCHON_REPO" && "$BUN_BIN" run cli "$@")

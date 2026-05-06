#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
SOURCE_DIR="${ROOT}/archon/workflows"
ARCHON_WORKFLOWS_DIR="${ARCHON_WORKFLOWS_DIR:-$HOME/.archon/workflows}"
DRY_RUN=0

usage() {
  printf 'Usage: %s [--dry-run]\n' "$(basename "$0")"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      printf 'Unknown argument: %s\n' "$1" >&2
      exit 2
      ;;
  esac
  shift
done

if [ ! -d "$SOURCE_DIR" ]; then
  printf 'ERROR: source workflow directory missing: %s\n' "$SOURCE_DIR" >&2
  exit 1
fi

shopt -s nullglob
WORKFLOW_FILES=("$SOURCE_DIR"/claudeclaw-*.yaml)
shopt -u nullglob

if [ "${#WORKFLOW_FILES[@]}" -eq 0 ]; then
  printf 'ERROR: no claudeclaw-*.yaml files found in %s\n' "$SOURCE_DIR" >&2
  exit 1
fi

if [ "$DRY_RUN" -eq 1 ]; then
  printf 'DRY-RUN: would install %s workflow file(s) to %s\n' "${#WORKFLOW_FILES[@]}" "$ARCHON_WORKFLOWS_DIR"
else
  mkdir -p "$ARCHON_WORKFLOWS_DIR"
  printf 'Installing %s workflow file(s) to %s\n' "${#WORKFLOW_FILES[@]}" "$ARCHON_WORKFLOWS_DIR"
fi

for workflow_file in "${WORKFLOW_FILES[@]}"; do
  workflow_name="$(basename "$workflow_file")"
  target_file="$ARCHON_WORKFLOWS_DIR/$workflow_name"

  if [ "$DRY_RUN" -eq 1 ]; then
    printf 'DRY-RUN: %s -> %s\n' "$workflow_name" "$target_file"
  else
    install -m 0644 "$workflow_file" "$target_file"
    printf 'INSTALLED: %s -> %s\n' "$workflow_name" "$target_file"
  fi
done

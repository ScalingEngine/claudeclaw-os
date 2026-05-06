#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
SOURCE_DIR="${ROOT}/archon/workflows"
ARCHON_WORKFLOWS_DIR="${ARCHON_WORKFLOWS_DIR:-$HOME/.archon/workflows}"
DRY_RUN=0

usage() {
  printf 'Usage: %s [--dry-run]\n' "$(basename "$0")"
  printf 'Installs require a clean committed workflow source tree.\n'
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

if git -C "$ROOT" diff --name-only -- 'archon/workflows/claudeclaw-*.yaml' | grep -q .; then
  printf 'ERROR: refusing to install with unstaged ClaudeClaw workflow source changes\n' >&2
  git -C "$ROOT" diff --name-only -- 'archon/workflows/claudeclaw-*.yaml' >&2
  exit 1
fi

if git -C "$ROOT" diff --cached --name-only -- 'archon/workflows/claudeclaw-*.yaml' | grep -q .; then
  printf 'ERROR: refusing to install with staged ClaudeClaw workflow source changes\n' >&2
  git -C "$ROOT" diff --cached --name-only -- 'archon/workflows/claudeclaw-*.yaml' >&2
  exit 1
fi

mapfile -d '' WORKFLOW_FILES < <(
  git -C "$ROOT" ls-files -z 'archon/workflows/claudeclaw-*.yaml'
)

if [ "${#WORKFLOW_FILES[@]}" -eq 0 ]; then
  printf 'ERROR: no committed claudeclaw-*.yaml files found\n' >&2
  exit 1
fi

for i in "${!WORKFLOW_FILES[@]}"; do
  WORKFLOW_FILES[$i]="$ROOT/${WORKFLOW_FILES[$i]}"
done

declare -A DESIRED_WORKFLOWS=()
for workflow_file in "${WORKFLOW_FILES[@]}"; do
  DESIRED_WORKFLOWS["$(basename "$workflow_file")"]=1
done

if [ "$DRY_RUN" -eq 1 ]; then
  printf 'DRY-RUN: would install %s workflow file(s) to %s\n' "${#WORKFLOW_FILES[@]}" "$ARCHON_WORKFLOWS_DIR"
else
  mkdir -p "$ARCHON_WORKFLOWS_DIR"
  printf 'Installing %s workflow file(s) to %s\n' "${#WORKFLOW_FILES[@]}" "$ARCHON_WORKFLOWS_DIR"
fi

shopt -s nullglob
for target_file in "$ARCHON_WORKFLOWS_DIR"/claudeclaw-*.yaml; do
  target_name="$(basename "$target_file")"
  if [ -z "${DESIRED_WORKFLOWS[$target_name]+x}" ]; then
    if [ "$DRY_RUN" -eq 1 ]; then
      printf 'DRY-RUN: would remove stale workflow %s\n' "$target_file"
    else
      rm -f "$target_file"
      printf 'REMOVED: stale workflow %s\n' "$target_file"
    fi
  fi
done
shopt -u nullglob

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

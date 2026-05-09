#!/usr/bin/env bash
# Sync local persona overlays (~/.claudeclaw/agents/) to the VPS and restart
# the ClaudeClaw fleet so each agent reloads its CLAUDE.md + agent.yaml.
#
# Excludes:
#   *.bak           — local backups from in-place edits
#   ezra/           — orchestrator loads root ~/.claudeclaw/CLAUDE.md directly
#                     (see src/index.ts MAIN_AGENT_ID branch). Sync that file
#                     separately if Ezra's persona changes:
#                       rsync -av ~/.claudeclaw/CLAUDE.md vps:.claudeclaw/CLAUDE.md
#                     The local agents/ezra/CLAUDE.md is a real-file mirror for
#                     editor tooling, but the runtime never reads it.
#
# Companion to scripts/sync-skills.sh. Run after editing personas locally.
# Going forward Noah is iterating on personas directly on the VPS, so this is
# mostly a one-shot deploy tool — but keep it in shape for future round-trips.
#
# Usage:
#   bash scripts/sync-personas.sh            # uses VPS_HOST=vps from ~/.ssh/config
#   bash scripts/sync-personas.sh --dry-run  # preview changes only, no transfer, no restart
#   VPS_HOST=other bash scripts/sync-personas.sh

set -euo pipefail

VPS_HOST="${VPS_HOST:-vps}"
LOCAL_AGENTS="${HOME}/.claudeclaw/agents/"
DRY_RUN=""

if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN="--dry-run"
  echo "[DRY RUN] No files will be transferred and the fleet will not be restarted."
fi

if [ ! -d "$LOCAL_AGENTS" ]; then
  echo "Local agents overlay not found: $LOCAL_AGENTS" >&2
  exit 1
fi

LOCAL_COUNT=$(find "$LOCAL_AGENTS" -maxdepth 1 -mindepth 1 -type d ! -name 'ezra' | wc -l | tr -d ' ')
echo "[1/2] rsync ${LOCAL_COUNT} persona overlays -> ${VPS_HOST}:.claudeclaw/agents/"

rsync -av --delete $DRY_RUN \
  --exclude='ezra/' \
  --exclude='*.bak' \
  --exclude='*.cole.bak' \
  --exclude='.DS_Store' \
  "$LOCAL_AGENTS" "${VPS_HOST}:.claudeclaw/agents/"

if [ -n "$DRY_RUN" ]; then
  echo
  echo "Dry run complete. Re-run without --dry-run to apply."
  exit 0
fi

VPS_COUNT=$(ssh "$VPS_HOST" "ls ~/.claudeclaw/agents/ | wc -l" | tr -d ' ')
echo "      VPS now has ${VPS_COUNT} entries under agents/"

echo
echo "[2/2] Restart ClaudeClaw fleet on ${VPS_HOST}"
ssh "$VPS_HOST" "systemctl --user restart claudeclaw-ezra claudeclaw-vera claudeclaw-poe claudeclaw-cole claudeclaw-hopper claudeclaw-archie"

echo
echo "Done. Verifying service state:"
ssh "$VPS_HOST" "systemctl --user is-active claudeclaw-ezra claudeclaw-vera claudeclaw-poe claudeclaw-cole claudeclaw-hopper claudeclaw-archie"

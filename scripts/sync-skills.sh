#!/usr/bin/env bash
# Sync local Claude Code skills to the VPS and restart the ClaudeClaw fleet
# so each agent's Claude Agent SDK reloads them via settingSources: ['user'].
#
# Usage:
#   bash scripts/sync-skills.sh            # uses VPS_HOST=vps from your ~/.ssh/config
#   VPS_HOST=other bash scripts/sync-skills.sh

set -euo pipefail

VPS_HOST="${VPS_HOST:-vps}"
LOCAL_SKILLS="${HOME}/.claude/skills/"

if [ ! -d "$LOCAL_SKILLS" ]; then
  echo "Local skills directory not found: $LOCAL_SKILLS" >&2
  exit 1
fi

LOCAL_COUNT=$(find "$LOCAL_SKILLS" -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ')
echo "[1/2] rsync ${LOCAL_COUNT} local skills -> ${VPS_HOST}:.claude/skills/"
rsync -a --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  "$LOCAL_SKILLS" "${VPS_HOST}:.claude/skills/"

VPS_COUNT=$(ssh "$VPS_HOST" "ls ~/.claude/skills/ | wc -l" | tr -d ' ')
echo "      VPS now has ${VPS_COUNT} skills"

echo
echo "[2/2] Restart ClaudeClaw fleet on ${VPS_HOST}"
ssh "$VPS_HOST" "systemctl --user restart claudeclaw claudeclaw-ops claudeclaw-content claudeclaw-research claudeclaw-comms claudeclaw-code"

echo
echo "Done. The Claude Agent SDK will pick up the new skills on next agent query."

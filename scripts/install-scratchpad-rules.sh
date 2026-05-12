#!/bin/bash
#
# install-scratchpad-rules.sh
#
# One-shot migration: splice the per-class scratchpad rule into each live
# persona file under ~/.claudeclaw/. Idempotent — re-running is a no-op
# (detects an existing "## Scratchpad" section and skips).
#
# Per-class assignment (locked in 06-PLAN.md):
#   ~/.claudeclaw/CLAUDE.md                  → coordinator (Ezra)
#   ~/.claudeclaw/agents/vera/CLAUDE.md      → research
#   ~/.claudeclaw/agents/archie/CLAUDE.md    → research
#   ~/.claudeclaw/agents/cole/CLAUDE.md      → draft
#   ~/.claudeclaw/agents/poe/CLAUDE.md       → draft
#   ~/.claudeclaw/agents/hopper/CLAUDE.md    → coordinator
#
# Why a script (not Edit-from-the-repo): src/agent-config.ts:78-88's
# resolveAgentClaudeMd() reads ~/.claudeclaw/agents/{id}/CLAUDE.md FIRST.
# Editing repo paths is a no-op for live behavior. The repo template gets
# the research-class default (Plan 06-04 Task 4.1); this script handles
# the live splice for already-deployed personas.
#
# Usage:
#   bash scripts/install-scratchpad-rules.sh           # apply
#   bash scripts/install-scratchpad-rules.sh --dry-run # preview only
#   bash scripts/install-scratchpad-rules.sh --revert  # restore from .bak
#
# Backups: each modified file is copied to ${file}.pre-scratch.bak before write.

set -e

# ── Resolve config dir ────────────────────────────────────────────────
CONFIG_DIR="${CLAUDECLAW_CONFIG:-$HOME/.claudeclaw}"

# ── Args ──────────────────────────────────────────────────────────────
DRY_RUN=0
REVERT=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --revert)  REVERT=1 ;;
    -h|--help)
      sed -n '2,30p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      echo "Usage: $0 [--dry-run|--revert]" >&2
      exit 2
      ;;
  esac
done

# ── Per-class rule blocks (locked wording, see 06-PLAN.md) ───────────

read -r -d '' RESEARCH_BLOCK <<'BLOCK' || true
## Scratchpad

Each turn you receive a scratchpad path inside a `[Scratchpad — ...]` block in
your prompt. Treat it as durable memory across context compaction.

- After every 3 tool calls during a research task, append a short bulleted
  findings block to the scratchpad using the Write tool. Include URLs,
  endpoint names, payload shapes, auth headers, error messages — anything
  you would lose if this conversation reset.
- After context compaction fires (you'll see a system message about it,
  or your earlier tool output will feel summarized), Read the scratchpad
  before doing any more work. Re-emit those findings in your reply to the
  user.
- Do NOT spend turns on scratchpad housekeeping. Append, don't reorganize.
BLOCK

read -r -d '' DRAFT_BLOCK <<'BLOCK' || true
## Scratchpad

Each turn you receive a scratchpad path inside a `[Scratchpad — ...]` block in
your prompt. Use it as a durable outline for drafts.

- Outline your draft in sections (e.g. hook, body, CTA for content; subject,
  body, sign-off for comms) at the start of the turn.
- As you finalize each section, append it to the scratchpad with the Write
  tool. Partial drafts then survive any mid-turn context compaction.
- After context compaction, Read the scratchpad and continue from the last
  finalized section instead of starting over.
BLOCK

read -r -d '' COORDINATOR_BLOCK <<'BLOCK' || true
## Scratchpad

Each turn you receive a scratchpad path inside a `[Scratchpad — ...]` block in
your prompt. Use it only on heavy turns.

- If you expect more than 5 tool calls in this turn (e.g. Linear sync,
  cross-agent dispatch with fan-out, multi-step ops triage), dump the
  decision tree and intermediate results to the scratchpad as you go.
- For quick routing/triage turns (1-3 tool calls), skip it. The point is
  recovery from compaction, not housekeeping.
- After context compaction, Read the scratchpad if you used it; otherwise
  continue normally.
BLOCK

# ── Agent → class table (parallel arrays, bash 3 compatible) ─────────
TARGET_FILES=(
  "$CONFIG_DIR/CLAUDE.md"
  "$CONFIG_DIR/agents/vera/CLAUDE.md"
  "$CONFIG_DIR/agents/archie/CLAUDE.md"
  "$CONFIG_DIR/agents/cole/CLAUDE.md"
  "$CONFIG_DIR/agents/poe/CLAUDE.md"
  "$CONFIG_DIR/agents/hopper/CLAUDE.md"
)
TARGET_CLASSES=(
  "coordinator"   # ezra (root file — main agent loads ~/.claudeclaw/CLAUDE.md)
  "research"      # vera
  "research"      # archie
  "draft"         # cole
  "draft"         # poe
  "coordinator"   # hopper
)

# ── Counters ──────────────────────────────────────────────────────────
INSTALLED=0
ALREADY=0
MISSING=0
REVERTED=0

# ── --revert path ─────────────────────────────────────────────────────
if [ "$REVERT" -eq 1 ]; then
  echo "==> Reverting scratchpad-rule install (restoring *.pre-scratch.bak)"
  for file in "${TARGET_FILES[@]}"; do
    bak="${file}.pre-scratch.bak"
    if [ -f "$bak" ]; then
      if [ "$DRY_RUN" -eq 1 ]; then
        echo "  [dry-run] would restore: $file ← $bak"
      else
        cp "$bak" "$file"
        echo "  restored: $file"
      fi
      REVERTED=$((REVERTED + 1))
    else
      echo "  no backup found, skipping: $file"
    fi
  done
  echo
  echo "Reverted: $REVERTED file(s)."
  exit 0
fi

# ── Install path ──────────────────────────────────────────────────────
echo "==> Installing scratchpad rules into $CONFIG_DIR"
if [ "$DRY_RUN" -eq 1 ]; then
  echo "    (DRY RUN — no files will be modified)"
fi
echo

for i in "${!TARGET_FILES[@]}"; do
  file="${TARGET_FILES[$i]}"
  class="${TARGET_CLASSES[$i]}"

  # Pick the right block
  case "$class" in
    research)    block="$RESEARCH_BLOCK" ;;
    draft)       block="$DRAFT_BLOCK" ;;
    coordinator) block="$COORDINATOR_BLOCK" ;;
    *)
      echo "  ERROR: unknown class '$class' for $file" >&2
      exit 3
      ;;
  esac

  # File must exist (script doesn't seed personas — that's agent-create.sh)
  if [ ! -f "$file" ]; then
    echo "  [missing]   $file (no live persona — skip)"
    MISSING=$((MISSING + 1))
    continue
  fi

  # Idempotency: skip if already installed
  if grep -q "^## Scratchpad" "$file"; then
    echo "  [already]   $file ($class — skip)"
    ALREADY=$((ALREADY + 1))
    continue
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "  [would-add] $file ($class)"
    INSTALLED=$((INSTALLED + 1))
    continue
  fi

  # Backup, then append the block with a leading blank-line separator.
  cp "$file" "${file}.pre-scratch.bak"
  printf '\n\n%s\n' "$block" >> "$file"
  echo "  [installed] $file ($class) — backup: ${file}.pre-scratch.bak"
  INSTALLED=$((INSTALLED + 1))
done

echo
if [ "$DRY_RUN" -eq 1 ]; then
  echo "Dry run summary: would install $INSTALLED | already $ALREADY | missing $MISSING"
else
  echo "Installed: $INSTALLED | Skipped (already present): $ALREADY | Skipped (missing file): $MISSING | Backups in *.pre-scratch.bak"
fi

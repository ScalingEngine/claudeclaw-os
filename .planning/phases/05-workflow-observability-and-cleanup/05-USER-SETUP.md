# Phase 05: User Setup Required

**Generated:** 2026-05-06
**Phase:** workflow-observability-and-cleanup
**Status:** Incomplete

Complete these VPS verification items after deploying the committed Phase 05 changes. No new accounts, dashboards, or secrets are required.

## Environment Variables

None.

## Account Setup

None.

## Dashboard Configuration

None.

## Verification

After deploy on the VPS:

```bash
cd /home/devuser/claudeclaw
scripts/archon-runs.sh list
scripts/archon-runs.sh stale --older-than-hours 24
scripts/archon-runs.sh cleanup --older-than-hours 24
```

Expected results:
- `list` prints Archon run metadata with `RUN_ID`, `PATH`, `BRANCH`, `AGE_HOURS`, and `STATUS`.
- `stale --older-than-hours 24` shows only stale isolated worktrees under `/home/devuser/claudeclaw-worktrees`.
- `cleanup --older-than-hours 24` is a dry-run and prints `DRY-RUN: would remove stale Archon worktree` for removable stale runs.

Only after reviewing the dry-run output:

```bash
scripts/archon-runs.sh cleanup --older-than-hours 24 --force
```

Expected results:
- Clean stale worktrees under `/home/devuser/claudeclaw-worktrees` are removed.
- Dirty worktrees are refused with `dirty worktree; not removing`.
- The production checkout `/home/devuser/claudeclaw` is never removed.

---

**Once all items complete:** Mark status as "Complete" at top of file.

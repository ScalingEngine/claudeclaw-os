# Phase 2: Safe Workspace and Deploy Boundary - Pattern Map

**Mapped:** 2026-05-05
**Status:** Complete

## Files To Create Or Modify

| File | Role | Closest Existing Analog | Notes |
|------|------|-------------------------|-------|
| `scripts/archon-workspace-guard.sh` | Safety preflight for Archon coding workspaces | `scripts/archon-status.sh`, `scripts/pre-commit-check.sh` | Use labeled checks, strict bash, no secret output |
| `docs/archon-workspaces.md` | Operator runbook for safe worktrees, deploy, rollback | `docs/archon-runtime.md`, `docs/incident-runbook.md` | Include exact VPS paths and commands |
| `docs/archon-runtime.md` | Existing Archon runtime runbook | Itself | Add Phase 2 pointer so coding workflows stop targeting production |
| `.planning/phases/02-safe-workspace-and-deploy-boundary/02-PLAN.md` | Execution contract | `.planning/phases/01-vps-archon-runtime-surface/01-PLAN.md` | Must cover SAFE-01 through SAFE-04 |

## Local Patterns

### Bash status/guard scripts

`scripts/archon-status.sh` uses strict bash, labels each check, accumulates failure state, and exits non-zero if any safety check fails. `scripts/archon-workspace-guard.sh` should follow that same shape:

```bash
#!/usr/bin/env bash
set -euo pipefail

FAILED=0

report_ok() {
  printf '%s: OK - %s\n' "$1" "$2"
}

report_fail() {
  printf '%s: FAIL - %s\n' "$1" "$2"
  FAILED=1
}
```

### Sensitive file blocking

`scripts/pre-commit-check.sh` blocks staged sensitive files with:

```bash
SENSITIVE=$(git diff --cached --name-only | grep -E "\.env$|^store/|\.db$|\.db-wal$|\.db-shm$|\.pid$" || true)
```

The workspace guard should apply the same idea to filesystem contents, not staged files. The key extension is live agent config blocking: `agents/*/CLAUDE.md` and `agents/*/agent.yaml` are forbidden outside `agents/_template/` and `.example` files.

### Operator docs

`docs/archon-runtime.md` uses short sections, exact paths, and copy-paste command blocks. `docs/incident-runbook.md` uses "symptom -> action" and rollback commands. The new workspace runbook should keep that practical style and avoid architecture essaying.

## Data Flow

```text
Operator or agent prepares run ID
  -> git worktree add under /home/devuser/claudeclaw-worktrees/<run-id>
  -> scripts/archon-workspace-guard.sh checks path and forbidden state
  -> scripts/archon-vps.sh workflow run ... --cwd /home/devuser/claudeclaw-worktrees/<run-id>
  -> validation runs in worktree
  -> approved branch/commit is merged or selected
  -> production checkout pulls a known-good branch/commit
  -> rollback uses captured pre-deploy commit
```

## Verification Anchors

- Guard syntax: `bash -n scripts/archon-workspace-guard.sh`
- Production path refusal text: `grep -q '/home/devuser/claudeclaw' scripts/archon-workspace-guard.sh`
- Worktree root text: `grep -q '/home/devuser/claudeclaw-worktrees' scripts/archon-workspace-guard.sh`
- Forbidden state text: `grep -q '.env' scripts/archon-workspace-guard.sh && grep -q 'store' scripts/archon-workspace-guard.sh && grep -q 'agents' scripts/archon-workspace-guard.sh`
- Runtime bridge: `grep -q 'docs/archon-workspaces.md' docs/archon-runtime.md`
- Deploy rule: `grep -q 'git pull --ff-only origin main' docs/archon-workspaces.md`
- Rollback rule: `grep -q 'git checkout --detach "${ROLLBACK_COMMIT}"' docs/archon-workspaces.md`

## PATTERN MAPPING COMPLETE

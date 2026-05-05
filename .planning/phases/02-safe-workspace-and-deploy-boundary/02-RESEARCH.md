# Phase 2: Safe Workspace and Deploy Boundary - Research

**Researched:** 2026-05-05
**Status:** Complete
**Phase goal:** Establish non-production Archon workspaces/worktrees for agent work, document forbidden production state, and preserve commit-based deploy and rollback rules.

## Executive Summary

Phase 2 should turn the Phase 1 Archon runtime surface from "callable" into "safe to use for coding workflows." The safest implementation shape is a documented worktree boundary plus a small guard script that workflow authors and operators can run before allowing Archon to operate on code.

The plan should not modify live VPS state, copy production secrets, or update persona routing policy. Those are either operator actions or later phases. The repo should gain:

- A workspace guard script that refuses production checkout paths, refuses workspaces outside `/home/devuser/claudeclaw-worktrees`, and detects copied secrets/live state.
- A dedicated runbook for creating, validating, deploying, and rolling back Archon coding workspaces.
- An update to the Phase 1 Archon runtime runbook so coding workflows point to the Phase 2 safe-workspace contract instead of `/home/devuser/claudeclaw`.
- Verification commands that prove the guard and docs cover `SAFE-01` through `SAFE-04`.

## Source Facts

From `.planning/ROADMAP.md`:

- Phase 2 is "Safe workspace and deploy boundary."
- Current VPS production checkout is `/home/devuser/claudeclaw`.
- Phase 1 verified `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` and `systemd-run --user --wait --collect ...` on the VPS.
- Phase 2 requirements are `SAFE-01`, `SAFE-02`, `SAFE-03`, and `SAFE-04`.

From `.planning/REQUIREMENTS.md`:

- `SAFE-01`: Archon coding workflows run in isolated worktrees or a non-production workspace, not directly in `/home/devuser/claudeclaw`.
- `SAFE-02`: Production `.env`, SQLite databases, OAuth tokens, and live agent configs are never copied into Archon worktrees.
- `SAFE-03`: ClaudeClaw deploy remains commit-based: production pulls known-good branches or commits after validation.
- `SAFE-04`: Rollback and verification commands are documented for any workflow that touches production-adjacent code or config.

From Phase 1 artifacts:

- `scripts/archon-vps.sh` defaults `ARCHON_PROJECT_CWD` to `/home/devuser/claudeclaw` for workflow discovery.
- `docs/archon-runtime.md` already states: "Phase 1 verifies workflow discovery only; coding workflows must wait for the safe workspace boundary in Phase 2."
- `scripts/archon-status.sh` checks the Archon repo, credentials, workflow path, and workflow discovery, but does not verify coding workspace safety.

From current codebase:

- `scripts/pre-commit-check.sh` already blocks staged `.env`, `store/`, DB files, PID files, and non-template live agent configs.
- `docs/incident-runbook.md` documents operator-style rollback and verification commands.
- `agents/_template/CLAUDE.md` contains guidance for agent-local scheduling and hive-mind writes, but Phase 3 owns persona routing policy.

## Recommended Architecture

### 1. Workspace guard script

Create `scripts/archon-workspace-guard.sh` with strict bash and explicit VPS defaults:

- `PROD_CLAUDECLAW_CWD="${PROD_CLAUDECLAW_CWD:-/home/devuser/claudeclaw}"`
- `ARCHON_WORKTREE_ROOT="${ARCHON_WORKTREE_ROOT:-/home/devuser/claudeclaw-worktrees}"`
- `ARCHON_WORKSPACE_CWD="${1:-${ARCHON_WORKSPACE_CWD:-}}"`

The guard should fail when:

- No workspace path is supplied.
- The resolved workspace equals `/home/devuser/claudeclaw`.
- The resolved workspace is not under `/home/devuser/claudeclaw-worktrees/`.
- The workspace is not a git worktree.
- Any forbidden production state exists inside the workspace:
  - `.env`
  - `.env.*`
  - `store/*.db`
  - `store/*.db-wal`
  - `store/*.db-shm`
  - `*.sqlite`
  - `*.sqlite3`
  - `agents/*/CLAUDE.md` except `agents/_template/CLAUDE.md`
  - `agents/*/agent.yaml` except `.example` files
- `git -C "$WORKSPACE_CWD" status --porcelain` is non-empty when `ARCHON_REQUIRE_CLEAN=1`.

The script should print labeled `OK` or `FAIL` lines similar to `scripts/archon-status.sh` and exit non-zero on failure. It should not inspect or print secret values.

### 2. Safe workspace runbook

Create `docs/archon-workspaces.md` with:

- The production checkout path: `/home/devuser/claudeclaw`.
- The allowed Archon worktree root: `/home/devuser/claudeclaw-worktrees`.
- A canonical worktree creation sequence:

```bash
RUN_ID="$(date +%Y%m%d%H%M%S)-example"
mkdir -p /home/devuser/claudeclaw-worktrees
cd /home/devuser/claudeclaw
git fetch origin
git worktree add -b "archon/${RUN_ID}" "/home/devuser/claudeclaw-worktrees/${RUN_ID}" origin/main
```

- A guard check:

```bash
/home/devuser/claudeclaw/scripts/archon-workspace-guard.sh "/home/devuser/claudeclaw-worktrees/${RUN_ID}"
```

- A safe Archon coding invocation pattern using the workspace as `--cwd`, not production:

```bash
ARCHON_PROJECT_CWD="/home/devuser/claudeclaw-worktrees/${RUN_ID}" \
  /home/devuser/claudeclaw/scripts/archon-vps.sh workflow run coding-plan-to-pr --cwd "/home/devuser/claudeclaw-worktrees/${RUN_ID}"
```

- Forbidden-state rules and cleanup commands.
- Commit-based deploy and rollback commands.

### 3. Runtime runbook bridge

Update `docs/archon-runtime.md` to add a Phase 2 coding-workspace section. It should say workflow discovery can still use `/home/devuser/claudeclaw`, but coding workflows must use `docs/archon-workspaces.md` and must run the workspace guard before `workflow run`.

### 4. Validation strategy

Automated validation should cover:

- `bash -n scripts/archon-workspace-guard.sh`
- `grep -q 'PROD_CLAUDECLAW_CWD="${PROD_CLAUDECLAW_CWD:-/home/devuser/claudeclaw}"' scripts/archon-workspace-guard.sh`
- `grep -q 'ARCHON_WORKTREE_ROOT="${ARCHON_WORKTREE_ROOT:-/home/devuser/claudeclaw-worktrees}"' scripts/archon-workspace-guard.sh`
- `grep -q 'docs/archon-workspaces.md' docs/archon-runtime.md`
- `grep -q 'git worktree add -b "archon/${RUN_ID}"' docs/archon-workspaces.md`
- `grep -q 'git pull --ff-only origin main' docs/archon-workspaces.md`
- `grep -q 'git checkout --detach "${ROLLBACK_COMMIT}"' docs/archon-workspaces.md`
- `npm run typecheck`

Manual VPS validation should cover creating a disposable worktree, running the guard, confirming production checkout rejection, and confirming the guard catches a deliberately created `.env.test-forbidden` file inside the disposable worktree.

## Threat Model

- **T-01 Production mutation:** A workflow runs against `/home/devuser/claudeclaw` and changes live checkout files.
  - Mitigation: Guard refuses production path; docs require `--cwd /home/devuser/claudeclaw-worktrees/<run-id>` for coding workflows.
- **T-02 Secret/state copy:** `.env`, SQLite DBs, OAuth tokens, or live agent configs are copied into an Archon worktree.
  - Mitigation: Guard scans for forbidden files; runbook forbids copying production state and routes env setup through example/template files only.
- **T-03 Non-commit deploy:** Operators copy loose files into production, bypassing review and rollback.
  - Mitigation: Runbook requires branch/commit validation and `git pull --ff-only origin main` or an explicit known-good commit.
- **T-04 Rollback ambiguity:** A production-adjacent workflow changes code and there is no known previous commit.
  - Mitigation: Runbook captures `PRE_DEPLOY_COMMIT="$(git rev-parse HEAD)"` before deploy and documents `git checkout --detach "${ROLLBACK_COMMIT}"` plus service restart/verification.

## Open Questions

- The exact starter workflow names arrive in Phase 4. Phase 2 should use example workflow names but make the `--cwd` and guard contract concrete.
- Whether production should deploy from `main` only or from tagged release commits is a project policy choice. The safe default for this plan is "known-good branch or commit after validation," matching `SAFE-03`.

## Validation Architecture

See `.planning/phases/02-safe-workspace-and-deploy-boundary/02-VALIDATION.md`.

## RESEARCH COMPLETE

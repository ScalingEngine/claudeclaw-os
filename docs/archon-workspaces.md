# Archon Safe Workspaces

## Scope

This runbook defines the safe workspace boundary for Archon coding workflows that touch ClaudeClaw. Workflow discovery and launch may happen from production, but coding work must happen in an isolated git worktree and must pass the workspace guard before implementation.

## Allowed Paths

- Production checkout: `/home/devuser/claudeclaw`
- Archon-managed worktree root: `~/.archon/workspaces/.../worktrees/...`
- Legacy/manual worktree root: `/home/devuser/claudeclaw-worktrees`
- Archon source checkout: `/home/devuser/remote-coding-agent`

Use `/home/devuser/claudeclaw` as the `--cwd` for Archon workflow launch and pass `--branch`; Archon creates and enters the isolated managed worktree for workflow nodes. Do not run implementation commands directly in `/home/devuser/claudeclaw`.

## Launch an Archon-Managed Worktree

```bash
RUN_ID="$(date +%Y%m%d%H%M%S)-example"
cd /home/devuser/claudeclaw
scripts/archon-vps.sh workflow run claudeclaw-coding-plan-to-pr --cwd /home/devuser/claudeclaw --branch "archon/${RUN_ID}" "Implement the approved objective"
```

The branch is the reviewable deployment artifact. Archon stores the managed worktree under `~/.archon/workspaces/.../worktrees/...`; keep all generated code, tests, and docs inside that worktree until the branch or commit is validated.

## Run the Workspace Guard

Workflow nodes run the guard against the current managed worktree:

```bash
/home/devuser/claudeclaw/scripts/archon-workspace-guard.sh "$(pwd -P)"
```

For final validation before deploy, require a clean workspace:

```bash
ARCHON_REQUIRE_CLEAN=1 /home/devuser/claudeclaw/scripts/archon-workspace-guard.sh "$(pwd -P)"
```

## Manual Worktree Fallback

If Archon-managed isolation is unavailable, create a disposable manual worktree and use the same guard:

```bash
RUN_ID="$(date +%Y%m%d%H%M%S)-example"
mkdir -p /home/devuser/claudeclaw-worktrees
cd /home/devuser/claudeclaw
git fetch origin
git worktree add -b "archon/${RUN_ID}" "/home/devuser/claudeclaw-worktrees/${RUN_ID}" origin/main
/home/devuser/claudeclaw/scripts/archon-workspace-guard.sh "/home/devuser/claudeclaw-worktrees/${RUN_ID}"
```

Workflow output should name the branch, commit, validation commands, and any approval needed before production deploy.

## Forbidden Production State

- `.env`
- `.env.*`
- `store/*.db`
- `store/*.db-wal`
- `store/*.db-shm`
- `*.sqlite`
- `*.sqlite3`
- `OAuth tokens`
- `agents/*/CLAUDE.md`
- `agents/*/agent.yaml`

Use committed example files and templates only. For example, `.env.example` is allowed, but copied or generated environment files such as `.env`, `.env.local`, and `.env.test-forbidden` are not. Do not copy production credentials, local SQLite state, OAuth browser state, or live agent overlays into disposable Archon worktrees.

## Validate Before Deploy

Run validation in the isolated worktree before selecting a branch or commit for production:

```bash
/home/devuser/claudeclaw/scripts/archon-workspace-guard.sh "$(pwd -P)"
npm run typecheck
npm test
```

Review the diff and commit history before merging or selecting a known-good commit.

## Commit-Based Deploy

Deploy from git only. Do not copy loose files from a worktree into production.

```bash
cd /home/devuser/claudeclaw
PRE_DEPLOY_COMMIT="$(git rev-parse HEAD)"
git fetch origin
git pull --ff-only origin main
npm ci
npm run typecheck
npm test
npm run build
systemctl --user restart 'claudeclaw-*'
```

If production should deploy an explicit known-good commit instead of `origin/main`, fetch it, inspect it, and check it out by commit before running the same install, validation, build, and restart steps.

## Rollback

Use the recorded pre-deploy commit as the rollback target:

```bash
cd /home/devuser/claudeclaw
ROLLBACK_COMMIT="${PRE_DEPLOY_COMMIT}"
git checkout --detach "${ROLLBACK_COMMIT}"
npm ci
npm run typecheck
npm run build
systemctl --user restart 'claudeclaw-*'
```

After rollback, verify affected agents with `systemctl --user status 'claudeclaw-*'` and inspect recent logs with `journalctl --user -u 'claudeclaw-*' -n 100 --no-pager`.

## Cleanup

Inspect stale isolated worktrees before removing them:

```bash
cd /home/devuser/claudeclaw
scripts/archon-runs.sh list
scripts/archon-runs.sh stale --older-than-hours 24
scripts/archon-runs.sh cleanup --older-than-hours 24
```

Forced cleanup is available only after reviewing the dry-run output:

```bash
scripts/archon-runs.sh cleanup --older-than-hours 24 --force
```

If cleanup refuses because files are dirty, inspect the diff in the isolated worktree. Commit or intentionally discard only the worktree-specific changes before retrying.

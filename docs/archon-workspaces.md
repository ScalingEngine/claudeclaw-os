# Archon Safe Workspaces

## Scope

This runbook defines the safe workspace boundary for Archon coding workflows that touch ClaudeClaw. Workflow discovery may inspect production, but coding work must happen in a disposable git worktree under the allowed root and must pass the workspace guard before Archon runs.

## Allowed Paths

- Production checkout: `/home/devuser/claudeclaw`
- Allowed worktree root: `/home/devuser/claudeclaw-worktrees`
- Archon source checkout: `/home/devuser/remote-coding-agent`

Do not use `/home/devuser/claudeclaw` as the `--cwd` for coding workflows.

## Create a Disposable Worktree

```bash
RUN_ID="$(date +%Y%m%d%H%M%S)-example"
mkdir -p /home/devuser/claudeclaw-worktrees
cd /home/devuser/claudeclaw
git fetch origin
git worktree add -b "archon/${RUN_ID}" "/home/devuser/claudeclaw-worktrees/${RUN_ID}" origin/main
```

The worktree branch is the reviewable deployment artifact. Keep all generated code, tests, and docs inside the worktree until the branch or commit is validated.

## Run the Workspace Guard

Run the guard before any Archon coding workflow:

```bash
/home/devuser/claudeclaw/scripts/archon-workspace-guard.sh "/home/devuser/claudeclaw-worktrees/${RUN_ID}"
```

For final validation before deploy, require a clean workspace:

```bash
ARCHON_REQUIRE_CLEAN=1 /home/devuser/claudeclaw/scripts/archon-workspace-guard.sh "/home/devuser/claudeclaw-worktrees/${RUN_ID}"
```

## Run Archon Against the Worktree

Use the disposable worktree as `--cwd`, not the production checkout:

```bash
ARCHON_PROJECT_CWD="/home/devuser/claudeclaw-worktrees/${RUN_ID}"
/home/devuser/claudeclaw/scripts/archon-vps.sh workflow run coding-plan-to-pr --cwd "/home/devuser/claudeclaw-worktrees/${RUN_ID}"
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

Run validation in the disposable worktree before selecting a branch or commit for production:

```bash
cd "/home/devuser/claudeclaw-worktrees/${RUN_ID}"
/home/devuser/claudeclaw/scripts/archon-workspace-guard.sh "/home/devuser/claudeclaw-worktrees/${RUN_ID}"
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

Remove the disposable worktree after the branch or commit is merged, abandoned, or otherwise captured:

```bash
cd /home/devuser/claudeclaw
git worktree remove "/home/devuser/claudeclaw-worktrees/${RUN_ID}"
git branch -D "archon/${RUN_ID}"
```

If cleanup fails because files are dirty, inspect the diff in the disposable worktree. Commit or intentionally discard only the worktree-specific changes before retrying.

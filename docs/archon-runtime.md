# Archon Runtime Surface

## Scope

This runbook covers the Phase 1 Archon runtime surface for ClaudeClaw on the VPS. It verifies that the production checkout can invoke Archon from non-interactive agent environments, list workflows for `/home/devuser/claudeclaw`, load Archon credentials from the user-scoped env file, and detect legacy workflow path warnings.

Phase 1 verifies workflow discovery only; coding workflows must wait for the safe workspace boundary in Phase 2.

## Coding Workflow Boundary

Workflow discovery may still target /home/devuser/claudeclaw.
Coding workflows must not run against /home/devuser/claudeclaw.
Use docs/archon-workspaces.md to launch coding workflows with `--branch`; Archon creates the managed worktree under `~/.archon/workspaces/devuser/claudeclaw/worktrees/...`. Workflow nodes run `scripts/archon-workspace-guard.sh "$(pwd -P)"` before any implementation.

```bash
/home/devuser/claudeclaw/scripts/archon-workspace-guard.sh "$(pwd -P)"
```

## Files and Paths

- ClaudeClaw production checkout: `/home/devuser/claudeclaw`
- Archon source checkout: `/home/devuser/remote-coding-agent`
- Archon wrapper: `/home/devuser/claudeclaw/scripts/archon-vps.sh`
- Archon status doctor: `/home/devuser/claudeclaw/scripts/archon-status.sh`
- Archon credential file: `~/.archon/.env`
- Current workflow directory: `~/.archon/workflows`
- Legacy workflow directory: `~/.archon/.archon/workflows`

## Install or Update

Deploy the committed ClaudeClaw checkout to the VPS before running these commands. The wrapper defaults to `/home/devuser/remote-coding-agent` for the Archon repository and `/home/devuser/claudeclaw` for workflow discovery.

```bash
cd /home/devuser/claudeclaw
chmod +x scripts/archon-vps.sh scripts/archon-status.sh
```

Verify direct invocation:

```bash
/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw
```

## Credential Loading

`scripts/archon-vps.sh` sources `~/.archon/.env` inside the wrapper process when the file exists. Do not paste, print, or commit credential values. Keep the file readable only by the owner or the service user group when required:

```bash
chmod 600 ~/.archon/.env
```

If `bun` is not available to the systemd user environment, invoke the wrapper with an explicit binary path:

```bash
BUN_BIN=/home/devuser/.bun/bin/bun /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw
```

## Legacy Workflow Path Cleanup

Copy existing home-scoped workflows into the current supported directory before moving the legacy directory aside:

```bash
mkdir -p ~/.archon/workflows
if [ -d ~/.archon/.archon/workflows ]; then
  rsync -a ~/.archon/.archon/workflows/ ~/.archon/workflows/ --dry-run
  rsync -a --ignore-existing ~/.archon/.archon/workflows/ ~/.archon/workflows/
  mv ~/.archon/.archon/workflows ~/.archon/.archon/workflows.migrated-$(date +%Y%m%d%H%M%S)
fi
```

The dry-run line shows what the legacy copy would add before anything changes. The real copy step protects custom workflows before the old path is renamed. `--ignore-existing` prevents stale legacy workflows from overwriting files already in the supported directory; review same-name conflicts separately before replacing anything. After cleanup, workflow discovery should not mention `legacy`, `deprecated`, or `.archon/.archon/workflows`.

## Verification

Run the status doctor:

```bash
/home/devuser/claudeclaw/scripts/archon-status.sh
```

Verify direct workflow discovery:

```bash
/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw
```

Verify the non-interactive user-systemd environment:

```bash
systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw
```

Capture workflow-list output for warning checks:

```bash
ARCHON_WORKFLOW_LIST="$(mktemp "${TMPDIR:-/tmp}/archon-workflow-list.XXXXXX")"
trap 'rm -f "$ARCHON_WORKFLOW_LIST"' EXIT

/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw 2>&1 | tee "$ARCHON_WORKFLOW_LIST"
if grep -Eiq 'legacy|deprecated|\.archon/\.archon/workflows' "$ARCHON_WORKFLOW_LIST"; then
  echo "legacy workflow warning found" >&2
  exit 1
fi
```

The final warning scan should exit 0 only when no legacy/deprecated workflow warning is present.
For ad hoc debugging only, the captured output can be copied to `/tmp/archon-workflow-list.txt` after the warning scan passes; do not write directly to that fixed path from `tee`.

## Rollback

If the workflow move needs to be reverted, restore the timestamped backup into the legacy location:

```bash
LATEST_BACKUP=$(ls -dt ~/.archon/.archon/workflows.migrated-* | head -1)
mv "$LATEST_BACKUP" ~/.archon/.archon/workflows
```

If the wrapper update needs to be rolled back, deploy the previous known-good ClaudeClaw commit and re-run the verification commands above. Do not restore or edit credential files unless the failure is specifically a credential-file permission problem.

## Safety Notes

- Never commit `.env`, `~/.archon/.env`, SQLite databases, OAuth tokens, or live agent configs.
- Do not run coding workflows against `/home/devuser/claudeclaw` during Phase 1.
- Do not use shell tracing around the wrapper or status doctor because the env file is sourced into the process.
- Prefer commit-based deploys over copying loose files into production.

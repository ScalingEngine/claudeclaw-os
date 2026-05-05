# Phase 1: VPS Archon Runtime Surface - Research

**Researched:** 2026-05-05
**Status:** Complete
**Phase goal:** Create a reliable Archon invocation path for systemd-run ClaudeClaw agents; verify workflow discovery against `/home/devuser/claudeclaw`; fix the legacy global workflow path warning; document environment and credential loading.

## Executive Summary

Phase 1 is an operational integration phase. The core risk is not algorithmic complexity; it is making Archon callable from non-interactive VPS agent processes without depending on shell profile state or leaking credentials.

The safest implementation shape is:

- Add a repo-owned Archon wrapper script that can be copied or symlinked into the VPS production checkout and called by systemd-run agents.
- Make that wrapper use explicit absolute paths and source `~/.archon/.env` in-process without printing secret values.
- Add a local status/doctor command that checks wrapper existence, workflow discovery, legacy workflow path state, and credential-file permissions.
- Document the VPS install, verification, and rollback commands.
- Defer safe worktrees, routing policy, workflow pack, and observability to later phases as already mapped in ROADMAP.md.

## Source Facts

From `.planning/ROADMAP.md`:

- Archon source checkout exists on the VPS at `/home/devuser/remote-coding-agent`.
- `bun run cli workflow list --cwd /home/devuser/claudeclaw` works and discovers 20 bundled workflows.
- `archon` is not currently on the non-interactive PATH used by SSH/systemd.
- `~/.archon/.archon/workflows/` still exists and triggers Archon's legacy-path warning.
- ClaudeClaw production checkout is `/home/devuser/claudeclaw`.
- Six `claudeclaw-*` systemd services are active.

From `.planning/REQUIREMENTS.md`:

- ARCH-01 requires each ClaudeClaw agent to invoke Archon without relying on an interactive shell profile.
- ARCH-02 requires workflow listing against `/home/devuser/claudeclaw`.
- ARCH-03 requires workflows under `~/.archon/workflows/` with no legacy warning.
- ARCH-04 requires credentials from `~/.archon/.env` without exposing secrets in prompts, logs, or git.

From current codebase:

- `src/agent.ts` already strips secret-shaped env vars before spawning Claude Code via `getScrubbedSdkEnv`.
- `src/env.ts` parses `.env` files without mutating `process.env`.
- `scripts/status.ts` is the existing user-facing environment health command.
- `scripts/agent-service.sh` is an existing cross-platform service installer pattern, but it writes service files with shell redirection and is not the right vehicle for runtime Archon calls.
- `scripts/pre-commit-check.sh` blocks `.env`, `store/`, DB files, and personal agent configs from being committed.
- `PROJECT.md` marks direct `src/` edits as out of scope for customization unless needed; this phase can avoid core engine edits.

## Recommended Architecture

### 1. Repo-owned Archon wrapper

Create `scripts/archon-vps.sh` with these behaviors:

- Resolve `ARCHON_REPO` from env or default to `/home/devuser/remote-coding-agent`.
- Resolve `ARCHON_PROJECT_CWD` from env or default to `/home/devuser/claudeclaw`.
- Resolve `ARCHON_ENV_FILE` from env or default to `$HOME/.archon/.env`.
- Source `ARCHON_ENV_FILE` with `set -a` so Archon receives credentials, but never echo values.
- Refuse to run if `ARCHON_REPO` is missing or if `bun` is unavailable.
- Execute `bun run cli "$@"` from the Archon repo.
- Provide a predictable workflow-list call:
  `scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`

This satisfies ARCH-01 by removing dependence on `.bashrc`, `.profile`, or a systemd user PATH.

### 2. Status check

Add an Archon section to `scripts/status.ts` or create a focused `scripts/archon-status.sh`. The less invasive path is `scripts/archon-status.sh` because Phase 1 can remain outside core TypeScript engine code.

The status script should check:

- `$ARCHON_REPO` or `/home/devuser/remote-coding-agent` exists.
- `$ARCHON_REPO/package.json` exists.
- `bun` resolves with `command -v bun`.
- `$HOME/.archon/.env` exists and is not group/world-readable.
- `$HOME/.archon/workflows` exists.
- `$HOME/.archon/.archon/workflows` is absent.
- `scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` exits 0 and output includes at least one workflow line.

### 3. Legacy workflow path remediation

Use an explicit VPS command sequence:

```bash
mkdir -p ~/.archon/workflows
if [ -d ~/.archon/.archon/workflows ]; then
  rsync -a ~/.archon/.archon/workflows/ ~/.archon/workflows/
  mv ~/.archon/.archon/workflows ~/.archon/.archon/workflows.migrated-$(date +%Y%m%d%H%M%S)
fi
```

Verification should run `scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw 2>&1 | tee /tmp/archon-workflow-list.txt` and assert the output does not contain `legacy`, `deprecated`, or `~/.archon/.archon/workflows`.

### 4. Documentation contract

Add `docs/archon-runtime.md` with:

- Wrapper purpose and required paths.
- Install/symlink/copy command for VPS production checkout.
- How credentials load from `~/.archon/.env`.
- Secret handling rule: never paste `.env`, never log exported values, keep `chmod 600`.
- Workflow list verification command.
- Systemd verification using `systemd-run --user --wait --pty` or a non-interactive equivalent.
- Rollback commands to restore the legacy workflow directory backup and remove wrapper symlink.

## Implementation Notes

- Avoid editing `.env`, `~/.archon/.env`, production SQLite DBs, or live systemd units in the repo.
- Do not commit personal `agents/*/CLAUDE.md` or `agents/*/agent.yaml`.
- The wrapper can be committed because it contains no secrets and only default paths.
- The plan should include manual VPS verification because local macOS cannot prove systemd user environment behavior for `/home/devuser`.
- The phase should not introduce workflow routing prompt changes for each persona; those are Phase 3 requirements.

## Validation Architecture

Automated validation should cover file presence and deterministic text patterns:

- `bash -n scripts/archon-vps.sh`
- `bash -n scripts/archon-status.sh`
- `grep -q 'ARCHON_REPO' scripts/archon-vps.sh`
- `grep -q '~/.archon/.env' docs/archon-runtime.md`
- `grep -q 'workflow list --cwd /home/devuser/claudeclaw' docs/archon-runtime.md`
- `grep -q 'chmod 600 ~/.archon/.env' docs/archon-runtime.md`
- `npm run typecheck`

Manual VPS validation should cover:

- `scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` exits 0.
- Output lists workflows and does not include the legacy path warning.
- `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` exits 0.
- `stat -c '%a %n' ~/.archon/.env` returns `600` or stricter.

## Threat Model

- **T-01 Secret leakage:** Wrapper or docs accidentally print `.env` values.
  - Mitigation: Wrapper must never use `set -x`; docs must instruct redaction and `chmod 600`; verification greps for no literal secret values only by path/key names.
- **T-02 Production mutation:** Agents use Archon directly against the production checkout for coding work.
  - Mitigation: Phase 1 docs must describe workflow discovery only and explicitly defer coding workspace isolation to Phase 2.
- **T-03 PATH drift:** Interactive shell works but systemd-run agents fail.
  - Mitigation: Wrapper uses absolute repo path and invokes `bun run cli` from `ARCHON_REPO`; manual verification uses systemd-run.
- **T-04 Legacy path data loss:** Moving `~/.archon/.archon/workflows` drops custom workflows.
  - Mitigation: Copy before move, timestamp backup, document rollback.

## Open Questions

- Whether `bun` itself is available in systemd's PATH. If not, the wrapper should support `BUN_BIN=/absolute/path/to/bun`.
- Whether the production checkout should install the wrapper via commit pull or local symlink from the repo. The plan should document both, with commit-based deploy preferred.

## RESEARCH COMPLETE

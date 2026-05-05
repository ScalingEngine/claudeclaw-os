# Phase 1: VPS Archon Runtime Surface - Pattern Map

**Mapped:** 2026-05-05
**Status:** Complete

## Files To Create Or Modify

| File | Role | Closest Existing Analog | Notes |
|------|------|-------------------------|-------|
| `scripts/archon-vps.sh` | VPS-safe command wrapper | `scripts/agent-service.sh`, `scripts/pre-commit-check.sh` | Use strict bash, explicit paths, no secret echoing |
| `scripts/archon-status.sh` | Focused health/doctor script | `scripts/status.ts`, `scripts/pre-commit-check.sh` | Keep checks readable and shell-native for VPS use |
| `docs/archon-runtime.md` | Operator runbook | `docs/incident-runbook.md`, README service sections | Include install, verify, rollback, and credential handling |
| `.planning/phases/01-vps-archon-runtime-surface/01-PLAN.md` | Execution contract | GSD plan contract | Must cover ARCH-01 through ARCH-04 |

## Local Patterns

### Shell scripts

`scripts/pre-commit-check.sh` uses:

```bash
#!/usr/bin/env bash
set -e
```

It also uses clear failure messages and exits non-zero when checks fail. New shell scripts should follow that style, with `set -euo pipefail` where practical.

`scripts/agent-service.sh` uses:

```bash
cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)
NODE_PATH=$(which node)
```

For the Archon wrapper, use the same "resolve from script directory" pattern for repo-relative safety, but use configurable absolute VPS defaults for Archon.

### Secret handling

`src/agent.ts` reads only selected credentials and passes a scrubbed SDK environment:

```ts
const secrets = readEnvFile(['CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_API_KEY']);
const sdkEnv = getScrubbedSdkEnv(secrets);
```

The Archon wrapper should mirror the same principle operationally: load required credentials into the subprocess environment but never print them or persist them.

### Environment parsing

`src/env.ts` is a minimal parser and intentionally does not mutate `process.env`. For the shell wrapper, equivalent behavior is sourcing `~/.archon/.env` only inside the wrapper process before `exec`.

### Public repo safety

`scripts/pre-commit-check.sh` blocks:

```bash
SENSITIVE=$(git diff --cached --name-only | grep -E "\.env$|^store/|\.db$|\.db-wal$|\.db-shm$|\.pid$" || true)
```

The plan should explicitly avoid committing credential files, DBs, live agent configs, or VPS-local runtime outputs.

## Data Flow

```text
ClaudeClaw agent turn
  -> shell command / skill invokes scripts/archon-vps.sh
  -> wrapper sources ~/.archon/.env without printing values
  -> wrapper cd's into /home/devuser/remote-coding-agent
  -> bun run cli workflow list --cwd /home/devuser/claudeclaw
  -> output returns workflow names/status only
```

## Verification Anchors

- Wrapper syntax: `bash -n scripts/archon-vps.sh`
- Status syntax: `bash -n scripts/archon-status.sh`
- TypeScript unchanged/healthy: `npm run typecheck`
- VPS command: `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`
- VPS systemd command: `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`

## PATTERN MAPPING COMPLETE

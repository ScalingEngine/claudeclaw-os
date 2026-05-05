---
phase: 1
phase_name: VPS Archon runtime surface
plan: 01
title: Reliable VPS Archon command surface
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/archon-vps.sh
  - scripts/archon-status.sh
  - docs/archon-runtime.md
autonomous: false
requirements:
  - ARCH-01
  - ARCH-02
  - ARCH-03
  - ARCH-04
requirements_addressed:
  - ARCH-01
  - ARCH-02
  - ARCH-03
  - ARCH-04
---

<objective>
Make Archon callable from ClaudeClaw's non-interactive VPS agent environment by adding a safe wrapper, a focused status check, and an operator runbook that verifies workflow discovery, credential loading, and legacy workflow path cleanup.
</objective>

<must_haves>
<truths>
- ARCH-01: Each ClaudeClaw agent can invoke Archon from its VPS runtime environment without relying on an interactive shell profile.
- ARCH-02: Agents can list available Archon workflows for `/home/devuser/claudeclaw` and receive a successful result.
- ARCH-03: Archon home-scoped workflows are stored in `~/.archon/workflows/` with no legacy path warning from `~/.archon/.archon/workflows/`.
- ARCH-04: The configured Archon invocation path loads credentials from `~/.archon/.env` without exposing secrets in prompts, logs, or git.
</truths>
</must_haves>

<threat_model>
<threat id="T-01" severity="high">
Secret values from `~/.archon/.env` could be printed by the wrapper, copied into docs, or committed.
Mitigation: the wrapper must not use `set -x`, must only source the env file inside the process, and docs must reference only key paths and permission commands, not values.
</threat>
<threat id="T-02" severity="medium">
Phase 1 could accidentally bless coding workflows directly against `/home/devuser/claudeclaw`, bypassing the safe workspace phase.
Mitigation: docs must limit this phase to runtime discovery/invocation and explicitly state that coding workflow workspace isolation is Phase 2.
</threat>
<threat id="T-03" severity="high">
Archon works in an interactive shell but fails under systemd because PATH, HOME, or cwd differ.
Mitigation: wrapper must use explicit defaults for `/home/devuser/remote-coding-agent` and `/home/devuser/claudeclaw`, support `BUN_BIN`, and be verified with `systemd-run --user`.
</threat>
<threat id="T-04" severity="medium">
Legacy workflow path cleanup could lose custom workflows.
Mitigation: docs must copy into `~/.archon/workflows/`, rename the old path to a timestamped backup, and provide rollback commands.
</threat>
</threat_model>

<tasks>
<task id="1-01-01" type="execute" wave="1">
<title>Add VPS-safe Archon wrapper</title>
<read_first>
- `scripts/agent-service.sh`
- `scripts/pre-commit-check.sh`
- `.planning/phases/01-vps-archon-runtime-surface/01-RESEARCH.md`
</read_first>
<files>
- `scripts/archon-vps.sh`
</files>
<action>
Create `scripts/archon-vps.sh` as an executable bash wrapper with `#!/usr/bin/env bash` and `set -euo pipefail`.

The script must define these defaults exactly:
- `ARCHON_REPO="${ARCHON_REPO:-/home/devuser/remote-coding-agent}"`
- `ARCHON_PROJECT_CWD="${ARCHON_PROJECT_CWD:-/home/devuser/claudeclaw}"`
- `ARCHON_ENV_FILE="${ARCHON_ENV_FILE:-$HOME/.archon/.env}"`
- `BUN_BIN="${BUN_BIN:-bun}"`

The script must:
- Refuse with `ARCHON_REPO not found: ${ARCHON_REPO}` if the repo directory is missing.
- Refuse with `Archon package.json not found: ${ARCHON_REPO}/package.json` if package.json is missing.
- Source `ARCHON_ENV_FILE` when it exists using `set -a` before and `set +a` after sourcing.
- Never echo env values and never enable `set -x`.
- If no arguments are supplied, default to `workflow list --cwd "${ARCHON_PROJECT_CWD}"`.
- Otherwise pass all user arguments through to `bun run cli`.
- Execute from `ARCHON_REPO` using `(cd "$ARCHON_REPO" && "$BUN_BIN" run cli "$@")`.
</action>
<verify>
<automated>
`bash -n scripts/archon-vps.sh`
`grep -q 'ARCHON_REPO="${ARCHON_REPO:-/home/devuser/remote-coding-agent}"' scripts/archon-vps.sh`
`grep -q 'ARCHON_PROJECT_CWD="${ARCHON_PROJECT_CWD:-/home/devuser/claudeclaw}"' scripts/archon-vps.sh`
`grep -q 'ARCHON_ENV_FILE="${ARCHON_ENV_FILE:-$HOME/.archon/.env}"' scripts/archon-vps.sh`
`grep -q 'bun run cli' scripts/archon-vps.sh`
`! grep -q 'set -x' scripts/archon-vps.sh`
</automated>
</verify>
<acceptance_criteria>
- `scripts/archon-vps.sh` starts with `#!/usr/bin/env bash`.
- `scripts/archon-vps.sh` contains `set -euo pipefail`.
- `scripts/archon-vps.sh` contains `ARCHON_REPO="${ARCHON_REPO:-/home/devuser/remote-coding-agent}"`.
- `scripts/archon-vps.sh` contains `ARCHON_PROJECT_CWD="${ARCHON_PROJECT_CWD:-/home/devuser/claudeclaw}"`.
- `scripts/archon-vps.sh` contains `ARCHON_ENV_FILE="${ARCHON_ENV_FILE:-$HOME/.archon/.env}"`.
- `scripts/archon-vps.sh` contains `(cd "$ARCHON_REPO" && "$BUN_BIN" run cli "$@")`.
- `bash -n scripts/archon-vps.sh` exits 0.
</acceptance_criteria>
</task>

<task id="1-01-02" type="execute" wave="1">
<title>Add Archon runtime status check</title>
<read_first>
- `scripts/status.ts`
- `scripts/pre-commit-check.sh`
- `scripts/archon-vps.sh`
- `.planning/phases/01-vps-archon-runtime-surface/01-VALIDATION.md`
</read_first>
<files>
- `scripts/archon-status.sh`
</files>
<action>
Create `scripts/archon-status.sh` as an executable bash doctor for the VPS Archon surface.

The script must use the same defaults as `scripts/archon-vps.sh`:
- `ARCHON_REPO="${ARCHON_REPO:-/home/devuser/remote-coding-agent}"`
- `ARCHON_PROJECT_CWD="${ARCHON_PROJECT_CWD:-/home/devuser/claudeclaw}"`
- `ARCHON_ENV_FILE="${ARCHON_ENV_FILE:-$HOME/.archon/.env}"`
- `ARCHON_WORKFLOWS_DIR="${ARCHON_WORKFLOWS_DIR:-$HOME/.archon/workflows}"`
- `ARCHON_LEGACY_WORKFLOWS_DIR="${ARCHON_LEGACY_WORKFLOWS_DIR:-$HOME/.archon/.archon/workflows}"`

It must print one line per check using these exact labels:
- `Archon repo`
- `Archon package`
- `bun`
- `Archon env file`
- `Archon env permissions`
- `Archon workflows dir`
- `Legacy workflows dir`
- `Workflow list`

It must run `scripts/archon-vps.sh workflow list --cwd "$ARCHON_PROJECT_CWD"` and fail if that command exits non-zero. It must fail if the workflow-list output contains `.archon/.archon/workflows`, `legacy`, or `deprecated`. It must fail if `ARCHON_ENV_FILE` exists and has mode broader than `600`, `400`, or `440`.
</action>
<verify>
<automated>
`bash -n scripts/archon-status.sh`
`grep -q 'Legacy workflows dir' scripts/archon-status.sh`
`grep -q 'workflow list --cwd "$ARCHON_PROJECT_CWD"' scripts/archon-status.sh`
`grep -q '.archon/.archon/workflows' scripts/archon-status.sh`
</automated>
</verify>
<acceptance_criteria>
- `scripts/archon-status.sh` starts with `#!/usr/bin/env bash`.
- `scripts/archon-status.sh` contains `Archon repo`.
- `scripts/archon-status.sh` contains `Archon env permissions`.
- `scripts/archon-status.sh` contains `Legacy workflows dir`.
- `scripts/archon-status.sh` contains `workflow list --cwd "$ARCHON_PROJECT_CWD"`.
- `scripts/archon-status.sh` contains `.archon/.archon/workflows`.
- `bash -n scripts/archon-status.sh` exits 0.
</acceptance_criteria>
</task>

<task id="1-01-03" type="execute" wave="2">
<title>Document install, verification, cleanup, and rollback</title>
<read_first>
- `docs/incident-runbook.md`
- `README.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `scripts/archon-vps.sh`
- `scripts/archon-status.sh`
</read_first>
<files>
- `docs/archon-runtime.md`
</files>
<action>
Create `docs/archon-runtime.md` with these sections:
- `# Archon Runtime Surface`
- `## Scope`
- `## Files and Paths`
- `## Install or Update`
- `## Credential Loading`
- `## Legacy Workflow Path Cleanup`
- `## Verification`
- `## Rollback`
- `## Safety Notes`

The document must include these exact commands:
- `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`
- `/home/devuser/claudeclaw/scripts/archon-status.sh`
- `chmod 600 ~/.archon/.env`
- `mkdir -p ~/.archon/workflows`
- `rsync -a ~/.archon/.archon/workflows/ ~/.archon/workflows/`
- `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`

The document must state exactly: `Phase 1 verifies workflow discovery only; coding workflows must wait for the safe workspace boundary in Phase 2.`
</action>
<verify>
<automated>
`grep -q '# Archon Runtime Surface' docs/archon-runtime.md`
`grep -q '/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw' docs/archon-runtime.md`
`grep -q 'chmod 600 ~/.archon/.env' docs/archon-runtime.md`
`grep -q 'Phase 1 verifies workflow discovery only; coding workflows must wait for the safe workspace boundary in Phase 2.' docs/archon-runtime.md`
</automated>
</verify>
<acceptance_criteria>
- `docs/archon-runtime.md` contains `# Archon Runtime Surface`.
- `docs/archon-runtime.md` contains `## Credential Loading`.
- `docs/archon-runtime.md` contains `## Legacy Workflow Path Cleanup`.
- `docs/archon-runtime.md` contains `## Rollback`.
- `docs/archon-runtime.md` contains `chmod 600 ~/.archon/.env`.
- `docs/archon-runtime.md` contains `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`.
</acceptance_criteria>
</task>

<task id="1-01-04" type="execute" wave="2">
<title>Run local and VPS verification</title>
<read_first>
- `scripts/archon-vps.sh`
- `scripts/archon-status.sh`
- `docs/archon-runtime.md`
- `package.json`
- `.planning/phases/01-vps-archon-runtime-surface/01-VALIDATION.md`
</read_first>
<files>
- `scripts/archon-vps.sh`
- `scripts/archon-status.sh`
- `docs/archon-runtime.md`
</files>
<action>
Run local verification:
- `bash -n scripts/archon-vps.sh`
- `bash -n scripts/archon-status.sh`
- `npm run typecheck`

Run VPS verification from `/home/devuser/claudeclaw`:
- `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`
- `/home/devuser/claudeclaw/scripts/archon-status.sh`
- `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`
- `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw 2>&1 | tee /tmp/archon-workflow-list.txt`
- `! grep -Ei 'legacy|deprecated|\\.archon/\\.archon/workflows' /tmp/archon-workflow-list.txt`
- `stat -c '%a %n' ~/.archon/.env`

Record any VPS-only failures in the execution summary rather than editing secrets or production state blindly.
</action>
<verify>
<automated>
`bash -n scripts/archon-vps.sh && bash -n scripts/archon-status.sh && npm run typecheck`
</automated>
<manual>
VPS verification commands listed above all exit 0, and `stat -c '%a %n' ~/.archon/.env` reports `600`, `400`, or `440`.
</manual>
</verify>
<acceptance_criteria>
- `bash -n scripts/archon-vps.sh` exits 0.
- `bash -n scripts/archon-status.sh` exits 0.
- `npm run typecheck` exits 0.
- VPS workflow list exits 0 from a normal shell.
- VPS workflow list exits 0 through `systemd-run --user --wait --collect`.
- `/tmp/archon-workflow-list.txt` does not contain `legacy`, `deprecated`, or `.archon/.archon/workflows`.
- `~/.archon/.env` mode is `600`, `400`, or `440`.
</acceptance_criteria>
</task>
</tasks>

<verification>
<automated>
- `bash -n scripts/archon-vps.sh`
- `bash -n scripts/archon-status.sh`
- `npm run typecheck`
- `grep -q 'ARCH-01' .planning/phases/01-vps-archon-runtime-surface/01-PLAN.md`
- `grep -q 'ARCH-02' .planning/phases/01-vps-archon-runtime-surface/01-PLAN.md`
- `grep -q 'ARCH-03' .planning/phases/01-vps-archon-runtime-surface/01-PLAN.md`
- `grep -q 'ARCH-04' .planning/phases/01-vps-archon-runtime-surface/01-PLAN.md`
</automated>
<manual>
- On VPS, run `/home/devuser/claudeclaw/scripts/archon-status.sh`.
- On VPS, run `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`.
- Confirm no output includes `legacy`, `deprecated`, or `.archon/.archon/workflows`.
</manual>
</verification>

<success_criteria>
- ARCH-01 is satisfied when `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` exits 0.
- ARCH-02 is satisfied when `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` exits 0 and prints available workflows.
- ARCH-03 is satisfied when `~/.archon/workflows/` exists, `~/.archon/.archon/workflows/` is absent or timestamp-renamed, and workflow-list output contains no legacy path warning.
- ARCH-04 is satisfied when `~/.archon/.env` is loaded by the wrapper, has mode `600`, `400`, or `440`, and no docs/scripts/logs contain credential values.
</success_criteria>

## PLANNING COMPLETE

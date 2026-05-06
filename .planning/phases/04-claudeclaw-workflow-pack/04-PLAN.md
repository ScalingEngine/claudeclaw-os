---
phase: 4
phase_name: ClaudeClaw workflow pack
plan: 01
title: Starter Archon workflow pack, installer, and validation
type: execute
wave: 1
depends_on:
  - 01-vps-archon-runtime-surface
  - 02-safe-workspace-and-deploy-boundary
  - 03-agent-workflow-routing-policy
files_modified:
  - archon/workflows/claudeclaw-coding-plan-to-pr.yaml
  - archon/workflows/claudeclaw-bugfix.yaml
  - archon/workflows/claudeclaw-strategy-ingest.yaml
  - archon/workflows/claudeclaw-ops-triage.yaml
  - archon/workflows/claudeclaw-comms-content-draft.yaml
  - archon/workflows/claudeclaw-workflow-authoring.yaml
  - docs/claudeclaw-workflow-pack.md
  - scripts/install-archon-workflows.sh
  - scripts/check-archon-workflow-pack.sh
  - package.json
autonomous: true
requirements:
  - FLOW-01
  - FLOW-02
  - FLOW-03
  - FLOW-04
  - FLOW-05
  - FLOW-06
requirements_addressed:
  - FLOW-01
  - FLOW-02
  - FLOW-03
  - FLOW-04
  - FLOW-05
  - FLOW-06
user_setup:
  - After these committed workflow pack sources ship to the VPS, run `scripts/install-archon-workflows.sh --dry-run`, then `scripts/install-archon-workflows.sh`, then `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`.
  - Run `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` to confirm non-interactive discovery sees all six `claudeclaw-*` workflows.
must_haves:
  truths:
    - "FLOW-01: A ClaudeClaw coding workflow exists for plan-to-PR work with test/typecheck/build validation."
    - "FLOW-02: A ClaudeClaw bugfix workflow exists for diagnosis, focused fix, regression check, and PR/report output."
    - "FLOW-03: A strategy/business ingestion workflow exists for turning meeting notes, docs, and direction changes into canonical planning updates."
    - "FLOW-04: An ops triage workflow exists for VPS/service health checks, log review, and safe remediation recommendations."
    - "FLOW-05: A comms/content workflow pattern exists for Poe and Cole that produces drafts/artifacts but does not send or publish without approval."
    - "FLOW-06: A workflow-authoring path exists so agents can create, validate, and document new Archon workflows."
  artifacts:
    - "archon/workflows/claudeclaw-coding-plan-to-pr.yaml"
    - "archon/workflows/claudeclaw-bugfix.yaml"
    - "archon/workflows/claudeclaw-strategy-ingest.yaml"
    - "archon/workflows/claudeclaw-ops-triage.yaml"
    - "archon/workflows/claudeclaw-comms-content-draft.yaml"
    - "archon/workflows/claudeclaw-workflow-authoring.yaml"
    - "docs/claudeclaw-workflow-pack.md"
    - "scripts/install-archon-workflows.sh"
    - "scripts/check-archon-workflow-pack.sh"
  key_links:
    - "Coding and bugfix workflows reference `/home/devuser/claudeclaw-worktrees/<run-id>` and `scripts/archon-workspace-guard.sh`."
    - "`npm run check:archon-workflow-pack` verifies workflow files, requirement IDs, safety gates, installer behavior, and documentation."
---

<objective>
Create the Phase 4 ClaudeClaw starter Archon workflow pack as committed source files, plus installer, validator, package script, and operator documentation.

The pack must cover coding plan-to-PR, bugfix, strategy/business ingestion, ops triage, comms/content drafting, and workflow authoring. It must preserve Phase 1 runtime assumptions, Phase 2 safe workspace boundaries, and Phase 3 routing and approval policy.
</objective>

<execution_context>
@$HOME/.codex/get-shit-done/workflows/execute-plan.md
@$HOME/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-vps-archon-runtime-surface/01-SUMMARY.md
@.planning/phases/02-safe-workspace-and-deploy-boundary/02-SUMMARY.md
@.planning/phases/03-agent-workflow-routing-policy/03-SUMMARY.md
@.planning/phases/04-claudeclaw-workflow-pack/04-RESEARCH.md
@.planning/phases/04-claudeclaw-workflow-pack/04-PATTERNS.md
@.planning/phases/04-claudeclaw-workflow-pack/04-VALIDATION.md
@docs/archon-runtime.md
@docs/archon-workspaces.md
@docs/agent-workflow-routing.md
@docs/incident-runbook.md
@scripts/archon-vps.sh
@scripts/archon-status.sh
@scripts/archon-workspace-guard.sh
@scripts/check-agent-workflow-routing.sh
@package.json
</context>

<must_haves>
<truths>
- FLOW-01: A ClaudeClaw coding workflow exists for plan-to-PR work with test/typecheck/build validation.
- FLOW-02: A ClaudeClaw bugfix workflow exists for diagnosis, focused fix, regression check, and PR/report output.
- FLOW-03: A strategy/business ingestion workflow exists for turning meeting notes, docs, and direction changes into canonical planning updates.
- FLOW-04: An ops triage workflow exists for VPS/service health checks, log review, and safe remediation recommendations.
- FLOW-05: A comms/content workflow pattern exists for Poe and Cole that produces drafts/artifacts but does not send or publish without approval.
- FLOW-06: A workflow-authoring path exists so agents can create, validate, and document new Archon workflows.
</truths>
<artifacts>
- `archon/workflows/claudeclaw-coding-plan-to-pr.yaml`
- `archon/workflows/claudeclaw-bugfix.yaml`
- `archon/workflows/claudeclaw-strategy-ingest.yaml`
- `archon/workflows/claudeclaw-ops-triage.yaml`
- `archon/workflows/claudeclaw-comms-content-draft.yaml`
- `archon/workflows/claudeclaw-workflow-authoring.yaml`
- `docs/claudeclaw-workflow-pack.md`
- `scripts/install-archon-workflows.sh`
- `scripts/check-archon-workflow-pack.sh`
- `package.json`
</artifacts>
<key_links>
- Workflow pack docs include the exact install command `scripts/install-archon-workflows.sh`.
- Workflow pack docs include the exact discovery command `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`.
- Coding workflows link to `docs/archon-workspaces.md` and call `scripts/archon-workspace-guard.sh`.
</key_links>
</must_haves>

<threat_model>
<threat id="T-01" severity="high">
Invalid or undiscoverable workflows: committed workflow files could exist but not install to the supported Archon workflow path or appear in `workflow list`.
Mitigation: add `scripts/install-archon-workflows.sh`, `scripts/check-archon-workflow-pack.sh`, `npm run check:archon-workflow-pack`, and operator docs requiring `archon-vps.sh workflow list` after install.
</threat>
<threat id="T-02" severity="high">
Unsafe coding workspace: coding or bugfix workflows could run against `/home/devuser/claudeclaw` and mutate production checkout state.
Mitigation: coding and bugfix workflows must reference `/home/devuser/claudeclaw-worktrees/<run-id>`, `docs/archon-workspaces.md`, and `scripts/archon-workspace-guard.sh`; the validator must grep for these strings.
</threat>
<threat id="T-03" severity="high">
External-effect drift: ops or comms/content workflows could restart services, deploy, send, post, publish, or mutate production data without approval.
Mitigation: ops and comms/content workflow files and docs must include `Noah approval` and explicit stop-before-effect language; validator must grep for approval language.
</threat>
<threat id="T-04" severity="medium">
Requirements drift: one of `FLOW-01` through `FLOW-06` could be unrepresented or undocumented.
Mitigation: every workflow file must contain its requirement ID, docs must list all six workflows, and the validator must fail if any ID or workflow file is missing.
</threat>
<threat id="T-05" severity="medium">
Secret or live-state leakage: installer or docs could encourage copying `~/.archon/.env`, `.env`, SQLite DBs, OAuth tokens, or live agent configs.
Mitigation: installer copies only files from `archon/workflows/*.yaml`; docs include forbidden state; scripts do not print credential contents.
</threat>
</threat_model>

<tasks>
<task id="4-01-01" type="execute" wave="1">
<title>Create committed ClaudeClaw workflow pack sources</title>
<read_first>
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/phases/04-claudeclaw-workflow-pack/04-RESEARCH.md`
- `.planning/phases/04-claudeclaw-workflow-pack/04-PATTERNS.md`
- `docs/archon-workspaces.md`
- `docs/agent-workflow-routing.md`
- `docs/incident-runbook.md`
</read_first>
<files>
- `archon/workflows/claudeclaw-coding-plan-to-pr.yaml`
- `archon/workflows/claudeclaw-bugfix.yaml`
- `archon/workflows/claudeclaw-strategy-ingest.yaml`
- `archon/workflows/claudeclaw-ops-triage.yaml`
- `archon/workflows/claudeclaw-comms-content-draft.yaml`
- `archon/workflows/claudeclaw-workflow-authoring.yaml`
</files>
<action>
Create directory `archon/workflows/`.

Create six workflow source files with these exact filenames:
- `archon/workflows/claudeclaw-coding-plan-to-pr.yaml`
- `archon/workflows/claudeclaw-bugfix.yaml`
- `archon/workflows/claudeclaw-strategy-ingest.yaml`
- `archon/workflows/claudeclaw-ops-triage.yaml`
- `archon/workflows/claudeclaw-comms-content-draft.yaml`
- `archon/workflows/claudeclaw-workflow-authoring.yaml`

Each file must contain these exact strings:
- `claudeclaw-`
- its matching requirement ID: `FLOW-01`, `FLOW-02`, `FLOW-03`, `FLOW-04`, `FLOW-05`, or `FLOW-06`
- `docs/agent-workflow-routing.md`

`claudeclaw-coding-plan-to-pr.yaml` must contain these exact strings:
- `FLOW-01`
- `plan-to-PR`
- `docs/archon-workspaces.md`
- `/home/devuser/claudeclaw-worktrees/<run-id>`
- `scripts/archon-workspace-guard.sh`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `PR/report output`

`claudeclaw-bugfix.yaml` must contain these exact strings:
- `FLOW-02`
- `diagnosis`
- `focused fix`
- `regression check`
- `PR/report output`
- `docs/archon-workspaces.md`
- `/home/devuser/claudeclaw-worktrees/<run-id>`
- `scripts/archon-workspace-guard.sh`
- `npm run typecheck`

`claudeclaw-strategy-ingest.yaml` must contain these exact strings:
- `FLOW-03`
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `canonical planning updates`
- `review gate`

`claudeclaw-ops-triage.yaml` must contain these exact strings:
- `FLOW-04`
- `VPS/service health checks`
- `log review`
- `safe remediation recommendations`
- `docs/incident-runbook.md`
- `Noah approval`
- `systemctl --user`
- `journalctl --user`

`claudeclaw-comms-content-draft.yaml` must contain these exact strings:
- `FLOW-05`
- `Poe`
- `Cole`
- `Vera`
- `drafts/artifacts`
- `Noah approval`
- `does not send or publish without approval`

`claudeclaw-workflow-authoring.yaml` must contain these exact strings:
- `FLOW-06`
- `create, validate, and document new Archon workflows`
- `archon/workflows/`
- `docs/claudeclaw-workflow-pack.md`
- `scripts/check-archon-workflow-pack.sh`
- `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`

Use the workflow schema already accepted by the local or VPS Archon runtime if it is discoverable during execution. If no schema source is available locally, preserve the stable source files above as human-readable Archon workflow definitions and rely on the VPS install/list validation in Task 4-01-03 to catch schema mismatches.
</action>
<verify>
<automated>
`test -f archon/workflows/claudeclaw-coding-plan-to-pr.yaml`
`test -f archon/workflows/claudeclaw-bugfix.yaml`
`test -f archon/workflows/claudeclaw-strategy-ingest.yaml`
`test -f archon/workflows/claudeclaw-ops-triage.yaml`
`test -f archon/workflows/claudeclaw-comms-content-draft.yaml`
`test -f archon/workflows/claudeclaw-workflow-authoring.yaml`
`grep -q 'FLOW-01' archon/workflows/claudeclaw-coding-plan-to-pr.yaml`
`grep -q 'FLOW-02' archon/workflows/claudeclaw-bugfix.yaml`
`grep -q 'FLOW-03' archon/workflows/claudeclaw-strategy-ingest.yaml`
`grep -q 'FLOW-04' archon/workflows/claudeclaw-ops-triage.yaml`
`grep -q 'FLOW-05' archon/workflows/claudeclaw-comms-content-draft.yaml`
`grep -q 'FLOW-06' archon/workflows/claudeclaw-workflow-authoring.yaml`
`grep -q 'scripts/archon-workspace-guard.sh' archon/workflows/claudeclaw-coding-plan-to-pr.yaml`
`grep -q 'scripts/archon-workspace-guard.sh' archon/workflows/claudeclaw-bugfix.yaml`
`grep -q 'Noah approval' archon/workflows/claudeclaw-ops-triage.yaml`
`grep -q 'Noah approval' archon/workflows/claudeclaw-comms-content-draft.yaml`
</automated>
</verify>
<acceptance_criteria>
- `archon/workflows/claudeclaw-coding-plan-to-pr.yaml` exists and contains `FLOW-01`, `plan-to-PR`, `npm run typecheck`, `npm test`, and `npm run build`.
- `archon/workflows/claudeclaw-bugfix.yaml` exists and contains `FLOW-02`, `diagnosis`, `focused fix`, and `regression check`.
- `archon/workflows/claudeclaw-strategy-ingest.yaml` exists and contains `FLOW-03`, `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, and `review gate`.
- `archon/workflows/claudeclaw-ops-triage.yaml` exists and contains `FLOW-04`, `VPS/service health checks`, `journalctl --user`, and `Noah approval`.
- `archon/workflows/claudeclaw-comms-content-draft.yaml` exists and contains `FLOW-05`, `Poe`, `Cole`, `Vera`, and `does not send or publish without approval`.
- `archon/workflows/claudeclaw-workflow-authoring.yaml` exists and contains `FLOW-06`, `archon/workflows/`, and `scripts/check-archon-workflow-pack.sh`.
</acceptance_criteria>
</task>

<task id="4-01-02" type="execute" wave="1">
<title>Add workflow pack installer and operator documentation</title>
<read_first>
- `scripts/archon-vps.sh`
- `scripts/archon-status.sh`
- `scripts/archon-workspace-guard.sh`
- `docs/archon-runtime.md`
- `docs/archon-workspaces.md`
- `docs/agent-workflow-routing.md`
- `archon/workflows/claudeclaw-coding-plan-to-pr.yaml`
- `archon/workflows/claudeclaw-bugfix.yaml`
- `archon/workflows/claudeclaw-strategy-ingest.yaml`
- `archon/workflows/claudeclaw-ops-triage.yaml`
- `archon/workflows/claudeclaw-comms-content-draft.yaml`
- `archon/workflows/claudeclaw-workflow-authoring.yaml`
</read_first>
<files>
- `scripts/install-archon-workflows.sh`
- `docs/claudeclaw-workflow-pack.md`
</files>
<action>
Create `scripts/install-archon-workflows.sh` with:
- shebang `#!/usr/bin/env bash`
- `set -euo pipefail`
- `ROOT="$(git rev-parse --show-toplevel)"`
- `SOURCE_DIR="${ROOT}/archon/workflows"`
- `ARCHON_WORKFLOWS_DIR="${ARCHON_WORKFLOWS_DIR:-$HOME/.archon/workflows}"`
- support for `--dry-run`
- creation of `"$ARCHON_WORKFLOWS_DIR"` when not dry-run
- copy/install of only `"$SOURCE_DIR"/claudeclaw-*.yaml`
- labeled output containing `DRY-RUN` when `--dry-run` is used
- no command that prints `.env`, `~/.archon/.env`, SQLite contents, OAuth tokens, or live agent configs

The installer must fail if `archon/workflows` is missing or no `claudeclaw-*.yaml` files exist.

Create `docs/claudeclaw-workflow-pack.md` with these sections:
- `# ClaudeClaw Workflow Pack`
- `## Scope`
- `## Workflows`
- `## Install`
- `## Verify`
- `## Safety Rules`
- `## Rollback`

The `## Workflows` section must list all six workflow filenames and all six requirement IDs: `FLOW-01`, `FLOW-02`, `FLOW-03`, `FLOW-04`, `FLOW-05`, `FLOW-06`.

The `## Install` section must contain:
- `scripts/install-archon-workflows.sh --dry-run`
- `scripts/install-archon-workflows.sh`
- `~/.archon/workflows`

The `## Verify` section must contain:
- `npm run check:archon-workflow-pack`
- `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`
- `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`

The `## Safety Rules` section must contain:
- `docs/archon-workspaces.md`
- `/home/devuser/claudeclaw-worktrees/<run-id>`
- `scripts/archon-workspace-guard.sh`
- `Noah approval`
- `.env`
- `~/.archon/.env`
- `SQLite databases`
- `OAuth tokens`
- `live agent configs`
- `does not send or publish without approval`
</action>
<verify>
<automated>
`bash -n scripts/install-archon-workflows.sh`
`grep -q 'SOURCE_DIR="${ROOT}/archon/workflows"' scripts/install-archon-workflows.sh`
`grep -q 'ARCHON_WORKFLOWS_DIR="${ARCHON_WORKFLOWS_DIR:-$HOME/.archon/workflows}"' scripts/install-archon-workflows.sh`
`grep -q -- '--dry-run' scripts/install-archon-workflows.sh`
`grep -q '# ClaudeClaw Workflow Pack' docs/claudeclaw-workflow-pack.md`
`grep -q 'FLOW-01' docs/claudeclaw-workflow-pack.md`
`grep -q 'FLOW-06' docs/claudeclaw-workflow-pack.md`
`grep -q 'scripts/install-archon-workflows.sh --dry-run' docs/claudeclaw-workflow-pack.md`
`grep -q '/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw' docs/claudeclaw-workflow-pack.md`
`grep -q 'Noah approval' docs/claudeclaw-workflow-pack.md`
</automated>
</verify>
<acceptance_criteria>
- `scripts/install-archon-workflows.sh` passes `bash -n`.
- `scripts/install-archon-workflows.sh` contains `SOURCE_DIR="${ROOT}/archon/workflows"`.
- `scripts/install-archon-workflows.sh` contains `ARCHON_WORKFLOWS_DIR="${ARCHON_WORKFLOWS_DIR:-$HOME/.archon/workflows}"`.
- `scripts/install-archon-workflows.sh` supports `--dry-run`.
- `docs/claudeclaw-workflow-pack.md` contains `# ClaudeClaw Workflow Pack`.
- `docs/claudeclaw-workflow-pack.md` lists all six `FLOW-01` through `FLOW-06` IDs.
- `docs/claudeclaw-workflow-pack.md` contains `scripts/install-archon-workflows.sh --dry-run`.
- `docs/claudeclaw-workflow-pack.md` contains `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`.
- `docs/claudeclaw-workflow-pack.md` contains `Noah approval`.
</acceptance_criteria>
</task>

<task id="4-01-03" type="execute" wave="1">
<title>Add deterministic workflow pack validator and package script</title>
<read_first>
- `scripts/check-agent-workflow-routing.sh`
- `scripts/archon-status.sh`
- `package.json`
- `archon/workflows/claudeclaw-coding-plan-to-pr.yaml`
- `archon/workflows/claudeclaw-bugfix.yaml`
- `archon/workflows/claudeclaw-strategy-ingest.yaml`
- `archon/workflows/claudeclaw-ops-triage.yaml`
- `archon/workflows/claudeclaw-comms-content-draft.yaml`
- `archon/workflows/claudeclaw-workflow-authoring.yaml`
- `docs/claudeclaw-workflow-pack.md`
- `scripts/install-archon-workflows.sh`
</read_first>
<files>
- `scripts/check-archon-workflow-pack.sh`
- `package.json`
</files>
<action>
Create `scripts/check-archon-workflow-pack.sh` following the validator style in `scripts/check-agent-workflow-routing.sh`:
- shebang `#!/usr/bin/env bash`
- `set -euo pipefail`
- `ROOT="$(git rev-parse --show-toplevel)"`
- `FAILED=0`
- helper function `check_file_contains()`
- final pass line `Archon workflow pack check passed.`
- final fail line `Archon workflow pack check failed.`

The validator must check every file below exists:
- `archon/workflows/claudeclaw-coding-plan-to-pr.yaml`
- `archon/workflows/claudeclaw-bugfix.yaml`
- `archon/workflows/claudeclaw-strategy-ingest.yaml`
- `archon/workflows/claudeclaw-ops-triage.yaml`
- `archon/workflows/claudeclaw-comms-content-draft.yaml`
- `archon/workflows/claudeclaw-workflow-authoring.yaml`
- `docs/claudeclaw-workflow-pack.md`
- `scripts/install-archon-workflows.sh`

The validator must grep:
- `FLOW-01` in `archon/workflows/claudeclaw-coding-plan-to-pr.yaml`
- `FLOW-02` in `archon/workflows/claudeclaw-bugfix.yaml`
- `FLOW-03` in `archon/workflows/claudeclaw-strategy-ingest.yaml`
- `FLOW-04` in `archon/workflows/claudeclaw-ops-triage.yaml`
- `FLOW-05` in `archon/workflows/claudeclaw-comms-content-draft.yaml`
- `FLOW-06` in `archon/workflows/claudeclaw-workflow-authoring.yaml`
- `scripts/archon-workspace-guard.sh` in both coding workflow files
- `/home/devuser/claudeclaw-worktrees/<run-id>` in both coding workflow files
- `npm run typecheck` in both coding workflow files
- `npm test` and `npm run build` in `claudeclaw-coding-plan-to-pr.yaml`
- `Noah approval` in `claudeclaw-ops-triage.yaml`
- `Noah approval` in `claudeclaw-comms-content-draft.yaml`
- `does not send or publish without approval` in `claudeclaw-comms-content-draft.yaml`
- `scripts/install-archon-workflows.sh --dry-run` in `docs/claudeclaw-workflow-pack.md`
- `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` in `docs/claudeclaw-workflow-pack.md`

Update `package.json` scripts with:
- `"check:archon-workflow-pack": "bash scripts/check-archon-workflow-pack.sh"`

Do not remove or rename existing package scripts.
</action>
<verify>
<automated>
`bash -n scripts/check-archon-workflow-pack.sh`
`npm run check:archon-workflow-pack`
`npm run typecheck`
`node -e "const p=require('./package.json'); if(p.scripts['check:archon-workflow-pack']!=='bash scripts/check-archon-workflow-pack.sh') process.exit(1)"`
</automated>
</verify>
<acceptance_criteria>
- `scripts/check-archon-workflow-pack.sh` passes `bash -n`.
- `npm run check:archon-workflow-pack` exits 0.
- `npm run typecheck` exits 0.
- `package.json` has script `check:archon-workflow-pack` equal to `bash scripts/check-archon-workflow-pack.sh`.
- `scripts/check-archon-workflow-pack.sh` contains `Archon workflow pack check passed.`.
- `scripts/check-archon-workflow-pack.sh` contains `Archon workflow pack check failed.`.
</acceptance_criteria>
</task>
</tasks>

<verification>
<automated>
`grep -q 'FLOW-01' .planning/phases/04-claudeclaw-workflow-pack/04-PLAN.md`
`grep -q 'FLOW-06' .planning/phases/04-claudeclaw-workflow-pack/04-PLAN.md`
`grep -q '<threat_model>' .planning/phases/04-claudeclaw-workflow-pack/04-PLAN.md`
`grep -q 'scripts/archon-workspace-guard.sh' .planning/phases/04-claudeclaw-workflow-pack/04-PLAN.md`
`grep -q 'Noah approval' .planning/phases/04-claudeclaw-workflow-pack/04-PLAN.md`
</automated>
<manual>
- On the VPS after implementation and deploy, run `scripts/install-archon-workflows.sh --dry-run`, then `scripts/install-archon-workflows.sh`, then `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`.
- Confirm the workflow list includes `claudeclaw-coding-plan-to-pr`, `claudeclaw-bugfix`, `claudeclaw-strategy-ingest`, `claudeclaw-ops-triage`, `claudeclaw-comms-content-draft`, and `claudeclaw-workflow-authoring`.
</manual>
</verification>

<success_criteria>
- All six `FLOW-01` through `FLOW-06` requirements are represented in committed workflow source files.
- The workflow pack can be installed from repo sources into `~/.archon/workflows` without copying private home directory state into git.
- Coding and bugfix workflows include the safe worktree guard and validation commands.
- Strategy ingestion, ops triage, comms/content drafting, and workflow authoring have explicit durable workflow definitions and approval gates where required.
- `npm run check:archon-workflow-pack` exists and verifies the pack deterministically.
</success_criteria>

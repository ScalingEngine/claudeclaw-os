---
phase: 4
phase_name: ClaudeClaw workflow pack
status: complete
researched: 2026-05-06
requirements:
  - FLOW-01
  - FLOW-02
  - FLOW-03
  - FLOW-04
  - FLOW-05
  - FLOW-06
---

# Phase 4 Research: ClaudeClaw Workflow Pack

## Research Question

What needs to be true before ClaudeClaw can ship a starter Archon workflow pack for coding, bugfixes, strategy/business ingestion, ops triage, comms/content drafting, and workflow authoring?

## Source Context

- `.planning/ROADMAP.md` defines Phase 4 as the ClaudeClaw workflow pack for coding plan-to-PR, bugfix, strategy/business ingestion, ops triage, comms/content drafting, and workflow authoring.
- `.planning/REQUIREMENTS.md` maps Phase 4 to `FLOW-01` through `FLOW-06`.
- `docs/archon-runtime.md` establishes the VPS wrapper at `/home/devuser/claudeclaw/scripts/archon-vps.sh` and verifies workflow discovery against `/home/devuser/claudeclaw`.
- `docs/archon-workspaces.md` establishes the safe workspace boundary for coding workflows: workflow discovery may inspect production, but coding workflows must run in `/home/devuser/claudeclaw-worktrees/<run-id>` and pass `scripts/archon-workspace-guard.sh`.
- `docs/agent-workflow-routing.md` establishes the Phase 3 routing ladder: direct answers first, skills/react loops for quick one-off work, Archon workflows for durable gated work, and Noah approval for ambiguous external effects.

## Current System Shape

The repo has Archon invocation and safety infrastructure, but it does not yet contain committed ClaudeClaw workflow pack sources. The current durable surfaces are:

- `scripts/archon-vps.sh`: wrapper for `bun run cli` in the Archon checkout, with `~/.archon/.env` credential loading.
- `scripts/archon-status.sh`: deterministic runtime doctor that checks Archon repo, env permissions, workflow path, and workflow list output.
- `scripts/archon-workspace-guard.sh`: deterministic guard for isolated coding worktrees.
- `docs/archon-runtime.md`, `docs/archon-workspaces.md`, and `docs/agent-workflow-routing.md`: operator policy and safety rules.
- `package.json`: existing validation script registry.

There are no local `~/.archon/workflows` files on this Mac workspace, and the Archon source checkout is documented as a VPS path. Therefore the execution plan should avoid inventing unverifiable live state. It should create committed workflow pack source files, an installer/checker that deploys them to the supported Archon home workflow directory on the VPS, and validation steps that use the existing wrapper when the VPS Archon runtime is available.

## Workflow Pack Shape

Create committed source workflow definitions under a repo-owned directory, then install them to the home-scoped Archon workflow directory:

- Source directory: `archon/workflows/`
- Installed directory on VPS: `~/.archon/workflows/`
- Installer: `scripts/install-archon-workflows.sh`
- Validator: `scripts/check-archon-workflow-pack.sh`
- Documentation: `docs/claudeclaw-workflow-pack.md`

The workflow file names should be stable and grep-verifiable:

- `claudeclaw-coding-plan-to-pr.yaml` for `FLOW-01`
- `claudeclaw-bugfix.yaml` for `FLOW-02`
- `claudeclaw-strategy-ingest.yaml` for `FLOW-03`
- `claudeclaw-ops-triage.yaml` for `FLOW-04`
- `claudeclaw-comms-content-draft.yaml` for `FLOW-05`
- `claudeclaw-workflow-authoring.yaml` for `FLOW-06`

Use a `claudeclaw-` prefix so workflow discovery output is easy to distinguish from generic Archon workflows and safe to validate with a targeted grep.

## Workflow Requirements

### Coding Plan-to-PR (`FLOW-01`)

This workflow must run only in an isolated coding worktree. It should include explicit phases or gates for:

- workspace guard
- plan creation or plan loading
- implementation
- `npm run typecheck`
- `npm test`
- `npm run build`
- PR/report output

It must reference `/home/devuser/claudeclaw-worktrees/<run-id>` and `scripts/archon-workspace-guard.sh`.

### Bugfix (`FLOW-02`)

This workflow must include:

- diagnosis
- focused fix
- regression check
- PR/report output

It should reuse the same safe coding worktree boundary and include at least `npm run typecheck` and targeted tests, with `npm test` when the touched surface is broad.

### Strategy/Business Ingestion (`FLOW-03`)

This workflow turns meeting notes, docs, or direction changes into canonical planning updates. It should produce proposed edits for `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, phase context, or a summary artifact. It must not rewrite canonical planning state silently when the source is ambiguous; it should surface a review gate before committing planning changes.

### Ops Triage (`FLOW-04`)

This workflow performs VPS/service health checks, log review, and safe remediation recommendations. It should read service status and logs, produce a triage report, and recommend remediation. It must require Noah approval before restarting production services, deploying, mutating production data, or changing credentials.

### Comms/Content Drafting (`FLOW-05`)

This workflow pattern is for Vera and Poe. It should produce drafts/artifacts and explicitly stop before sending, posting, publishing, or scheduling outbound messages unless Noah gave exact approval for that effect and scope.

### Workflow Authoring (`FLOW-06`)

This workflow creates, validates, and documents new Archon workflows. It should require:

- workflow name and owner/persona
- source workflow file under `archon/workflows/`
- docs update in `docs/claudeclaw-workflow-pack.md`
- validation through `scripts/check-archon-workflow-pack.sh`
- discovery check through `scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` after install

## Security and Approval Constraints

- Do not commit `.env`, `~/.archon/.env`, SQLite databases, OAuth tokens, or live agent configs.
- Coding and bugfix workflows must not run against `/home/devuser/claudeclaw`.
- Coding workflows must run in `/home/devuser/claudeclaw-worktrees/<run-id>` and call `scripts/archon-workspace-guard.sh` before implementation.
- External-effect workflows must pause for Noah approval before sending, posting, publishing, scheduling, deploying, restarting services, closing issues, mutating production data, or editing credentials.
- The installer must copy only committed workflow source files to `~/.archon/workflows`; it must not copy private home directory state back into git.

## Validation Architecture

Validation should be layered because workflow YAML schema details may only be fully validated where the Archon runtime exists:

- Static validation:
  - `bash -n scripts/install-archon-workflows.sh`
  - `bash -n scripts/check-archon-workflow-pack.sh`
  - `npm run check:archon-workflow-pack`
  - grep every workflow file for its `FLOW-0N` requirement ID
  - grep coding workflows for `/home/devuser/claudeclaw-worktrees/<run-id>` and `scripts/archon-workspace-guard.sh`
  - grep external-effect workflows for `Noah approval`
- Runtime validation on VPS:
  - `scripts/install-archon-workflows.sh --dry-run`
  - `scripts/install-archon-workflows.sh`
  - `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`
  - `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`
  - confirm all six `claudeclaw-*` workflow names appear and no legacy workflow path warning appears.

## Planning Implications

One executable plan is enough for this phase if it creates the source workflow pack, installer, validator, docs, and npm script together. The implementation should be autonomous for committed repo artifacts, but the final install into `~/.archon/workflows` and any production service mutation must remain explicit user/operator setup. The plan should include a user setup section for VPS install and discovery checks.

## RESEARCH COMPLETE

# ClaudeClaw Workflow Pack

## Scope

This pack defines committed ClaudeClaw Archon workflow sources for durable coding, bugfix, strategy, ops, comms/content, and workflow-authoring work. The source files live in `archon/workflows/` and install into `~/.archon/workflows` on the VPS.

The pack preserves the Phase 1 runtime wrapper, the Phase 2 safe workspace boundary, and the Phase 3 routing policy in `docs/agent-workflow-routing.md`.

## Workflows

| Workflow | Requirement | Primary owner | Purpose |
|----------|-------------|---------------|---------|
| `claudeclaw-coding-plan-to-pr.yaml` | FLOW-01 | Archie | Coding plan-to-PR work with test, typecheck, build, and PR/report output. |
| `claudeclaw-bugfix.yaml` | FLOW-02 | Archie | Diagnosis, focused fix, regression check, and PR/report output. |
| `claudeclaw-strategy-ingest.yaml` | FLOW-03 | Cole | Meeting notes, docs, and direction changes into canonical planning updates. |
| `claudeclaw-ops-triage.yaml` | FLOW-04 | Hopper | VPS/service health checks, log review, and safe remediation recommendations. |
| `claudeclaw-comms-content-draft.yaml` | FLOW-05 | Poe, Cole, Vera | Drafts/artifacts for comms and content that does not send or publish without approval. |
| `claudeclaw-workflow-authoring.yaml` | FLOW-06 | Archie | Create, validate, and document new Archon workflows. |

## Install

Deploy the committed repo to the VPS first, then install the workflow sources from the repo into the supported Archon workflow directory:

```bash
cd /home/devuser/claudeclaw
scripts/install-archon-workflows.sh --dry-run
scripts/install-archon-workflows.sh
```

Run the installer from a clean committed workflow source tree: staged or unstaged changes under `archon/workflows/claudeclaw-*.yaml` cause the installer to abort before copying or removing runtime workflow files.

The installer synchronizes the owned `claudeclaw-*.yaml` namespace in `~/.archon/workflows`: it installs committed `archon/workflows/claudeclaw-*.yaml` files and removes stale installed `claudeclaw-*.yaml` files that are no longer present in the committed source set. It does not read, print, install, or copy `.env`, `~/.archon/.env`, SQLite databases, OAuth tokens, or live agent configs.

## Verify

Run this check from a clean `archon/workflows/claudeclaw-coding-plan-to-pr.yaml` state; the validator temporarily edits that tracked workflow file and aborts instead of overwriting pre-existing staged or unstaged changes.

Run local deterministic validation:

```bash
npm run check:archon-workflow-pack
```

Confirm Archon discovers the installed workflows from the production checkout:

```bash
/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw
```

Confirm the non-interactive user-systemd environment sees the same workflows:

```bash
systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw
```

The workflow list should include:

- `claudeclaw-coding-plan-to-pr`
- `claudeclaw-bugfix`
- `claudeclaw-strategy-ingest`
- `claudeclaw-ops-triage`
- `claudeclaw-comms-content-draft`
- `claudeclaw-workflow-authoring`

## Safety Rules

- Coding and bugfix workflows follow `docs/archon-workspaces.md`.
- Coding and bugfix work runs in `/home/devuser/claudeclaw-worktrees/<run-id>`, not `/home/devuser/claudeclaw`.
- Coding and bugfix workflows run `scripts/archon-workspace-guard.sh` before implementation.
- Deploys remain commit-based after validation.
- Noah approval is required before sending, posting, publishing, scheduling, deploying, restarting services, closing issues, changing credentials, or mutating production data when scope is ambiguous.
- Comms/content drafting produces drafts/artifacts and does not send or publish without approval.
- Do not copy, print, install, or commit `.env`, `~/.archon/.env`, SQLite databases, OAuth tokens, or live agent configs.

## Rollback

If the installed workflow pack needs to be removed or reverted, deploy the previous known-good ClaudeClaw commit and reinstall that commit's workflow sources:

```bash
cd /home/devuser/claudeclaw
git fetch origin
git checkout <known-good-commit>
scripts/install-archon-workflows.sh --dry-run
scripts/install-archon-workflows.sh
/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw
```

Reinstalling a known-good commit also removes stale owned `claudeclaw-*.yaml` files from the runtime workflow directory when those files are not present in that commit's source set.

For a single workflow rollback, replace only the affected `claudeclaw-*.yaml` source in git, commit it, deploy the commit, rerun the installer, and rerun workflow discovery. Do not edit `~/.archon/.env`, `.env`, SQLite databases, OAuth tokens, or live agent configs as part of workflow rollback.

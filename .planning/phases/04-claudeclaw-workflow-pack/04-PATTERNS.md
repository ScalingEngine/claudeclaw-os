---
phase: 4
phase_name: ClaudeClaw workflow pack
status: complete
created: 2026-05-06
---

# Phase 4 Pattern Map

## Files to Create or Modify

| Target File | Role | Closest Analog | Pattern to Reuse |
|-------------|------|----------------|------------------|
| `archon/workflows/claudeclaw-coding-plan-to-pr.yaml` | Coding plan-to-PR workflow source | `docs/archon-workspaces.md` command sequence | Explicit safe-worktree guard, validation commands, PR/report output. |
| `archon/workflows/claudeclaw-bugfix.yaml` | Bugfix workflow source | `docs/archon-workspaces.md` and existing npm validation scripts | Diagnosis, focused fix, regression command, PR/report output. |
| `archon/workflows/claudeclaw-strategy-ingest.yaml` | Business/strategy ingestion workflow source | `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` | Planning artifact update proposal with review gate before canonical edits. |
| `archon/workflows/claudeclaw-ops-triage.yaml` | Ops triage workflow source | `docs/incident-runbook.md`, `docs/archon-runtime.md`, `scripts/archon-status.sh` | Read-only checks first, report before remediation, approval before production mutation. |
| `archon/workflows/claudeclaw-comms-content-draft.yaml` | Vera/Poe drafting workflow source | `docs/agent-workflow-routing.md`, `skills/gmail/SKILL.md`, `skills/slack/SKILL.md` | Draft artifacts only, no send/post/publish without approval. |
| `archon/workflows/claudeclaw-workflow-authoring.yaml` | Workflow-authoring workflow source | New workflow pack validator and docs | Require source file, docs update, validator update, and workflow list proof. |
| `docs/claudeclaw-workflow-pack.md` | Operator documentation | `docs/archon-runtime.md`, `docs/archon-workspaces.md` | Scope, files, install, verification, rollback, safety notes. |
| `scripts/install-archon-workflows.sh` | Installer | `scripts/archon-status.sh`, `scripts/archon-workspace-guard.sh` | Strict bash, labeled output, dry-run support, no secret printing. |
| `scripts/check-archon-workflow-pack.sh` | Deterministic validator | `scripts/check-agent-workflow-routing.sh` | `check_file_contains` style grep checks plus required workflow list. |
| `package.json` | Validation script registry | Existing scripts block | Add `check:archon-workflow-pack` without disturbing existing scripts. |

## Existing Patterns

### Bash Validators

Existing shell validators use:

- `#!/usr/bin/env bash`
- `set -euo pipefail`
- `ROOT="$(git rev-parse --show-toplevel)"`
- labeled OK/FAIL output
- no credential value printing
- deterministic grep and path checks

The workflow pack checker should follow `scripts/check-agent-workflow-routing.sh` closely.

### Archon Runtime Docs

`docs/archon-runtime.md` and `docs/archon-workspaces.md` use short sections with exact commands. `docs/claudeclaw-workflow-pack.md` should use the same style and avoid abstract prose when an exact path or command is known.

### Package Scripts

`package.json` already exposes focused validation commands such as `check:agent-workflow-routing` and `test:archon-workspace-guard`. Add one new script:

- `check:archon-workflow-pack`: `bash scripts/check-archon-workflow-pack.sh`

### Planning Artifacts

Strategy ingestion should treat `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, and phase context files as canonical planning surfaces. It should propose changes and require review when direction changes are ambiguous.

## Landmines

- Do not copy live `~/.archon/workflows` files into git.
- Do not copy, print, or commit `~/.archon/.env`, `.env`, SQLite databases, OAuth tokens, or live agent configs.
- Do not let coding or bugfix workflows use `/home/devuser/claudeclaw` as their implementation `--cwd`.
- Do not allow comms/content workflows to send, post, publish, or schedule without Noah approval when scope is ambiguous.
- Do not let ops triage restart services, deploy, change credentials, close issues, or mutate production data without approval.
- Do not make validator checks depend on fragile exact line numbers; use stable strings, workflow file names, and requirement IDs.

## PATTERN MAPPING COMPLETE

---
phase: 01-vps-archon-runtime-surface
verified: 2026-05-05T20:03:46Z
status: passed
score: "4/4 must-haves verified"
overrides_applied: 0
human_verification: []
---

# Phase 1: VPS Archon Runtime Surface Verification Report

**Phase Goal:** VPS Archon runtime surface -- create a reliable Archon invocation path for systemd-run ClaudeClaw agents; verify workflow list against `/home/devuser/claudeclaw`; fix legacy global workflow path warning; document environment and credential loading.
**Verified:** 2026-05-05T20:03:46Z
**Status:** passed
**Re-verification:** Yes -- VPS human UAT completed after SSH alias verification and commit-based deploy.

## Goal Achievement

The Archon runtime surface is implemented and verified on the VPS. The initial SSH issue came from using `srv1310498` directly instead of the configured `vps` alias. After deploying the committed code to `/home/devuser/claudeclaw`, tightening `~/.archon/.env` permissions, and migrating the legacy workflow directory, all Phase 1 must-haves passed.

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ARCH-01: Each ClaudeClaw agent can invoke Archon from its VPS runtime environment without relying on an interactive shell profile. | VERIFIED | `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` exited 0 on the VPS. |
| 2 | ARCH-02: Agents can list available Archon workflows for `/home/devuser/claudeclaw` and receive a successful result. | VERIFIED | `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` exited 0 and listed 21 workflows. |
| 3 | ARCH-03: Archon home-scoped workflows are stored in `~/.archon/workflows/` with no legacy path warning from `~/.archon/.archon/workflows/`. | VERIFIED | Legacy workflows were copied into `~/.archon/workflows/`, the old directory was moved to `~/.archon/.archon/workflows.migrated-20260505200321`, and the status doctor reported no legacy warning. |
| 4 | ARCH-04: The configured Archon invocation path loads credentials from `~/.archon/.env` without exposing secrets in prompts, logs, or git. | VERIFIED | Wrapper output reported env loading without values, `scripts/archon-status.sh` reported env permissions OK, and `stat -c '%a %n' ~/.archon/.env` reported `600 /home/devuser/.archon/.env`. |

**Score:** 4/4 truths verified

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/archon-vps.sh` | VPS-safe Archon wrapper | VERIFIED | Exists, executable, starts with bash shebang and `set -euo pipefail`, defines required defaults, sources env file without tracing, defaults to workflow list, and executes from `ARCHON_REPO` via `run cli`. |
| `scripts/archon-status.sh` | Runtime status doctor | VERIFIED | Exists, executable, checks repo/package/bun/env/workflow dirs/legacy dir/workflow list, enforces env modes `600`, `400`, or `440`, and rejects legacy/deprecated/no-workflow output. |
| `docs/archon-runtime.md` | Operator runbook | VERIFIED | Contains required sections and commands for install, credential loading, legacy cleanup, verification, rollback, and the exact Phase 1 discovery-only boundary text. |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Wrapper shell syntax and executable bit | `bash -n scripts/archon-vps.sh && test -x scripts/archon-vps.sh` | Exited 0 | PASS |
| Status shell syntax and executable bit | `bash -n scripts/archon-status.sh && test -x scripts/archon-status.sh` | Exited 0 | PASS |
| TypeScript project still typechecks | `npm run typecheck` | Exited 0 | PASS |
| VPS normal-shell workflow list | `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` | Exited 0, listed 21 workflows, no legacy/deprecated warning | PASS |
| VPS status doctor | `/home/devuser/claudeclaw/scripts/archon-status.sh` | Exited 0, all checks OK | PASS |
| VPS systemd-run workflow list | `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` | Exited 0 | PASS |
| VPS env file mode | `stat -c '%a %n' ~/.archon/.env` | `600 /home/devuser/.archon/.env` | PASS |

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ARCH-01 | `01-PLAN.md` | Each agent can invoke Archon from VPS runtime without interactive shell profile. | VERIFIED | VPS `systemd-run --user --wait --collect ... workflow list` exited 0. |
| ARCH-02 | `01-PLAN.md` | Agents can list workflows for `/home/devuser/claudeclaw` successfully. | VERIFIED | VPS wrapper listed 21 workflows for `/home/devuser/claudeclaw`. |
| ARCH-03 | `01-PLAN.md` | Supported workflow path is `~/.archon/workflows/` with no legacy warning. | VERIFIED | Status doctor reported workflows dir OK, legacy workflows dir absent, and workflow list OK. |
| ARCH-04 | `01-PLAN.md` | Invocation path loads `~/.archon/.env` without exposing secrets. | VERIFIED | Env mode is `600`; wrapper/status output did not expose credential values. |

## Human Verification Completed

Results are persisted in `01-HUMAN-UAT.md`. No gaps remain.

---

_Verified: 2026-05-05T20:03:46Z_
_Verifier: Codex + VPS UAT_

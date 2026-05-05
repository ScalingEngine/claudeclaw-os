---
status: passed
phase: 01-vps-archon-runtime-surface
source:
  - 01-VERIFICATION.md
started: 2026-05-05T19:58:21Z
updated: 2026-05-05T20:03:46Z
---

# Phase 01 Human UAT

## Current Test

Completed on VPS after SSH alias verification and commit-based deploy to `/home/devuser/claudeclaw`.

## Tests

### 1. VPS systemd-run Archon invocation

expected: `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` exits 0 from the VPS agent runtime and lists available workflows.

result: passed - `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` exited 0.

### 2. VPS normal-shell workflow discovery

expected: `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` exits 0 and prints concrete workflow entries for `/home/devuser/claudeclaw`.

result: passed - wrapper exited 0, listed 21 workflows for `/home/devuser/claudeclaw`, and produced no legacy/deprecated warning.

### 3. VPS legacy workflow path cleanup

expected: `~/.archon/workflows/` exists, `~/.archon/.archon/workflows/` is absent or timestamp-renamed, and workflow-list output contains no `legacy`, `deprecated`, or `.archon/.archon/workflows` warning.

result: passed - `scripts/archon-status.sh` reported workflows dir OK, legacy workflows dir absent, and workflow list OK.

### 4. VPS Archon credential loading and permissions

expected: `~/.archon/.env` is loaded by the wrapper, has mode `600`, `400`, or `440`, and no credential values are exposed in prompts, logs, docs, or git.

result: passed - `scripts/archon-status.sh` reported env file OK and env permissions OK; `stat -c '%a %n' ~/.archon/.env` reported `600 /home/devuser/.archon/.env`.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None. VPS verification passed after env permissions were tightened and the legacy workflow directory was migrated to `~/.archon/workflows`.

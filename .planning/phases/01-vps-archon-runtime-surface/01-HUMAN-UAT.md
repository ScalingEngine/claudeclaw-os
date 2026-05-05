---
status: partial
phase: 01-vps-archon-runtime-surface
source:
  - 01-VERIFICATION.md
started: 2026-05-05T19:58:21Z
updated: 2026-05-05T19:58:21Z
---

# Phase 01 Human UAT

## Current Test

Awaiting VPS operator verification after SSH host-key trust for `srv1310498` is repaired.

## Tests

### 1. VPS systemd-run Archon invocation

expected: `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` exits 0 from the VPS agent runtime and lists available workflows.

result: [pending]

### 2. VPS normal-shell workflow discovery

expected: `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` exits 0 and prints concrete workflow entries for `/home/devuser/claudeclaw`.

result: [pending]

### 3. VPS legacy workflow path cleanup

expected: `~/.archon/workflows/` exists, `~/.archon/.archon/workflows/` is absent or timestamp-renamed, and workflow-list output contains no `legacy`, `deprecated`, or `.archon/.archon/workflows` warning.

result: [pending]

### 4. VPS Archon credential loading and permissions

expected: `~/.archon/.env` is loaded by the wrapper, has mode `600`, `400`, or `440`, and no credential values are exposed in prompts, logs, docs, or git.

result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

None recorded yet. If any VPS check fails after SSH trust is repaired, record the failing command, output summary without secrets, and route to gap closure.

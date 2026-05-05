---
phase: 1
slug: vps-archon-runtime-surface
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-05
---

# Phase 1 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash syntax checks + existing TypeScript checks |
| **Config file** | `package.json`, `tsconfig.json` |
| **Quick run command** | `bash -n scripts/archon-vps.sh && bash -n scripts/archon-status.sh` |
| **Full suite command** | `npm run typecheck` |
| **Estimated runtime** | ~30 seconds locally, VPS workflow-list manual check varies |

## Sampling Rate

- **After every task commit:** Run `bash -n scripts/archon-vps.sh && bash -n scripts/archon-status.sh`
- **After every plan wave:** Run `npm run typecheck`
- **Before `$gsd-verify-work`:** Full suite must be green and manual VPS checks must be recorded
- **Max feedback latency:** 60 seconds for local checks

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | ARCH-01, ARCH-04 | T-01, T-03 | Wrapper loads env file without echoing secrets and avoids shell profile dependence | syntax + grep | `bash -n scripts/archon-vps.sh && grep -q 'ARCHON_REPO' scripts/archon-vps.sh && grep -q 'ARCHON_ENV_FILE' scripts/archon-vps.sh` | ✅ | pending |
| 1-01-02 | 01 | 1 | ARCH-02, ARCH-03 | T-03, T-04 | Status script reports workflow discovery and legacy path state | syntax + grep | `bash -n scripts/archon-status.sh && grep -q 'workflow list --cwd' scripts/archon-status.sh && grep -q '.archon/.archon/workflows' scripts/archon-status.sh` | ✅ | pending |
| 1-01-03 | 01 | 2 | ARCH-01, ARCH-02, ARCH-03, ARCH-04 | T-01, T-02, T-04 | Docs provide command surface, verification, credential handling, and rollback without secrets | grep | `grep -q 'workflow list --cwd /home/devuser/claudeclaw' docs/archon-runtime.md && grep -q 'chmod 600 ~/.archon/.env' docs/archon-runtime.md && grep -q 'Rollback' docs/archon-runtime.md` | ✅ | pending |
| 1-01-04 | 01 | 2 | ARCH-01, ARCH-02, ARCH-03, ARCH-04 | T-01, T-03 | VPS/systemd verification proves non-interactive invocation works | manual | `npm run typecheck` plus VPS commands in plan acceptance criteria | ✅ | pending |

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| systemd-run can call Archon wrapper from VPS user service environment | ARCH-01, ARCH-02 | Local macOS environment cannot emulate VPS systemd user manager or `/home/devuser` paths | On VPS, run `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` and confirm exit code 0 |
| Legacy workflow warning is gone | ARCH-03 | Warning originates from VPS Archon home directory state | On VPS, run `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw 2>&1 | tee /tmp/archon-workflow-list.txt`; confirm output does not contain `legacy`, `deprecated`, or `.archon/.archon/workflows` |
| Credential file permission is safe | ARCH-04 | Credential file lives outside repo on VPS | On VPS, run `stat -c '%a %n' ~/.archon/.env`; confirm mode is `600` or stricter |

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or manual VPS checks
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s for local checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

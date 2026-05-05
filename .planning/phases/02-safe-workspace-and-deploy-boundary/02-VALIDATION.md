---
phase: 2
slug: safe-workspace-and-deploy-boundary
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-05
---

# Phase 2 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + TypeScript project checks |
| **Config file** | `package.json` |
| **Quick run command** | `bash -n scripts/archon-workspace-guard.sh` |
| **Full suite command** | `bash -n scripts/archon-workspace-guard.sh && npm run typecheck` |
| **Estimated runtime** | ~20 seconds |

## Sampling Rate

- **After every task commit:** Run `bash -n scripts/archon-workspace-guard.sh` after the guard exists; before it exists, run the task's grep-based acceptance checks.
- **After every plan wave:** Run `bash -n scripts/archon-workspace-guard.sh && npm run typecheck`.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 30 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | SAFE-01, SAFE-02 | T-01, T-02 | Guard refuses production and forbidden copied state | shell syntax + grep | `bash -n scripts/archon-workspace-guard.sh` | yes | pending |
| 2-01-02 | 01 | 1 | SAFE-01, SAFE-02, SAFE-03, SAFE-04 | T-01, T-02, T-03, T-04 | Runbook defines allowed worktree root, forbidden state, deploy, rollback | grep | `grep -q '/home/devuser/claudeclaw-worktrees' docs/archon-workspaces.md` | yes | pending |
| 2-01-03 | 01 | 2 | SAFE-01 | T-01 | Runtime runbook routes coding workflows to safe workspace contract | grep | `grep -q 'docs/archon-workspaces.md' docs/archon-runtime.md` | yes | pending |
| 2-01-04 | 01 | 2 | SAFE-01, SAFE-02, SAFE-03, SAFE-04 | T-01, T-02, T-03, T-04 | Local and VPS validation recorded in summary | shell + manual | `bash -n scripts/archon-workspace-guard.sh && npm run typecheck` | no code artifact | pending |

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Disposable VPS worktree can be created and guarded | SAFE-01 | Local macOS cannot prove `/home/devuser` layout | Create `/home/devuser/claudeclaw-worktrees/<run-id>`, run `scripts/archon-workspace-guard.sh`, expect exit 0. |
| Production checkout is rejected | SAFE-01 | Requires VPS path semantics | Run `/home/devuser/claudeclaw/scripts/archon-workspace-guard.sh /home/devuser/claudeclaw`, expect non-zero. |
| Forbidden state is rejected | SAFE-02 | Requires temporary fixture in disposable workspace | Touch `.env.test-forbidden` in disposable worktree, run guard, expect non-zero, then remove the file. |
| Deploy and rollback commands are operator-approved | SAFE-03, SAFE-04 | Production deploy should not be automated during planning | Follow `docs/archon-workspaces.md` deploy section only after validated branch/commit is approved. |

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

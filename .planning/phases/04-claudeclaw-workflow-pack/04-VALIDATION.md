---
phase: 4
slug: claudeclaw-workflow-pack
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-06
---

# Phase 4 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + npm scripts + Archon wrapper discovery |
| **Config file** | `package.json` |
| **Quick run command** | `bash -n scripts/install-archon-workflows.sh && bash -n scripts/check-archon-workflow-pack.sh` |
| **Full suite command** | `npm run check:archon-workflow-pack && npm run typecheck` |
| **VPS runtime command** | `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` |
| **Estimated local runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run check:archon-workflow-pack`
- **After every plan wave:** Run `npm run check:archon-workflow-pack && npm run typecheck`
- **Before `$gsd-verify-work`:** Full local suite must be green; VPS install/list checks must be run or explicitly marked manual if VPS is unavailable
- **Max local feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-06 | T-01 / T-02 / T-03 / T-04 | Workflow source files exist with requirement IDs, safe workspace references, approval gates, and pack documentation. | grep/script | `npm run check:archon-workflow-pack` | Yes | pending |
| 4-01-02 | 01 | 1 | FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-06 | T-01 / T-05 | Installer copies only committed workflow sources to `~/.archon/workflows` and supports `--dry-run`. | bash/script | `bash -n scripts/install-archon-workflows.sh && npm run check:archon-workflow-pack` | Yes | pending |
| 4-01-03 | 01 | 1 | FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-06 | T-01 / T-02 / T-03 / T-04 / T-05 | Validator proves all six workflows are present, mapped to requirements, and preserve safe workspace plus approval gates. | bash/npm | `npm run check:archon-workflow-pack && npm run typecheck` | Yes | pending |

---

## Wave 0 Requirements

Existing infrastructure covers the runtime and safety dependencies:

- `scripts/archon-vps.sh` invokes Archon through the VPS checkout.
- `scripts/archon-status.sh` validates workflow discovery and legacy path warnings.
- `scripts/archon-workspace-guard.sh` validates isolated coding worktrees.
- `docs/archon-runtime.md`, `docs/archon-workspaces.md`, and `docs/agent-workflow-routing.md` define the required safety policy.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Install pack into VPS home workflow directory | FLOW-01 through FLOW-06 | The supported Archon home workflow directory is `~/.archon/workflows` on the VPS and is outside the git repo. | On the VPS, run `scripts/install-archon-workflows.sh --dry-run`, then `scripts/install-archon-workflows.sh`, then `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`. |
| Non-interactive workflow discovery | FLOW-01 through FLOW-06 | Requires the user-level systemd environment on the VPS. | Run `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` and confirm all six `claudeclaw-*` names appear. |
| External-effect approval behavior | FLOW-04, FLOW-05 | Sending, posting, deploying, restarting services, or mutating production data must not happen in local tests. | Inspect `docs/claudeclaw-workflow-pack.md` and workflow files for `Noah approval`; dry-run workflows if Archon supports it, but do not perform production mutations. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers runtime and safety dependencies
- [x] No watch-mode flags
- [x] Feedback latency < 30s for local checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

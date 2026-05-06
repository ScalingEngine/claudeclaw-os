---
phase: 3
slug: agent-workflow-routing-policy
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-05
---

# Phase 3 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + npm scripts + TypeScript typecheck |
| **Config file** | `package.json` |
| **Quick run command** | `bash -n scripts/check-agent-workflow-routing.sh` |
| **Full suite command** | `npm run check:agent-workflow-routing && npm run typecheck` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash -n scripts/check-agent-workflow-routing.sh`
- **After every plan wave:** Run `npm run check:agent-workflow-routing && npm run typecheck`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | ROUT-01, ROUT-02, ROUT-03, ROUT-04, ROUT-05 | T-01 / T-02 / T-03 | Policy distinguishes direct answers, skills/react loops, Archon workflows, and external-effect approval. | grep/script | `npm run check:agent-workflow-routing` | Yes | pending |
| 3-01-02 | 01 | 1 | ROUT-01, ROUT-03, ROUT-04, ROUT-05 | T-01 / T-02 / T-03 | Main and specialist templates include routing and approval language without copying live configs. | grep/script | `npm run check:agent-workflow-routing` | Yes | pending |
| 3-01-03 | 01 | 1 | ROUT-01, ROUT-02, ROUT-03, ROUT-04, ROUT-05 | T-01 / T-02 / T-03 | War Room compact personas follow the same policy and do not silently perform ambiguous external effects. | typecheck/script | `npm run check:agent-workflow-routing && npm run typecheck` | Yes | pending |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live VPS overlay policy application | ROUT-01, ROUT-02, ROUT-05 | Live `~/.claudeclaw` configs are intentionally outside git and may contain private data. | After deploy, update main and specialist CLAUDE.md files through the dashboard or an approved operator command, then inspect the dashboard agent file editor to confirm routing guidance is present. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending


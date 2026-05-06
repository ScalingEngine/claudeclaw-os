---
phase: 5
slug: workflow-observability-and-cleanup
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-06
---

# Phase 5 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + bash + npm scripts |
| **Config file** | `package.json` |
| **Quick run command** | `npm run check:archon-observability` |
| **Full suite command** | `npm run check:archon-observability && npm run typecheck && npm test` |
| **VPS runtime command** | `scripts/archon-runs.sh list && scripts/archon-runs.sh stale --older-than-hours 24` |
| **Estimated local runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's focused verifier.
- **After every plan wave:** Run `npm run check:archon-observability && npm run typecheck`.
- **Before `$gsd-verify-work`:** Run `npm run check:archon-observability && npm run typecheck && npm test`.
- **Max local feedback latency:** 60 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | OBS-01, OBS-02 | T-01 / T-02 / T-03 | Archon events create live chat/dashboard events and durable hive_mind records; failed events require workflow, run ID or branch, failing node, and recovery action. | vitest/typecheck | `npm test -- src/archon-observability.test.ts && npm run typecheck` | Yes | pending |
| 5-01-02 | 01 | 1 | OBS-01, OBS-02 | T-01 / T-02 / T-04 | Agent prompts, workflow report nodes, and docs require launch/completion/failure reporting with the standard fields. | grep/script | `npm run check:archon-observability` | Yes | pending |
| 5-01-03 | 01 | 1 | OBS-03 | T-03 / T-05 / T-06 | Run inspection and cleanup operate only under `/home/devuser/claudeclaw-worktrees`, default to dry-run, refuse production checkout, and refuse dirty worktrees. | bash/script | `npm run test:archon-runs && npm run check:archon-observability` | Yes | pending |

---

## Wave 0 Requirements

Existing infrastructure covers the runtime and safety dependencies:

- `src/state.ts` emits live chat/dashboard events.
- `src/db.ts` stores durable `hive_mind` activity rows.
- `src/dashboard.ts` streams chat events and exposes `/api/hive-mind`.
- `scripts/archon-vps.sh` invokes Archon through the VPS checkout.
- `scripts/archon-workspace-guard.sh` validates isolated coding worktrees.
- `docs/archon-workspaces.md` forbids coding work in `/home/devuser/claudeclaw`.
- Phase 4 has already installed/discovered the six `claudeclaw-*` workflow sources on the VPS.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| VPS run inspection | OBS-03 | The real Archon worktree root is on the VPS, not this local Mac workspace. | On the VPS, run `cd /home/devuser/claudeclaw && scripts/archon-runs.sh list`, then confirm output only lists paths under `/home/devuser/claudeclaw-worktrees`. |
| Stale cleanup dry-run | OBS-03 | Actual stale worktree state depends on VPS runtime history. | On the VPS, run `scripts/archon-runs.sh stale --older-than-hours 24` and `scripts/archon-runs.sh cleanup --older-than-hours 24`; verify cleanup is dry-run without `--force`. |
| Live launch/completion visibility | OBS-01 | Requires a real agent workflow launch path and dashboard/chat recipient. | Launch a small Archon workflow from an agent, then verify the agent response or dashboard/hive_mind feed includes workflow name and run ID for start and completion. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers runtime, dashboard, hive_mind, and safe worktree dependencies.
- [x] No watch-mode flags.
- [x] Feedback latency < 60s for local checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending

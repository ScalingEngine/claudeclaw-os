---
phase: 01-vps-archon-runtime-surface
verified: 2026-05-05T19:56:41Z
status: human_needed
score: "0/4 must-haves fully verified"
overrides_applied: 0
human_verification:
  - test: "VPS systemd-run Archon invocation"
    expected: "`systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` exits 0 from the VPS agent runtime."
    why_human: "Remote execution was blocked before commands ran by SSH `Host key verification failed`; local code cannot prove the VPS systemd user environment."
  - test: "VPS normal-shell workflow discovery"
    expected: "`/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` exits 0 and prints concrete available workflows."
    why_human: "The phase summary documents this as pending after SSH host-key repair; no captured VPS output exists."
  - test: "VPS legacy workflow path cleanup"
    expected: "`~/.archon/workflows/` exists, `~/.archon/.archon/workflows/` is absent or timestamp-renamed, and workflow-list output contains no `legacy`, `deprecated`, or `.archon/.archon/workflows` warning."
    why_human: "The status script can check this, but the actual VPS filesystem and workflow-list output were not reachable."
  - test: "VPS Archon credential loading and permissions"
    expected: "`~/.archon/.env` is loaded by the wrapper, has mode `600`, `400`, or `440`, and no credential values are exposed in prompts, logs, docs, or git."
    why_human: "Scripts/docs avoid secret output locally, but the actual VPS env file and permission mode require remote verification."
---

# Phase 1: VPS Archon Runtime Surface Verification Report

**Phase Goal:** VPS Archon runtime surface -- create a reliable Archon invocation path for systemd-run ClaudeClaw agents; verify workflow list against `/home/devuser/claudeclaw`; fix legacy global workflow path warning; document environment and credential loading.
**Verified:** 2026-05-05T19:56:41Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

The repo now contains a substantive local Archon runtime surface: a wrapper, a status doctor, and an operator runbook. However, the roadmap and plan define the phase outcome using VPS-observed behavior. The execution summary states the VPS attempt failed before remote execution with `Host key verification failed`, so the remote workflow-list, systemd-run, legacy-path, and env-mode truths are pending rather than proven.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ARCH-01: Each ClaudeClaw agent can invoke Archon from its VPS runtime environment without relying on an interactive shell profile. | UNCERTAIN - HUMAN NEEDED | `scripts/archon-vps.sh` has explicit defaults, sources env in-process, and executes `"$BUN_BIN" run cli`; `bash -n` passed. The required VPS `systemd-run --user --wait --collect ... workflow list` did not run because SSH host-key verification failed. |
| 2 | ARCH-02: Agents can list available Archon workflows for `/home/devuser/claudeclaw` and receive a successful result. | UNCERTAIN - HUMAN NEEDED | Wrapper defaults no-arg calls to `workflow list --cwd "$ARCHON_PROJECT_CWD"`, and the status script requires concrete workflow entries. The VPS workflow-list command is documented as pending; no successful remote output was captured. |
| 3 | ARCH-03: Archon home-scoped workflows are stored in `~/.archon/workflows/` with no legacy path warning from `~/.archon/.archon/workflows/`. | UNCERTAIN - HUMAN NEEDED | `scripts/archon-status.sh` checks current and legacy workflow dirs and fails on `legacy`, `deprecated`, or `.archon/.archon/workflows` output. The actual VPS filesystem and Archon output were not reachable. |
| 4 | ARCH-04: The configured Archon invocation path loads credentials from `~/.archon/.env` without exposing secrets in prompts, logs, or git. | UNCERTAIN - HUMAN NEEDED | The wrapper sources `ARCHON_ENV_FILE` with `set -a`/`set +a`, does not use `set -x`, and secret-pattern grep found no credential-looking values in the scripts/docs/summary. The actual VPS env file mode and runtime load remain unverified. |

**Score:** 0/4 truths fully verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/archon-vps.sh` | VPS-safe Archon wrapper | VERIFIED | Exists, executable, starts with bash shebang and `set -euo pipefail`, defines required defaults, sources env file without tracing, defaults to workflow list, and executes from `ARCHON_REPO` via `run cli`. |
| `scripts/archon-status.sh` | Runtime status doctor | VERIFIED | Exists, executable, checks repo/package/bun/env/workflow dirs/legacy dir/workflow list, enforces env modes `600`, `400`, or `440`, and rejects legacy/deprecated/no-workflow output. |
| `docs/archon-runtime.md` | Operator runbook | VERIFIED | Contains required sections and commands for install, credential loading, legacy cleanup, verification, rollback, and the exact Phase 1 discovery-only boundary text. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/archon-vps.sh` | Archon CLI | `(cd "$ARCHON_REPO" && exec "$BUN_BIN" run cli "$@")` | WIRED | The wrapper runs the CLI from the configured Archon repo and preserves wrapper-selected repo/cwd/bun values after sourcing the env file. |
| `scripts/archon-status.sh` | `scripts/archon-vps.sh` | `ARCHON_WRAPPER` and `workflow list --cwd "$ARCHON_PROJECT_CWD"` | WIRED | The status doctor invokes the wrapper, captures output, fails on non-zero exit, and scans output for legacy/deprecated/no-workflow cases. |
| `docs/archon-runtime.md` | Runtime scripts | Absolute VPS commands | WIRED | Runbook includes direct wrapper, status doctor, and `systemd-run --user --wait --collect` verification commands. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `scripts/archon-vps.sh` | CLI arguments | Defaults or caller args, then `exec "$BUN_BIN" run cli "$@"` | Requires VPS Archon CLI | LOCAL FLOW VERIFIED; VPS OUTPUT HUMAN NEEDED |
| `scripts/archon-status.sh` | `WORKFLOW_OUTPUT` | `"$ARCHON_WRAPPER" workflow list --cwd "$ARCHON_PROJECT_CWD" 2>&1` | Requires VPS Archon CLI | LOCAL FLOW VERIFIED; VPS OUTPUT HUMAN NEEDED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Wrapper shell syntax and executable bit | `bash -n scripts/archon-vps.sh && test -x scripts/archon-vps.sh` | Exited 0 | PASS |
| Status shell syntax and executable bit | `bash -n scripts/archon-status.sh && test -x scripts/archon-status.sh` | Exited 0 | PASS |
| TypeScript project still typechecks | `npm run typecheck` | Exited 0 | PASS |
| Wrapper refuses missing Archon repo | `ARCHON_REPO=/definitely/not/a/repo BUN_BIN=/bin/true scripts/archon-vps.sh` | Printed `ARCHON_REPO not found: /definitely/not/a/repo` | PASS |
| Status doctor reports missing local runtime dependencies | `ARCHON_REPO=/definitely/not/a/repo BUN_BIN=/bin/true scripts/archon-status.sh` | Reported repo/package/env/workflow failures and exited non-zero | PASS |
| VPS normal-shell workflow list | `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` | Not run; SSH blocked with host-key failure | HUMAN NEEDED |
| VPS systemd-run workflow list | `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` | Not run; SSH blocked with host-key failure | HUMAN NEEDED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ARCH-01 | `01-PLAN.md` | Each agent can invoke Archon from VPS runtime without interactive shell profile. | NEEDS HUMAN | Local wrapper supports non-interactive defaults and `BUN_BIN`, but the required VPS `systemd-run` command is pending. |
| ARCH-02 | `01-PLAN.md` | Agents can list workflows for `/home/devuser/claudeclaw` successfully. | NEEDS HUMAN | Local wrapper/status wiring exists; no successful remote workflow-list output was produced in this phase. |
| ARCH-03 | `01-PLAN.md` | Supported workflow path is `~/.archon/workflows/` with no legacy warning. | NEEDS HUMAN | Status script and docs cover the check/cleanup; actual VPS path state and output are unverified. |
| ARCH-04 | `01-PLAN.md` | Invocation path loads `~/.archon/.env` without exposing secrets. | NEEDS HUMAN | Local code avoids secret output and checks permissions; actual VPS env file mode/load still requires remote verification. |

No orphaned Phase 1 requirements were found. `.planning/REQUIREMENTS.md` maps ARCH-01 through ARCH-04 to Phase 1, and all four are declared in the plan frontmatter. Note: `.planning/REQUIREMENTS.md` currently marks these requirements complete, but that file is not proof of runtime success.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No TODO/FIXME/placeholders, empty implementations, shell tracing, or credential-looking values were found in the reviewed scripts/docs/summary. Legacy-path strings appear intentionally in detection and cleanup logic. |

### Human Verification Required

### 1. VPS systemd-run Archon invocation

**Test:** After SSH host-key trust is repaired, run `systemd-run --user --wait --collect /home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` on the VPS.
**Expected:** Command exits 0 from the non-interactive user-systemd environment and lists available workflows.
**Why human:** Local checks cannot prove the VPS systemd user PATH, HOME, cwd, Archon checkout, and credentials.

### 2. VPS normal-shell workflow discovery

**Test:** Run `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` on the VPS.
**Expected:** Command exits 0 and prints concrete workflow entries for `/home/devuser/claudeclaw`.
**Why human:** The phase summary says SSH failed before any remote command ran.

### 3. VPS legacy workflow path cleanup

**Test:** Run `/home/devuser/claudeclaw/scripts/archon-status.sh` on the VPS and confirm workflow-list output contains no `legacy`, `deprecated`, or `.archon/.archon/workflows`.
**Expected:** Current workflow dir is present, legacy dir is absent or timestamp-renamed, and the status doctor exits 0.
**Why human:** The code can detect the condition, but the real VPS filesystem and Archon CLI output were not inspected.

### 4. VPS credential loading and permissions

**Test:** Run `/home/devuser/claudeclaw/scripts/archon-status.sh` and `stat -c '%a %n' ~/.archon/.env` on the VPS.
**Expected:** Env file exists, mode is `600`, `400`, or `440`, and workflow invocation succeeds without printing credential values.
**Why human:** The actual env file is intentionally not in git or local prompts/logs.

### Gaps Summary

No codebase blocker was found in the local implementation. The phase cannot be marked passed because the must-have truths are defined by VPS-observed behavior, and the execution summary documents that SSH host-key verification failed before remote commands ran. This is an Escalation Gate outcome: automated/local checks passed, but the remote runtime proof requires human or operator action to repair SSH trust and rerun the VPS commands.

---

_Verified: 2026-05-05T19:56:41Z_
_Verifier: the agent (gsd-verifier)_

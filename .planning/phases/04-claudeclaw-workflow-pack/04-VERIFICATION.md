---
phase: 04-claudeclaw-workflow-pack
verified: 2026-05-06T03:07:58Z
status: gaps_found
score: 6/8 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Installer copies only committed ClaudeClaw workflow sources into the Archon runtime workflow directory."
    status: failed
    reason: "Code review CR-01 remains valid: the installer builds WORKFLOW_FILES from an unconstrained filesystem glob, so untracked, ignored, generated, or locally staged claudeclaw-*.yaml files under archon/workflows/ would be installed despite docs promising committed sources only."
    artifacts:
      - path: "scripts/install-archon-workflows.sh"
        issue: "Line 37 uses WORKFLOW_FILES=(\"$SOURCE_DIR\"/claudeclaw-*.yaml) instead of git ls-files."
      - path: "scripts/check-archon-workflow-pack.sh"
        issue: "Validator does not assert that the installer source set comes from git-tracked workflow files."
      - path: "docs/claudeclaw-workflow-pack.md"
        issue: "Line 30 promises only committed workflow sources are copied, but installer behavior does not enforce that."
    missing:
      - "Use git -C \"$ROOT\" ls-files -z 'archon/workflows/claudeclaw-*.yaml' to build the install source set."
      - "Add validator coverage proving the installer is constrained to committed workflow sources."
  - truth: "Reinstall and rollback keep the installed ClaudeClaw workflow namespace synchronized with the committed source set."
    status: failed
    reason: "Code review CR-02 remains valid: the installer only copies current sources and never removes stale claudeclaw-*.yaml files already present in ~/.archon/workflows, so renamed/deleted workflows can remain discoverable after reinstall or rollback."
    artifacts:
      - path: "scripts/install-archon-workflows.sh"
        issue: "Lines 52-62 install current files only; there is no stale claudeclaw-*.yaml removal path."
      - path: "scripts/check-archon-workflow-pack.sh"
        issue: "Validator has no temporary-target check for stale installed workflow removal."
      - path: "docs/claudeclaw-workflow-pack.md"
        issue: "Rollback instructions rely on reinstalling a known-good commit, but stale workflow files would survive."
    missing:
      - "Synchronize the owned claudeclaw-*.yaml namespace by removing installed stale files not present in the desired committed source set."
      - "Add dry-run and non-dry-run validator coverage for stale workflow removal using a temporary target directory."
human_verification:
  - test: "VPS Archon workflow discovery after install"
    expected: "After dry-run and install on /home/devuser/claudeclaw, both direct archon-vps.sh workflow list and systemd-run workflow list show all six claudeclaw-* workflows."
    why_human: "This mutates home-scoped VPS Archon workflow state and depends on the production VPS runtime."
---

# Phase 4: ClaudeClaw Workflow Pack Verification Report

**Phase Goal:** ClaudeClaw workflow pack -- add and validate starter workflows for coding plan-to-PR, bugfix, strategy/business ingestion, ops triage, comms/content drafting, and workflow authoring.
**Verified:** 2026-05-06T03:07:58Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | FLOW-01: A ClaudeClaw coding workflow exists for plan-to-PR work with test/typecheck/build validation. | VERIFIED | `archon/workflows/claudeclaw-coding-plan-to-pr.yaml` has `FLOW-01`, `plan-to-PR`, isolated worktree cwd, guard call, `npm run typecheck`, `npm test`, `npm run build`, and PR/report output. YAML parsed with `name`, `requirement`, and 5 steps. |
| 2 | FLOW-02: A ClaudeClaw bugfix workflow exists for diagnosis, focused fix, regression check, and PR/report output. | VERIFIED | `archon/workflows/claudeclaw-bugfix.yaml` has `FLOW-02`, diagnosis, focused fix, regression check, isolated worktree cwd, guard call, typecheck, and PR/report output. YAML parsed with 5 steps. |
| 3 | FLOW-03: A strategy/business ingestion workflow exists for turning meeting notes, docs, and direction changes into canonical planning updates. | VERIFIED | `archon/workflows/claudeclaw-strategy-ingest.yaml` has `FLOW-03`, `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, canonical planning updates, and review gate. YAML parsed with 4 steps. |
| 4 | FLOW-04: An ops triage workflow exists for VPS/service health checks, log review, and safe remediation recommendations. | VERIFIED | `archon/workflows/claudeclaw-ops-triage.yaml` has `FLOW-04`, VPS/service health checks, log review, safe remediation recommendations, incident runbook, Noah approval, `systemctl --user`, and `journalctl --user`. YAML parsed with 4 steps. |
| 5 | FLOW-05: A comms/content workflow pattern exists for Poe and Cole that produces drafts/artifacts but does not send or publish without approval. | VERIFIED | `archon/workflows/claudeclaw-comms-content-draft.yaml` has `FLOW-05`, Poe, Cole, Vera, drafts/artifacts, Noah approval, and `does not send or publish without approval`. YAML parsed with 4 steps. |
| 6 | FLOW-06: A workflow-authoring path exists so agents can create, validate, and document new Archon workflows. | VERIFIED | `archon/workflows/claudeclaw-workflow-authoring.yaml` has `FLOW-06`, `archon/workflows/`, docs link, validator link, and VPS workflow discovery command. YAML parsed with 5 steps. |
| 7 | Installer copies only committed ClaudeClaw workflow sources into the Archon runtime workflow directory. | FAILED | Code review CR-01 confirmed in code: `scripts/install-archon-workflows.sh:37` uses a filesystem glob; no `git ls-files` appears in installer or validator. This contradicts `docs/claudeclaw-workflow-pack.md:30`. |
| 8 | Reinstall and rollback keep the installed ClaudeClaw workflow namespace synchronized with the committed source set. | FAILED | Code review CR-02 confirmed in code: `scripts/install-archon-workflows.sh:52-62` only installs current files; no stale removal path or validator coverage exists. |

**Score:** 6/8 must-haves verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `archon/workflows/claudeclaw-coding-plan-to-pr.yaml` | FLOW-01 workflow | VERIFIED | 53 lines; parsed as YAML; includes worktree guard and typecheck/test/build validation. |
| `archon/workflows/claudeclaw-bugfix.yaml` | FLOW-02 workflow | VERIFIED | 48 lines; parsed as YAML; includes diagnosis, focused fix, regression check, worktree guard, and PR/report output. |
| `archon/workflows/claudeclaw-strategy-ingest.yaml` | FLOW-03 workflow | VERIFIED | 41 lines; parsed as YAML; routes source material into planning surfaces with review gate. |
| `archon/workflows/claudeclaw-ops-triage.yaml` | FLOW-04 workflow | VERIFIED | 39 lines; parsed as YAML; read-only health/log checks and approval-gated remediation. |
| `archon/workflows/claudeclaw-comms-content-draft.yaml` | FLOW-05 workflow | VERIFIED | 42 lines; parsed as YAML; owner personas and outbound-effect approval gate present. |
| `archon/workflows/claudeclaw-workflow-authoring.yaml` | FLOW-06 workflow | VERIFIED | 47 lines; parsed as YAML; references source directory, docs, validator, and VPS discovery. |
| `docs/claudeclaw-workflow-pack.md` | Workflow pack operator docs | PARTIAL | Includes inventory, install, verify, safety, rollback, and exact required commands. However, installer behavior does not satisfy committed-source and rollback claims. |
| `scripts/install-archon-workflows.sh` | Dry-run capable installer | FAILED | Exists and passes `bash -n`, but review blockers remain: unconstrained glob source set and no stale installed workflow cleanup. |
| `scripts/check-archon-workflow-pack.sh` | Deterministic validator | PARTIAL | Exists, passes `bash -n`, and `npm run check:archon-workflow-pack` passes. Missing checks for committed-source install set and stale workflow cleanup. |
| `package.json` | Package script wiring | VERIFIED | `check:archon-workflow-pack` is wired to `bash scripts/check-archon-workflow-pack.sh`. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Workflow docs | Installer | `scripts/install-archon-workflows.sh --dry-run` and install command | WIRED | Docs include exact dry-run/install command at lines 24-28. |
| Workflow docs | VPS discovery | `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw` | WIRED | Docs include exact discovery command at lines 40-44 and systemd-run variant at lines 46-50. |
| Coding workflow | Safe workspace docs and guard | `docs/archon-workspaces.md`, `/home/devuser/claudeclaw-worktrees/<run-id>`, `scripts/archon-workspace-guard.sh` | WIRED | Coding workflow lines 7-10 and 28 include docs, worktree path, and guard. |
| Bugfix workflow | Safe workspace docs and guard | `docs/archon-workspaces.md`, `/home/devuser/claudeclaw-worktrees/<run-id>`, `scripts/archon-workspace-guard.sh` | WIRED | Bugfix workflow lines 7-10 and 25 include docs, worktree path, and guard. |
| `package.json` | Validator | `npm run check:archon-workflow-pack` | WIRED | Script invokes `bash scripts/check-archon-workflow-pack.sh`; command passed locally. |
| Installer | Committed source set | Expected `git ls-files` source enumeration | NOT WIRED | Installer uses a filesystem glob at line 37; no git-tracked source filtering exists. |
| Installer | Rollback/stale cleanup | Expected removal of stale installed `claudeclaw-*.yaml` files | NOT WIRED | Installer has no stale removal logic; validator has no stale-target test. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| Workflow YAML files | Static workflow definitions | Repo-owned YAML under `archon/workflows/` | Yes | VERIFIED -- parsed through `js-yaml`; names, requirements, and steps are present. |
| `scripts/check-archon-workflow-pack.sh` | Fixed workflow file/path assertions | Hardcoded source paths and grep patterns | Yes | PARTIAL -- validates the six workflow files and safety strings, but not installer source filtering or stale cleanup behavior. |
| `scripts/install-archon-workflows.sh` | `WORKFLOW_FILES` | Filesystem glob over `archon/workflows/claudeclaw-*.yaml` | No for committed-source guarantee | FAILED -- data source can include untracked or ignored files. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Workflow YAML definitions parse and expose name/requirement/steps | `node -e "... yaml.load(...)"` | All six files parsed; step counts: 4-5 each. | PASS |
| Shell scripts are syntactically valid | `bash -n scripts/install-archon-workflows.sh && bash -n scripts/check-archon-workflow-pack.sh` | Exit 0. | PASS |
| Package validator runs | `npm run check:archon-workflow-pack` | Exit 0; all configured checks passed. | PASS |
| Full project build/typecheck/test status | Orchestrator-provided results | `npm run build` passed, `npm run typecheck` passed, `npm run check:archon-workflow-pack` passed. `npm test` failed in existing unrelated areas: better-sqlite3 native ABI mismatch, missing `DB_ENCRYPTION_KEY` in schedule CLI tests, missing ffmpeg for voice tests, and existing MAIN_AGENT_ID/mock/main-vs-ezra expectations. | PASS for phase-specific checks; broader test suite has unrelated failures. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| FLOW-01 | `04-PLAN.md` | Coding workflow for plan-to-PR work with test/typecheck/build validation. | SATISFIED | `claudeclaw-coding-plan-to-pr.yaml` includes FLOW-01 and required validation commands. |
| FLOW-02 | `04-PLAN.md` | Bugfix workflow for diagnosis, focused fix, regression check, and PR/report output. | SATISFIED | `claudeclaw-bugfix.yaml` includes FLOW-02 and required bugfix stages. |
| FLOW-03 | `04-PLAN.md` | Strategy/business ingestion workflow for canonical planning updates. | SATISFIED | `claudeclaw-strategy-ingest.yaml` includes planning surfaces and review gate. |
| FLOW-04 | `04-PLAN.md` | Ops triage workflow for health checks, log review, and safe remediation recommendations. | SATISFIED | `claudeclaw-ops-triage.yaml` includes read-only health/log checks and Noah approval for effects. |
| FLOW-05 | `04-PLAN.md` | Comms/content workflow for Poe and Cole producing drafts/artifacts without send/publish without approval. | SATISFIED | `claudeclaw-comms-content-draft.yaml` includes Poe, Cole, Vera, drafts/artifacts, and approval gate. |
| FLOW-06 | `04-PLAN.md` | Workflow-authoring path to create, validate, and document new Archon workflows. | SATISFIED | `claudeclaw-workflow-authoring.yaml` includes source directory, docs, validator, and workflow list command. |

All Phase 4 requirement IDs in `.planning/REQUIREMENTS.md` are claimed by the plan and represented in workflow files/docs. No orphaned Phase 4 requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `scripts/install-archon-workflows.sh` | 37 | Filesystem glob controls install source set | BLOCKER | Can install untracked/ignored/generated workflows into the Archon runtime path, violating committed-source boundary. |
| `scripts/install-archon-workflows.sh` | 52 | Copy-only reinstall behavior | BLOCKER | Stale installed workflows remain discoverable after source rename/delete/rollback. |
| `scripts/check-archon-workflow-pack.sh` | 49-84 | Validator checks presence/strings only | WARNING | Passing validator does not cover installer committed-source filtering or stale cleanup behavior. |

### Human Verification Required

### 1. VPS Archon workflow discovery after install

**Test:** On the VPS production checkout, run `scripts/install-archon-workflows.sh --dry-run`, `scripts/install-archon-workflows.sh`, `/home/devuser/claudeclaw/scripts/archon-vps.sh workflow list --cwd /home/devuser/claudeclaw`, and the documented `systemd-run --user --wait --collect ... workflow list` command.
**Expected:** Both workflow list commands include all six `claudeclaw-*` workflow names.
**Why human:** This mutates home-scoped Archon runtime state and depends on the production VPS environment.

### Gaps Summary

The six starter workflows themselves exist, are substantive, parse as YAML, carry the correct FLOW requirement IDs, and are documented. The package-level validator also runs.

The phase still cannot pass because the code review found two BLOCKER installer issues and both are observable in the current code. The installer does not enforce the committed-source boundary documented for production workflow installation, and it does not synchronize/remediate stale installed `claudeclaw-*.yaml` files during reinstall or rollback. Phase 5 explicitly covers workflow observability and active/stale run/worktree cleanup, not the Phase 4 installer semantics, so these gaps are not deferred.

---

_Verified: 2026-05-06T03:07:58Z_
_Verifier: the agent (gsd-verifier)_

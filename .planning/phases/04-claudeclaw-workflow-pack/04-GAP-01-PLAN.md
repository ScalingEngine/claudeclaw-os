---
phase: 04-claudeclaw-workflow-pack
plan: GAP-01
title: Close workflow pack installer source and synchronization gaps
type: execute
gap_closure: true
wave: 1
depends_on:
  - 04-PLAN.md
files_modified:
  - scripts/install-archon-workflows.sh
  - scripts/check-archon-workflow-pack.sh
  - docs/claudeclaw-workflow-pack.md
autonomous: true
requirements:
  - FLOW-01
  - FLOW-02
  - FLOW-03
  - FLOW-04
  - FLOW-05
  - FLOW-06
requirements_addressed:
  - FLOW-01
  - FLOW-02
  - FLOW-03
  - FLOW-04
  - FLOW-05
  - FLOW-06
must_haves:
  truths:
    - "Installer copies only committed ClaudeClaw workflow sources into the Archon runtime workflow directory."
    - "Installer aborts before copying when committed workflow sources have unstaged dirty tracked changes or staged workflow changes."
    - "Reinstall and rollback keep the installed ClaudeClaw workflow namespace synchronized with the committed source set."
  artifacts:
    - path: "scripts/install-archon-workflows.sh"
      provides: "Clean committed-source guard, committed-source install set, and stale owned workflow cleanup"
    - path: "scripts/check-archon-workflow-pack.sh"
      provides: "Deterministic validator coverage for committed-source behavior, dirty/staged source guards, and stale cleanup"
    - path: "docs/claudeclaw-workflow-pack.md"
      provides: "Operator docs for owned namespace synchronization and rollback cleanup"
  key_links:
    - from: "scripts/install-archon-workflows.sh"
      to: "git committed workflow source set"
      via: "git -C \"$ROOT\" ls-files -z 'archon/workflows/claudeclaw-*.yaml'"
      pattern: "git -C \"\\$ROOT\" ls-files -z 'archon/workflows/claudeclaw-\\*.yaml'"
    - from: "scripts/install-archon-workflows.sh"
      to: "unstaged tracked workflow source guard"
      via: "git -C \"$ROOT\" diff --name-only -- 'archon/workflows/claudeclaw-*.yaml'"
      pattern: "git -C \"\\$ROOT\" diff --name-only -- 'archon/workflows/claudeclaw-\\*.yaml'"
    - from: "scripts/install-archon-workflows.sh"
      to: "staged workflow source guard"
      via: "git -C \"$ROOT\" diff --cached --name-only -- 'archon/workflows/claudeclaw-*.yaml'"
      pattern: "git -C \"\\$ROOT\" diff --cached --name-only -- 'archon/workflows/claudeclaw-\\*.yaml'"
    - from: "scripts/check-archon-workflow-pack.sh"
      to: "scripts/install-archon-workflows.sh"
      via: "temporary ARCHON_WORKFLOWS_DIR behavioral tests plus scoped dirty/staged workflow source probes"
      pattern: "ARCHON_WORKFLOWS_DIR=.*scripts/install-archon-workflows.sh"
---

<objective>
Close the two Phase 4 verification gaps without changing the six shipped workflow YAML sources.

Purpose: make the workflow pack installer honor the documented committed-source boundary and keep the installed `claudeclaw-*.yaml` namespace synchronized during reinstall or rollback.

Output: one gap fix across the installer, deterministic checker, and operator docs.
</objective>

<execution_context>
@/Users/nwessel/.codex/get-shit-done/workflows/execute-plan.md
@/Users/nwessel/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/04-claudeclaw-workflow-pack/04-PLAN.md
@.planning/phases/04-claudeclaw-workflow-pack/04-SUMMARY.md
@.planning/phases/04-claudeclaw-workflow-pack/04-REVIEW.md
@.planning/phases/04-claudeclaw-workflow-pack/04-VERIFICATION.md
@.planning/phases/04-claudeclaw-workflow-pack/04-RESEARCH.md
@.planning/phases/04-claudeclaw-workflow-pack/04-PATTERNS.md
@scripts/install-archon-workflows.sh
@scripts/check-archon-workflow-pack.sh
@docs/claudeclaw-workflow-pack.md
@package.json

<interfaces>
Current package command:
```json
"check:archon-workflow-pack": "bash scripts/check-archon-workflow-pack.sh"
```

Current installer inputs:
```bash
ROOT="$(git rev-parse --show-toplevel)"
SOURCE_DIR="${ROOT}/archon/workflows"
ARCHON_WORKFLOWS_DIR="${ARCHON_WORKFLOWS_DIR:-$HOME/.archon/workflows}"
DRY_RUN=0
```

Required installer source-set contract:
```bash
if git -C "$ROOT" diff --name-only -- 'archon/workflows/claudeclaw-*.yaml' | grep -q .; then
  printf 'ERROR: refusing to install with unstaged ClaudeClaw workflow source changes\n' >&2
  git -C "$ROOT" diff --name-only -- 'archon/workflows/claudeclaw-*.yaml' >&2
  exit 1
fi

if git -C "$ROOT" diff --cached --name-only -- 'archon/workflows/claudeclaw-*.yaml' | grep -q .; then
  printf 'ERROR: refusing to install with staged ClaudeClaw workflow source changes\n' >&2
  git -C "$ROOT" diff --cached --name-only -- 'archon/workflows/claudeclaw-*.yaml' >&2
  exit 1
fi

mapfile -d '' WORKFLOW_FILES < <(
  git -C "$ROOT" ls-files -z 'archon/workflows/claudeclaw-*.yaml'
)
```
</interfaces>
</context>

<tasks>

<task id="04-GAP-01-01" type="auto">
  <name>Task 1: Guard installer source cleanliness, constrain to committed workflow sources, and synchronize owned namespace</name>
  <read_first>
    - `scripts/install-archon-workflows.sh`
    - `.planning/phases/04-claudeclaw-workflow-pack/04-REVIEW.md`
    - `.planning/phases/04-claudeclaw-workflow-pack/04-VERIFICATION.md`
    - `.planning/phases/04-claudeclaw-workflow-pack/04-PATTERNS.md`
  </read_first>
  <files>scripts/install-archon-workflows.sh</files>
  <action>
    Before building the source set or copying/removing any runtime workflow files, add hard clean-source guards for the owned workflow namespace. Abort with a clear nonzero error when `git -C "$ROOT" diff --name-only -- 'archon/workflows/claudeclaw-*.yaml'` returns any path, printing a message such as `ERROR: refusing to install with unstaged ClaudeClaw workflow source changes` plus the matching paths. Abort with a clear nonzero error when `git -C "$ROOT" diff --cached --name-only -- 'archon/workflows/claudeclaw-*.yaml'` returns any path, printing a message such as `ERROR: refusing to install with staged ClaudeClaw workflow source changes` plus the matching paths. These guards are required because `git ls-files` alone does not prevent installing dirty tracked workflow contents or silently ignoring staged new workflow sources.

    Replace the filesystem glob source enumeration with `git -C "$ROOT" ls-files -z 'archon/workflows/claudeclaw-*.yaml'` exactly, per the required implementation target and CR-01. Use `mapfile -d '' WORKFLOW_FILES < <(...)`, then convert each repo-relative path to an absolute path by prefixing `"$ROOT/"`.

    Keep the existing `SOURCE_DIR` directory existence check because it gives a clear error when the repo source directory is missing. Change the empty-set error to refer to committed files, for example `ERROR: no committed claudeclaw-*.yaml files found`.

    Add synchronization for the installed owned namespace per CR-02. Build `declare -A DESIRED_WORKFLOWS=()` from `basename "$workflow_file"` for each desired committed file. Before copying desired workflows, scan only `"$ARCHON_WORKFLOWS_DIR"/claudeclaw-*.yaml` with `nullglob`; for each installed `claudeclaw-*.yaml` whose basename is not in `DESIRED_WORKFLOWS`, print `DRY-RUN: would remove stale workflow ...` during dry-run and remove it with `rm -f` plus `REMOVED: stale workflow ...` during install. Do not remove non-`claudeclaw-*.yaml` files.

    Preserve dry-run behavior: dry-run must not create `ARCHON_WORKFLOWS_DIR`, must not copy files, and must not remove stale files. Non-dry-run must create `ARCHON_WORKFLOWS_DIR` before scanning/removing/copying so a first install succeeds. Preserve the no-secret/no-live-state boundary: the script may only install repo-owned `archon/workflows/claudeclaw-*.yaml` files and must not read, print, copy, or mention copying `.env`, SQLite databases, OAuth tokens, or live agent configs.

    Optionally document in the installer error/help text that installs must run from a clean committed workflow source tree. Do not weaken the guard to a warning.

    Do not edit any `archon/workflows/claudeclaw-*.yaml` workflow source files in this task.
  </action>
  <verify>
    <automated>bash -n scripts/install-archon-workflows.sh</automated>
    <automated>grep -Fq "git -C \"\$ROOT\" diff --name-only -- 'archon/workflows/claudeclaw-*.yaml'" scripts/install-archon-workflows.sh</automated>
    <automated>grep -Fq "git -C \"\$ROOT\" diff --cached --name-only -- 'archon/workflows/claudeclaw-*.yaml'" scripts/install-archon-workflows.sh</automated>
    <automated>grep -Fq "refusing to install with unstaged ClaudeClaw workflow source changes" scripts/install-archon-workflows.sh</automated>
    <automated>grep -Fq "refusing to install with staged ClaudeClaw workflow source changes" scripts/install-archon-workflows.sh</automated>
    <automated>grep -Fq "git -C \"\$ROOT\" ls-files -z 'archon/workflows/claudeclaw-*.yaml'" scripts/install-archon-workflows.sh</automated>
    <automated>grep -Fq "declare -A DESIRED_WORKFLOWS" scripts/install-archon-workflows.sh</automated>
    <automated>grep -Fq "would remove stale workflow" scripts/install-archon-workflows.sh</automated>
    <automated>grep -Fq "REMOVED: stale workflow" scripts/install-archon-workflows.sh</automated>
    <automated>! grep -Fq 'WORKFLOW_FILES=("$SOURCE_DIR"/claudeclaw-*.yaml)' scripts/install-archon-workflows.sh</automated>
  </verify>
  <acceptance_criteria>
    - `scripts/install-archon-workflows.sh` passes `bash -n`.
    - `scripts/install-archon-workflows.sh` aborts before copying/removing when any tracked `archon/workflows/claudeclaw-*.yaml` source has unstaged content changes.
    - `scripts/install-archon-workflows.sh` aborts before copying/removing when any `archon/workflows/claudeclaw-*.yaml` source path is staged, including staged new workflow files.
    - `grep -F "git -C \"\$ROOT\" ls-files -z 'archon/workflows/claudeclaw-*.yaml'" scripts/install-archon-workflows.sh` finds the committed-source enumeration.
    - `grep -F 'WORKFLOW_FILES=("$SOURCE_DIR"/claudeclaw-*.yaml)' scripts/install-archon-workflows.sh` returns no matches.
    - `scripts/install-archon-workflows.sh` contains `declare -A DESIRED_WORKFLOWS`.
    - `scripts/install-archon-workflows.sh` contains `would remove stale workflow` and `REMOVED: stale workflow`.
    - Dry-run paths print intended stale removals without deleting files; install paths delete stale installed `claudeclaw-*.yaml` files that are not in the committed desired set.
  </acceptance_criteria>
  <done>The installer refuses dirty/staged workflow source trees, uses committed workflow files only, and synchronizes stale installed owned workflows without mutating dry-run targets.</done>
</task>

<task id="04-GAP-01-02" type="auto">
  <name>Task 2: Add deterministic validator coverage for committed-source, dirty/staged guards, and stale cleanup behavior</name>
  <read_first>
    - `scripts/check-archon-workflow-pack.sh`
    - `scripts/install-archon-workflows.sh`
    - `.planning/phases/04-claudeclaw-workflow-pack/04-REVIEW.md`
    - `.planning/phases/04-claudeclaw-workflow-pack/04-VERIFICATION.md`
    - `package.json`
  </read_first>
  <files>scripts/check-archon-workflow-pack.sh</files>
  <action>
    Extend `scripts/check-archon-workflow-pack.sh` without changing the `package.json` script. Keep the existing deterministic grep checks and add checks that the installer contains the committed-source enumeration string, the unstaged dirty-source guard string, the staged-source guard string, the stale-removal dry-run string, and the stale-removal install string.

    Add a behavioral validator section using temporary directories. Use `mktemp -d`, a `trap` cleanup, and `ARCHON_WORKFLOWS_DIR="$tmp_dir/installed"` when invoking `scripts/install-archon-workflows.sh`. The validator must create a transient untracked probe file at `archon/workflows/claudeclaw-untracked-validator-probe.yaml`, run the installer against the temporary installed directory, and assert that `"$tmp_dir/installed/claudeclaw-untracked-validator-probe.yaml"` does not exist. Remove the untracked probe through the trap.

    Add a dirty tracked workflow source probe. Choose one existing tracked workflow file, preferably `archon/workflows/claudeclaw-coding-plan-to-pr.yaml`. Before mutating it, assert that `git -C "$ROOT" diff --quiet -- "$CODING_WORKFLOW"` and `git -C "$ROOT" diff --cached --quiet -- "$CODING_WORKFLOW"` both succeed; if either check fails, print a clear `FAIL:` message and do not overwrite or restore that file. If the file is clean, copy its current contents to a temporary backup, append a test-created marker line, run the installer with a separate temporary `ARCHON_WORKFLOWS_DIR`, assert the installer exits nonzero, assert output contains `unstaged ClaudeClaw workflow source changes`, and assert the temporary target did not receive the dirty workflow content. Restore the workflow file from the temporary backup immediately after the probe and in the trap. This is the only tracked workflow mutation allowed, and it must be scoped to the validator-created marker.

    Add a staged workflow source probe. Create a transient new file named `archon/workflows/claudeclaw-staged-validator-probe.yaml`, stage only that file with `git -C "$ROOT" add -- archon/workflows/claudeclaw-staged-validator-probe.yaml`, run the installer with a separate temporary `ARCHON_WORKFLOWS_DIR`, assert the installer exits nonzero, assert output contains `staged ClaudeClaw workflow source changes`, and assert the staged probe was not installed. Cleanup must be scoped to the probe only: unstage with `git -C "$ROOT" rm --cached -- archon/workflows/claudeclaw-staged-validator-probe.yaml` or `git -C "$ROOT" restore --staged -- archon/workflows/claudeclaw-staged-validator-probe.yaml`, then remove that exact working-tree probe file. Do not run broad cleanup commands such as `git reset`, `git checkout -- archon/workflows`, or any command that can affect user-created workflow changes outside the test probe.

    In the same temporary installed directory, create `claudeclaw-stale-validator-probe.yaml` before running installer dry-run. Assert dry-run output contains `would remove stale workflow` and assert the stale file still exists after dry-run. Then run the installer without `--dry-run`, assert the stale file no longer exists, and assert expected committed workflows were installed. Also create a non-owned file such as `other-workflow.yaml` and assert it remains after install to prove cleanup is limited to the owned `claudeclaw-*.yaml` namespace.

    Use normal shell conditionals and set `FAILED=1` with clear `FAIL:` output on assertion failures. Do not leave untracked files in `archon/workflows/` after the validator exits. Do not edit any workflow YAML source files except for the transient probe created and removed inside the validator run.
  </action>
  <verify>
    <automated>bash -n scripts/check-archon-workflow-pack.sh</automated>
    <automated>npm run check:archon-workflow-pack</automated>
    <automated>grep -Fq "claudeclaw-untracked-validator-probe.yaml" scripts/check-archon-workflow-pack.sh</automated>
    <automated>grep -Fq "claudeclaw-staged-validator-probe.yaml" scripts/check-archon-workflow-pack.sh</automated>
    <automated>grep -Fq "claudeclaw-stale-validator-probe.yaml" scripts/check-archon-workflow-pack.sh</automated>
    <automated>grep -Fq "unstaged ClaudeClaw workflow source changes" scripts/check-archon-workflow-pack.sh</automated>
    <automated>grep -Fq "staged ClaudeClaw workflow source changes" scripts/check-archon-workflow-pack.sh</automated>
    <automated>grep -Fq "git -C \"\$ROOT\" diff --quiet -- \"\$CODING_WORKFLOW\"" scripts/check-archon-workflow-pack.sh</automated>
    <automated>grep -Fq "ARCHON_WORKFLOWS_DIR=" scripts/check-archon-workflow-pack.sh</automated>
  </verify>
  <acceptance_criteria>
    - `scripts/check-archon-workflow-pack.sh` passes `bash -n`.
    - `npm run check:archon-workflow-pack` exits 0 and exercises installer behavior through a temporary `ARCHON_WORKFLOWS_DIR`.
    - The checker creates and removes an untracked `archon/workflows/claudeclaw-untracked-validator-probe.yaml` probe during validation.
    - The checker fails if the installer copies the untracked probe workflow into the temporary installed directory.
    - The checker creates a test-scoped dirty tracked workflow modification, proves the installer fails with `unstaged ClaudeClaw workflow source changes`, proves dirty content is not installed, and restores the tracked workflow source.
    - The checker creates and stages only `archon/workflows/claudeclaw-staged-validator-probe.yaml`, proves the installer fails with `staged ClaudeClaw workflow source changes`, proves the staged probe is not installed, then unstages/removes only that probe.
    - The checker cleanup commands are scoped to validator-created probes and do not reset, checkout, or remove user workflow changes.
    - The checker fails if dry-run removes a stale installed `claudeclaw-*.yaml` file.
    - The checker fails if non-dry-run leaves a stale installed `claudeclaw-*.yaml` file in place.
    - The checker fails if non-dry-run removes a non-owned file such as `other-workflow.yaml`.
  </acceptance_criteria>
  <done>The workflow pack validator deterministically proves committed-source installation, dirty/staged source guard behavior, and stale owned workflow cleanup.</done>
</task>

<task id="04-GAP-01-03" type="auto">
  <name>Task 3: Document committed-source installation and owned namespace synchronization</name>
  <read_first>
    - `docs/claudeclaw-workflow-pack.md`
    - `scripts/install-archon-workflows.sh`
    - `.planning/phases/04-claudeclaw-workflow-pack/04-REVIEW.md`
    - `.planning/phases/04-claudeclaw-workflow-pack/04-VERIFICATION.md`
  </read_first>
  <files>docs/claudeclaw-workflow-pack.md</files>
  <action>
    Update the install and rollback docs to match the fixed behavior. The docs must state that installers run from a clean committed workflow source tree: staged or unstaged changes under `archon/workflows/claudeclaw-*.yaml` cause the installer to abort before copying or removing runtime workflow files. The docs must state that the installer synchronizes the owned `claudeclaw-*.yaml` namespace in `~/.archon/workflows`: it installs committed `archon/workflows/claudeclaw-*.yaml` files and removes stale installed `claudeclaw-*.yaml` files that are no longer present in the committed source set.

    Keep the no-secret/no-live-state boundary explicit: only repo-owned `archon/workflows/claudeclaw-*.yaml` files may be installed; `.env`, `~/.archon/.env`, SQLite databases, OAuth tokens, and live agent configs must not be copied, printed, installed, or committed.

    In rollback instructions, state that reinstalling a known-good commit also removes stale owned `claudeclaw-*.yaml` files from the runtime workflow directory. Keep the existing VPS validation commands and do not add any instructions to edit `~/.archon/workflows` manually.
  </action>
  <verify>
    <automated>grep -Fq 'clean committed workflow source tree' docs/claudeclaw-workflow-pack.md</automated>
    <automated>grep -Fq 'staged or unstaged changes under `archon/workflows/claudeclaw-*.yaml` cause the installer to abort' docs/claudeclaw-workflow-pack.md</automated>
    <automated>grep -Fq 'synchronizes the owned `claudeclaw-*.yaml` namespace' docs/claudeclaw-workflow-pack.md</automated>
    <automated>grep -Fq 'removes stale installed `claudeclaw-*.yaml` files' docs/claudeclaw-workflow-pack.md</automated>
    <automated>grep -Fq 'committed `archon/workflows/claudeclaw-*.yaml` files' docs/claudeclaw-workflow-pack.md</automated>
    <automated>grep -Fq 'SQLite databases' docs/claudeclaw-workflow-pack.md</automated>
    <automated>grep -Fq 'OAuth tokens' docs/claudeclaw-workflow-pack.md</automated>
  </verify>
  <acceptance_criteria>
    - `docs/claudeclaw-workflow-pack.md` states that installs run from a clean committed workflow source tree.
    - `docs/claudeclaw-workflow-pack.md` states that staged or unstaged changes under `archon/workflows/claudeclaw-*.yaml` cause the installer to abort before copying/removing runtime workflow files.
    - `docs/claudeclaw-workflow-pack.md` states that the installer synchronizes the owned `claudeclaw-*.yaml` namespace.
    - `docs/claudeclaw-workflow-pack.md` states that stale installed `claudeclaw-*.yaml` files are removed when not present in the committed source set.
    - `docs/claudeclaw-workflow-pack.md` states that rollback via reinstall of a known-good commit removes stale owned workflows.
    - `docs/claudeclaw-workflow-pack.md` preserves the no-secret/no-live-state boundary for `.env`, `~/.archon/.env`, SQLite databases, OAuth tokens, and live agent configs.
  </acceptance_criteria>
  <done>The operator docs accurately describe committed-source install, owned namespace synchronization, and rollback cleanup behavior.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| repo source -> Archon runtime workflows | Committed repo workflow files are installed into `~/.archon/workflows`, which Archon can discover and execute. |
| local working tree -> installer source set | Untracked, ignored, generated, staged, or dirty tracked workflow files may exist beside committed sources. |
| committed source set -> rollback runtime state | A known-good commit's workflow set must replace the runtime owned namespace instead of leaving stale runtime workflows discoverable. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-04-GAP-01 | Tampering / Elevation of Privilege | `scripts/install-archon-workflows.sh` source enumeration | high | mitigate | Before copying/removing, abort on `git -C "$ROOT" diff --name-only -- 'archon/workflows/claudeclaw-*.yaml'` and `git -C "$ROOT" diff --cached --name-only -- 'archon/workflows/claudeclaw-*.yaml'`; build `WORKFLOW_FILES` only from `git -C "$ROOT" ls-files -z 'archon/workflows/claudeclaw-*.yaml'`; validator covers untracked, dirty tracked, and staged workflow source probes. |
| T-04-GAP-02 | Tampering | `~/.archon/workflows/claudeclaw-*.yaml` reinstall/rollback state | high | mitigate | Installer builds a desired basename map and removes installed stale `claudeclaw-*.yaml` files not present in the committed source set; validator covers dry-run and install behavior in a temporary target directory. |
| T-04-GAP-03 | Information Disclosure | workflow install boundary | high | mitigate | Installer only copies committed repo-owned `archon/workflows/claudeclaw-*.yaml`; docs preserve the ban on copying `.env`, `~/.archon/.env`, SQLite databases, OAuth tokens, and live agent configs. |
| T-04-GAP-04 | Denial of Service | namespace cleanup | medium | mitigate | Cleanup is limited to the owned `claudeclaw-*.yaml` namespace; validator asserts a non-owned file remains after install. |
</threat_model>

<verification>
Run these commands after the tasks complete:

```bash
bash -n scripts/install-archon-workflows.sh
bash -n scripts/check-archon-workflow-pack.sh
npm run check:archon-workflow-pack
```

The validator must include temporary-directory behavioral tests that prove:
- an untracked `archon/workflows/claudeclaw-*.yaml` probe is not installed;
- a test-created dirty tracked workflow source makes the installer fail before installing dirty content, then the tracked source is restored;
- a test-created staged new `archon/workflows/claudeclaw-*-validator-probe.yaml` makes the installer fail before installing staged content, then only that probe is unstaged and removed;
- dry-run reports stale owned workflow cleanup but does not delete the stale file;
- install removes stale owned `claudeclaw-*.yaml` files not present in the committed desired set;
- install leaves non-owned workflow files in the target directory untouched.
</verification>

<success_criteria>
- The installer source set is built from `git -C "$ROOT" ls-files -z 'archon/workflows/claudeclaw-*.yaml'`.
- Installer runs only from a clean committed workflow source tree and aborts before copying/removing when `archon/workflows/claudeclaw-*.yaml` has unstaged tracked changes or staged workflow changes.
- Untracked, ignored, generated, staged, or dirty tracked `archon/workflows/claudeclaw-*.yaml` files are not installed.
- Reinstall and rollback remove stale installed `claudeclaw-*.yaml` files that are not in the committed desired set.
- Dry-run reports the same install and stale-removal actions without mutating the target directory.
- `npm run check:archon-workflow-pack` deterministically covers committed-source behavior, dirty/staged workflow source guard behavior, and stale cleanup using temporary directories.
- Documentation accurately describes owned namespace synchronization and stale workflow removal.
</success_criteria>

<output>
After completion, create `.planning/phases/04-claudeclaw-workflow-pack/04-GAP-01-SUMMARY.md`.
</output>

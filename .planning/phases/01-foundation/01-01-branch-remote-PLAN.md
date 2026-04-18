---
phase: 01-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
external_paths: []
autonomous: true
requirements: [FOUN-01]
tags: [git, branch, remote, foundation]

must_haves:
  truths:
    - "Working branch noah/main exists locally and on origin"
    - "main is a verbatim mirror of upstream/main (fast-forward compatible)"
    - "git remote -v shows origin = ScalingEngine/claudeclaw-os and upstream = earlyaidopters/claudeclaw-os"
    - "All prior .planning/ commits are reachable from noah/main HEAD"
  artifacts:
    - path: ".git/refs/heads/noah/main"
      provides: "Local noah/main branch reference"
      contains: "git SHA"
    - path: ".git/refs/remotes/origin/noah/main"
      provides: "Remote tracking branch for noah/main on origin"
      contains: "git SHA"
  key_links:
    - from: "noah/main"
      to: "upstream/main"
      via: "divergence point (upstream commits + Noah's .planning/ commits)"
      pattern: "git merge-base noah/main upstream/main"
    - from: "main"
      to: "upstream/main"
      via: "fast-forward compatible (no Noah-specific commits on main)"
      pattern: "git rev-list --count main..upstream/main should equal 0 or be purely additive"
---

<objective>
Cut `noah/main` as Noah's working branch, move the existing `.planning/` commits onto it, keep `main` as a verbatim upstream mirror, and push `noah/main` to origin so Phase 1 subsequent plans can commit against it.

Purpose: Satisfy FOUN-01 and implement D-01 from CONTEXT.md. Separating Noah's work onto `noah/main` keeps `git fetch upstream && git merge upstream/main` onto `main` a clean fast-forward forever, minimizing upstream churn conflicts.

Output: `noah/main` branch exists locally and on origin, contains all prior `.planning/` commits plus upstream history, is the active working branch. `main` remains aligned with `upstream/main` so upstream sync is trivial.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-foundation/01-CONTEXT.md

<interfaces>
<!-- Current git state the executor needs. Verified by planner: 2026-04-18 -->
Current branch: main
Remotes:
  origin   https://github.com/ScalingEngine/claudeclaw-os.git
  upstream https://github.com/earlyaidopters/claudeclaw-os.git
Recent commits on main (Noah-specific .planning/ commits at top of history):
  bf0230e docs(state): record phase 1 context session
  809095e docs(01): capture phase context
  d70c722 docs: create roadmap (9 phases)
  3d13986 docs: define v1 requirements
  9dfcaa6 chore: add project config
  29714a6 docs: initialize project
  008d6b0 docs: keep only fresh-install prompt in README   <-- first upstream commit below here
  ...

The 6 Noah-specific commits (29714a6..bf0230e) that touch .planning/ and CLAUDE.md can stay in main's history OR be isolated to noah/main. Per D-01 they must live on noah/main, and main must be resettable to match upstream/main.

Implementation strategy (simplest that satisfies D-01):
  Step 1: Create noah/main pointing at current HEAD (bf0230e). All .planning/ commits ride along.
  Step 2: Reset local main to upstream/main (so main == verbatim upstream mirror).
  Step 3: Push noah/main to origin with upstream tracking.
  Step 4: Force-push main to origin ONLY IF it is diverged (requires user approval — see checkpoint).

Verify upstream/main SHA before resetting main to ensure we're aligning to the right target.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create noah/main branch at current HEAD and push to origin</name>
  <files></files>
  <read_first>
    - .planning/phases/01-foundation/01-CONTEXT.md (D-01 decision text)
    - .git/HEAD (confirms we start from main)
  </read_first>
  <action>
    Execute these git commands in sequence from the repo root (/Users/nwessel/ClaudeCode/claudeclaw-os):

    1. Fetch upstream to ensure we have latest upstream/main refs:
       `git fetch upstream`
    2. Confirm current HEAD SHA and branch (expect `main` with HEAD at bf0230e or later):
       `git rev-parse HEAD && git rev-parse --abbrev-ref HEAD`
    3. Create noah/main branch pointing at current HEAD (carries all 6 Noah-specific .planning/ commits forward):
       `git branch noah/main`
    4. Checkout noah/main as the active working branch:
       `git checkout noah/main`
    5. Push noah/main to origin with upstream tracking (so origin/noah/main exists and `git push` works without args):
       `git push -u origin noah/main`

    Do NOT delete or force-push main in this task. Task 2 handles main-alignment.
    Do NOT modify any files. Git-only operations.
  </action>
  <verify>
    <automated>git rev-parse --abbrev-ref HEAD | grep -qx 'noah/main' && git ls-remote --heads origin noah/main | grep -q 'refs/heads/noah/main' && git log --oneline noah/main | head -6 | grep -q 'record phase 1 context'</automated>
  </verify>
  <acceptance_criteria>
    - `git branch --list noah/main` output contains `noah/main`
    - `git rev-parse --abbrev-ref HEAD` returns exactly `noah/main`
    - `git ls-remote --heads origin noah/main` contains `refs/heads/noah/main`
    - `git log --oneline -6 noah/main` contains `bf0230e`, `809095e`, `d70c722`, `3d13986`, `9dfcaa6`, `29714a6` in order (newest first)
    - `git config branch.noah/main.remote` returns `origin`
    - `git config branch.noah/main.merge` returns `refs/heads/noah/main`
  </acceptance_criteria>
  <done>noah/main exists locally + on origin, tracks origin/noah/main, contains all prior .planning/ commits, is the active branch.</done>
</task>

<task type="checkpoint:decision" gate="blocking">
  <name>Task 2: Decide main-alignment strategy with Noah</name>
  <decision>How to align local `main` with `upstream/main` per D-01 (main as verbatim upstream mirror)</decision>
  <context>
    Local `main` currently has 6 Noah-specific commits (29714a6..bf0230e) that do NOT exist on upstream/main. These are now also on `noah/main` (carried forward by Task 1). To make `main` a verbatim upstream mirror per D-01, we must remove those commits from `main`.

    This is destructive to `main`'s history. Origin's `main` branch currently matches upstream/main's history PLUS Noah's 6 commits (same as local main). Resetting local `main` to `upstream/main` and force-pushing would rewrite origin/main's history.

    Alternative: leave origin/main untouched and only reset local main (the 6 commits stay on origin/main but are also preserved on noah/main). Upstream-sync still works fast-forward because noah/main is where actual work happens.
  </context>
  <options>
    <option id="option-a">
      <name>Force-push reset (strict D-01 interpretation)</name>
      <pros>main is literally identical to upstream/main everywhere (local + origin). Clean D-01 compliance.</pros>
      <cons>Rewrites origin/main history. Requires `git push --force-with-lease origin main`. Destructive — only safe because the 6 commits are preserved on noah/main + origin/noah/main.</cons>
    </option>
    <option id="option-b">
      <name>Local-only reset (pragmatic)</name>
      <pros>Non-destructive. origin/main retains the 6 .planning/ commits as a backup. Future `git fetch upstream && git merge upstream/main` into local main still fast-forwards.</pros>
      <cons>origin/main diverges from upstream/main (has extra commits). Partial D-01 compliance.</cons>
    </option>
    <option id="option-c">
      <name>Skip main-alignment entirely (defer to Phase 5/6 upstream-sync work)</name>
      <pros>Zero risk in Phase 1. noah/main is the working branch; main's state does not block any FOUN criterion.</pros>
      <cons>D-01 not fully satisfied until later. First upstream sync will require manual handling of the 6 commits on main.</cons>
    </option>
  </options>
  <resume-signal>Select: option-a, option-b, or option-c</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Execute main-alignment per Noah's decision</name>
  <files></files>
  <read_first>
    - .planning/phases/01-foundation/01-CONTEXT.md (D-01)
    - Task 2 decision outcome
  </read_first>
  <action>
    Execute the branch chosen in Task 2:

    **If option-a (force-push reset):**
    ```
    git fetch upstream
    git checkout main
    git reset --hard upstream/main
    git push --force-with-lease origin main
    git checkout noah/main
    ```

    **If option-b (local-only reset):**
    ```
    git fetch upstream
    git checkout main
    git reset --hard upstream/main
    git checkout noah/main
    ```
    Do NOT push main to origin. origin/main retains its current state.

    **If option-c (skip):**
    No-op. Document in plan summary that main-alignment was deferred.

    After execution, return to noah/main and confirm: `git rev-parse --abbrev-ref HEAD` must print `noah/main`.
  </action>
  <verify>
    <automated>git rev-parse --abbrev-ref HEAD | grep -qx 'noah/main' && git remote -v | grep -q 'origin\s\+https://github.com/ScalingEngine/claudeclaw-os' && git remote -v | grep -q 'upstream\s\+https://github.com/earlyaidopters/claudeclaw-os'</automated>
  </verify>
  <acceptance_criteria>
    - Active branch is `noah/main` (`git rev-parse --abbrev-ref HEAD` == `noah/main`)
    - `git remote -v` contains a line matching `origin\s+https://github.com/ScalingEngine/claudeclaw-os`
    - `git remote -v` contains a line matching `upstream\s+https://github.com/earlyaidopters/claudeclaw-os`
    - If option-a OR option-b selected: `git rev-parse main` == `git rev-parse upstream/main` (main is a verbatim upstream mirror locally)
    - If option-a selected: `git ls-remote origin main` SHA equals local `upstream/main` SHA
    - Noah's 6 prior commits are present on noah/main: `git log --oneline noah/main | grep -q 'chore: add project config'`
    - If option-c selected: note in SUMMARY.md that main-alignment deferred, and `git log --oneline main` still shows the 6 Noah commits
  </acceptance_criteria>
  <done>Decision executed, working branch is noah/main, remotes intact, main-state matches the chosen option.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Local repo → origin (GitHub) | Authenticated push via Noah's GitHub credentials/token. |
| Local repo → upstream (GitHub) | Read-only fetch; never push. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering | origin/main history | mitigate (if option-a) | Use `--force-with-lease` (not `--force`) so push rejects if origin moved underneath us. |
| T-01-02 | Repudiation | Commit attribution | accept | Git already signs commits with `user.name`/`user.email`; no additional action required. |
| T-01-03 | Information disclosure | upstream push | accept | upstream remote is read-only for Noah; no risk of accidental write. |
| T-01-04 | Elevation of privilege | force-push to main | mitigate (if option-a) | Explicit user decision via checkpoint Task 2 required before destructive op. |
</threat_model>

<verification>
- `git rev-parse --abbrev-ref HEAD` returns `noah/main`
- `git remote -v` shows origin (ScalingEngine) + upstream (earlyaidopters)
- `git ls-remote --heads origin noah/main` exists
- Prior `.planning/` commits preserved on noah/main
</verification>

<success_criteria>
FOUN-01 satisfied: fork configured with noah/main working branch and upstream remote available for fast-forward merges.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-01-SUMMARY.md`
</output>

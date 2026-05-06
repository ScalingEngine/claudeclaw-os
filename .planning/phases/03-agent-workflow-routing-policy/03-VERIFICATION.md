---
phase: 03-agent-workflow-routing-policy
verified: 2026-05-06T01:57:43Z
status: passed
score: "5/5 must-haves verified"
overrides_applied: 0
---

# Phase 03: Agent Workflow Routing Policy Verification Report

**Phase Goal:** Agent workflow routing policy -- create a committed workflow routing policy for ClaudeClaw agents and wire it into the main template, specialist template, War Room personas, and deterministic validation.
**Verified:** 2026-05-06T01:57:43Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ROUT-01: Ezra has a written routing rule for direct answer vs skill/react loop vs Archon workflow. | VERIFIED | `docs/agent-workflow-routing.md` defines the three-lane ladder and Ezra matrix row; `CLAUDE.md.example` includes Ezra/main routing guidance with ROUT-01. |
| 2 | ROUT-02: Vera, Poe, Cole, Hopper, and Archie each have role-specific guidance for when to launch or recommend an Archon workflow. | VERIFIED | Persona matrix covers all five specialists; `warroom/personas.py` gives each specialist role-specific Archon guidance. |
| 3 | ROUT-03: Agents use skills and react loops for one-off tasks and quick repeatable actions. | VERIFIED | Policy, main template, specialist template, and War Room shared rules all contain Skill/react loop guidance for one-off or quick repeatable work. |
| 4 | ROUT-04: Agents use Archon workflows for coding and business processes that require phases, gates, artifacts, approvals, retries, or repeatability. | VERIFIED | Policy, templates, and War Room shared rules reserve Archon for durable workflow work with phases, gates, artifacts, approvals, retries, or repeatability. |
| 5 | ROUT-05: Ambiguous external-effect workflows require Noah approval before sending, posting, deploying, closing issues, or mutating production data. | VERIFIED | Policy, templates, and War Room shared rules require Noah approval for ambiguous sending, posting, deploying, closing issues, or production data mutation. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `docs/agent-workflow-routing.md` | Canonical routing policy | VERIFIED | 65 lines; contains scope, routing ladder, persona matrix, approval gate, Archon safety preconditions, and verification commands. Tracked in git. |
| `scripts/check-agent-workflow-routing.sh` | Deterministic validator | VERIFIED | 121 lines; executable; checks policy, templates, War Room personas, canonical roster IDs, and stale legacy routing examples. Tracked in git. |
| `CLAUDE.md.example` | Main/Ezra template routing guidance | VERIFIED | Contains `## Workflow routing`, ROUT-01/03/04/05, canonical policy reference, and canonical delegation roster IDs. Tracked in git. |
| `agents/_template/CLAUDE.md` | Specialist template routing guidance | VERIFIED | Contains `## Workflow routing`, ROUT-02/03/04/05, canonical policy reference, and external-effect approval language. Tracked in git. |
| `warroom/personas.py` | Compact War Room persona alignment | VERIFIED | Canonical personas declare `ezra`, `vera`, `poe`, `cole`, `hopper`, `archie`; legacy aliases map internally to canonical prompts; auto-router renders canonical IDs. Tracked in git. |
| `package.json` | npm validation entrypoint | VERIFIED | Exposes `check:agent-workflow-routing`: `bash scripts/check-agent-workflow-routing.sh`. Tracked in git. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `docs/agent-workflow-routing.md` | `docs/archon-workspaces.md` | Archon safety preconditions | WIRED | Policy requires coding workflows to follow `docs/archon-workspaces.md`, use `/home/devuser/claudeclaw-worktrees/<run-id>`, and pass `scripts/archon-workspace-guard.sh` before workflow start. |
| `package.json` | `scripts/check-agent-workflow-routing.sh` | npm script | WIRED | `npm run check:agent-workflow-routing` invokes the validator and passed. |
| `CLAUDE.md.example` | `docs/agent-workflow-routing.md` | Main template routing section | WIRED | Main template names the canonical policy and tells agents how to resolve the repo root before reading it. |
| `agents/_template/CLAUDE.md` | `docs/agent-workflow-routing.md` | Specialist template routing section | WIRED | Specialist template names the canonical policy and covers direct answer, skill/react loop, Archon workflow, and Noah approval. |
| `warroom/personas.py` | Canonical War Room roster | `AGENT_PERSONAS`, `_legacy_to_current`, auto-router roster | WIRED | Runtime spot-check confirmed legacy aliases resolve to canonical prompt text and legacy roster input renders canonical auto-router IDs. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `warroom/personas.py` | Persona prompt selected by `get_persona(agent_id, mode)` | `AGENT_PERSONAS`, `_generate_persona`, `_build_auto_roster_block` | Yes | FLOWING -- import/runtime check returned canonical and legacy personas, plus canonical auto-router roster output. |
| Policy and template markdown | N/A | Static committed prompt policy | N/A | VERIFIED -- no dynamic render path required. |
| `scripts/check-agent-workflow-routing.sh` | Validation result | File content checks plus Python persona import check | Yes | FLOWING -- command executed and reported pass. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Deterministic routing validator passes | `npm run check:agent-workflow-routing` | Validator printed all OK checks and `Agent workflow routing check passed.` | PASS |
| TypeScript project still typechecks | `npm run typecheck` | Exit 0 | PASS |
| War Room personas compile | `python3 -m py_compile warroom/personas.py` | Exit 0 | PASS |
| Validation script is syntactically valid and executable | `bash -n scripts/check-agent-workflow-routing.sh`; `test -x scripts/check-agent-workflow-routing.sh` | Exit 0; executable=0 | PASS |
| Canonical roster IDs and compatibility aliases are coherent | Python import check with mocked legacy roster JSON | Printed `War Room canonical IDs and legacy aliases coherent` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ROUT-01 | `03-PLAN.md` | Ezra has a written routing rule for direct answer vs skill/react loop vs Archon workflow. | SATISFIED | Policy Ezra row, main template ROUT-01 entry, War Room Ezra persona and shared routing rules. |
| ROUT-02 | `03-PLAN.md` | Vera, Poe, Cole, Hopper, and Archie each have role-specific guidance for when to launch or recommend an Archon workflow. | SATISFIED | Policy persona matrix and War Room specialist persona strings cover each named specialist. |
| ROUT-03 | `03-PLAN.md` | Agents use skills and react loops for one-off tasks and quick repeatable actions. | SATISFIED | Policy, templates, War Room shared rules, and validator checks all include Skill/react loop guidance. |
| ROUT-04 | `03-PLAN.md` | Agents use Archon workflows for coding and business processes that require phases, gates, artifacts, approvals, retries, or repeatability. | SATISFIED | Policy, templates, War Room shared rules, and validator checks all include durable Archon workflow criteria. |
| ROUT-05 | `03-PLAN.md` | Ambiguous external-effect workflows require Noah approval before sending, posting, deploying, closing issues, or mutating production data. | SATISFIED | Policy, templates, and War Room shared rules include the required approval language; validator checks for `Noah approval`. |

No orphaned Phase 3 requirement IDs were found in `.planning/REQUIREMENTS.md`; ROUT-01 through ROUT-05 are the complete Phase 3 set.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | N/A | N/A | N/A | `rg` scan found no TODO/FIXME/placeholders, empty returns, or console-only implementation patterns in changed artifacts. |

### Human Verification Required

None. The phase deliverables are committed documentation, prompt surfaces, and deterministic validation; all requested checks are programmatically verifiable.

### Gaps Summary

No blocking gaps found. The workflow routing policy exists, is committed, is wired into the main and specialist templates, is reflected in War Room compact personas, and is covered by the npm validator. Canonical War Room roster IDs and legacy aliases are coherent.

---

_Verified: 2026-05-06T01:57:43Z_
_Verifier: the agent (gsd-verifier)_

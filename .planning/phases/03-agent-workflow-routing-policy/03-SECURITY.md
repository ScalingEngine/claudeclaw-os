---
phase: 03-agent-workflow-routing-policy
slug: agent-workflow-routing-policy
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-06T02:16:04Z
updated: 2026-05-06T02:16:04Z
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Prompt routing policy boundary | Committed policy and templates instruct agents when to answer directly, use skills/react loops, or launch Archon workflows. | User intent, routing decisions, workflow launch criteria |
| External-effect boundary | Agents may draft or execute actions that send, post, deploy, close issues, or mutate production data. | User approval, target system, external side effects |
| Archon coding workspace boundary | Routing guidance can recommend coding workflows that must not run against production checkout state. | Code changes, workspace paths, production-adjacent files |
| War Room compact prompt boundary | `warroom/personas.py` condenses routing behavior for live War Room agents and auto-router prompts. | Persona identity, delegation target IDs, routing examples |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-01 | Process abuse / availability | Routing policy, templates, War Room prompts | mitigate | `docs/agent-workflow-routing.md`, `CLAUDE.md.example`, `agents/_template/CLAUDE.md`, and `warroom/personas.py` make Direct answer the first lane, Skill/react loop the second lane, and Archon workflow the durable gated-work lane. `npm run check:agent-workflow-routing` verifies those lane names across committed prompt surfaces. | closed |
| T-02 | External-effect escalation | Templates and War Room shared rules | mitigate | Policy, main template, specialist template, and War Room shared rules require Noah approval before ambiguous sending, posting, deploying, closing issues, or mutating production data. Same-turn approval is scoped to the named effect and scope. | closed |
| T-03 | Unsafe coding workflow launch | Agent workflow policy and Archie persona | mitigate | `docs/agent-workflow-routing.md` points coding workflows to `docs/archon-workspaces.md`, requires `/home/devuser/claudeclaw-worktrees/<run-id>`, requires `scripts/archon-workspace-guard.sh`, and states `Coding workflows must not run against /home/devuser/claudeclaw.` Archie's War Room persona repeats the safe-workspace rule. | closed |
| T-04 | Split-brain prompt behavior | Policy, templates, War Room personas, validator | mitigate | `scripts/check-agent-workflow-routing.sh` and `package.json` provide `npm run check:agent-workflow-routing`, validating policy lanes, requirement coverage, persona-role mapping, canonical roster IDs, auto-router output, and stale legacy routing examples. Post-review hardening removed legacy active prompt examples and records a clean code review in `03-REVIEW.md`. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-06 | 4 | 4 | 0 | Codex secure-phase |

---

## Verification Evidence

- `npm run check:agent-workflow-routing` — passed
- `npm run typecheck` — passed
- `python3 -m py_compile warroom/personas.py` — passed
- `03-VERIFICATION.md` reports Phase 03 status `passed` with `5/5 must-haves verified`.
- `03-REVIEW.md` reports status `clean` after post-review canonical ID hardening.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-06

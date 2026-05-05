# Requirements: ClaudeClaw

**Defined:** 2026-05-05
**Core Value:** One front door (Ezra) for the whole knowledge-work surface, with five specialists, persistent memory, and unified dashboard.

## v1.1 Requirements

### Archon Runtime

- [x] **ARCH-01**: Each ClaudeClaw agent can invoke Archon from its VPS runtime environment without relying on an interactive shell profile.
- [x] **ARCH-02**: Agents can list available Archon workflows for `/home/devuser/claudeclaw` and receive a successful result.
- [x] **ARCH-03**: Archon home-scoped workflows are stored in the current supported path (`~/.archon/workflows/`) with no legacy path warning.
- [x] **ARCH-04**: The configured Archon invocation path loads credentials from `~/.archon/.env` without exposing secrets in prompts, logs, or git.

### Workflow Routing

- [ ] **ROUT-01**: Ezra has a written routing rule for direct answer vs skill/react loop vs Archon workflow.
- [ ] **ROUT-02**: Vera, Poe, Cole, Hopper, and Archie each have role-specific guidance for when to launch or recommend an Archon workflow.
- [ ] **ROUT-03**: Agents use skills and react loops for one-off tasks and quick repeatable actions.
- [ ] **ROUT-04**: Agents use Archon workflows for coding and business processes that require phases, gates, artifacts, approvals, retries, or repeatability.
- [ ] **ROUT-05**: Ambiguous external-effect workflows require Noah approval before sending, posting, deploying, closing issues, or mutating production data.

### Safe Workspaces

- [x] **SAFE-01**: Archon coding workflows run in isolated worktrees or a non-production workspace, not directly in `/home/devuser/claudeclaw`.
- [x] **SAFE-02**: Production `.env`, SQLite databases, OAuth tokens, and live agent configs are never copied into Archon worktrees.
- [x] **SAFE-03**: ClaudeClaw deploy remains commit-based: production pulls known-good branches or commits after validation.
- [x] **SAFE-04**: Rollback and verification commands are documented for any workflow that touches production-adjacent code or config.

### Workflow Pack

- [ ] **FLOW-01**: A ClaudeClaw coding workflow exists for plan-to-PR work with test/typecheck/build validation.
- [ ] **FLOW-02**: A ClaudeClaw bugfix workflow exists for diagnosis, focused fix, regression check, and PR/report output.
- [ ] **FLOW-03**: A strategy/business ingestion workflow exists for turning meeting notes, docs, and direction changes into canonical planning updates.
- [ ] **FLOW-04**: An ops triage workflow exists for VPS/service health checks, log review, and safe remediation recommendations.
- [ ] **FLOW-05**: A comms/content workflow pattern exists for Poe and Cole that produces drafts/artifacts but does not send or publish without approval.
- [ ] **FLOW-06**: A workflow-authoring path exists so agents can create, validate, and document new Archon workflows.

### Observability

- [ ] **OBS-01**: Archon workflow launches and completions are visible in ClaudeClaw conversation output or hive_mind-style activity records.
- [ ] **OBS-02**: Failed Archon workflow runs report the workflow name, run ID or branch, failing node, and next recovery action.
- [ ] **OBS-03**: Archie and Hopper can inspect active Archon worktrees/runs and clean up stale isolated work safely.

## Future Requirements

### Platform Integration

- **PLAT-01**: Telegram/Slack commands can launch Archon workflows through a first-class ClaudeClaw command surface.
- **PLAT-02**: ClaudeClaw dashboard shows Archon runs as first-class mission/control activity.
- **PLAT-03**: Cross-process delegation queue can dispatch tasks into Archon workflows when a durable process is required.

### Advanced Orchestration

- **ORCH-01**: Agents can select Archon workflows through a classifier rather than hardcoded prompt guidance.
- **ORCH-02**: Sandcastle can be evaluated as a lower-level sandbox provider only if Archon cannot satisfy isolation or parallelism needs.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Sandcastle implementation | Archon is the selected v1.1 workflow engine. |
| Replacing ClaudeClaw's Telegram/Slack transports with Archon adapters | This milestone wires Archon as workflow engine, not as the primary user interface. |
| Production deploy automation without approval | Noah remains the approval gate for deploys and external effects. |
| Moving live agent config into git | VPS agent overlays remain production-local and gitignored. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 1 | Complete |
| ARCH-02 | Phase 1 | Complete |
| ARCH-03 | Phase 1 | Complete |
| ARCH-04 | Phase 1 | Complete |
| SAFE-01 | Phase 2 | Complete |
| SAFE-02 | Phase 2 | Complete |
| SAFE-03 | Phase 2 | Complete |
| SAFE-04 | Phase 2 | Complete |
| ROUT-01 | Phase 3 | Pending |
| ROUT-02 | Phase 3 | Pending |
| ROUT-03 | Phase 3 | Pending |
| ROUT-04 | Phase 3 | Pending |
| ROUT-05 | Phase 3 | Pending |
| FLOW-01 | Phase 4 | Pending |
| FLOW-02 | Phase 4 | Pending |
| FLOW-03 | Phase 4 | Pending |
| FLOW-04 | Phase 4 | Pending |
| FLOW-05 | Phase 4 | Pending |
| FLOW-06 | Phase 4 | Pending |
| OBS-01 | Phase 5 | Pending |
| OBS-02 | Phase 5 | Pending |
| OBS-03 | Phase 5 | Pending |

**Coverage:**
- v1.1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-05 after initial definition*

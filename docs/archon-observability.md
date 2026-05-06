# Archon Workflow Observability

ClaudeClaw agents use this contract when an Archon workflow starts, completes, fails, or leaves stale isolated work that Archie or Hopper need to inspect.

## Reporting Contract

OBS-01 is satisfied when Archon workflow launches and completions are visible through ClaudeClaw conversation output, live dashboard events, or hive_mind activity records.

OBS-02 is satisfied when every failed Archon workflow report includes workflow name, run ID or branch, failing node, and recovery action.

OBS-03 is satisfied when Archie and Hopper can inspect active Archon worktrees/runs and clean up stale isolated work safely under Archon-managed `~/.archon/workspaces/.../worktrees/...` paths or the legacy/manual `/home/devuser/claudeclaw-worktrees` root.

Agents should call the observability CLI from the ClaudeClaw repository after the TypeScript build is available. The helper writes durable hive_mind rows and emits live chat/dashboard events.

## CLI Commands

Record a workflow start:

```bash
node dist/archon-observability-cli.js start --workflow claudeclaw-coding-plan-to-pr --run-id 202605061700-code --chat-id "$CHAT_ID" --agent archie
```

Record a workflow completion:

```bash
node dist/archon-observability-cli.js complete --workflow claudeclaw-coding-plan-to-pr --branch archon/202605061700-code --chat-id "$CHAT_ID" --agent archie
```

Record a workflow failure:

```bash
node dist/archon-observability-cli.js fail --workflow claudeclaw-bugfix --run-id 202605061700-bug --chat-id "$CHAT_ID" --agent archie --node regression-check --recovery "Fix failing tests in the worktree, rerun npm test, then retry from regression-check"
```

Successful CLI output begins with `archon workflow event recorded:`.

## Failure Report Fields

Failed workflow reports must include these exact labels:

```text
workflow:
run_id:
branch:
failing_node:
recovery_action:
```

Use `run_id:` when a run ID is known. Use `branch:` when only a review branch is known. Every failed report must include one of `run_id:` or `branch:`.

## Agent Response Requirements

When launching or recommending an Archon workflow, agents should report workflow starts, completions, and failures. User-visible failure responses must include the workflow name, run ID or branch, failing node, and recovery action.

Agents should link back to this file, `docs/archon-observability.md`, when explaining the contract or when handing off an issue to Archie or Hopper.

## Safe Inspection and Cleanup

Archie and Hopper can inspect active and stale isolated work with:

```bash
scripts/archon-runs.sh list
scripts/archon-runs.sh stale --older-than-hours 24
scripts/archon-runs.sh cleanup --older-than-hours 24
scripts/archon-runs.sh cleanup --older-than-hours 24 --force
```

Cleanup is dry-run by default. Dry-run output contains `DRY-RUN: would remove stale Archon worktree`. Forced cleanup of a stale clean worktree prints `REMOVED: stale Archon worktree`. Forced cleanup of a dirty worktree refuses removal and prints `dirty worktree; not removing`.

The production checkout is `/home/devuser/claudeclaw`. Cleanup must refuse that path and operate only under Archon-managed `~/.archon/workspaces/.../worktrees/...` paths or the legacy/manual `/home/devuser/claudeclaw-worktrees` root.

## Validation

Run:

```bash
npm run check:archon-observability
npm run test:archon-runs
npm run typecheck
npm test
```

After deploy on the VPS, run `cd /home/devuser/claudeclaw && scripts/archon-runs.sh list`, then `scripts/archon-runs.sh stale --older-than-hours 24`. Review stale output before running `scripts/archon-runs.sh cleanup --older-than-hours 24 --force`.

## Safety Rules

- Do not print, copy, or commit `.env`, `~/.archon/.env`, SQLite contents, OAuth tokens, or live agent configs.
- Do not run cleanup against `/home/devuser/claudeclaw`.
- Do not remove dirty worktrees.
- Do not deploy, restart services, send messages, publish, close issues, or mutate production data unless Noah approval names the exact effect and scope.

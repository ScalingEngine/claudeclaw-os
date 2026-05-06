#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
FAILED=0

check_file_contains() {
  local file="$1"
  local pattern="$2"
  local label="${3:-$pattern}"

  if grep -Fq -- "$pattern" "$ROOT/$file"; then
    printf 'OK: %s contains %s\n' "$file" "$label"
  else
    printf 'FAIL: %s missing %s\n' "$file" "$label" >&2
    FAILED=1
  fi
}

finish() {
  if [ "$FAILED" -ne 0 ]; then
    printf 'Agent workflow routing check failed.\n' >&2
    exit 1
  fi

  printf 'Agent workflow routing check passed.\n'
}

check_file_contains "docs/agent-workflow-routing.md" "Direct answer"
check_file_contains "docs/agent-workflow-routing.md" "Skill/react loop"
check_file_contains "docs/agent-workflow-routing.md" "Archon workflow"
check_file_contains "docs/agent-workflow-routing.md" "Ezra"
check_file_contains "docs/agent-workflow-routing.md" "Vera"
check_file_contains "docs/agent-workflow-routing.md" "Poe"
check_file_contains "docs/agent-workflow-routing.md" "Cole"
check_file_contains "docs/agent-workflow-routing.md" "Hopper"
check_file_contains "docs/agent-workflow-routing.md" "Archie"
check_file_contains "docs/agent-workflow-routing.md" "Noah approval"
check_file_contains "docs/agent-workflow-routing.md" "docs/archon-workspaces.md"
check_file_contains "docs/agent-workflow-routing.md" "Coding workflows must not run against /home/devuser/claudeclaw."
check_file_contains "docs/agent-workflow-routing.md" "| Vera | Communications."
check_file_contains "docs/agent-workflow-routing.md" "| Poe | Content."
check_file_contains "docs/agent-workflow-routing.md" "| Cole | Research/strategy."
check_file_contains "docs/agent-workflow-routing.md" "| Archie | Engineering/workflow authoring."

check_file_contains "CLAUDE.md.example" "Workflow routing"
check_file_contains "CLAUDE.md.example" "git rev-parse --show-toplevel"
check_file_contains "CLAUDE.md.example" "--agent cole"
check_file_contains "CLAUDE.md.example" "Available agents: ezra, vera, poe, cole, hopper, archie"
check_file_contains "CLAUDE.md.example" "ROUT-01"
check_file_contains "CLAUDE.md.example" "ROUT-03"
check_file_contains "CLAUDE.md.example" "ROUT-04"
check_file_contains "CLAUDE.md.example" "ROUT-05"

check_file_contains "agents/_template/CLAUDE.md" "Workflow routing"
check_file_contains "agents/_template/CLAUDE.md" "external agent config directory"
check_file_contains "agents/_template/CLAUDE.md" "ROUT-02"
check_file_contains "agents/_template/CLAUDE.md" "ROUT-03"
check_file_contains "agents/_template/CLAUDE.md" "ROUT-04"
check_file_contains "agents/_template/CLAUDE.md" "ROUT-05"

check_file_contains "warroom/personas.py" "Direct answer"
check_file_contains "warroom/personas.py" "Skill/react loop"
check_file_contains "warroom/personas.py" "Archon workflow"
check_file_contains "warroom/personas.py" "Noah approval"

if ! python3 - <<'PY'
from warroom.personas import get_persona

checks = {
    "ezra": ("Ezra", "Your agent id is ezra", "Direct answer", "Archon workflow"),
    "vera": ("Vera", "Communications", "Noah approval"),
    "poe": ("Poe", "Content", "Publishing"),
    "cole": ("Cole", "Research and Strategy", "research programs"),
    "hopper": ("Hopper", "Ops", "Production mutations"),
    "archie": ("Archie", "Engineering", "docs/archon-workspaces.md"),
}

for agent_id, expected in checks.items():
    persona = get_persona(agent_id)
    missing = [text for text in expected if text not in persona]
    if missing:
        raise SystemExit(f"{agent_id} persona missing: {', '.join(missing)}")

auto = get_persona("ezra", mode="auto")
for text in ("- ezra:", "- vera:", "- poe:", "- cole:", "- hopper:", "- archie:"):
    if text not in auto:
        raise SystemExit(f"auto roster missing {text}")

if "Your agent id is main" in get_persona("ezra"):
    raise SystemExit("ezra persona still declares legacy main id")

for legacy in ("- main:", "- research:", "- comms:", "- content:", "- ops:", "- code:"):
    if legacy in auto:
        raise SystemExit(f"auto roster still advertises legacy id: {legacy}")

prompt = ("\n".join(
    get_persona(agent_id)
    for agent_id in ("ezra", "vera", "poe", "cole", "hopper", "archie")
) + "\n" + auto).lower()

legacy_examples = (
    "have research",
    "loop in research",
    "kick that to comms",
    "kicked it over to research",
    "research, what's",
    "ask ops",
)
for legacy in legacy_examples:
    if legacy in prompt:
        raise SystemExit(f"active persona prompt still contains legacy routing example: {legacy}")
PY
then
  printf 'FAIL: warroom persona routing checks failed\n' >&2
  FAILED=1
else
  printf 'OK: warroom persona routing checks passed\n'
fi

finish

# ClaudeClaw Agents And Config

Use this reference when changing personas, specialist behavior, agent definitions, or NoahBrain/vault scope.

## Fleet

- Ezra: main orchestrator / COS / front door
- Vera: research
- Poe: comms
- Cole: content
- Hopper: ops
- Archie: code

The fleet uses single-name IDs: `ezra`, `vera`, `poe`, `cole`, `hopper`, `archie`. Avoid reintroducing role/persona dual naming such as `research` vs `vera`.

## Config Boundary

Tracked examples live in the repo. Live config lives outside the repo:

- tracked examples: `agents/*/*.example`
- local/default config root: `~/.claudeclaw`
- VPS config root: `/home/devuser/.claudeclaw`

Do not commit live `agent.yaml`, `CLAUDE.md`, tokens, or vault paths unless the user explicitly asks for a public/example version.

## Persona Tuning

Milestone 2 flagged over-execution risk: Vera interpreted a "confirm" prompt as an instruction to execute via `notify.sh`. When tuning personas, add clear reply-vs-execute guidance:

- Reply only when the user asks for wording, confirmation, draft, summary, review, or recommendation.
- Execute only when the user clearly asks to perform an action, run a command, create/edit a file, send a message, or schedule something.
- When intent is ambiguous and action has external effects, ask or provide a draft.

Apply the same audit to Vera, Poe, Cole, Hopper, and Archie.

## Obsidian / NoahBrain

Specialists have scoped Obsidian vault access. VPS configs were patched to `/home/devuser/NoahBrain/Memory` on 2026-05-04. Local Mac configs may still point at macOS paths and are not the production source of truth.

When changing vault behavior, verify paths separately for local and VPS. Do not assume one environment's config applies to the other.

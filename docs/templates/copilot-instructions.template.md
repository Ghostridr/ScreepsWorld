# Copilot Instruction Template

Use this template to brief Copilot (or any AI pair) before starting a task.

## Purpose

- What do you want to achieve? [brief goal]

## Context snapshot

- Repo: [name or URL]
- Branch: [branch]
- Entry points: [files or modules]
- Tech stack: [languages/frameworks/tools]
- Related docs: [links]

## Task

- Goal: [clear outcome]
- Scope: [in scope / out of scope]
- Non-goals: [explicitly not doing]
- Acceptance criteria:
  - [ ] [criterion 1]
  - [ ] [criterion 2]

## Constraints and guardrails

- Files/paths to avoid: [globs]
- Security/PII: [notes]
- Licensing: [notes]
- Performance limits: [CPU/memory/latency]
- Backwards compatibility: [yes/no + details]

## Coding guidelines

- Language/style: [conventions]
- Lint/format: [commands/configs]
- Tests required: [unit/e2e/none]
- Error handling/logging: [policy]

## Plan (high level)

1. [step]
2. [step]
3. [step]

Edge cases to consider:

- [edge case 1]
- [edge case 2]

## Deliverables

- Code changes: [files]
- Tests: [files]
- Docs/notes: [where]

## Run and verify

- Build/lint/tests:
  - [command]
- Manual check:
  - [steps]

## Notes for Copilot

- Ask only if truly blocked; infer reasonable defaults.
- Keep diffs minimal and focused; preserve existing style.
- Respect ignores/exclusions and do not modify unrelated files.

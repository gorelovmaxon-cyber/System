---
name: to-spec
description: Turn confirmed brief and conversation into a proportionate local spec; external publication is optional.
disable-model-invocation: true
---

This skill synthesizes the confirmed brief and project evidence into a spec. From
System2 `/start`, use the local spec and handoff contract in
`docs/system-workflow.md`; do not require an external issue tracker or setup
skill. If a material decision is still unknown, ask for that decision before
declaring the spec agreed. A short site task gets a short spec; the long template
below is reference material for complex work, not a minimum length.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the spec, and respect any ADRs in the area you're touching.

2. State concrete acceptance checks at existing project seams. Ask the user
   only about decisions that change the result, cost or access.

3. Write the spec in the project's selected task folder (default
   `.scratch/<task-id>/SPEC.md`). Mark it agreed only after the user confirms
   the material decisions. Publish to an external tracker only on explicit
   request; local file status can be `ready-for-agent` when no blocker remains.

<spec-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A numbered list of user stories proportional to the task. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

Cover accepted behavior and important edge cases without inventing extra scope.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this spec.

## Further Notes

Any further notes about the feature.

</spec-template>

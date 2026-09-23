---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run checks that exercise the changed behavior. Run the full suite when shared
primitives change or a project gate requires it; do not repeat it merely for handoff.

Review the scoped diff and evidence before handoff. Independent acceptance remains
with the appointed reviewer; do not mark your own work done/READY.

Commit your work to the current branch.

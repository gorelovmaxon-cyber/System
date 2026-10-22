---
name: claude-handoff
description: Save a compact handoff for a fresh conversation; launch a background agent only when the user explicitly authorizes that launch.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Save a compact handoff for the explicitly selected project using the canonical
[handoff skill](../handoff/SKILL.md). Preserve the assigned role, stage, permitted
block, evidence and next step. Default completion is a saved HANDOFF and a short
message the user can pass to their chosen agent; it does not launch a process.

Only if the user explicitly authorizes a background-agent launch for this handoff
and the current client supports it, use the client's verified launch interface.
Do not infer launch permission from the word handoff, the availability of a CLI,
or permission to write a summary. Do not claim a launch succeeded without its
actual result. If unavailable, finish with the saved artifact and manual transfer.

For an authorized launch, use a descriptive job name through the naming interface
supported by that client. Do not assume another client's flags are available.

Include a "suggested skills" section in the summary, which suggests skills that the agent should invoke.

Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information — the summary becomes the agent's prompt.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the summary accordingly.

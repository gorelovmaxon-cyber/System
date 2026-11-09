---
name: implement
description: 'Реализовать один согласованный тикет по спецификации. Использовать, когда тикет готов и разрешён к исполнению; не запускать для планирования или разбивки.'
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run checks that exercise the changed behavior. Run the full suite when shared
primitives change or a project gate requires it; do not repeat it merely for handoff.

Review the scoped diff and evidence before handoff. Independent acceptance remains
with the appointed reviewer; do not mark your own work done/READY.

Commit your work to the current branch.

## Gotchas

- Реализуй один согласованный тикет, не расширяй объём «по ходу». Новое требование —
  остановка и возврат планировщику.
- Не ставь себе `done`/READY: независимая приёмка остаётся у отдельного приёмщика.
- Прогоняй проверки по затронутому поведению, а не повторяй успешный suite ради отчёта.

# ROLES-02 — решение о модельно-независимых ролях

**What to build:** Прямое решение пользователя сохранено в журнале System2 и общем профиле через штатный writer, доступно для восстановления по файлам.
**Requirement IDs:** ROLES-02 поручения пользователя 2026-10-08.
**Blocked by:** none (ROLES-01 принят).
**Status:** done.
**External acceptance:** [Вердикт из беседы 2026-10-08](../RESULT.md#roles-external-verdict).

## Контекст и границы

Рабочий проект — `systemqwen`, журнал сайта не изменять. Поиск старого решения
дополнять прямым чтением. При отсутствии прежней записи журнала System2 создать
decision со ссылкой на исторические документы; correction допустима только с реальным
journal_id из того же проекта. Не подменять его memory event_id.

## Файлы и порядок

- [Реальная запись журнала](../../../.system2/decision-journal/abda2410f436b8bc1170e2d7.json).
- [Общий профиль](../../../.claude/memory/user-profile/writer-entries.md), `MEMORY.md`.
- capture → полученный journal_id → save.js (`user-profile`, `scope: user`) → search → mark.
- Не менять старую pending-очередь, writer/CLI, сервисы, настройки и глобальные навыки.

## Критерии приёмки и проверки

- [x] Обязанности и полный процесс совпадают с согласованным решением пользователя.
- [x] journal_id настоящий, event_id `journal_systemqwen_abda2410f436b8bc1170e2d7`; mark относится к тому же корню.
- [x] UTF-8 и текст памяти совпадают с журналом; запись одна, чужой scope не затронут.
- [x] Штатный search находит запись; fallback не объявлен индексацией.
- [x] `persisted` подтверждён; `indexed` не подтверждён, `synced` отсутствует без push.

Evidence: [roles-02-persistence.json](../evidence/roles-02-persistence.json).
Итог и ограничения: [существующий отчёт](../RESULT.md#roles-2026-10-08).

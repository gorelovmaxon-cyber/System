---
name: project-memory-init
description: Подключает явно выбранный проект к общей памяти System2 и создаёт точечный HANDOFF.
disable-model-invocation: true
---

# project-memory-init

Запускай только для проекта, который пользователь явно подключил. Общая память
остаётся в корне System2 из `resolve-paths.js`; `.system-memory/` внутри проекта
не создаётся.

```powershell
node scripts/memory/init-project.js --root <project-root> --project <project_id> --client claude-code
```

Скрипт принимает только стабильный kebab-case `project_id` из реестра. Для нового
проекта сначала получи подтверждение пользователя, затем используй явные
`--register --title "..." --kind "..."`; запись попадёт только в
gitignored `config/system.local.json`, а не молча в общий example-рееестр.

Скрипт идемпотентно обновляет только секцию между маркерами
`<!-- systemqwen:start -->` и `<!-- systemqwen:end -->` в `CLAUDE.md` и
`HANDOFF.md`. Текст вне маркеров принадлежит проекту и не перезаписывается.
HANDOFF обязан отражать незакоммиченные изменения, результаты проверок,
незавершённое и конкретный следующий шаг.

Для Claude Code `--client claude-code` создаёт минимальный проектный
`.claude/skills/start/SKILL.md` и локальный игнорируемый
`.claude/system2.local.json` с путём к единому System. Локальный
`.claude/settings.local.json` добавляет System в `permissions.additionalDirectories`
без изменения глобальных настроек и без подгрузки чужих skills. Команда `/start` доступна
после открытия нового сеанса Claude Code из корня проекта. Адаптер читает
канонический start из System; всю систему в проект не копировать. На другом ПК
повторить setup с его путём к System. Если клиент иной, не обещать поддержку
`/start` без проверки его механизма навыков.

## Golden cases

1. Новый временный проект: первый запуск создаёт `CLAUDE.md`/`HANDOFF.md`,
   второй не создаёт дубликатов.
2. Ручной текст вне маркеров сохраняется после повторного запуска.
3. Неизвестный `project_id` без явной регистрации завершается ошибкой.
4. Проверить `git diff --numstat` и отсутствие `.system-memory/`.

Резюме сессии сохраняется отдельно через SC-07 `capture.js session-summary`;
auto-learn не должен повторно анализировать это же резюме.

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
node scripts/memory/init-project.js --root <project-root> --project <project_id>
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

## Golden cases

1. Новый временный проект: первый запуск создаёт `CLAUDE.md`/`HANDOFF.md`,
   второй не создаёт дубликатов.
2. Ручной текст вне маркеров сохраняется после повторного запуска.
3. Неизвестный `project_id` без явной регистрации завершается ошибкой.
4. Проверить `git diff --numstat` и отсутствие `.system-memory/`.

Резюме сессии сохраняется отдельно через SC-07 `capture.js session-summary`;
auto-learn не должен повторно анализировать это же резюме.

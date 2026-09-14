# Восстановление на другом ПК

Git переносит закоммиченные файлы, но не `.local/`, локальные конфиги, секреты,
Khoj index или Activepieces volumes. На новом устройстве восстанавливается
только явный проект; чужой `HANDOFF.md` не копируется в проект B.

## Порядок

Для продолжения чата сначала прочитать корневой `HANDOFF.md` и
`HANDOFF-SYSTEM2-2026-09-08.md`. Все SC-01…SC-18 и входные планы уже в Git.

Нужны Git for Windows (включая Git Bash) и совместимый Node.js; проверка клона
прошла на Node 24.14.0. Для одного чтения/ревью запуск сервисов не нужен.
Выберите **новую, не занятую рабочими файлами папку** (пример ниже):

```powershell
git clone --branch master https://github.com/gorelovmaxon-cyber/System.git C:\Work\System2
cd C:\Work\System2
git status --short
git log -1 --oneline
node scripts/memory/bootstrap.js --root C:\Work\System2
node scripts/memory/doctor.js --root C:\Work\System2 --json
```

Если копия уже есть: сначала `git status`, `git remote -v`, `git fetch origin` и
`git log --oneline --left-right HEAD...origin/master`. Только при чистом дереве
и отсутствии собственных расходящихся коммитов — `git pull --ff-only origin master`.
При расхождении остановиться и сохранить/согласовать обе версии, не применять reset/clean.

Код выхода 1 у bootstrap/doctor при недоступных сервисах не означает неудачный clone:
смотреть отдельные проверки. Doctor пока содержит фиксированные health-адреса;
его результат не заменяет проверку реальных endpoints выбранного релиза.
Bootstrap не запускает сервисы без специальных флагов.

Зависимости Figma не хранятся в Git, но lockfile есть:

```powershell
npm --prefix .claude/mcp-servers/figma ci --ignore-scripts
npm --prefix .claude/mcp-servers/figma test
```

Если bootstrap остановился из-за существующего hook, сначала изучить текущий
`git config --get core.hooksPath` и hook. Не запускать `--force` вслепую:
сохранить пользовательские hooks и согласовать переключение на `.git-hooks-templates`.
Старый `.git/hooks/post-commit` на исходном ПК использовал Python с системной
кодировкой и падал на кириллице; переносимый hook использует Node и проверен отдельно.

Bootstrap создаёт ignored `config/system.local.json`, активирует portable
hooks и запускает doctor. Дальше вручную:

1. заполнить локальные project paths и проверить `project_id`;
2. создать секреты Activepieces/Khoj/bridge по README сервисов, не копируя их
   через Git;
3. запустить bridge, Activepieces and worker, затем проверить host bridge;
4. настроить только `<SYSTEM_ROOT>/.claude/memory` в Khoj и перестроить индекс;
5. прочитать `CLAUDE.md` и `HANDOFF.md`, затем выполнить retrieval fallback;
6. проверить `node scripts/memory/sync.js --status` и выполнить `push` в согласованных
   границах без нового вопроса; вне них — по указанию пользователя.

`.vscode/` с настройками редактора/провайдера, локальные конфиги, `.local/`, backup
и данные сервисов намеренно исключены из Git. Настроить их отдельно безопасным способом.
Память в Git и HANDOFF достаточны для возобновления ревью, но не означают,
что все подключения агента или сервисы автоматически заработают на ноутбуке.

## Проект A и B

Для Project A запустите `init-project.js` с его зарегистрированным ID и
прочитайте его HANDOFF. Для Project B сначала получите отдельное подтверждение,
зарегистрируйте новый ID в local config и инициализируйте только его файлы.
Общая память доступна обоим проектам по конфигурации, HANDOFF остаётся
проектным.

## Конфликты и незакоммиченное

Перед сменой ПК сохраните незакоммиченную работу commit-ом или отдельным
архивом по явному решению пользователя; Git сам её не переносит. При divergence
выполните обычный `git pull --no-rebase`/merge, сохраните обе конфликтующие
версии, разрешите конфликт явно и создайте commit. Force push/reset запрещены.

Реальный второй ПК не доступен в текущей среде; этот runbook должен пройти
изолированный clone smoke-test, а live second-PC validation остаётся
`awaiting-validation`.

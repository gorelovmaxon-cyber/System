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

Реальный второй ПК не доступен из среды разработки; этот runbook прошёл изолированный
clone smoke-test, а live second-PC validation остаётся `awaiting-validation`.

## Проверка доступности и готовый пакет, 2026-09-14

Состояние на дату: доступа ко второму ПК из рабочей среды нет — ни сетевой папки
(`net use`, `Get-PSDrive`, `HKCU:\Network` пусты), ни SSH-записи (в `~/.ssh` только
чужой торговый ключ), ни облачной синхронизации, ни управляемой удалённой сессии
(AnyDesk установлен, но настроенного второго ПК нет). `net view` отвечает ошибкой 6118.
Поэтому путь и `git status` второго ПК отсюда получить нельзя.

Готовый пакет команд (шаги 0–3: снять состояние, сохранить данные в
`D:\transfer-backups\second-pc-<ts>`, принять изменения через Git, проверить полноту
сохранения) — в `.scratch/system-launch/issues/L06-01-second-pc-access-and-transfer-package.md`;
шаги 4–8 (bootstrap, привязка, сервисы, hooks, поиск известной записи, round-trip и
конфликт) — в `L06-02-second-pc-bootstrap-and-roundtrip.md`. Пакет применяется на втором
ПК, а не здесь; локальный клон его не заменяет.

Два факта о резервах, подтверждённые drill-ом в отдельном каталоге 2026-09-14
(evidence: `.scratch/system-launch/evidence/l06-03-restore-drill-2026-09-14.json`):

- **Резерв не подменяет Git.** Пакет `pre-live-cycle-20260913-221624` восстановился
  целостно (sha256 19/19 против манифеста), но он старее текущей памяти: восстановление
  из него откатило бы память назад.
- **Durable-очередь в резерв локального состояния не попадает.** В пакете есть
  производные журналы (`indexer/tasks.jsonl`, `writer/processed.jsonl`), но нет
  `queue/events.jsonl`; недовезённые события из такого резерва не возвращаются.

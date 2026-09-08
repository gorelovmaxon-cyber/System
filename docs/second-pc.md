# Восстановление на другом ПК

Git переносит закоммиченные файлы, но не `.local/`, локальные конфиги, секреты,
Khoj index или Activepieces volumes. На новом устройстве восстанавливается
только явный проект; чужой `HANDOFF.md` не копируется в проект B.

## Порядок

```powershell
git clone <repository-url> E:\System2
cd E:\System2
node scripts/memory/bootstrap.js --root E:\System2
node scripts/memory/doctor.js --root E:\System2 --json
```

Bootstrap создаёт ignored `config/system.local.json`, активирует portable
hooks и запускает doctor. Дальше вручную:

1. заполнить локальные project paths и проверить `project_id`;
2. создать секреты Activepieces/Khoj/bridge по README сервисов, не копируя их
   через Git;
3. запустить bridge, Activepieces and worker, затем проверить host bridge;
4. настроить только `<SYSTEM_ROOT>/.claude/memory` в Khoj и перестроить индекс;
5. прочитать `CLAUDE.md` и `HANDOFF.md`, затем выполнить retrieval fallback;
6. проверить `node scripts/memory/sync.js --status` и делать push только явно.

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

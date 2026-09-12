# System2 operations and recovery

Этот runbook сводит запуск и восстановление. Все действия работают от корня
`E:\System2` (на другом ПК замените путь). Секреты вводятся локально и никогда
не копируются через Git.

## Запуск по порядку

1. Проверить `node scripts/memory/doctor.js --json` и запустить bridge:
   `node scripts/memory/bridge-server.js` с локальным `MEMORY_BRIDGE_TOKEN`.
2. Запустить Khoj способом выбранного релиза из [khoj-setup.md](khoj-setup.md),
   затем проверить `curl.exe -fsS http://127.0.0.1:42110/health`.
3. Заполнить `services/activepieces/.env` из example и выполнить
   `docker compose -f services/activepieces/docker-compose.yml up -d`.
4. Проверить `curl.exe -fsS http://localhost:8642/api/v1/health`, UI и worker
   logs; затем container → host bridge по `AP_HOST_BRIDGE_URL`.
5. Выполнить `node scripts/memory/indexer.js --run` после настройки
   `indexer.reindex_url`, а затем `doctor.js`.

На текущей машине Docker/Khoj не установлены; эти health-команды здесь не
успешны и не выдаются за пройденные.

## Ежедневные операции и диагностика

```powershell
node scripts/memory/sync.js --status
node scripts/memory/queue-status.js
node scripts/memory/indexer.js --status
node scripts/memory/doctor.js --json
docker compose -f services/activepieces/docker-compose.yml logs --tail=100 app worker
```

При отказе delivery очередь остаётся pending/failed; `queue-status.js
--redeliver failed` повторяет её. При отказе Khoj persisted-запись сохраняется,
а indexer показывает failed; после восстановления используйте `--requeue-failed`
и `--run`. Не запускайте бесконечные shell-циклы.

`queue-status.js` печатает `corrupt_count` по очереди и обоим журналам
(`corrupt.writer`, `corrupt.indexer`) и флаг `torn_tail`. Счётчик снимается
до чтения, поэтому он показывает состояние на момент запуска. Явный ремонт:

```powershell
node scripts/memory/queue-status.js --quarantine
```

Команда перечисляет созданные sidecar-`*.corrupt-tail-*`; повреждение в середине
журнала она не чинит, а сообщает в `quarantine.<журнал>.error` и оставляет файл
без изменений — такой журнал разбирается вручную.

## Повторная доставка и планировщик

Один проход (`node scripts/memory/queue-worker.js`) обрабатывает очередь один раз:
событие, оставшееся `pending` из-за недоступного получателя, без нового запуска не
доставляется. Простои закрывает ограниченный `watch`:

```powershell
node scripts/memory/queue-worker.js --watch --max-idle-ms 600000
```

`watch` ожидает `next_attempt_at` ближайшего события, повторяет попытки по backoff
очереди, а события с исчерпанными попытками оживляет не чаще одного раза в
минуту (`--no-revive` отключает оживление и завершает работу терминальным
статусом). Работа прекращается сама: `status: idle` — недоставленных событий нет,
`deadline` — истекло окно `--max-idle-ms` (по умолчанию 10 минут), `failed` —
терминальный отказ при `--no-revive`. Второй экземпляр worker возвращает
`{"status":"busy"}` и не делит очередь с первым. Бессрочный фоновый сервис и
глобальный оркестратор не предполагаются: простои длиннее окна закрывает
повторный запуск `--watch` (например, из планировщика задач), а не новый демон.

post-commit hook сам запускает `--watch --no-revive --max-idle-ms 120000` после
постановки события в очередь — этого достаточно, чтобы пережить перезапуск
сервиса без нового commit.

## Откат

Для кода и переносимых конфигов используйте обычный `git revert <commit>` на
проверенной ветке, затем тесты. Не используйте `reset --hard`, force push или
удаление `.local/`. Для сервиса сначала остановите compose, верните явно
закреплённый image tag из release notes, затем `pull`, `up -d` и health.

## Backup

Резервируйте на защищённый диск/менеджер секретов с датой, не в репозиторий:

- `.claude/memory/`, `config/system.example.json` и flow blueprint — Git;
- `config/system.local.json`, `.local/` (queue/writer/indexer logs) — отдельная
  локальная копия;
- Activepieces DB/flow — экспорт из UI и named volume `activepieces-postgres`
  по Docker procedure;
- `.env` и bridge/AI/Khoj keys — только отдельное encrypted secret store,
  восстанавливать вручную по именам переменных.

Предварительно проверьте размер и список файлов, создайте архив в явно
выбранной папке вне workspace и зафиксируйте checksum. Не архивируйте реальные
ключи вместе с Git backup.

## Restore

1. Клонируйте репозиторий, выполните `node scripts/memory/bootstrap.js` и
   заполните local config/secrets вручную.
2. Восстановите `.local/` и Activepieces export/volume только в тот же явно
   выбранный профиль, проверьте ownership и отсутствие ключей в log.
3. Запустите bridge → Khoj → Activepieces; восстановите flow и connection в UI.
4. Перестройте производный Khoj index из `.claude/memory`, не восстанавливайте
   его как источник истины. Проверьте поиск, writer idempotency и test event.
5. Выполните doctor, evidence report и только затем явный sync/push.

Проверка на отдельной копии: используйте [second-pc.md](second-pc.md),
временный clone и репрезентативный backup памяти/flow blueprint/queue. Для
текущей среды live flow/index restore невозможен из-за отсутствия сервисов;
это остаётся awaiting-validation.

## Ручная настройка и future remote

Нельзя автоматически восстановить owner account, AI/Figma/Khoj tokens, bridge
token, machine paths, Docker volumes и права доступа. Эти шаги повторяются
вручную с проверкой `doctor`.

Remote-профиль 24/7 — только будущий план: нужен выбранный сервер, приватный
доступ, один writer, encrypted backups, monitoring и recovery drill. Он не
развёрнут и не проверен.

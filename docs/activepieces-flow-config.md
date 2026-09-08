# Activepieces flow: событие → анализ → writer

Каноническая схема хранится в
[`services/activepieces/flows/memory-event-to-writer.json`](../services/activepieces/flows/memory-event-to-writer.json).
Это переносимый blueprint без секретов; live export/import ещё не выполнен,
потому что Activepieces SC-06 заблокирован отсутствием Docker Desktop/WSL.

## Контракт входа

Webhook принимает событие SC-07 schema v1: `event_id`, `project_id`, `kind`,
`timestamp`, `source`, `summary`, решения/коррекции/checks и ограниченный `diff`.
Поддерживаются `commit` и `session-summary`. В prompt передаются только эти
поля; diff ограничен 20 000 байт.

## Шаги flow

1. Webhook trigger принимает событие.
2. Data Mapper собирает ограниченный prompt.
3. AI connection из UI анализирует только возможность долговечного знания.
4. Валидация требует строгий JSON:

   ```json
   {
     "has_pattern": true,
     "proposals": [{
       "category": "patterns",
       "statement": "...",
       "evidence": "...",
       "scope": "systemqwen",
       "status": "observation"
     }]
   }
   ```

   Разрешены категории `user-profile`, `facts`, `patterns`, `decisions`,
   `gotchas`; статусы — `observation`, `confirmed`, `superseded`; scope —
   `user` или зарегистрированный `project_id`.
5. `has_pattern=false` завершает flow успешно без записи.
6. В true-ветке выполняется только `POST <AP_HOST_BRIDGE_URL>/write` с
   `event_id` и `proposals`. Прямой записи файлов из flow нет.
7. HTTP 200 с `status:persisted` — success; 4xx/5xx — видимая ошибка.
   Повторная доставка использует тот же event_id и опирается на idempotency
   writer-а; событие остаётся в очереди SC-07 при ошибке доставки.

## Локальная настройка

На рабочем Activepieces:

- создать Webhook flow и сохранить его URL только локально;
- создать AI connection и выбрать модель, имя записать в ENVIRONMENT без ключа;
- указать `http://host.docker.internal:8643` как host bridge, не `localhost`;
- передать `MEMORY_BRIDGE_TOKEN` через secret/header connection;
- импортировать/собрать flow по blueprint и включить его после smoke-теста.

Пример тестового события создаётся SC-07:

```powershell
node scripts/memory/capture.js commit --project systemqwen --sha <sha> --message "test"
```

Ручной webhook POST и execution logs выполняются только после запуска SC-06.

## Текущий статус

SC-08 bridge и writer проверены отдельно. AI connection, Activepieces import,
положительный/отрицательный execution, ошибка provider/bridge и persistence
flow не проверены live; SC-09 остаётся `blocked` до разблокировки SC-06.

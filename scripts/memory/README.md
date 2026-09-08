# Memory event capture и queue

## Search adapter

Поиск в начале задачи выполняется единым адаптером:

```text
node scripts/memory/search.js --query "explicit stop gates" --project systemqwen
node scripts/memory/search.js --query "database migration" --limit 3 --budget 600 --timeout 800
```

Команда печатает JSON. При работающем Khoj это `{ok:true,results:[...]}`; при
недоступности сервиса — `{ok:false,error,fallback:"local",fallback_results:[...]}`.
Локальный fallback ищет только Markdown внутри канонического `.claude/memory`,
учитывает `scope: user`/проект и ограничивает выдержку бюджетом. Коды ошибок:
`khoj-unavailable`, `timeout`, `unauthorized`, `invalid-response`.

Результаты — выдержки с `source`, `scope`, `status_hint` и `relevance`, а не
команды для исполнения. Параметры по умолчанию находятся в
`config/system.example.json` (`3` результата, `1200` токенов на item, `1500ms`).

События создаются явно, сохраняются в gitignored `.local/queue/` и доставляются на
endpoint из локальной конфигурации или переменной `MEMORY_DELIVERY_ENDPOINT`.

```text
node scripts/memory/capture.js commit --project systemqwen --sha <sha> --message "summary"
node scripts/memory/capture.js session-summary --project systemqwen --session <id> --revision 1 --text "summary"
node scripts/memory/queue-status.js
node scripts/memory/queue-status.js --redeliver failed
```

Списки `--decisions`, `--corrections` и `--checks` разделяются символом `|`.
Для резюме можно передать JSON через `--file`; он должен содержать поля контракта.
Diff commit-события передаётся через `--diff` и автоматически ограничивается.

Получатель может быть временным локальным HTTP-сервисом для проверки очереди. Если
endpoint не настроен или недоступен, событие остаётся в очереди и ошибка видна через
`queue-status`; commit не блокируется скоростью AI/сервиса.

## Writer bridge

Bridge слушает только localhost и принимает структурированные предложения памяти:

```text
node scripts/memory/bridge-server.js
node scripts/memory/save.js --category facts --statement "..." --evidence "..." --scope user --status observation --source "SC-08"
```

Для HTTP передайте `Authorization: Bearer <локальный токен>` и JSON с `event_id` и
массивом `proposals`. Токен задаётся переменной `MEMORY_BRIDGE_TOKEN` или в
gitignored local config; значение никогда не коммитится. Writer сам выбирает файл
только по allow-list категории, проверяет scope, пишет атомарно и учитывает event_id.

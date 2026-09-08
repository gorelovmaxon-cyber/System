# Memory event capture и queue

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

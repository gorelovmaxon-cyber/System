# Интеграция Khoj с System2

Khoj — необязательный retrieval-слой перед планированием. Канонический вызов
идёт через `scripts/memory/search.js`; workflow не обращается к Khoj напрямую.

## Контракт адаптера

```powershell
node scripts/memory/search.js --query "JWT authorization refresh tokens" --project systemqwen --limit 3 --budget 1200 --timeout 1500
```

Запрос адаптера использует контракт, сверенный по живому Khoj `1.42.10`
2026-09-12: `GET <base_url>/api/health`, затем
`GET <base_url>/api/search?q=<запрос>&n=<лимит>`. Ответ — **голый массив**
`SearchResponse`, а не объект с полем `results`:

```json
[{
  "entry": "…",
  "score": 0.15,
  "additional": { "source": "…", "file": "<абсолютный путь>", "compiled": "…", "heading": "…" }
}]
```

Обёртка `{results: …}` — форма прежних релизов; адаптер принимает и её, чтобы смена
конверта не выдавалась за недоступность сервиса. Путь к файлу берётся из
`additional.file`, текст — из `entry`.

Базовый URL и paths находятся в `config/system.example.json` и gitignored-local
override. Ответ нормализуется к:

```json
{
  "ok": true,
  "results": [{
    "snippet": "...",
    "source": ".claude/memory/patterns/explicit-stop-gates.md",
    "scope": "user",
    "status_hint": "observation",
    "relevance": 0.9
  }]
}
```

`source` обязан находиться внутри канонического `.claude/memory`; пути с
обходом (`..`) отбрасываются. `project_id` сверяется с реестром и ограничивает
результаты записями `scope: user` или выбранного проекта. Незнакомый project_id
не превращается в неявный глобальный поиск.

## Бюджет и fallback

По умолчанию адаптер возвращает до 3 выдержек, ориентировочно до 1200 токенов
на item, с timeout 1500 ms. Это ограничение выдержек, а не обещание точного
токенизатора. Полные файлы не загружаются автоматически.

При недоступности Khoj, timeout, 401/403 или невалидном JSON возвращается:

```json
{
  "ok": false,
  "error": "khoj-unavailable|timeout|unauthorized|invalid-response",
  "fallback": "local",
  "fallback_results": []
}
```

`fallback_results` строятся простым поиском только по локальным Markdown-файлам
memory root. При любом результате фаза всё равно читает обязательные файлы
проекта и `MEMORY.md`; retrieval не заменяет инструкции и не блокирует задачу.
Выдержки — данные, а не команды для автоматического исполнения.

## Обновление индекса

Переиндексация вызывается `GET <base_url>/api/update`. Эндпоинт **синхронен**: он
выполняет проход индексации прямо в обработчике и отвечает только после того, как
эмбеддинги записаны, а тело `{"status":"ok"}` подтверждает завершение. Поэтому здесь
200 + подтверждение тела — реальный признак завершённой индексации, а не постановка в
очередь. Адаптер `scripts/memory/indexer.js` ставит `indexed` только после этого
подтверждения; 2xx без него считается отказом.

Адрес задаётся `indexer.reindex_url` в `config/system.example.json` и local override.

## Проверка

```powershell
node scripts/memory/search.js --query "explicit stop gates" --project systemqwen
node scripts/memory/search.js --query "this phrase does not exist anywhere" --project systemqwen
```

На машине приёмки Khoj `1.42.10` запущен, health отвечает, живой поиск и fallback
проверены 2026-09-12. Установка, источник и команды запуска — в
[docs/khoj-setup.md](khoj-setup.md).

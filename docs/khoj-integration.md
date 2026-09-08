# Интеграция Khoj с System2

Khoj — необязательный retrieval-слой перед планированием. Канонический вызов
идёт через `scripts/memory/search.js`; workflow не обращается к Khoj напрямую.

## Контракт адаптера

```powershell
node scripts/memory/search.js --query "JWT authorization refresh tokens" --project systemqwen --limit 3 --budget 1200 --timeout 1500
```

Запрос адаптера к Khoj v1 использует проверенный контракт из SC-04:
`GET <base_url>/health`, затем `POST <base_url>/api/search` с JSON
`{"q":"...","n":3}`. Базовый URL и paths находятся в
`config/system.example.json`/local override. Ответ нормализуется к:

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

## Проверка

```powershell
node scripts/memory/search.js --query "explicit stop gates" --project systemqwen
node scripts/memory/search.js --query "this phrase does not exist anywhere" --project systemqwen
```

На машине SC-01 Khoj не установлен и порт `42110` не отвечает, поэтому live
health/search остаются `blocked`; fallback проверяется локально. Установка и
индексация описаны отдельно в [docs/khoj-setup.md](khoj-setup.md).

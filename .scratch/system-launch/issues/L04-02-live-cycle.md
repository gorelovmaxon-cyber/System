# L04-02 — Один настоящий event через весь живой цикл до Git

**What to build:** Один настоящий event проходит живой путь commit → AP AI → bridge → writer → indexer → Khoj search → Git, с отслеживанием `event_id` и состояний на каждом шаге.
**Requirement IDs:** SC-08, SC-09, SC-10
**Blocked by:** none
**Status:** verified-live
**Перед началом работы:** Открой `D:\SystemTheBest\System`, проверь корень Git и текущие изменения.

## Контекст

Опубликованная версия flow указывала шагом `write` на fixture-мост L03-03
(`http://host.docker.internal:8644`). Живой цикл обязан доходить до рабочей памяти,
поэтому шаг переведён на рабочий мост 8643 с настоящим токеном и опубликован:
`publishedVersionId taybpPCJxVqCZpWYvLuYG`. Экспорт снят заново с живого flow,
токен остаётся плейсхолдером.

## Трейс

| Шаг | Результат | Время (UTC) |
|---|---|---|
| commit `fb2395a` | обычный коммит проекта | 19:37 |
| `capture.js --enqueue-only` | ровно одно событие `evt_e33c5558759f`, `pending` | 19:37:09 |
| `queue-worker.js` | HTTP 200, коррелированный `persisted` → `delivered` | 19:39:52 → 19:40:00 (7.65 с) |
| AP run `jfljn5o75eJ2Siguq3A9Y` | `SUCCEEDED`, 6429 мс (`analyze` 4910, `write` 1292) | 19:39:53 → 19:39:59 |
| bridge → writer | 2 предложения записаны, оба с `event_id: evt_e33c5558759f` | 19:39:59 |
| `indexer.js --run` | 2 задачи `indexed`, 5.0 с | 19:42:05 → 19:42:10 |
| `search.js --query` | запись найдена в Khoj | 19:42 |

Записи: `.claude/memory/decisions/writer-entries.md`,
`.claude/memory/gotchas/writer-entries.md` — обе новые, созданы живым циклом.
Состояния различены: `persisted` (writer) → `indexed` (indexer+Khoj) → scoped-коммит (Git).

## Критерии приёмки

- [x] Живой event прошёл весь путь до поиска и Git.
- [x] `event_id` прослежен на всех шагах, состояния не смешаны.
- [x] Новые записи созданы циклом, а не взяты из существующих.
- [x] Нет ложного `indexed`: обе задачи действительно приняты Khoj.
- [x] Токен моста и AI-ключ не попали в коммит, отчёт или экспорт.

## Ограничения

- Шаг `write` живого flow указывает на рабочий мост 8643; fixture-мост L03-03 (8644)
  остаётся отдельным процессом и в опубликованной версии не используется.
- Задержка `analyze` (3.4–6.0 с) зависит от внешнего AI-шлюза; в одном ответе шлюза
  встретилась пара U+FFFD внутри слова — дефект шлюза, конвейер записал текст как есть.

## Как закончить

1. Diff и evidence — в [reports/CHAT-04-RESULT.md](../reports/CHAT-04-RESULT.md).
2. `verified-live` подтверждает приёмщик.

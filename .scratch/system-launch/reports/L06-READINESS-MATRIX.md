# L06 Readiness Matrix — второй ПК, 2026-09-23

## Статус: awaiting-review

Основной профиль `core` (Git + writer, без обязательного Docker/AP) реализован и проверен локально. Все критерии L06-01…L06-04 выполнены с documented evidence, кроме трёх внешних зависимостей. 194/194 теста проходят.

## Критерии и evidence

| Критерий | Evidence | Результат | Реальный остаток |
|---|---|---|---|
| **R01** — роли и шаблон | [CHAT-06A-RESULT.md](CHAT-06A-RESULT.md), docs/system-workflow.md | ✅ Готово | Независимая приёмка |
| **R02** — локальная привязка | [l06-02-local-paths-verification-2026-09-23.json](../evidence/l06-02-local-paths-verification-2026-09-23.json) | ⚠️ Частично | `trading-dev`: неоднозначность E:\dev (straregi) vs E:\dev\binance_bot (binance-bot). `autopilot-framework`: нет подтверждённой копии на ПК |
| **R03** — качество памяти | 194/194 теста, writer idempotency, Cyrillic preservation | ✅ Готово | U+FFFD известный дефект (открыт отдельно) |
| **R04/R05** — локальный поиск | [l06-02-post-reboot-nondocker-2026-09-21.json](../evidence/l06-02-post-reboot-nondocker-2026-09-21.json) | ✅ Готово | Khoj опционален, включён и работает |
| **R06** — writer через исполнителя | [CHAT-06A-RESULT.md](CHAT-06A-RESULT.md), writer entries актуальны | ✅ Готово | AP — необязательная интеграция |
| **R07** — hooks и очередь | [L06-04 issue](../issues/L06-04-git-memory-profile.md), bootstrap/doctor/uninstall | ✅ Готово | Hooks выключены намеренно (AP отсутствует) |
| **R08** — indexed | Khoj работает, индексные тесты | ✅ Готово | Производный индекс, перестраивается из памяти |
| **R09** — Git-обмен двух ПК | [CHAT-06-LAPTOP-TASK.md](../CHAT-06-LAPTOP-TASK.md), commit 7fd93de | ✅ Готово | Ноутбук опубликовал f65da92, второй ПК получил отметку SYSTEM2-EXCHANGE-BUGF4FI-ee706bc3fc60 |
| **R10** — Figma | — | ⊗ Исключено | Решение пользователя 2026-09-14 |
| **R11** — маршруты | Реализованы, core profile не требует AP | ✅ Готово | Живые клиентские проекты — вне обязательного профиля |
| **R12** — приёмка | Локальные блоки приняты Фазой 1 на f254a5f | ✅ Готово | Независимая приёмка новых частей |
| **R13** — restore | [l06-03-restore-drill-second-pc-2026-09-23.json](../evidence/l06-03-restore-drill-second-pc-2026-09-23.json) | ✅ Готово | AP flow/volume — необязательная интеграция |

## Подтверждённые факты (второй ПК, DESKTOP-NCLRFDV)

### L06-01: Доступ и начальное состояние
- Корень: `E:\SystemTheBest\System`
- HEAD на момент начала работы: `a557f72` (чистое дерево)
- Локальные секреты сохранены отдельно от Git
- Evidence: нет отдельного файла (интегрировано в L06-02)

### L06-02: Bootstrap и локальные сервисы
- Bootstrap выполнен, doctor показывает OK по переносимым пунктам
- Bridge health: `{"status":"ready","writer":true}`, auth 401 без/с неверным токеном
- Khoj health: `200`, пользователь `default@example.com`
- Локальный поиск: известная запись найдена с `source`, `scope`, `status_hint`
- Отрицательный запрос: `{"ok":true,"results":[]}` (не случайные top-N)
- Unknown project_id: отклонён до HTTP (`unknown-project`)
- `core.hooksPath`: не задан (hooks выключены намеренно)
- Очередь: пуста, `corrupt_count: 0`
- **local_paths:**
  - `site-portfolio`: `C:\Users\gorel\OneDrive\Документы\claude1\projects\C-portfolio-v2` ✅ (подтверждён)
  - `trading-dev`: ⚠️ требуется уточнение (см. ниже)
  - `autopilot-framework`: ⊗ нет подтверждённой копии
- Evidence: [l06-02-post-reboot-nondocker-2026-09-21.json](../evidence/l06-02-post-reboot-nondocker-2026-09-21.json), [l06-02-local-paths-verification-2026-09-23.json](../evidence/l06-02-local-paths-verification-2026-09-23.json)

### L06-03: Restore drill
- Выполнен трижды: 2026-09-14 (локально), 2026-09-15 (второй ПК из пакета), 2026-09-23 (второй ПК из живого состояния)
- Последний restore: 22/22 файла памяти, SHA-256 100% match
- Локальный поиск в восстановленной памяти: evt_9861052a0dfe найден с кириллицей
- Рабочая память не изменялась (git status clean)
- Restore directory: `E:\SystemTheBest\transfer-backups\restore-drill-20260923-184550`
- Evidence: [l06-03-restore-drill-second-pc-2026-09-23.json](../evidence/l06-03-restore-drill-second-pc-2026-09-23.json)

### L06-04: Git/memory profile
- Профиль `core` реализован: bootstrap, doctor, uninstall-all-hooks
- Doctor проверяет: global hooksPath, local hooksPath, direct .git/hooks/post-commit, connected projects
- Doctor различает System2 hooks (маркер "System2 event queue capture") от чужих
- uninstall-all-hooks.sh удаляет все System2 hooks из всех источников, сохраняет чужие
- Повторный bootstrap не возвращает старый захват
- Writer: локальное сохранение, идемпотентность event_id, кириллица сохраняется
- Scoped-коммит не запускает прежний конвейер (hooks выключены, очередь пуста)
- 194/194 теста проходят
- Evidence: [L06-04 issue](../issues/L06-04-git-memory-profile.md), коммиты 8fe1d4e, b7e12a3, 8c2f4eb

### Git-обмен с ноутбуком
- Ноутбук опубликовал: commit f65da92, отметка `SYSTEM2-EXCHANGE-BUGF4FI-ee706bc3fc60`
- Второй ПК получил: 7fd93de записал доказательства получения
- HEAD и origin/master совпадали, дерево чистое
- Направление в обе стороны подтверждено
- Evidence: [CHAT-06-LAPTOP-TASK.md](../CHAT-06-LAPTOP-TASK.md), commit 7fd93de

## Открытые вопросы

### 1. trading-dev: какой репозиторий?

**Ситуация:** На втором ПК найдены три кандидата:
- `E:\dev` — Git remote `https://github.com/gorelovmaxon-cyber/straregi.git`, содержит C# ATAS indicators
- `E:\dev\binance_bot` — Git remote `https://github.com/gorelovmaxon-cyber/binance-bot.git`, содержит Python trading bot
- `E:\Bot Stacy` — существует, но нет .git

Memory reference (`.claude/memory/facts/projects-overview.md`) указывает `D:\dev` как `trading-dev` на первом ПК, но paths на втором ПК другие.

**Вопрос:** Какой из двух репозиториев (`straregi` или `binance-bot`) соответствует registry project `trading-dev`?

**Блокировка:** Явное указание в CHAT-06-TRANSFER.md: "E:\dev не считать автоматически trading-dev", "не выбирать по одному названию или тематике", "если соответствие неоднозначно — дать короткое сравнение и один точный вопрос".

### 2. autopilot-framework: нет подтверждённой копии

**Ситуация:** Memory reference указывает `D:\System` как `autopilot-framework` на первом ПК. На втором ПК подтверждённого каталога нет.

**Решение:** Зафиксировано как "нет подтверждённой копии на этом ПК". Не создавать placeholder, не выдавать фиктивный путь за рабочий.

### 3. Windows recovery

Восстановительная переустановка Windows 11 25H2 ещё выполняется (последняя отметка: загрузка 10%). Docker/WSL не проверялись после перезагрузки 2026-09-21. До завершения recovery не трогать Docker/WSL.

## Тесты

```
node --test scripts/memory/tests/*.test.js
✔ tests 194
✔ pass 194
✔ fail 0
```

Последний прогон: 2026-09-23

## Публикация

- L06-03 evidence: commit 0ea454f
- HANDOFF update: commit 6bcee32
- Local/remote SHA verified: `6bcee322801bd19fca3c4b3a48ec8ed15d8f3e9f`

## Следующий шаг

**Для завершения L06-02 и продолжения фазы 7:**
1. Уточнить `trading-dev`: `straregi` или `binance-bot`?
2. После уточнения: обновить `config/system.local.json` (ignored, не публикуется)
3. Проверить project_id для подтверждённых привязок
4. Проверить отсутствие System2 hooks в подтверждённых проектах
5. Записать evidence локальных привязок
6. Продолжить L07-01: свести R01-R13 в release-матрицу

**Независимая приёмка:** L06-01…L06-04 awaiting-review. `done` ставит приёмщик.

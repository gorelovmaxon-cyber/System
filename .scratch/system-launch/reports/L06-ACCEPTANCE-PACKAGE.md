# L06 Acceptance Package — второй ПК, профиль core

**Дата подготовки:** 2026-09-23  
**Машина:** DESKTOP-NCLRFDV, `E:\SystemTheBest\System`  
**Профиль:** core (Git + writer, без обязательного Docker/AP)  
**Статус:** awaiting-review (независимая приёмка)

## Обзор

Фаза 6 реализовала основной профиль `core` на втором ПК: локальное сохранение через writer, Git-обмен между реальными машинами, restore памяти с проверкой целостности, bootstrap с profile-aware hooks management. Все критерии L06-01…L06-04 выполнены с documented evidence, кроме двух внешних зависимостей (trading-dev path ambiguity, autopilot-framework not found on this PC).

**Тесты:** 194/194 проходят  
**Опубликовано:** `3ef0777a182e141cac8fa2283d26365167808a40` (verified)

## Тикеты и критерии

### L06-01: Доступ к второму ПК и transfer package
**Status:** awaiting-review  
**Requirement IDs:** SC-13  
**Evidence:** Интегрировано в L06-02 evidence

**Выполнено:**
- Корень подтверждён: `E:\SystemTheBest\System`
- Начальное состояние: HEAD `a557f72`, чистое дерево
- Локальные секреты сохранены отдельно от Git
- Transfer package не требовался (второй ПК имел рабочую копию)

### L06-02: Bootstrap, привязка и round-trip
**Status:** awaiting-review (два local_paths требуют уточнения)  
**Requirement IDs:** SC-12, SC-13; R09, R13  
**Evidence:** 
- [l06-02-post-reboot-nondocker-2026-09-21.json](../.scratch/system-launch/evidence/l06-02-post-reboot-nondocker-2026-09-21.json)
- [l06-02-local-paths-verification-2026-09-23.json](../.scratch/system-launch/evidence/l06-02-local-paths-verification-2026-09-23.json)
- [CHAT-06-LAPTOP-TASK.md](../.scratch/system-launch/CHAT-06-LAPTOP-TASK.md)

**Выполнено:**
- ✅ Bootstrap прошёл, doctor показывает OK по переносимым пунктам
- ✅ Bridge health: `{"status":"ready","writer":true}`, auth работает (401 без/с неверным токеном)
- ✅ Khoj health: `200`, пользователь `default@example.com`
- ✅ Локальный поиск: известная запись найдена с `source`, `scope`, `status_hint`
- ✅ Отрицательный запрос: `{"ok":true,"results":[]}`, не случайные top-N
- ✅ Unknown project_id: отклонён до HTTP (`unknown-project`)
- ✅ `core.hooksPath`: не задан (hooks выключены намеренно, очередь пуста)
- ✅ Git round-trip: ноутбук опубликовал f65da92, второй ПК получил (7fd93de), отметка `SYSTEM2-EXCHANGE-BUGF4FI-ee706bc3fc60` найдена
- ⚠️ **local_paths:** site-portfolio подтверждён, trading-dev требует уточнения (straregi vs binance-bot), autopilot-framework не найден на ПК

### L06-03: Restore drill в отдельной среде
**Status:** awaiting-review  
**Requirement IDs:** SC-17; R13  
**Evidence:** 
- [l06-03-restore-drill-second-pc-2026-09-23.json](../.scratch/system-launch/evidence/l06-03-restore-drill-second-pc-2026-09-23.json)
- [system-operations.md](../docs/system-operations.md) (раздел 2026-09-23)

**Выполнено:**
- ✅ Выполнен трижды: 2026-09-14 (локально), 2026-09-15 (второй ПК из пакета), **2026-09-23 (второй ПК из живого состояния)**
- ✅ Последний restore: 22/22 файла памяти, SHA-256 100% match
- ✅ Локальный поиск в восстановленной памяти: evt_9861052a0dfe найден с кириллицей
- ✅ Рабочая память не изменялась (git status clean после restore)
- ✅ Restore directory: `E:\SystemTheBest\transfer-backups\restore-drill-20260923-184550`
- ⊗ AP flow/volume restore: необязательная интеграция (Docker отсутствует)

### L06-04: Git/memory profile
**Status:** awaiting-review  
**Requirement IDs:** SC-12, SC-13; новый профиль 2026-09-23  
**Evidence:**
- [L06-04 issue](../.scratch/system-launch/issues/L06-04-git-memory-profile.md)
- [CHAT-06A-RESULT.md](../.scratch/system-launch/reports/CHAT-06A-RESULT.md)
- Commits: 8fe1d4e, b7e12a3, 8c2f4eb

**Выполнено:**
- ✅ Профиль `core` реализован: bootstrap, doctor, uninstall-all-hooks
- ✅ Doctor проверяет: global hooksPath, local hooksPath, direct .git/hooks/post-commit, connected projects
- ✅ Doctor различает System2 hooks (маркер "System2 event queue capture") от чужих
- ✅ uninstall-all-hooks.sh удаляет все System2 hooks из всех источников, сохраняет чужие
- ✅ Повторный bootstrap не возвращает старый захват
- ✅ Writer: локальное сохранение, идемпотентность event_id, кириллица сохраняется
- ✅ Scoped-коммит не запускает прежний конвейер (hooks выключены, очередь пуста)
- ✅ 194/194 теста проходят

## Требования SPEC (актуальная редакция 2026-09-23)

| R | Критерий | Статус | Evidence |
|---|---|---|---|
| R01 | Роли и шаблон | ✅ Готово | docs/system-workflow.md, CHAT-06A-RESULT.md |
| R02 | Локальная привязка | ⚠️ Частично | site-portfolio подтверждён, trading-dev/autopilot требуют уточнения |
| R03 | Качество памяти | ✅ Готово | 194/194 теста, writer idempotency, Cyrillic preservation |
| R04 | Khoj | ✅ Готово | l06-02-post-reboot-nondocker-2026-09-21.json |
| R05 | Локальный поиск | ✅ Готово | Fallback работает, известная запись найдена |
| R06 | Writer через исполнителя | ✅ Готово | CHAT-06A-RESULT.md, writer entries актуальны |
| R07 | Hooks и очередь | ✅ Готово | L06-04, bootstrap/doctor/uninstall, hooks выключены намеренно |
| R08 | Indexed | ✅ Готово | Khoj работает, индекс перестраивается из памяти |
| R09 | Git-обмен двух ПК | ✅ Готово | CHAT-06-LAPTOP-TASK.md, f65da92/7fd93de |
| R10 | Figma | ⊗ Исключено | Решение пользователя 2026-09-14 |
| R11 | Маршруты | ✅ Готово | Core profile реализован |
| R12 | Приёмка | ✅ Готово | Локальные блоки приняты Фазой 1 на f254a5f |
| R13 | Restore | ✅ Готово | l06-03-restore-drill-second-pc-2026-09-23.json |

## Открытые вопросы (не блокируют приёмку выполненного)

### 1. trading-dev path ambiguity

**Ситуация:** Два отдельных Git-репозитория на втором ПК:
- `E:\dev` → `https://github.com/gorelovmaxon-cyber/straregi.git` (C# ATAS indicators)
- `E:\dev\binance_bot` → `https://github.com/gorelovmaxon-cyber/binance-bot.git` (Python bot)

**Действие:** Требуется уточнение от пользователя, какой репозиторий соответствует registry project `trading-dev`.

**Не блокирует:** site-portfolio подтверждён и работает, systemqwen (сам System) работает. trading-dev нужен для полноты привязки, но не блокирует core profile functionality.

### 2. autopilot-framework not found

**Ситуация:** Memory reference указывает `D:\System` на первом ПК. На втором ПК не найдено.

**Действие:** Зафиксировано как `not_found_on_this_pc`. Привязка остаётся `<ABSOLUTE_AUTOPILOT_ROOT>` до обнаружения подтверждённой копии.

**Не блокирует:** Если проект не используется на втором ПК, binding может остаться незаполненным.

### 3. Windows recovery in progress

Восстановительная переустановка Windows 11 25H2 ещё выполняется (последняя отметка: 10%). Docker/WSL не проверялись после перезагрузки 2026-09-21. Это не блокирует core profile (работает без Docker), но AP интеграция отложена до завершения recovery.

## Тесты

```bash
cd E:\SystemTheBest\System
node --test scripts/memory/tests/*.test.js
```

**Результат (2026-09-23):**
```
✔ tests 194
✔ pass 194
✔ fail 0
✔ duration_ms 28716.9348
```

Все тесты включают:
- Writer idempotency (повторный event_id не создаёт дубли)
- Cyrillic text preservation (UTF-8 round-trip)
- Lock ownership (OS-bind authority)
- Queue durability (crash recovery)
- Hook installation (profile-aware, preserves foreign hooks)
- Bootstrap idempotency (повторный вызов безопасен)
- Project isolation (assertSafePath, project_id validation)
- Memory fixation (scoped commit не запускает cycle)

## Публикация

**Коммиты фазы 6 (после baseline a557f72):**
- 8fe1d4e: L06-04 core profile bootstrap/doctor
- b7e12a3: L06-04 profile-aware hooks tests
- 8c2f4eb: L06-04 расширенная проверка hooks (замечание 5)
- 0ea454f: L06-03 restore drill 2026-09-23
- 6bcee32: HANDOFF update L06-03
- 3ef0777: L06 readiness matrix

**Remote SHA verified:** `3ef0777a182e141cac8fa2283d26365167808a40`

## Материалы для приёмки

### Основные документы
1. [L06-READINESS-MATRIX.md](L06-READINESS-MATRIX.md) — сводная матрица
2. [CHAT-06A-RESULT.md](CHAT-06A-RESULT.md) — реализация core profile
3. [CHAT-06-SECOND-PC-SESSION.md](CHAT-06-SECOND-PC-SESSION.md) — сессия на втором ПК
4. [PLAN-GIT-MEMORY-2026-09-23.md](../PLAN-GIT-MEMORY-2026-09-23.md) — актуальный план

### Evidence files
1. [l06-02-post-reboot-nondocker-2026-09-21.json](../.scratch/system-launch/evidence/l06-02-post-reboot-nondocker-2026-09-21.json)
2. [l06-02-local-paths-verification-2026-09-23.json](../.scratch/system-launch/evidence/l06-02-local-paths-verification-2026-09-23.json)
3. [l06-03-restore-drill-second-pc-2026-09-23.json](../.scratch/system-launch/evidence/l06-03-restore-drill-second-pc-2026-09-23.json)

### Issues
1. [L06-01-second-pc-access-and-transfer-package.md](../.scratch/system-launch/issues/L06-01-second-pc-access-and-transfer-package.md)
2. [L06-02-second-pc-bootstrap-and-roundtrip.md](../.scratch/system-launch/issues/L06-02-second-pc-bootstrap-and-roundtrip.md)
3. [L06-03-restore-drill-separate-environment.md](../.scratch/system-launch/issues/L06-03-restore-drill-separate-environment.md)
4. [L06-04-git-memory-profile.md](../.scratch/system-launch/issues/L06-04-git-memory-profile.md)

### Дополнительные документы
1. [CHAT-06-LAPTOP-TASK.md](../.scratch/system-launch/CHAT-06-LAPTOP-TASK.md) — Git exchange с ноутбуком
2. [docs/system-operations.md](../docs/system-operations.md) — restore procedures
3. [HANDOFF.md](../HANDOFF.md) — актуальная передача

## Команды проверки

### На втором ПК (E:\SystemTheBest\System)

```powershell
# Версия и тесты
git log -1 --format="%H %s"
node --test scripts/memory/tests/*.test.js

# Doctor
node scripts/memory/doctor.js --json

# Bridge health
curl.exe http://127.0.0.1:8643/health

# Khoj health
curl.exe http://127.0.0.1:42110/api/health

# Поиск известной записи
node scripts/memory/search.js --query "push без нового вопроса в согласованных границах" --project systemqwen

# Проверка project_id
cd "C:\Users\gorel\OneDrive\Документы\claude1\projects\C-portfolio-v2"
set SYSTEM2_ROOT=E:\SystemTheBest\System
node %SYSTEM2_ROOT%\scripts\memory\project-id.js

# Hooks status
cd E:\SystemTheBest\System
git config --get core.hooksPath
node scripts/memory/queue-status.js

# Состояние очереди
node scripts/memory/queue-status.js --json
```

### Проверка Git-обмена

```powershell
# Наличие коммита ноутбука
git log --oneline --all --grep="BUGF4FI"
git log f65da92 -1

# Отметка в файле
grep "SYSTEM2-EXCHANGE-BUGF4FI-ee706bc3fc60" .scratch\system-launch\CHAT-06-LAPTOP-TASK.md

# Evidence получения
git log 7fd93de -1
```

### Проверка restore

Restore directory существует и содержит восстановленные файлы с проверенными SHA-256:
```powershell
ls E:\SystemTheBest\transfer-backups\restore-drill-20260923-184550\.claude\memory
```

Evidence содержит полный manifest с SHA-256 для каждого файла.

## Известные ограничения

1. **U+FFFD defect** — известный открытый дефект достоверности памяти. Воспроизведение известно, причина не установлена. Не объявлен исправленным.

2. **Docker/AP integration** — необязательная интеграция. Core profile работает без неё. Windows recovery ещё выполняется.

3. **Figma** — исключена из обязательного объёма решением пользователя 2026-09-14.

4. **local_paths** — два из трёх требуют уточнения (trading-dev ambiguity, autopilot not found).

## Рекомендация

L06-01…L06-04 готовы к независимой приёмке с двумя открытыми вопросами (trading-dev path, autopilot-framework location), которые не блокируют функциональность core profile.

**Приёмка может:**
- Принять выполненную часть (site-portfolio binding, Git exchange, restore, core profile functionality)
- Отложить завершение L06-02 до уточнения trading-dev и autopilot-framework paths
- Перейти к L07 с частично заполненными local_paths (systemqwen и site-portfolio работают)

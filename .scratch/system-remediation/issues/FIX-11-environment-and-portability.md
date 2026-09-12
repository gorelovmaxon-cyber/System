# FIX-11 — Среда и переносимость: фактическая проверка, hooks, Figma, маршруты

**What to build:** Фактическая среда этой машины зафиксирована с датой (2026-09-09) в ENVIRONMENT.md; переносимые hooks проверены на изолированном клоне (включая divergence/merge на временном remote); Figma MCP перепроверен (`npm test`); маршруты — dry-run; внешние блокировки перечислены с причинами и awaiting-validation.
**Requirement IDs:** SC-01/02/04/06/11/12/13/14/15/17 (R02, R04, R05, R06, R07, R09, R10, R11, R13)
**Blocked by:** none (после FIX-10)
**Status:** awaiting-validation (внешние сервисы/второй ПК; локальные проверки awaiting-review)

## Контекст

Аудит требует не делать выводов об отсутствии Docker/Python/WSL по вчерашним отчётам. Фактическая проверка этой машины: Node v24.18.0, Git 2.55.0, Docker отсутствует, WSL не инициализирован (wsl.exe системный, дистрибутивов нет), Python — нерабочий WindowsApps alias. Khoj/Activepieces/Figma-live/второй ПК недоступны → awaiting-validation с причинами. Установка Docker Desktop / Python 3.12 требует решения и доступа пользователя (системные изменения) — выносится отдельно.

## Файлы для изменения

- `.scratch/system-completion/ENVIRONMENT.md` — актуализировать с датой проверки 2026-09-09: версии (Node/Git), отсутствие Docker/WSL/Python, core.hooksPath пуст, remote/ветка, отсутствие `.local/`; внешние блокировки и что требуется от пользователя.
- `docs/second-pc.md` — (если найдётся расхождение с фактическим поведением bootstrap/doctor на этой машине) датированная правка.
- `docs/routes/*` — не менять без расхождения; зафиксировать dry-run в отчёте.
- `scripts/memory/tests/fix-11-hooks.test.js` — новый тест: изолированный клон (temp git repo с bare-remote): install-hooks идемпотентен; commit → одно pending-событие; divergence: две ветки с разными записями памяти → merge сохраняет обе версии; `sync.js --push` на временный remote после merge.
- `scripts/memory/tests/fix-11-figma.test.js` — (или вызов существующих тестов) `npm test` в `.claude/mcp-servers/figma`.
- `SC-REVIEW-MATRIX.md` — финальные статусы SC-01/02/04/06/11/12/13/14/15/17.

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `core.hooksPath` настоящей рабочей копии (подключение исправленного writer к рабочему потоку — только после внешней приёмки блока F01–F04); установка Docker/Python без решения пользователя; секреты.

## Входные/выходные данные

Тесты/проверки на временных каталогах и временном bare-remote. Никаких изменений в настоящем `.git/hooks` и `.local/`.

## Алгоритм (шаг за шагом)

1. ENVIRONMENT.md: фактический срез с датами и командами (проверено на этой машине).
2. Изолированный клон: `git clone` репозитория в TEMP; `bash .git-hooks-templates/install-hooks.sh` дважды (идемпотентность); пустой commit → ровно одно pending-событие в `.local/queue` (это не реальная память — клон изолирован).
3. Divergence: в двух клонах-фикстурах добавить разные записи памяти в один файл; `git pull`/merge → обе версии сохранены (конфликт или обе строки), без force; `sync.js --status`/`--push` на временный bare-remote.
4. Figma: `npm ci` (lockfile) + `npm test` в `.claude/mcp-servers/figma` — повторный прогон 2/2.
5. Маршруты: `node scripts/memory/route.js` на 3 примерах + неоднозначный — dry-run, результат в отчёт.
6. Обновить матрицу и RELEASE-REPORT по результатам; внешние блокировки — список для пользователя (Docker Desktop, Python 3.12, Figma-ключ+макет, второй ПК).

## Критерии приёмки

- [ ] ENVIRONMENT.md отражает проверку 2026-09-09 с командами и датой.
- [ ] Hook-сценарий в изолированном клоне: установка идемпотентна; commit → одно событие; divergence merge сохраняет обе версии; push только явный (на временный remote).
- [ ] Figma `npm test` повторно 2/2 (или точная причина сбоя).
- [ ] Маршруты: 3+1 dry-run с ожидаемыми результатами.
- [ ] Внешние блокировки перечислены с причинами и тем, что нужно от пользователя; awaiting-validation.

## Проверки

**Среда и предпосылки:** локальный Node/Git; временные клоны; сеть для clone (remote доступен, так как репозиторий уже склонирован).
**Команды:** см. алгоритм; итоговый прогон всех регрессий `node --test scripts/memory/tests/`.
**Ожидаемый результат:** все локальные проверки зелёные; внешние — честные статусы.
**Если проверка недоступна:** указать причину; awaiting-validation.

## Ограничения

Установка Docker Desktop / Python 3.12 / Figma-ключа / второго ПК — требует решения и доступа пользователя; в этом тикете — только фиксация причин и зависимых шагов. Живой Khoj/Activepieces/Figma-live — вне этого тикета.

## Как закончить

1. Проверки по алгоритму. 2. Обновить ENVIRONMENT.md, матрицу. 3. Scoped-коммит `FIX-11`. 4. `awaiting-review` для локальных проверок; `awaiting-validation` для внешних. 5. Финальная сводка: обновить SUMMARY, HANDOFF, написать `REMEDIATION-REPORT.md`.

## Блок 4: выполнено и проверено (2026-09-12)

Блок 4 закрывает три находки переносимости этого тикета (G10, G11, G14), перенос
`transfer`-набора (G17, G19) и повторную доставку очереди (G12).

**Что изменено.**

- `.git-hooks-templates/install-hooks.sh` (G11): действующий каталог hook
  запрашивается у Git (`rev-parse --path-format=absolute --git-path hooks`), поэтому
  относительный `core.hooksPath` одного worktree не отключает общий пользовательский
  hook молча. Активная чужая настройка → отказ (exit 2); существующий пользовательский
  hook → backup и только с `--force`; отсутствующий шаблон → явная ошибка (exit 1) без
  настройки мёртвого `hooksPath`; после установки путь и наличие hook проверяются.
- `.git-hooks-templates/post-commit` (G19): база diff — первый родитель
  (`rev-parse --verify --quiet HEAD^1`), у первого commit истории — пустое дерево Git;
  недоступный diff записывается явной пометкой, а не пустым содержимым. Разбор строки
  `rev-list`/`cut` отвергнут: для root-commit `cut` возвращал сам sha, и diff шёл между
  `HEAD` и `HEAD` (это и было причиной пустого diff после первой правки — поймано
  регрессией). Hook также запускает ограниченный `queue-worker.js --watch --no-revive
  --max-idle-ms 120000`.
- `scripts/memory/init-project.js` (G10, G14): маркеры проверяются по порядку, оба
  документа собираются до первой записи, `--register` сохраняет `local_paths[project_id]`,
  повторная привязка каталога/проекта отклоняется.
- `scripts/memory/sync.js` (G17): пункт назначения push — ветка upstream (или явный
  `--branch`), без upstream команда отказывается отправлять; после push SHA ветки
  назначения на remote сверяется с `HEAD` (`verified`).
- `scripts/memory/queue-worker.js` (G12): ограниченный `watch` (ожидание
  `next_attempt_at`, ограниченное оживление, статусы `idle`/`deadline`/`failed`, один
  worker на очередь через существующий примитив блокировки).
- `docs/memory-contract.md`, `docs/system-operations.md`: политика diff, семантика
  назначения push, проверка маркеров/привязки, порядок повторной доставки.

**RED.** База — сам git: `HEAD` (`a8bfaf4`) в отдельном worktree, куда скопированы
только новые тесты. `node --test fix-11.test.js fix-11-cycle.test.js` → **9 pass, 14 fail**
([вывод](evidence/red-2026-09-12-block4-unit.txt)); прогон трёх harness'ов на том же
дереве → `reproduced: true` для G10, G11, G12, G14, G16, G17, G19
([audit](evidence/red-2026-09-12-block4-harness-results.json),
[extra](evidence/red-2026-09-12-block4-extra-results.json),
[transfer](evidence/red-2026-09-12-block4-transfer-results.json)).

**GREEN.** На исправленном дереве `node --test scripts/memory/tests/*.test.js` → **146/146**;
целевые файлы — **23/23** ([вывод](evidence/green-2026-09-12-block4-suite.txt)). Повторный
прогон harness'ов: G10, G11, G14, G17, G19 → `not-reproduced`
(`evidence/comprehensive-*-2026-09-12-results.json`; сохранённые до повтора результаты —
`evidence/pre-block4/`).

**Открытые наблюдения (не приёмка).**

- Проба G12 вызывает `drain()` — один проход, который по контракту остаётся одним
  проходом, поэтому её вердикт `reproduced: true` исправлением не меняется. Критерий
  аудита закрывает `watch()`, проверенный тремя положительными регрессиями.
- Merge-проба G19 — позитивный страж политики «первый родитель»: `git merge` сам
  `post-commit` не вызывает (проверено на Git 2.55), поэтому на базе она проходит и до
  правки. Дефект воспроизводят две другие пробы (root commit и недоступный diff).
- Живой прогон в изолированном клоне на настоящем remote, `npm ci`/`npm test` Figma,
  dry-run маршрутов и внешние блокировки (Docker Desktop, Python 3.12, ключ+макет Figma,
  второй ПК) остаются незакрытыми: они требуют внешней среды или решения пользователя.

Статус остаётся `awaiting-validation`: `READY` выставляет только независимая приёмка.

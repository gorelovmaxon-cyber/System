# CHAT-02-RESULT — Khoj: установка, настоящий индекс, поиск и восстановление

Дата: 2026-09-12. Роль: исполнитель Sonnet 5, фаза 2 (всего семь чатов).
Задание: [CHAT-02-KHOJ.md](../CHAT-02-KHOJ.md), тикеты L02-01, L02-02, L02-03.

- base SHA: `1c0bc9d6cca2b782529603ce6de46efe8928b323` (= remote `origin/master` на момент старта)
- финальный SHA фазы 2: `7a3ad88f45d8e0b4e10f01ef397afd01aef07f72`.
- При повторной проверке 2026-09-13 HEAD/remote уже на `8c822b1fcbc77f689a68df97e76db3bebd763d5c`;
  последующие PROC-01-коммиты относятся к правилам процесса.

## Проверка и завершение передачи 2026-09-13

По просьбе пользователя GPT проверил фазу 2 на `8c822b1` и закрыл недостающий
критерий L02-03: **новое содержимое и следующая ревизия действительно попадают
в индекс**, а не только получают ответ `/api/update` или читаются адаптером с диска.
Исправлены три относительные ссылки и указан точный SHA публикации фазы 2.
При заключительном запуске обнаружен и исправлен дефект восстановления: `pgserver`
ограничивал запуск `pg_ctl` 10 секундами, тогда как PostgreSQL восстанавливался
около 38 секунд после нештатного завершения. Причина самого завершения не установлена.
Launcher теперь даёт `pg_ctl start` 120 секунд и внешний timeout 125 секунд;
обычные ошибки остаются ошибками, stop не меняется. Установленный пакет не правился.
Три регрессии `services/khoj/test_run_local.py` проходят; сценарий медленного
восстановления моделируется без аварийной остановки основной БД.

Прогон: [khoj-phase2-live-review.py](../evidence/khoj-phase2-live-review.py).
Фактический результат: [khoj-phase2-live-review-2026-09-13.json](../evidence/khoj-phase2-live-review-2026-09-13.json).
Это ручная живая проверка: она временно останавливает и снова запускает Khoj;
не включена в автоматический набор тестов.

- Канонический индекс: **19 файлов**, точное совпадение с памятью; источник только
  `.claude/memory/**/*.md`, модели поиска локальные, внешние endpoints/ключи отсутствуют.
- Изоляция: отдельный временный пользователь Khoj, отдельный источник и System2-root
  в TEMP. Записи создавались настоящим writer в этой фикстуре; production-память не менялась.
- Две последовательные ревизии: уникальный текст отсутствует в сыром ответе Khoj
  до индексации, появляется после неё и находится системным адаптером с нужным scope.
  Авторизация временного пользователя добавлялась только на HTTP-границе теста;
  ответы не подменялись, индексатор и поиск использовались из текущего checkout.
- Останов: задача → `failed`, поиск → `fallback:local`, запись → `persisted`,
  `indexed:false`. После старта прежний индекс доступен ещё до обновления;
  `requeue` → `indexed`, новая ревизия находится в сыром ответе и через адаптер.
- После проверки временный пользователь, токен, источник и индекс удалены.
  SHA-256 всех Markdown-файлов основной памяти, содержимое индекса пользователя
  `default` и его настройки источника совпали со снимком до проверки.
- Регрессии адаптеров (`fix-01`, `fix-03`, `fix-07`, `fix-08`): **64/64**, exit 0.
  Общая приёмка ядра не повторялась.

Первый проход: `C:\Users\1663646\AppData\Local\Temp\s2-khoj-live-review-nmt7uirs`.
При последующей проверке сервис был остановлен; первоначальный успешный прогон
не доказывал его дальнейшую доступность. Ошибка 10-секундного ожидания —
`D:\SystemTheBest\runtime\khoj-review-2026-09-13.stderr.log`; восстановление БД
с 07:47:41 до 07:48:19 GMT — `D:\SystemTheBest\runtime\khoj-data\pgserver\log`.

После исправления выполнен **повторный полный живой сценарий**, exit 0;
итоговый JSON выше относится к нему. Каталог:
`C:\Users\1663646\AppData\Local\Temp\s2-khoj-live-review-vuygcqba`, файлы
`restart.stdout.log`, `restart.stderr.log`, `result.json` и изолированная фикстура.
Токен на диск не сохранялся. Launcher запускается скрытым `Start-Process`.
После завершения проверочной команды **отдельным вызовом** подтверждены живой health,
поиск известной записи и пустой ответ на отсутствующую фразу. Khoj оставлен работающим.
Cold-start первого прохода занял около 90 секунд; прежние ~24 с из отчёта Sonnet
не являются нормативом. Перед повторным запуском проверять PID/health.

**Вывод по фазе 2:** критерии Khoj подтверждены; следующий шаг остаётся чат 3 —
Activepieces. Это не приёмка сквозного AP-цикла или полного релиза.

## Тикеты

| Тикет | Результат | Статус |
|---|---|---|
| L02-01 | Khoj 1.42.10 установлен одним проверенным путём, без Docker и смены закреплённых версий | verified-local |
| L02-02 | живой локальный Khoj: health, реальный поиск, scope, изоляция источника | verified-live |
| L02-03 | реальный механизм обновления индекса и подтверждение завершения | verified-live |

Тикеты записаны в [issues/](../issues/): `L02-01-khoj-install.md`,
`L02-02-khoj-live-search.md`, `L02-03-index-freshness.md`.

## Что реально работает

- **Khoj 1.42.10 запущен локально.** `D:\SystemTheBest\runtime\khoj-1.42.10`,
  `http://127.0.0.1:42110`, встроенный PostgreSQL из extra `[local]` (`pgserver==0.1.4`).
  Docker не потребовался.
- **Индекс настоящий и точно ограничен.** 19 файлов = 19 файлов на диске, лишних нет;
  единственный источник — `D:/SystemTheBest/System/.claude/memory/**/*.md`. Других
  источников в БД нет (`org`/`plaintext`/`github`/`notion` — 0).
- **Поиск локальный и бесплатный.** `thenlper/gte-small` + `mixedbread-ai/mxbai-rerank-xsmall-v1`,
  тип endpoint `local`; внешних ключей и адресов нет. Khoj не стал платным планировщиком.
- **Известная запись находится живым сервисом** через `scripts/memory/search.js`: source
  внутри `.claude/memory/`, scope `systemqwen`, актуальное содержимое.
- **Обновление индекса — по факту, а не по коду ответа.** `GET /api/update` синхронен:
  200 и `{"status":"ok"}` приходят после завершённой индексации. `indexed` ставится
  только после подтверждения.
- **Восстановление проверено на живом сценарии**: останов → `failed` с причиной →
  запуск → `--requeue-failed` → `indexed`.

## Два дефекта релиза на Windows

Выявлены при запуске, обойдены в `services/khoj/run-local.py` без правок внутри пакета и
без смены закреплённых зависимостей:

1. ветка `USE_EMBEDDED_DB=true` рассчитана на Unix-сокет (в `DB_HOST` подставляется каталог
   pgdata, в `DB_PORT` — пустая строка) и на Windows непригодна;
2. в колесе pgserver 0.1.4 для Windows нет базы часовых поясов, из-за чего Django падал на
   `SET TimeZone='UTC'` до первой миграции; TZif-файлы восстанавливаются из пакета `tzdata`.

Прочитать задачу целиком в [docs/khoj-setup.md](../../../docs/khoj-setup.md).

## Команды и результат

```text
khoj --version                                     → 1.42.10 (совпадает с метаданными пакета)
GET /api/health                                    → {"email": "default@example.com"}
GET /api/content/files (page 0..1)                 → 19 файлов, расхождений с диском нет
GET /api/search?q=W1 independently accepted…       → ok:true, source .claude/memory/facts/writer-entries.md
GET /api/search?q=<несуществующая фраза>           → {"ok":true,"results":[]}
search.js --project not-a-project                  → {"ok":false,"error":"unknown-project"} до HTTP
run-local.py --status                              → сервис работает, postgres ready
run-local.py --stop                                → pg_ctl -m fast, затем сервис; порт свободен
indexer.js --status / --run / --requeue-failed     → pending → failed(fetch failed) → indexed
node --test fix-01,fix-03,fix-07,fix-08            → 64/64 pass
node scripts/memory/doctor.js --json               → "Khoj health" OK
```

Evidence восстановления при выключенном Khoj:

```json
{"ok":false,"error":"khoj-unavailable","fallback":"local","fallback_results":[…]}
{"task_id":"idx_d5ed571f4b4cfa3e","status":"failed","reason":"fetch failed"}
{"requeued":1}
{"results":[{"task_id":"idx_d5ed571f4b4cfa3e","status":"indexed","reason":null}]}
```

Запись `evt_system2_acceptance_w1_20260912` оставалась `persisted` всё время, пока Khoj был
выключен: состояние записи не зависит от доступности сервиса.

## Изменённые файлы

| Файл | Что |
|---|---|
| `services/khoj/run-local.py` | **новый**: запуск pgserver + Khoj, `--stop`/`--status`, TZif-восстановление |
| `services/khoj/config.example.env` | **новый**: воспроизводимая форма без абсолютных путей и секретов |
| `scripts/memory/search.js` | адаптер под реальный контракт 1.42.10: `GET /api/search`, голый массив, `additional.file` |
| `scripts/memory/indexer.js` | `reindex()` подтверждает завершение телом `{"status":"ok"}`, а не кодом ответа |
| `scripts/memory/doctor.js` | дефолт health-пути `/health` → `/api/health` |
| `config/system.example.json` | `integrations.khoj` и `indexer.reindex_url` — реальные значения |
| `scripts/memory/tests/fix-07.test.js`, `fix-08.test.js` | заглушки под реальный ответ + тест «2xx без подтверждения» |
| `.gitignore` | `services/khoj/config.local.*`, `services/khoj/data/`, `__pycache__/` |
| `services/khoj/README.md`, `docs/khoj-setup.md`, `docs/khoj-integration.md`, `docs/system-operations.md`, `scripts/memory/README.md` | к факту с датой |
| `.scratch/system-completion/ENVIRONMENT.md` | раздел «Повторная проверка 2026-09-12» |
| `.scratch/system-completion/SC-04-REPORT.md`, `issues/SC-04-*.md` | датированная пометка о снятии блокировки; статус трекера не менялся |
| `HANDOFF.md` | новая актуальная передача фазы 2; прежняя стала предыдущей |

Ядро (writer, очередь, path-safety, jsonl) не пересматривалось. Содержимое
`.claude/memory` вручную не правилось; тестовые факты в память не писались.

## Локальная конфигурация (значения не публикуются)

Пути без значений: `services/khoj/config.local.env` (gitignored) — каталог pgdata, ключ
Django, локальные admin email/пароль, host/port, корень памяти. Подтверждено
`git check-ignore -v`: `config/system.local.json`, `services/khoj/config.local.env`,
`services/khoj/data/` — все три игнорируются. В example, коммите и отчёте значений
секретов нет.

## Фактическое состояние процессов (проверено, не по документам)

- Khoj `127.0.0.1:42110` — **работает** (`GET /api/health` отвечает);
  `python.exe` сервиса и `postgres.exe` из pgserver запущены, PID сервиса — в
  `D:\SystemTheBest\runtime\khoj-data\khoj-service.pid`.
- Остановка одной командой: `…\run-local.py --stop`. Проверено: после неё процессов,
  порта и `postmaster.pid` не остаётся.
- bridge `127.0.0.1:8643` — **не работает** (вне этой фазы).
- Docker отсутствует, Activepieces не запускался (вне этой фазы).
- `core.hooksPath` не установлен.

## Оставшиеся untracked (намеренно)

- `.scratch/system-remediation/ASTRA-ORCHESTRATION-IDEAS-2026-09-12.md` — черновик Astra.
- `.scratch/system-remediation/evidence/status-check-current-tests.txt` — старый UTF-16-лог
  PowerShell.

Оба существовали до этой фазы, не удалялись и в коммит не включены.

## Нерешённые вопросы

- Порт встроенного PostgreSQL выбирается свободным при каждом старте и меняется между
  запусками; сервис сообщает его сам, внешним потребителям он не нужен.
- Индекс инкрементален, но расписание переиндексации не настроено: обновление запускается
  `indexer.js --run` (или `--reconcile` при расхождении). Автоматизация — отдельная задача.
- Git-синхронизация (`synced`) — SC-11, здесь не реализуется.

## Следующий шаг

Chat 3 — Activepieces: см. [CHAT-03](../CHAT-03-ACTIVEPIECES.md). Ожидаемая зависимость:
Docker отсутствует, поэтому подготовка окружения передаётся этому чату. Khoj к его работе
готов: сервис запускается и останавливается одной командой, индекс и поиск проверены.

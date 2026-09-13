# Khoj — локальный retrieval-слой System2

Проверено на живой установке 2026-09-12.

| Параметр | Значение |
|---|---|
| Версия | Khoj `1.42.10` (`khoj --version` и метаданные пакета совпадают) |
| venv | `D:\SystemTheBest\runtime\khoj-1.42.10` (вне репозитория) |
| Адрес | `http://127.0.0.1:42110` |
| Режим | `--anonymous-mode --non-interactive`; запросы отображаются на пользователя `default` |
| БД | встроенный PostgreSQL из extra `[local]` (`pgserver==0.1.4`), Docker не нужен |
| Источник индекса | ровно `<SYSTEM_ROOT>/.claude/memory/**/*.md` — 19 файлов, других источников нет |
| Модели | `thenlper/gte-small` (bi-encoder), `mixedbread-ai/mxbai-rerank-xsmall-v1` (cross-encoder), тип endpoint `local` — внешний платный провайдер не используется |

## Команды

```powershell
$py = "D:\SystemTheBest\runtime\khoj-1.42.10\Scripts\python.exe"

& $py services/khoj/run-local.py                      # запуск сервиса (в foreground)
& $py services/khoj/run-local.py --set-memory-source  # прописать источник индекса и выйти
& $py services/khoj/run-local.py --status             # состояние сервиса и БД
& $py services/khoj/run-local.py --stop               # остановить сервис и БД
```

Скрытый запуск с логом (использовался при приёмке):

```powershell
$env:PYTHONUTF8 = "1"
Start-Process -FilePath $py -ArgumentList "services/khoj/run-local.py" `
  -WorkingDirectory "D:\SystemTheBest\System" -WindowStyle Hidden `
  -RedirectStandardOutput "D:\SystemTheBest\runtime\khoj-service.log" `
  -RedirectStandardError  "D:\SystemTheBest\runtime\khoj-service.err.log"
```

`--stop` останавливает сначала PostgreSQL штатным `pg_ctl -m fast` (checkpoint), и
только потом процесс сервиса. Обратный порядок оборвал бы postmaster жёстко и
потребовал восстановления при следующем старте. PID сервиса лежит в
`<PGSERVER_DATA_DIR>/../khoj-service.pid`.

## Конфигурация

Локальные значения — в `services/khoj/config.local.env` (**gitignored**), форма без
секретов и абсолютных путей — в [config.example.env](config.example.env). Файл читает
`run-local.py`; отдельного YAML-конфига у релиза нет.

## Два дефекта релиза на Windows

Оба обойдены в `run-local.py`; закреплённые зависимости не менялись.

1. **Ветка `USE_EMBEDDED_DB=true` непригодна на Windows.** Khoj безусловно подставляет
   в `DB_HOST` каталог pgdata, а в `DB_PORT` — пустую строку, потому что рассчитывает на
   Unix-сокет (`socket.AF_UNIX`). На Windows pgserver поднимает сервер по TCP на
   `127.0.0.1` со свободным портом, поэтому подключиться по этому пути нельзя.
   `run-local.py` сам стартует pgserver и передаёт Khoj фактические host/port,
   выставляя `USE_EMBEDDED_DB=false` уже после старта БД.
2. **В колесе pgserver 0.1.4 для Windows нет базы часовых поясов.** Каталог
   `share/postgresql/timezone` отсутствует, и Django падает на `SET TimeZone='UTC'`
   ещё до первой миграции. `run-local.py` восстанавливает TZif-файлы из пакета
   `tzdata` (те же данные, что генерирует `zic`).

## Дополнение 2026-09-13: запуск после нештатного завершения

При повторной проверке PostgreSQL восстанавливался около 38 секунд, а `pgserver`
0.1.4 завершал launcher по жёсткому timeout 10 секунд. `run-local.py` увеличивает
только ожидание `pg_ctl start`: до 120 секунд внутри pg_ctl и 125 секунд снаружи.
Подмена функции действует только на время `get_server`; пакет на диске не меняется.
Не запускать второй экземпляр, пока первый восстанавливает БД. Показатель готовности
Khoj — `/api/health`, не только существующий процесс PostgreSQL.

Регрессии launcher: `<venv>/Scripts/python.exe services/khoj/test_run_local.py`.
Доказательства проверки фазы: [CHAT-02-RESULT](../../.scratch/system-launch/reports/CHAT-02-RESULT.md#проверка-и-завершение-передачи-2026-09-13).

## Границы индекса

Индексируется только `.claude/memory`, только Markdown. `.env`, весь репозиторий,
`services/`, `runtime/` и `.local/` в индекс не попадают. Секреты хранятся только в
gitignored-конфиге и в индекс не пишутся. Khoj — помощник поиска: обязательные файлы
проекта и `MEMORY.md` он не заменяет.

Контракт вызова — [docs/khoj-integration.md](../../docs/khoj-integration.md),
установка и восстановление — [docs/khoj-setup.md](../../docs/khoj-setup.md).

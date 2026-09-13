# Khoj: установка, запуск и восстановление

Runbook проверенного пути. Версия зафиксирована по факту живой установки
**2026-09-12**: Khoj `1.42.10`, встроенный PostgreSQL из extra `[local]`, Docker не
требуется.

Источники, сверенные 2026-09-12: [официальный setup](https://github.com/khoj-ai/khoj/blob/master/documentation/docs/get-started/setup.mdx),
[официальные releases](https://github.com/khoj-ai/khoj/releases),
[метаданные PyPI](https://pypi.org/project/khoj/) и сам установленный релиз — контракт
API берётся из него, а не из документации прошлых версий.

## Требования

- Python 3.12 (`requires_python` релиза — `>=3.10,<3.13`). На машине приёмки:
  `C:\Users\<user>\AppData\Local\Programs\Python\Python312\python.exe`, `Python 3.12.10`.
- venv вне репозитория: `D:\SystemTheBest\runtime\khoj-1.42.10`.
- Docker не нужен. `cmake` и Visual Studio не нужны — см. ниже.

## Установка (один проверенный путь)

`llama-cpp-python==0.2.88` — **базовая** зависимость релиза, а не extra, и на PyPI она
лежит только исходниками. Сборка из sdist на машине без `cmake` и Visual Studio
невозможна. Версии зависимостей при этом менять нельзя, поэтому подключается
официальный prebuilt-индекс проекта той же версии:

```powershell
$venv = "D:\SystemTheBest\runtime\khoj-1.42.10"
& "$venv\Scripts\python.exe" -m pip install "khoj[local]==1.42.10" `
  --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu `
  2>&1 | Tee-Object -FilePath "D:\SystemTheBest\runtime\khoj-install.log"
```

Перед запуском убедитесь, что не идёт другая установка: живых `pip`/`python` процессов
быть не должно. Вторая параллельная установка поверх первой запрещена.

Факт успеха: `Successfully installed ... khoj-1.42.10 ... pgserver-0.1.4 ... torch-2.6.0
... sentence-transformers-3.4.1 ... llama-cpp-python-0.2.88`. Закреплённые версии
совпадают с метаданными PyPI — ни одна не заменена вручную.

## Два дефекта релиза на Windows

Оба обойдены в `services/khoj/run-local.py`; правки самого пакета не вносятся.

1. **`USE_EMBEDDED_DB=true` на Windows не работает.** Ветка релиза безусловно
   подставляет в `DB_HOST` каталог pgdata, а в `DB_PORT` — пустую строку: она
   рассчитывает на Unix-сокет (`socket.AF_UNIX`). На Windows pgserver слушает TCP на
   `127.0.0.1` со свободным портом. `run-local.py` стартует pgserver сам и передаёт
   Khoj фактические host/port.
2. **В колесе pgserver 0.1.4 для Windows нет базы часовых поясов.** Каталог
   `share/postgresql/timezone` отсутствует, из-за чего Django падает на
   `SET TimeZone='UTC'` до первой миграции. `run-local.py` восстанавливает TZif-файлы
   из пакета `tzdata`.

## Конфигурация и источник

```powershell
Copy-Item services/khoj/config.example.env services/khoj/config.local.env
# заполнить <...> и сгенерировать секреты:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`config.local.env` gitignored; значения секретов не попадают ни в Git, ни в отчёты, ни
в индекс. Путь `KHOJ_MEMORY_ROOT` указывает ровно на `<SYSTEM_ROOT>/.claude/memory` —
не на репозиторий, не на `services/` и не на `runtime/`.

Источник индекса прописывается один раз, после первого старта сервиса:

```powershell
$py = "D:\SystemTheBest\runtime\khoj-1.42.10\Scripts\python.exe"
& $py services/khoj/run-local.py
# в другом окне:
& $py services/khoj/run-local.py --set-memory-source
```

## Запуск, состояние, остановка

```powershell
& $py services/khoj/run-local.py            # сервис в foreground
& $py services/khoj/run-local.py --status   # состояние сервиса и БД
& $py services/khoj/run-local.py --stop     # сначала pg_ctl -m fast, затем сервис
```

`--stop` останавливает PostgreSQL первым: postmaster не входит в дерево процессов
сервиса, и жёсткое завершение сервиса оставило бы его сиротой. Скрытый запуск с логом —
в [services/khoj/README.md](../services/khoj/README.md).

## Проверки

Дополнение 2026-09-13: после нештатного завершения восстановление PostgreSQL может
занять больше исходных 10 секунд, жёстко заданных в pgserver 0.1.4. Launcher теперь
ждёт `pg_ctl start` до 120 секунд (внешний timeout 125 секунд). Не запускать второй
процесс поверх восстановления; дождаться `/api/health`. Подробности и регрессия —
в [runbook](../services/khoj/README.md#дополнение-2026-09-13-запуск-после-нештатного-завершения).

```powershell
& $py -m pip show khoj | Select-String Version   # ожидается 1.42.10
curl.exe -fsS http://127.0.0.1:42110/api/health  # {"email": "default@example.com"}
node scripts/memory/search.js --query "explicit stop gates" --project systemqwen
node scripts/memory/search.js --query "фраза-которой-нет-в-памяти" --project systemqwen
```

Результат поиска обязан содержать `source` внутри `.claude/memory/`, `scope` и
актуальное содержимое. Запрос по отсутствующей фразе возвращает `{"ok":true,"results":[]}`,
а не случайные top-N. После остановки и повторного старта индекс сохраняется: поиск
работает без полной переиндексации.

## Результаты приёмки 2026-09-12

| Проверка | Результат |
|---|---|
| `khoj --version` | `1.42.10`, совпадает с метаданными пакета |
| `/api/health` | `{"email": "default@example.com"}` |
| Инвентарь индекса | 19 файлов = 19 файлов на диске, лишних нет, только `.md` внутри памяти |
| Источники в БД | одна строка `LocalMarkdownConfig`; `org`/`plaintext`/`github`/`notion` — 0 |
| Модели поиска | `thenlper/gte-small`, `mixedbread-ai/mxbai-rerank-xsmall-v1`, тип endpoint `local`, внешних ключей нет |
| Отсутствующая фраза | `{"ok":true,"results":[]}` |
| `project_id` вне реестра | отклонён до обращения к сервису: `unknown-project` |
| Перезапуск | индекс сохранён, полная переиндексация не потребовалась |
| При остановленном Khoj | адаптер отвечает `ok:false` + `fallback:"local"`, запись остаётся `persisted` |
| Обновление индекса | `GET /api/update` синхронен: 200 и `{"status":"ok"}` приходят после завершённой индексации |

## Чего не делать

- Не подставлять версию из старого черновика и не менять закреплённые зависимости при
  ошибке сборки `llama-cpp` — вместо этого подключить официальный prebuilt-индекс.
- Не устанавливать Khoj в системный Python и не использовать WindowsApps-заглушку.
- Не добавлять в индекс `.env`, весь репозиторий, `services/`, `runtime/` и `.local/`.
- Не считать обычный 2xx подтверждением завершённой индексации: у этого релиза
  `/api/update` синхронен, и завершение подтверждается телом `{"status":"ok"}`.

# SC-01 — проверенное окружение

Дата проверки: 2026-09-08. Рабочий каталог: `E:\\System2`. Значения секретов не
выводились и не записывались.

## Фактическая среда

| Компонент | Команда/проверка | Фактический результат |
|---|---|---|
| Git | `git --version` | `git version 2.53.0.windows.3` |
| Git Bash | `where bash`; проверка установки | Не входит в PATH; найден `C:\\Program Files\\Git\\usr\\bin\\bash.exe` |
| Git hooks path | `git config --get core.hooksPath` | Пусто; используется стандартный `.git/hooks` |
| Remote/ветка | `git remote -v`; `git branch --show-current` | `origin=https://github.com/gorelovmaxon-cyber/System.git`; ветка `master` |
| Node/npm | `node --version`; `npm --version` | Node `v24.14.0`; npm `11.9.0` |
| Docker | `docker --version`; `docker compose version`; `docker info` | Команды не найдены; демон недоступен |
| WSL 2 | `wsl --status` | WSL не установлен |
| Khoj CLI | `khoj --version` | Не установлен |
| Activepieces | процесс/локальный health | Не запущен; Docker также недоступен |
| Figma MCP | наличие `.claude/mcp-servers/figma/` | Черновой каталог существует; живой запуск не проверен |
| AI-подключения | локальная конфигурация/health | Рабочее подключение не подтверждено; значения ключей не искались |

Незакоммиченные черновики Khoj/Activepieces/Figma и `.scratch/activepieces/` существовали
до SC-01 и не входят в его коммит.

## Версии, выбранные для следующих тикетов

Это зафиксированные кандидаты для проверки при установке, не утверждение, что сервисы
уже установлены или совместимы без живого теста.

| Компонент | Базовая версия/тег | Основание |
|---|---|---|
| Node.js | 24.x LTS; локально 24.14.0 | [официальная таблица релизов](https://nodejs.org/en/about/previous-releases), проверено 2026-09-08; страница указывает v24 как LTS |
| Khoj | не установлен; stable PyPI `1.42.10` несовместим с локальным Python 3.14 (`<3.13`) | [PyPI metadata](https://pypi.org/project/khoj/), [официальные releases](https://github.com/khoj-ai/khoj/releases) и [setup](https://github.com/khoj-ai/khoj/blob/master/documentation/docs/get-started/setup.mdx), сверено 2026-09-08 |
| Activepieces | `ghcr.io/activepieces/activepieces:0.86.3`, канонический compose SC-06 | [официальный compose](https://github.com/activepieces/activepieces/blob/main/docker-compose.yml), сверено 2026-09-08; живой pull невозможен без Docker |
| PostgreSQL | `postgres:16.15-alpine` | [официальный Docker Hub image](https://hub.docker.com/_/postgres), тег проверен 2026-09-08 |
| Redis | `redis:7.4.11-alpine` | [официальный Docker Hub image](https://hub.docker.com/_/redis), тег проверен 2026-09-08 |

Перед установкой SC-04/SC-06 версии повторно сверяются с официальным релизом и
фиксируются при фактическом pull/запуске. `latest` не используется как контракт.

## Windows ↔ Docker ↔ host

На Windows имя `host.docker.internal` разрешилось в `127.115.1.5` и IPv6-адрес;
проверка TCP:80 неуспешна, потому что на порту нет сервиса. Docker-контейнер проверить
невозможно: Docker Desktop и WSL отсутствуют.

Для SC-06 выбран адрес подключения `host.docker.internal:<порт bridge>`, а не
`localhost` контейнера, на основании [официального Docker host-gateway](https://docs.docker.com/reference/cli/dockerd/)
и [документации Docker Desktop WSL 2](https://docs.docker.com/desktop/features/wsl/).
Статус сетевой связности: **blocked** (Docker отсутствует). После установки Docker нужно выполнить
живую проверку из контейнера к тестовому host-порту и только затем закрепить адрес flow.
AI-подключение Activepieces не создано: ключ и owner UI недоступны.

## Доступы, необходимые позже

Имена доступов: Docker Desktop/WSL, API-ключ AI-провайдера Activepieces, API-токен
Figma, доступ к выбранному второму ПК/репозиторию. Значения и секреты в этом документе
отсутствуют. Activepieces webhook/AI connection не созданы; flow SC-09 live
не проверен. Изолированный clone/hook smoke-test проверен SC-11; реальный
второй ПК отсутствует, его проверка `awaiting-validation`.

## Эксплуатация

Порядок запуска и восстановления: `docs/system-operations.md`; health-порты:
bridge `127.0.0.1:8643`, Khoj `127.0.0.1:42110`, Activepieces `localhost:8642`.
Docker/Khoj/AI connection не подтверждены в этой среде.

## Повторная проверка 2026-09-11 — текущее устройство

Рабочий каталог: `D:\SystemTheBest\System`; HEAD до расширенного пакета —
`c0b345932ec9446de13c9d8233888adc00ccc1c8`, `master` совпадал с
`origin/master`. До работы worktree был чистым; текущий dirty состоит из
расширенного пакета и не является runtime-данными. Настоящие `.git/hooks`,
`core.hooksPath` и `.claude/memory` не менялись.

| Компонент | Результат 2026-09-11 |
|---|---|
| Node | `v24.18.0` |
| npm | `11.16.0`; из PowerShell использован `npm.cmd`, execution policy не менялась |
| Git | `2.55.0.windows.3`; origin GitHub, ветка master |
| core.hooksPath | не задан в настоящей рабочей копии |
| Docker | CLI не найден |
| WSL | `wsl.exe` присутствует, но установка/дистрибутив не инициализированы |
| Python | найден только неработающий WindowsApps alias |
| `.local/` | в настоящей рабочей копии отсутствует |
| Figma fixture/SDK | `npm ci` без уязвимостей; `npm test` — 2/2 |

Локальные hook/queue/index/writer проверки выполнялись только в TEMP-каталогах.
Для live-приёмки по-прежнему нужны: решение пользователя об установке Docker/WSL
и совместимого Python; запуск Khoj и Activepieces 0.86.3; локальные AI/Figma
секреты без публикации значений; разрешённый Figma-файл; реальный второй ПК.

## Повторная проверка 2026-09-12 — Khoj запущен, Python 3.12 найден

Рабочий каталог: `D:\SystemTheBest\System`. Значения секретов не выводились и не
записывались. Локальный конфиг Khoj и его данные — в gitignored-путях.

| Компонент | Команда/проверка | Фактический результат |
|---|---|---|
| Python | `py -0p`; `python --version` | `C:\Users\1663646\AppData\Local\Programs\Python\Python312\python.exe`, `3.12.10` — не Store-заглушка |
| Khoj CLI | `khoj --version` | `1.42.10`, совпадает с метаданными пакета |
| Khoj venv | каталог вне репозитория | `D:\SystemTheBest\runtime\khoj-1.42.10` |
| Khoj сервис | `GET /api/health` | `{"email": "default@example.com"}` на `http://127.0.0.1:42110` |
| Docker | `docker --version` | CLI не найден — по-прежнему блокирует Activepieces |

Khoj `1.42.10` установлен одним проверенным путём с официальным prebuilt-индексом
`llama-cpp-python`; закреплённые версии зависимостей не менялись. Встроенный
PostgreSQL из extra `[local]` (`pgserver==0.1.4`) — Docker не требуется.

Два дефекта релиза на Windows обойдены в `services/khoj/run-local.py`: непригодная
ветка `USE_EMBEDDED_DB` (Unix-сокеты вместо TCP) и отсутствующая в колесе pgserver
база часовых поясов, из-за которой Django падал на `SET TimeZone='UTC'`. Правки
внутри пакета не вносились.

Источник индекса — ровно `<SYSTEM_ROOT>/.claude/memory/**/*.md`: 19 файлов,
совпадает с диском, лишних нет. Других источников в БД нет. Модели поиска
локальные (`thenlper/gte-small`, `mixedbread-ai/mxbai-rerank-xsmall-v1`, тип
endpoint `local`), внешний платный провайдер не используется.

Установка и эксплуатация: [services/khoj/README.md](../../services/khoj/README.md),
[docs/khoj-setup.md](../../docs/khoj-setup.md).

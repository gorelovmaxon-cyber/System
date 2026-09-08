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

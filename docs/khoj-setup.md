# Khoj: установка и первичная индексация

Этот runbook описывает только проверяемый путь. На машине System2 сейчас
установлен Python 3.14.5, а стабильный пакет Khoj на PyPI требует Python
`>=3.10,<3.13`; поэтому установка и live-приёмка остановлены до появления
Python 3.12 или совместимого официального релиза. Не устанавливайте Khoj в
системный Python 3.14.

Источники, сверенные 2026-09-08: [официальная установка Khoj](https://github.com/khoj-ai/khoj/blob/master/documentation/docs/get-started/setup.mdx),
[официальные releases](https://github.com/khoj-ai/khoj/releases) и
[PyPI metadata](https://pypi.org/project/khoj/). Версию и механизм конфигурации
нужно повторно зафиксировать после выбора совместимого Python.

## Предварительная проверка

```powershell
python --version
python -m pip --version
py -0p
```

Ожидается доступный Python 3.12.x. Создайте отдельное окружение вне репозитория:

```powershell
py -3.12 -m venv C:\Users\<user>\khoj\.venv
C:\Users\<user>\khoj\.venv\Scripts\python.exe -m pip install --upgrade pip
C:\Users\<user>\khoj\.venv\Scripts\python.exe -m pip install "khoj==<версия-после-проверки>"
```

Точную версию нельзя подставлять из старого черновика: сначала проверьте
официальный release и совместимость зависимостей, затем запишите её в
`ENVIRONMENT.md` и `services/khoj/README.md`.

## Разрешённый источник

Khoj должен индексировать только `E:\System2\.claude\memory` (на переносимой
машине — `<SYSTEM_ROOT>/.claude/memory`), рекурсивно, только Markdown. Не
добавляйте `.env`, `services/`, `.local/`, `node_modules/` или весь репозиторий.
После выбора официального механизма конфигурации сохраните локальный конфиг в
`services/khoj/config.local.yml` или эквиваленте; example-файл не должен
содержать абсолютный путь и секрет.

## Обязательные проверки после разблокировки

```powershell
khoj --version
# Запуск и порт берутся из официального setup выбранного релиза.
curl.exe -fsS http://127.0.0.1:42110/health
node E:\System2\scripts\memory\search.js --query "explicit stop gates" --project systemqwen --force
```

Результат поиска должен содержать существующий источник внутри
`.claude/memory/`, а после остановки/старта Khoj — быть доступен без полной
переиндексации. В отчёт SC-04 нужно записать version, health, один поиск,
перезапуск, статус индекса и `git check-ignore` для локальных данных.

## Текущий статус

`khoj --version` не найден, Docker не установлен, Python 3.12 отсутствует.
SC-04 остаётся `blocked`; `/api/search` и YAML-конфигурация не объявляются
проверенным контрактом конкретной версии. Адаптер SC-05 корректно использует
fail-open fallback, пока живой Khoj недоступен.

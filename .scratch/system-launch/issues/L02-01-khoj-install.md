# L02-01 — Установить Khoj 1.42.10 в существующий изолированный venv

**What to build:** Рабочая установка Khoj выбранного релиза в уже созданном venv
`D:\SystemTheBest\runtime\khoj-1.42.10`, полученная одним проверенным путём, без
второй параллельной установки и без слепой смены закреплённых зависимостей.
**Requirement IDs:** R04, SC-04
**Blocked by:** L01-01/L01-02 (приняты), SC-01
**Status:** done (verified-local, 2026-09-12)
**Перед началом работы:** Открой VS Code в `D:\SystemTheBest\System`. Убедись, что
предыдущая установка не идёт: ни одного живого `pip`/`python` процесса.

## Контекст

Передача [HANDOFF-GPT-NEXT-2026-09-12.md](../../../HANDOFF-GPT-NEXT-2026-09-12.md),
раздел 5, фиксирует: Python 3.12.10 установлен, venv создан вне репозитория, установка
оборвана. Предыдущая команда — `pip install "khoj[local]==1.42.10"`. Раздел 6.B.2
запрещает менять закреплённые зависимости вслепую при ошибке сборки `llama-cpp` и
требует определить совместимый официальный способ установки.

## Факты, установленные до правок

- venv чист: в `Lib/site-packages` только `pip` и `pip-25.0.1.dist-info`.
- `py -0p` → единственный `3.12` = `C:\Users\1663646\AppData\Local\Programs\Python\Python312\python.exe`
  (настоящая установка, не Store-заглушка); `py -3.12 --version` → `Python 3.12.10`;
  `Scripts\python.exe --version` → `Python 3.12.10`.
- Лог `D:\SystemTheBest\runtime\khoj-install-2026-09-12.log` — UTF-16, обрывается на
  скачивании wheel'ов; это прерывание сессии, а не ошибка сборки.
- Метаданные PyPI для 1.42.10: `requires_python = <3.13,>=3.10`, extras `dev|local|prod`.
  `torch==2.6.0`, `sentence-transformers==3.4.1` и `llama-cpp-python==0.2.88` — **базовые**
  зависимости (не extra). `[local]` добавляет только `pgserver==0.1.4` — встроенный
  PostgreSQL, то есть путь без Docker выбран верно.
- PyPI для `llama-cpp-python==0.2.88` содержит **только sdist**; официальный wheel-индекс
  проекта (`https://abetlen.github.io/llama-cpp-python/whl/cpu`) содержит
  `llama_cpp_python-0.2.88-cp312-cp312-win_amd64.whl` — та же версия, prebuilt.
- `cmake` не найден, Visual Studio не установлен → сборка из sdist на этой машине невозможна.

## Алгоритм

1. Исключить живую установку: проверить процессы.
2. Запусти��ь `pip install "khoj[local]==1.42.10"` в существующий venv, отдельным UTF-8 логом.
3. При провале сборки `llama-cpp-python` — не менять версии, а подключить официальный
   prebuilt wheel того же релиза через `--extra-index-url`.
4. Подтвердить `khoj --version` и импорт пакета.

## Критерии приёмки

- [x] Установка завершилась exit 0, лог сохранён.
- [x] `khoj --version` отвечает и совпадает с `1.42.10`.
- [x] Версии закреплённых зависимостей не изменены относительно метаданных PyPI.
- [x] Вторая параллельная установка не запускалась.

## Итог

Один проверенный путь, без Docker и без смены закреплённых зависимостей:

```powershell
& "$venv\Scripts\python.exe" -m pip install "khoj[local]==1.42.10" `
  --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu
```

`llama-cpp-python==0.2.88` — базовая зависимость релиза, на PyPI только sdist; сборка
невозможна без `cmake`/Visual Studio, поэтому подключён официальный prebuilt-индекс
проекта той же версии. Версии не менялись.

| Факт | Значение |
|---|---|
| venv | `D:\SystemTheBest\runtime\khoj-1.42.10` |
| Python | `C:\Users\1663646\AppData\Local\Programs\Python\Python312\python.exe`, `3.12.10` — не Store-заглушка |
| Лог установки | `D:\SystemTheBest\runtime\khoj-install-2026-09-12-l02.log` |
| Проверка версии | `khoj --version` → `1.42.10`; метаданные пакета → `1.42.10` |
| Закреплённые версии | `torch-2.6.0`, `sentence-transformers-3.4.1`, `llama-cpp-python-0.2.88`, `pgserver-0.1.4` — как в метаданных PyPI |
| Docker | не потребовался: extra `[local]` даёт встроенный PostgreSQL |

Два дефекта релиза на Windows выявлены при запуске (не при установке) и обойдены в
`services/khoj/run-local.py`: непригодная ветка `USE_EMBEDDED_DB` и отсутствующая в
колесе pgserver база часовых поясов. Разбор — в [docs/khoj-setup.md](../../../docs/khoj-setup.md).

## Ограничения

Docker не требуется. Секреты и абсолютные пути — только в gitignored-локальной настройке.

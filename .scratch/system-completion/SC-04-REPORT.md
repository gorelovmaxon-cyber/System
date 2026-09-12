# SC-04 report

Status: blocked

> Обновление 2026-09-12 (фаза 2, чат 2). Блокировка снята: Python 3.12.10 найден,
> Khoj `1.42.10` установлен и запущен на `127.0.0.1:42110`, живой health, индекс
> (19 файлов `.claude/memory/**/*.md`), поиск, сохранение индекса после перезапуска и
> исключение секретов проверены. Отчёт и тикеты:
> [CHAT-02-RESULT.md](../system-launch/reports/CHAT-02-RESULT.md),
> [issues/L02-01…L02-03](../system-launch/issues/). Статус этого артефакта оставлен
> прежним: его принимает трекер фазы завершения, а не чат 2.

## Verification

- `khoj --version`: command unavailable.
- `py -0p`: only Python 3.14 is installed.
- PyPI metadata checked 2026-09-08: stable Khoj requires Python `<3.13`.
- A pre-release dry-run reached native `llama-cpp-python` resolution and was
  stopped; no system package or service was installed.
- Docker Desktop/WSL are also unavailable.

The service runbook now refuses to claim an unverified YAML/API contract and
describes the exact gate for a Python 3.12-enabled machine. No `config.local.yml`
or index data was created; both paths are gitignored. Live version, health,
initial index, search, restart persistence and secret-exclusion checks remain
blocked rather than replaced by a mock.

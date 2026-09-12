# Evidence report — PUB-03 (резервная копия перед публикацией)

Status: awaiting-review
Date: 2026-09-12
Commit: `c27e52d`
Requirement IDs: R09, R13
Source brief/task: `.scratch/system-remediation/issues/PUB-03-pre-push-backup.md`

## Requirement coverage

| Requirement/criterion | Implemented behavior | Evidence | Result |
|---|---|---|---|
| Bundle содержит текущий HEAD | `git bundle create … --all` из `c27e52d` | `git bundle verify` → «The bundle records a complete history»; в списке refs `c27e52d… HEAD` | pass |
| Манифест SHA-256 совпадает | 12 файлов хешированы и проверены | `sha256sum -c MANIFEST.sha256` → 12 × `OK` | pass |
| Секреты не в Git и не в отчёте | значения не выводились | `git check-ignore -v` → `config/system.local.json` (.gitignore:11), `services/activepieces/.env` (.gitignore:18), `.local/` (.gitignore:12) | pass |
| Резерв вне репозитория | папка в `D:\SystemTheBest\transfer-backups` | `git status --short` после коммита — только untracked-черновики, резерва в дереве нет | pass |

## Checks and scenarios

**Команды и каталог:** `D:\SystemTheBest\System`, 2026-09-12
```text
bk = D:\SystemTheBest\transfer-backups\pre-push-20260912-182546
git bundle create <bk>\system-master-2026-09-12.bundle --all
git bundle verify <bk>\system-master-2026-09-12.bundle      # complete history, sha1
sha256sum -c <bk>\MANIFEST.sha256                            # 12 × OK
```

Содержимое резерва (12 файлов + манифест):

| Путь | Что это |
|---|---|
| `system-master-2026-09-12.bundle` | 1 163 769 байт; `refs/heads/master` = `c27e52d`, `refs/remotes/origin/master` = `c0b3459`, ref worktree `s2-red-block4` = `a8bfaf4` |
| `INVENTORY.txt` | HEAD, ветка, remote, `ls-remote`, ahead/behind (0 / 27), список неотправленных коммитов, полный `git status`, stash, worktrees |
| `untracked/…ASTRA-ORCHESTRATION-IDEAS-2026-09-12.md` | untracked-черновик пользователя |
| `untracked/…evidence/status-check-current-tests.txt` | UTF-16 вывод PowerShell из прошлой сессии |
| `runtime/config/system.local.json` | локальная конфигурация (в Git не входит) |
| `runtime/services/activepieces/.env` | локальные переменные AP (в Git не входят) |
| `runtime/.local/**` (6 файлов) | `.local/writer/processed.jsonl`, `.local/indexer/tasks.jsonl`, `.local/services/{bridge.pid,bridge.stdout.log,bridge.stderr.log,doctor-2026-09-12.json}` |

Порядок соблюдён: резерв снят **до** push, потому что он и есть страховка на случай отказа сети.
Предыдущий bundle (`2026-09-09-1701`, снят с `c0b3459`) сегодняшних коммитов не содержит —
настоящая копия первая, покрывающая текущий `HEAD`.

## Limitations

- Bundle хранит Git-историю и refs, но не untracked/dirty-содержимое: эта часть покрыта каталогом
  `untracked/` и `runtime/` из таблицы выше.
- `.local/*.jsonl` — живые журналы работающего bridge: в резерве снимок на момент копирования,
  а не согласованный дамп. Для восстановления после сбоя этого достаточно, для сверки состояния
  очереди — нет.
- Резерв лежит на том же диске. Это защита от сбоя публикации, а не перенос на другую машину;
  переносом остаётся push в GitHub.
- Значения секретов не выводились и не сравнивались; проверялось только, что файлы вне Git.

## Cost evidence

| Metric | Value | Source/method |
|---|---:|---|
| wall-clock time | `unknown` | таймер не ставился; операция уложилась в один вызов инструмента |
| retries/repeats | 1 | первый прогон `sha256sum -c` не выполнился из-за неверно переданного корня; повтор после исправления |
| context/input tokens | `unknown` | метрика недоступна |
| output tokens | `unknown` | метрика недоступна |
| monetary cost | `unknown: unavailable` | биллинг недоступен из среды |

Unknown оставлен с причиной; оценки из размеров файлов и имён моделей не выводятся.

## Дополнение 2026-09-12 (PUB-04)

Перед самой публикацией bundle в том же каталоге пересобран на финальный pre-push `HEAD`
(`67b45ec`) и манифест перегенерирован: `git bundle verify` → «complete history», HEAD
`67b45ec`; `sha256sum -c MANIFEST.sha256` → 12 × OK. Причина: в таблице выше зафиксирован
снимок на `c27e52d`, а после него появились коммиты PUB-03 и PUB-04. Резерв обновлён, чтобы
покрывать всё, что уходило в push. Значения SHA-256 файлов в резерве после пересборки изменились;
актуален текущий `MANIFEST.sha256`, а не цифры, приведённые в предыдущих отчётах.

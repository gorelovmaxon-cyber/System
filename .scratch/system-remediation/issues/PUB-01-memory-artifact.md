# PUB-01 — Зафиксировать артефакт живой проверки W1 в общей памяти

**What to build:** Запись памяти, созданная живым writer'ом, попадает в Git отдельным scoped-коммитом; индекс памяти `MEMORY.md` на неё ссылается.
**Requirement IDs:** R03, R07, R12
**Blocked by:** none
**Status:** ready-for-agent
**Перед началом работы:** Открой VS Code в `D:\SystemTheBest\System`. Проверь `git status --short` и `git log -1 --oneline`.

## Контекст

После приёмки W1 bridge был запущен вживую, и запись создана не вручную, а самим writer'ом:
`.local/writer/processed.jsonl` фиксирует `intent` → `persisted`,
`written_files: [".claude/memory/facts/writer-entries.md"]`, ревизия `0a471effda65`.
Задача индексатора `idx_175666186629781b` — `pending` (Khoj ещё не поднят).

Это первый артефакт живой проверки writer'а. По правилам проекта переносимая память
отслеживается Git'ом; файл сейчас untracked.

## Файлы для изменения

- `.claude/memory/facts/writer-entries.md` — существующий (создан writer'ом); сверить frontmatter с каноном, содержимое не переписывать.
- `.claude/memory/MEMORY.md` — существующий; строка в раздел `Facts`, обновить дату последнего обновления.

## Файлы для чтения (контекст)

- `.claude/memory/README.md` — канон формата записи памяти.
- `.local/writer/processed.jsonl` — доказательство происхождения (в Git не включать).
- `.scratch/system-remediation/W1-REVIVE-AWAIT-REPORT-2026-09-12.md` — что именно принято.

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `.local/**` — gitignored runtime, в коммит не попадает.
- `.scratch/system-remediation/ASTRA-ORCHESTRATION-IDEAS-2026-09-12.md` — решается в PUB-02.
- Содержимое `writer-entries.md` не редактировать: запись сделана writer'ом, ручная правка исказит доказательство.

## Входные/выходные данные

Вход: файл записи, созданный writer'ом. Выход: отслеживаемый Git'ом файл памяти и строка индекса.

## Алгоритм (шаг за шагом)

1. Прочитать `writer-entries.md`; сверить frontmatter с каноном README (`status`/`category`/`scope`/`source`/`evidence`).
2. Проверить, что `status: observation` корректен. Не повышать до `confirmed` без основания: подтверждена независимая проверка кода, а не пожелание пользователя.
3. Добавить строку в `MEMORY.md`, раздел `Facts`.
4. `git add` только этих двух файлов; после add выполнить `git status` и убедиться, что лишнего в индексе нет.

## Критерии приёмки

- [ ] `writer-entries.md` отслеживается Git'ом; frontmatter соответствует канону.
- [ ] `MEMORY.md` ссылается на запись.
- [ ] В коммите ровно два файла; `.local/`, `config/system.local.json`, `services/activepieces/.env` отсутствуют.
- [ ] Содержимое записи совпадает с версией, созданной writer'ом.

## Проверки

**Среда и предпосылки:** локально, Git.
**Команды:** `git show --stat HEAD`; `git check-ignore -v config/system.local.json services/activepieces/.env .local/writer/processed.jsonl`
**Ожидаемый результат:** два файла в коммите; три локальных пути игнорируются.
**Если проверка недоступна:** не применимо.

## Ограничения

Содержимое записи не редактируется. Задача индексатора остаётся `pending` до запуска Khoj — это не блокер публикации и не выдаётся за проиндексированное.

## Как закончить

1. Отчёт по `templates/evidence-report.md`.
2. Один scoped-коммит.
3. Статус `awaiting-review`; `done` не ставится исполнителем.

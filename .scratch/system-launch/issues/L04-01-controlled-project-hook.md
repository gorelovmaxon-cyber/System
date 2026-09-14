# L04-01 — Подключение контролируемого проекта и действующий hook

**What to build:** Один контролируемый проект (`systemqwen`) подключён к памяти: запись в registry/local_paths, действующий post-commit hook, который на обычный commit порождает ровно одно durable-событие, не теряя пользовательский hook.
**Requirement IDs:** SC-07, SC-11
**Blocked by:** —
**Status:** awaiting-review (hook установлен 2026-09-14, событие на обычном коммите получено автоматически)
**Перед началом работы:** Открой `D:\SystemTheBest\System`, проверь корень Git и текущие изменения.

## Контекст

Проект `systemqwen` — единственный проект registry с настоящим Git-репозиторием и
коммитами (`project-id.js .` → `systemqwen`), поэтому он и есть контролируемый.
Память настоящая, `.claude/memory`; миграция старых каталогов не выполняется.

## Факты, установленные до установки

- `core.hooksPath` не задан (`(not set)`).
- Действующий каталог hook: `D:/SystemTheBest/System/.git/hooks` (через
  `git rev-parse --path-format=absolute --git-path hooks`).
- Пользовательского `post-commit` там нет — только файлы `*.sample`, то есть терять
  нечего. `install-hooks.sh` в этом случае не требует `--force`.
- Резервная копия памяти снята и проверена:
  `D:\SystemTheBest\transfer-backups\pre-live-cycle-20260913-221624\` (19 файлов,
  0 расхождений, `system.local.json.backup`).

## Установка (2026-09-14)

Разрешение пользователя получено; установка выполнена штатным установщиком, а не
повтором ранее отклонённой команды:

```
bash .git-hooks-templates/install-hooks.sh
Installed hooksPath: .git-hooks-templates (effective: D:/SystemTheBest/System/.git-hooks-templates)
```

## Подтверждение автоматического срабатывания

Один обычный коммит `d2941f0ab7cb7ba2ef5c65b6cc6c82461bc55d68` без ручного вызова
`capture.js` — событие появилось само:

- `evt_9ff828f6e482`, `kind: commit`, `sha: d2941f0…`, `project_id: systemqwen`
  (запись в `.local/hook/capture.log`, `.local/queue/events.jsonl`).
- Событие то же, что раньше создавалось вручную, но теперь его породил hook.

Доставка в Activepieces недоступна (Docker выключен), поэтому событие исчерпало
попытки и стало терминальным `failed` с `attempts: 5` — это состояние внешней
зависимости, а не сбой hook. Сам hook после этого отработал ограниченно:
фоновый `queue-worker.js --watch --no-revive --max-idle-ms 120000` вернул
`{"status":"failed","passes":5,"revives":0,"delivered":1,"pending":0,"failed":2}`
и завершился сам, не удерживая владение (L04-04, F-04-2).

## Что уже проверено без hook

Событие создано ровно той командой, которую запускает hook (см.
[post-commit](../../../.git-hooks-templates/post-commit)), для настоящего коммита
`fb2395ab7da84ae8b0b75911ae10320bfea978ec`:

```
git diff --no-ext-diff HEAD^1 HEAD > .local/hook/diff-<sha>.txt
node scripts/memory/capture.js commit --project systemqwen --sha <sha> \
     --message "<message>" --diff <difffile> --enqueue-only
```

Результат: одно durable-событие `evt_e33c5558759f`, `status: pending`, `attempts: 0`.
То есть контракт «commit → ровно одно событие» выполняется; не хватает только
автоматического запуска по commit.

## Критерии приёмки

- [x] Контролируемый проект определён, local_paths указывает на `D:\SystemTheBest\System`.
- [x] Действующий hooksPath выяснен; принудительно не менялся.
- [x] Пользовательского hook, который можно потерять, нет — проверено.
- [x] Резервная копия снята до любых изменений.
- [x] Команда hook на настоящем коммите даёт ровно одно durable-событие.
- [x] Hook установлен и срабатывает автоматически на обычный commit.

## Как закончить

1. ~~После разрешения — установить hook и повторить обычный commit~~ — выполнено
   2026-09-14: `evt_9ff828f6e482` получено без ручного вызова `capture.js`.
2. Diff и evidence — в [reports/CHAT-04-RESULT.md](../reports/CHAT-04-RESULT.md).
3. `verified-live` ставит приёмщик; исполнитель себе `done` не ставит.

# L02-02 — Живой Khoj: health, реальный поиск, scope и изоляция источника

**What to build:** Запущенный локальный Khoj 1.42.10, индексирующий **только**
каноническую `.claude/memory` (Markdown), с подтверждённым живым health, реальным
контрактом поиска и project scope; известная запись writer находится через системный
адаптер `scripts/memory/search.js`.
**Requirement IDs:** R04, R05, SC-04, SC-05
**Blocked by:** L02-01
**Status:** done (verified-live, 2026-09-12)

## Контекст

Задание [CHAT-02-KHOJ.md](../../CHAT-02-KHOJ.md): локальные embeddings для поиска при
совместимости; Khoj не становится платным планировщиком; источник — только
`.claude/memory`, Markdown; не индексировать `.env`, весь repo, `services/`, `runtime/`.
Секреты и machine paths — в ignored-конфиге.

Официальная документация (docs.khoj.dev/get-started/setup) фиксирует: pip-путь
запускается как `USE_EMBEDDED_DB="true" khoj --anonymous-mode`, порт по умолчанию
`42110`, отдельного YAML-конфига нет — настройка через переменные окружения и CLI.
Реальный контракт API берётся из самого установленного релиза, а не из старой доки.

## Файлы для изменения

- `services/khoj/config.example.*` — **новый**: воспроизводимый пример без абсолютных
  путей и значений секретов (формат — по фактическому механизму релиза).
- `services/khoj/*.local.*` — **новый**, gitignored: локальная копия с реальным путём.
- `docs/khoj-setup.md`, `docs/khoj-integration.md` — фактический API и команды с датой.
- `.scratch/system-completion/ENVIRONMENT.md` — фактическая версия и результат проверки.

## Критерии приёмки

- [x] `curl /health` живого сервиса отвечает успехом; версия совпадает с `khoj --version`.
- [x] Известная writer-запись (`.claude/memory/facts/writer-entries.md`, event
      `evt_system2_acceptance_w1_20260912`) находится живым Khoj через `search.js`;
      результат содержит source внутри `.claude/memory/`, scope и актуальное содержимое.
- [x] Запрос по фразе, которой в памяти нет, не возвращает случайные top-N.
- [x] Источник индекса — только `.claude/memory/**.md`; `.env`, `services/`, `runtime/`,
      весь repo в индекс не попадают (подтверждено инвентарём индекса).
- [x] Локальный конфиг и данные gitignored; `git check-ignore` подтверждает; значений
      секретов нет в example/коммите/отчёте.
- [x] `project_id` вне реестра не превращается в неявный глобальный поиск.
- [x] Локальные embeddings работают без внешнего платного провайдера.

## Итог

Фактический путь health у 1.42.10 — `/api/health` (не `/health`); он и прописан в
`config/system.example.json` и в `doctor.js`.

| Проверка | Команда | Результат |
|---|---|---|
| Health | `GET /api/health` | `{"email": "default@example.com"}` |
| Известная запись | `node scripts/memory/search.js --query "W1 independently accepted staged service setup" --project systemqwen` | `ok:true`; source `.claude/memory/facts/writer-entries.md`, scope `systemqwen`, содержимое актуально |
| Отсутствующая фраза | тот же адаптер с несуществующей фразой | `{"ok":true,"results":[]}` |
| Чужой проект | `--project not-a-project` | `{"ok":false,"error":"unknown-project"}` до HTTP |
| Инвентарь индекса | `GET /api/content/files` (постранично, `page_size=10`) | 19 файлов = 19 файлов на диске, лишних нет |
| Источники в БД | `database_localmarkdownconfig` | одна строка, фильтр `D:/SystemTheBest/System/.claude/memory/**/*.md`; `org`/`plaintext`/`github`/`notion` — 0 |
| Модели | `database_searchmodelconfig` | `thenlper/gte-small`, `mixedbread-ai/mxbai-rerank-xsmall-v1`, тип endpoint `local`, ключей и внешнего URL нет |
| Ignore | `git check-ignore -v` | `config/system.local.json`, `services/khoj/config.local.env`, `services/khoj/data/` — все игнорируются |

`services/khoj/config.example.env` создан: воспроизводимая форма без абсолютных путей и
значений секретов. Секреты — только в gitignored `config.local.env`.

Побочная находка: адаптер `doctor.js` по умолчанию проверял `/health`; дефолт исправлен
на `/api/health` по факту релиза.

## Ограничения

Khoj — помощник поиска, не фильтр: прямое чтение задачи/HANDOFF/кода не заменяется.
Чат-модель внутри Khoj не обязательна. Ядро не пересматривается.

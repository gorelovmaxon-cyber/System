# SC-02 — Переносимый корень памяти и реестр проектов

**What to build:** Конфигурация, которая из любой рабочей папки находит один и тот же корень памяти (System2) и стабильные project_id, без абсолютных путей конкретного ПК в Git.
**Requirement IDs:** R02
**Blocked by:** SC-01
**Status:** planned
**Перед началом работы:** Открой VS Code в папке `E:/System2`. Убедись, что SC-01 принят и ENVIRONMENT.md содержит зафиксированные версии и путь Git Bash.

## Контекст

[SPEC](../SPEC.md) (решения 1–2): работающая система — это локальные инструкции, память (включая незакоммиченные правки), настройки и данные ПК; Git-репозиторий System2 хранит переносимую (отслеживаемую) часть и не заменяет всю систему. `.claude/memory/` (с подкаталогами user-profile/facts/patterns/decisions/gotchas) — переносимая часть памяти; локальные пути ПК — вне Git, их сохранность обеспечивают резервные копии (R13). Нужен реестр проектов со стабильными project_id; новый проект не должен молча создавать ещё одну «глобальную память».

Сейчас (факты из аудита):
- скиллы auto-learn/profile-update/autopilot используют относительный `.claude/memory/` и fallback `.system-memory/` в корне текущего проекта — при запуске из другого проекта это создаёт вторую копию памяти;
- `.claude/memory/facts/projects-overview.md` перечисляет проекты по путям дисков (`D:\System2`, `D:\Sait`, `D:\dev`, `D:\System`) без стабильных id; пути менялись (сейчас `E:\System2`) — именно это нужно устранить;
- `.claude/memory/user-profile/work-patterns.md` ссылается на абсолютные пути старой памяти;
- корень `memory/` содержит легаси-копию `user-profile/coding-style.md`, отличающуюся от канонической в `.claude/memory/` (сверку делает SC-03).
- Конфиг-файлов, каталогов `config/` и `scripts/memory/` нет.

## Файлы для изменения

- [config/system.example.json](../../../config/system.example.json) — **новый**; канонический пример конфигурации (без секретов и без машинных абсолютных путей; пути — относительно system_root или плейсхолдеры).
- [config/system.local.example.json](../../../config/system.local.example.json) — **новый**; шаблон локального оверрайда (машино-специфичные абсолютные пути, интеграционные адреса).
- [scripts/memory/resolve-paths.js](../../../scripts/memory/resolve-paths.js) — **новый**; модуль разрешения путей: находит system_root и возвращает memory_root, data_dir, registry.
- [scripts/memory/init-local-config.js](../../../scripts/memory/init-local-config.js) — **новый**; первая настройка: генерирует `config/system.local.json` (gitignored) из example + локальный ввод.
- [.claude/memory/facts/projects-overview.md](../../../.claude/memory/facts/projects-overview.md) — существующий; добавить колонку/поля стабильных project_id (текст записи дополнить, не удаляя прежние сведения о технологиях).
- [docs/memory-contract.md](../../../docs/memory-contract.md) — **новый**; контракт памяти: каталоги, категории, статусы, правило разрешения корня, формат реестра project_id. Этот файл — канонический хаб контрактов: SC-05/07/08 дополнят его секциями «Поиск», «Событие/Очередь», «Writer».
- [.gitignore](../../../.gitignore) — существующий; добавить `config/system.local.json`, `.local/`, а также общий паттерн для локальных файлов сервисов, которые появятся позже (SC-04/06 добавят свои).

## Файлы для чтения (контекст)

- [SPEC.md](../SPEC.md) — решения 1–2, раздел «Контракты» (начало), правила: локальная конфигурация/очереди не попадают в общий репозиторий.
- [PLAN.md](../PLAN.md) — содержание SC-02 и зависимость от SC-01.
- [.claude/memory/MEMORY.md](../../../.claude/memory/MEMORY.md), [.claude/memory/facts/projects-overview.md](../../../.claude/memory/facts/projects-overview.md) — существующий индекс и список проектов для seed-реестра.
- Скиллы [auto-learn](../../../.claude/skills/auto-learn/SKILL.md) и [profile-update](../../../.claude/skills/profile-update/SKILL.md) — как они сейчас адресуют память (fallback `.system-memory/`), чтобы описать в memory-contract, какое поведение они получат в SC-05/12.
- [.scratch/system-completion/ENVIRONMENT.md](../ENVIRONMENT.md) — результат SC-01 (путь Node/Git Bash).

## ⚠️ Файлы НЕЛЬЗЯ трогать

- Данные `.claude/memory/` (кроме явно указанного projects-overview.md): переносить/переписывать записи будет SC-03.
- Легаси `memory/user-profile/coding-style.md` — не удалять (судьбу решает SC-03).
- `TICKET_TEMPLATE.md`, PLAN/SPEC/SONNET_PROMPT, historical issues — как в SC-01.
- Реальные файлы с секретами: не создавать `config/system.local.json` с реальными путями/ключами в составе коммита; только example-файлы и gitignored-локальный файл.

## Входные/выходные данные

**config/system.example.json** — структура (имена полей фиксируются здесь и далее ссылаются на этот файл):
```json
{
  "schema_version": "1",
  "system_name": "System2",
  "memory_root": ".claude/memory",
  "registry": [
    { "project_id": "systemqwen",       "title": "SystemQwen (система разработки)", "kind": "meta" },
    { "project_id": "site-portfolio",   "title": "C-portfolio",                     "kind": "client-site" },
    { "project_id": "trading-dev",      "title": "Binance Trading System",          "kind": "dev" },
    { "project_id": "autopilot-framework", "title": "Autopilot Framework",          "kind": "dev" }
  ],
  "memory_categories": ["user-profile", "facts", "patterns", "decisions", "gotchas"],
  "integrations": {
    "khoj":    { "base_url": "http://127.0.0.1:42110", "enabled": true },
    "bridge":  { "base_url": "http://127.0.0.1:8643",  "enabled": false },
    "activepieces": { "webhook_url_placeholder": "http://<host>:8642/api/v1/webhooks/<WEBHOOK_ID>" }
  }
}
```
`config/system.local.json` (gitignored): `{ "system_root": "E:/System2", "local_paths": { "site-portfolio": "D:/Sait", "trading-dev": "D:/dev" }, "integrations": {...} }` — только машино-специфичное.

Выход `resolve-paths.js` (CLI и module): `{ system_root, memory_root, data_dir, localConfig, registry }`. data_dir по умолчанию `<system_root>/.local` (вне Git) — очередь (SC-07) и логи.

## Алгоритм (шаг за шагом)

0. **Резервная копия до изменений**: если на этом ПК уже есть локальное состояние, которое затрагивается (существующий `config/system.local.json`, незакоммиченные правки `projects-overview.md` или записей памяти и т.п.), — сохранить его копию вне изменяемого места (например, `.scratch/system-completion/backup/` с датой) до начала правок. Секреты — отдельно и защищённо, в Git не попадают. Git-история не восстановит untracked/gitignored-файлы.
1. **Создать каталоги и example-конфиги**: `config/system.example.json` и `config/system.local.example.json` по контракту выше. В example registry — четыре проекта из projects-overview (id из таблицы; названия привести в соответствие с реальными проектами пользователя, но ничего не «домысливать» об их внутренностях). Ключи/секреты не включать; интеграционные адреса — как значения по умолчанию, переопределяемые локально.
2. **Реализовать `resolve-paths.js`**: правила разрешения (в порядке приоритета): (1) env `SYSTEM2_ROOT`, если задан; (2) `config/system.local.json` в текущем git-корне, если тек��щая папка внутри System2; (3) поиск вверх от cwd до каталога, содержащего `config/system.example.json` + `.git` (т.е. сам System2); (4) иначе — понятная ошибка с инструкцией запустить `init-local-config.js`. Модуль экспортирует функции и умеет работать как CLI (`node scripts/memory/resolve-paths.js`). Никогда не создаёт второй memory_root; если System2 не найден — падает с ошибкой, а не создаёт `.system-memory/`.
3. **Реализовать `init-local-config.js`**: читает example, спрашивает/принимает флаг `--root <путь>` (или определяет текущий корень), пишет `config/system.local.json` с абсолютными путями. Повторный запуск не дублирует: перезаписывает локальный файл, сохраняя введённые ранее локальные пути (мержит по ключам). Флаг `--print` печатает итоговые разрешённые пути без секретов.
4. **Обновить `.claude/memory/facts/projects-overview.md`**: добавить стабильные project_id к каждому проекту (текстовая вставка), пометить, что локальные пути теперь живут в `config/system.local.json` (вне Git), а не в памяти.
5. **Написать `docs/memory-contract.md`**: разделы — «Где память (system_root и правило разрешения)», «Каталоги и категории», «Реестр проектов (project_id)», «Что не хранится в Git (локальные пути, секреты, .local/)», «Ссылки на контракты Событие/Очередь/Writer/Поиск — добавляются в SC-05/07/08». Формат: как фиксируется категория записи, что такое evidence/scope/status на уровне файла — кратко, детали модели в SC-03.
6. **Обновить `.gitignore`**: `config/system.local.json`, `.local/`.
7. **Проверить** сценариями ниже.

## Критерии приёмки

- [ ] Из каталога `docs/` (`cd docs && node ../scripts/memory/resolve-paths.js`) вывод показывает тот же memory_root (`E:/System2/.claude/memory`), что и из корня `E:/System2` — один корень, а не две копии.
- [ ] При отсутствии `config/system.local.json` и запуске из посторонней папки модуль выдаёт понятную ошибку с инструкцией (`init-local-config.js`) и НЕ создаёт `.system-memory/`.
- [ ] `init-local-config.js` создаёт gitignored `config/system.local.json`; повторный запуск не дублирует записи; `git status` не показывает этот файл как untracked-кандидат на коммит.
- [ ] projects-overview.md содержит project_id для всех четырёх проектов; в конфиге нет абсолютных путей конкретного ПК в коммитимых файлах.
- [ ] Перемещение репозитория System2 на другой путь (эмуляция: `SYSTEM2_ROOT` указывает на временную копию) не меняет project_id и registry.
- [ ] До правок сделана резервная копия затрагиваемого локального состояния; существующие данные/настройки не потеряны.
- [ ] R02: общая память и память проектов доступны через переносимую конфигурацию; docs/memory-contract.md описывает, как их находит любой инструмент.

## Проверки

**Среда и предпосылки:** локально; Node из ENVIRONMENT.md (SC-01). Запуск из других каталогов — через `cd` во временную папку, без реального переноса файлов.
**Команды:** `node scripts/memory/resolve-paths.js` (из корня и из `docs/`); `node scripts/memory/init-local-config.js --print`; `git check-ignore config/system.local.json`.
**Ожидаемый результат:** одинаковый memory_root из двух каталогов; корректный ignore; осмысленная ошибка при недоступном корне.
**Если проверка недоступна:** недоступные пункты (например, отсутствие одного из проектов на этом ПК) отметить в отчёте; они не блокируют механику разрешения путей.

## Ограничения

- Не реализовывать здесь поиск (SC-05), очередь (SC-07), writer (SC-08), hooks (SC-11) — только конфигурация и разрешение путей.
- Интеграции в example-конфиге по умолчанию выключены (`enabled: false`), включать их будут соответствующие тикеты при фактической настройке.
- Ре��стр не претендует на аудит содержимого чужих проектов: это только id + локальные пути вне Git.

## Как закончить

1. Проверить diff; выполнить проверки; сохранить краткие результаты в отчёт тикета.
2. Создать отдельный коммит с явным списком файлов (config/*.example.json, scripts/memory/, projects-overview.md, memory-contract.md, .gitignore).
3. Исполнитель ставит awaiting-review, приёмщик — done только после приёмки.
4. Ответ до 6 строк: ID, результат, проверки, коммит, ограничения, следующий доступный тикет (SC-03).

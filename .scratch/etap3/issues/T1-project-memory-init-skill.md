# T1 — Создать скилл project-memory-init

**What to build:** Скилл `.claude/skills/project-memory-init/SKILL.md` — bootstrap CLAUDE.md при старте нового проекта с маркерами systemqwen и командами.

**Blocked by:** none

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `D:\System2` (File > Open Folder).

## Контекст

При старте нового проекта нужно автоматически создавать/обновлять CLAUDE.md с секцией SystemQwen между маркерами. Скилл вызывается вручную `/project-memory-init` или из autopilot Phase 0.

## Файлы для изменения

- [.claude/skills/project-memory-init/SKILL.md](.claude/skills/project-memory-init/SKILL.md) — создать новый файл

## Файлы для чтения (контекст)

- [.claude/skills/auto-learn/SKILL.md](.claude/skills/auto-learn/SKILL.md) — структура скилла, для понимания формата
- [CLAUDE.md](CLAUDE.md) — пример финального CLAUDE.md проекта
- [TICKET_TEMPLATE.md](TICKET_TEMPLATE.md) — формат тикетов

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `CLAUDE.md` — это файл SystemQwen, не трогать
- `.claude/skills/auto-learn/SKILL.md` — только читать

## Алгоритм (шаг за шагом)

1. **Создать файл `.claude/skills/project-memory-init/SKILL.md`** со следующим содержимым:

```markdown
---
name: project-memory-init
description: Bootstrap CLAUDE.md нового проекта — добавляет секцию SystemQwen между маркерами. Запускать в начале работы с любым новым проектом.
---

# project-memory-init

Создаёт или обновляет CLAUDE.md проекта с секцией SystemQwen.

## Когда запускается

- Вручную: `/project-memory-init`
- Автоматически: из autopilot Phase 0 при старте задачи в новом проекте

## Шаги

1. **Проверить существование CLAUDE.md** в текущей папке проекта:
   - Если НЕ существует → создать новый файл с полным скелетом (см. шаблон ниже)
   - Если существует → проверить наличие маркеров `<!-- systemqwen:start -->` и `<!-- systemqwen:end -->`
     - Если маркеры есть → обновить содержимое между ними
     - Если маркеров нет → добавить секцию в конец файла

2. **Определить название проекта** — из имени папки (`basename $(pwd)`)

3. **Определить команды проекта** — проверить наличие файлов:
   - `package.json` → Node.js (`npm install`, `npm run dev`, `npm test`)
   - `requirements.txt` / `pyproject.toml` → Python (`pip install -r requirements.txt`, `python main.py`)
   - `*.csproj` → .NET (`dotnet build`, `dotnet run`, `dotnet test`)
   - `Cargo.toml` → Rust (`cargo build`, `cargo run`, `cargo test`)
   - Если ничего не найдено → оставить placeholder `[команда]`

4. **Записать секцию** между маркерами:

```markdown
<!-- systemqwen:start -->
# [Название проекта]

[Одна строка: что это и для кого]

## Команды

| Команда | Что делает |
|---------|------------|
| `[установка]` | Установить зависимости |
| `[запуск]` | Запустить локально |
| `[тесты]` | Прогнать тесты |

## Как здесь работает SystemQwen

Тикеты в `.scratch/[project]/issues/`.
Opus планирует → Qwen реализует → Opus проверяет.

Продолжение: скажи "продолжи systemqwen"
<!-- systemqwen:end -->
```

5. **Сообщить пользователю:**
```
✅ CLAUDE.md обновлён
Проект: [название]
Стек определён: [найденный стек или "не определён"]
Тикеты будут в: .scratch/[название]/issues/
```

## Gotchas

- Не перезаписывать содержимое OUTSIDE маркеров — там может быть важная информация
- Если CLAUDE.md уже содержит маркеры с актуальной информацией — не трогать, только подтвердить
- Название проекта брать из имени папки, не угадывать
```

## Критерии приёмки

- [ ] Файл `.claude/skills/project-memory-init/SKILL.md` создан
- [ ] Скилл содержит frontmatter с name и description
- [ ] Алгоритм описывает все 5 шагов
- [ ] Шаблон с маркерами включён
- [ ] Секция Gotchas есть

## Как закончить

1. Проверить что файл создан: `ls .claude/skills/project-memory-init/`
2. Коммит:
   ```bash
   git add .claude/skills/project-memory-init/SKILL.md
   git commit -m "T1: add project-memory-init skill"
   git push
   ```
3. Финальный ответ:
   - Что создано
   - Путь к файлу
   - Размер (строк)

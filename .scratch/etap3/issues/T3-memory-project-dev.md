# T3 — Заполнить память по проекту D:\dev (trading ATAS)

**What to build:** Создать файл `.claude/memory/facts/project-dev-trading.md` с полной информацией о проекте D:\dev — стек, что делали, решения, паттерны.

**Blocked by:** none

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `D:\System2` (File > Open Folder).

## Контекст

D:\dev — проект кастомного индикатора для торговой платформы ATAS (C#/.NET). Нужно зафиксировать в памяти SystemQwen что это за проект, какой стек, что уже сделано — чтобы в будущих задачах Claude сразу давал релевантные советы.

## Файлы для изменения

- [.claude/memory/facts/project-dev-trading.md](.claude/memory/facts/project-dev-trading.md) — создать новый файл

## Файлы для чтения (контекст)

- Прочитать из `D:\dev\`: `README.md`, `CLAUDE.md`, `HANDOFF.md`, `STRATEGY_REFERENCE.md` — понять проект
- [.claude/memory/facts/technology-stack.md](.claude/memory/facts/technology-stack.md) — посмотреть существующий формат

## ⚠️ Файлы НЕЛЬЗЯ трогать

- Всё в `D:\dev\` — только читать
- `.claude/memory/facts/technology-stack.md` — только читать

## Алгоритм (шаг за шагом)

1. **Прочитать** `D:\dev\README.md`, `D:\dev\CLAUDE.md`, `D:\dev\HANDOFF.md`

2. **Создать** `.claude/memory/facts/project-dev-trading.md`:

```markdown
---
name: project-dev-trading
description: Проект D:\dev — кастомный индикатор для ATAS (торговая платформа), C#/.NET
metadata:
  type: project
---

# Проект: D:\dev — ATAS Trading Indicator

**Дата последнего обновления:** 2026-08-19
**Путь:** D:\dev

## Что это

[1-2 предложения из README что делает проект]

## Стек

- Язык: C# / .NET 8
- Платформа: ATAS (торговый терминал с футпринтом)
- IDE: VS Code + C# Dev Kit
- Алерты: Telegram Bot API

## Что реализовано

[Список из README/HANDOFF что уже сделано]

## Ключевые решения

[Из CLAUDE.md или HANDOFF.md — что выбрали и почему]

## Паттерны которые сработали

[Что использовалось повторно, что работает хорошо]

## Как запускать

- Сборка: `dotnet build -c Release`
- DLL автоматически в `%APPDATA%\ATAS\Indicators\`
- Тестирование: Market Replay в ATAS

## Рекомендации для будущих задач

[На что обращать внимание, типичные grabs от проекта]
```

3. **Обновить** `.claude/memory/MEMORY.md` — добавить строку в раздел facts:
   ```
   - [project-dev-trading](facts/project-dev-trading.md) — ATAS trading indicator, C#/.NET
   ```

## Критерии приёмки

- [ ] Файл `.claude/memory/facts/project-dev-trading.md` создан
- [ ] Содержит реальную информацию из D:\dev (не заглушки)
- [ ] MEMORY.md обновлён

## Как закончить

1. Коммит:
   ```bash
   git add .claude/memory/facts/project-dev-trading.md .claude/memory/MEMORY.md
   git commit -m "T3: add D:\dev trading project to memory"
   git push
   ```
2. Финальный ответ:
   - Что записано в память
   - Ключевые факты о проекте

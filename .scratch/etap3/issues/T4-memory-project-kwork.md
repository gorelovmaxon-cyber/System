# T4 — Заполнить память по проекту кворк (сайты)

**What to build:** Создать файл `.claude/memory/facts/project-kwork-sites.md` с информацией о проектах фриланс-сайтов с кворка — стек, типичные задачи, паттерны.

**Blocked by:** none

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке с кворк-проектами на PC (папка кворк).
Затем открой D:\System2 для записи в память.

## Контекст

На PC есть папка с сайтами (кворк-заказы). Нужно зафиксировать в памяти SystemQwen общую информацию: какой стек используется, типичные задачи, что повторяется — чтобы в будущем Claude давал релевантные советы по этим проектам.

## Файлы для изменения

- [.claude/memory/facts/project-kwork-sites.md](.claude/memory/facts/project-kwork-sites.md) — создать (в D:\System2)

## Файлы для чтения (контекст)

- Папка кворк на PC — посмотреть список проектов, package.json или аналоги
- [.claude/memory/facts/project-dev-trading.md](.claude/memory/facts/project-dev-trading.md) — для понимания формата

## Алгоритм (шаг за шагом)

1. **Просмотреть** папку кворк: список проектов, типы файлов, стек

2. **Создать** `.claude/memory/facts/project-kwork-sites.md`:

```markdown
---
name: project-kwork-sites
description: Фриланс-проекты с кворка — сайты, стек, типичные задачи
metadata:
  type: project
---

# Проекты: кворк (фриланс-сайты)

**Дата:** 2026-08-19
**Путь на PC:** [путь к папке кворк]

## Стек (типичный)

[HTML/CSS/JS? WordPress? React? — из анализа файлов]

## Типичные задачи

[Что чаще всего делается в этих проектах]

## Паттерны которые повторяются

[Что используется из проекта в проект]

## Рекомендации

[Что учитывать при новых задачах по сайтам]
```

3. **Обновить** `.claude/memory/MEMORY.md` — добавить строку в раздел facts:
   ```
   - [project-kwork-sites](facts/project-kwork-sites.md) — кворк фриланс-сайты
   ```

## Критерии приёмки

- [ ] Файл `.claude/memory/facts/project-kwork-sites.md` создан с реальными данными
- [ ] MEMORY.md обновлён
- [ ] Информация конкретная (не заглушки)

## Как закончить

1. Коммит:
   ```bash
   git add .claude/memory/facts/project-kwork-sites.md .claude/memory/MEMORY.md
   git commit -m "T4: add kwork sites projects to memory"
   git push
   ```
2. Финальный ответ:
   - Что записано
   - Стек проектов

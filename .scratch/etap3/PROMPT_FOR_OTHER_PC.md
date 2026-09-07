# Промпт для продолжения на другом PC (GPT Luna)

## Контекст

Система SystemQwen (Opus планирует → Qwen/Luna реализует → Opus проверяет).
Вся память в GitHub: https://github.com/gorelovmaxon-cyber/System.git

Этап 3 в процессе — автоматизация памяти + заполнение проектов.

---

## Что нужно сделать

**Сначала:** склонировать репозиторий на новый PC:
```bash
git clone https://github.com/gorelovmaxon-cyber/System.git System2
cd System2
```

**Затем выполнить тикеты T1-T4** (находятся в `.scratch/etap3/issues/`):

### T1 — Создать скилл project-memory-init
- Файл: `.scratch/etap3/issues/T1-project-memory-init-skill.md`
- Что делает: создаёт скилл для bootstrap CLAUDE.md новых проектов
- Выполнить строго по инструкциям в тикете

### T2 — Git hook auto-push
- Файл: `.scratch/etap3/issues/T2-git-hook-auto-push.md`
- Что делает: после каждого коммита автоматически пушит память на GitHub
- Создать шаблоны в `.git-hooks-templates/` и установить hook

### T3 — Заполнить память по D:\dev
- Файл: `.scratch/etap3/issues/T3-memory-project-dev.md`
- Что делает: читает D:\dev (trading ATAS проект) и записывает в `.claude/memory/facts/project-dev-trading.md`
- Если D:\dev недоступен на этом PC — пропустить, вернуться к нему позже

### T4 — Заполнить память по кворк-сайтам
- Файл: `.scratch/etap3/issues/T4-memory-project-kwork.md`
- Что делает: анализирует папку кворк (сайты) и записывает в `.claude/memory/facts/project-kwork-sites.md`
- Выполнить когда будешь на PC с кворк-папкой

---

## Порядок выполнения

1. **T1** — независимый, можно первым
2. **T2** — независимый, можно параллельно с T1
3. **T3** — если D:\dev доступен на этом PC
4. **T4** — если папка кворк доступна на этом PC

После каждого тикета:
```bash
git add [изменённые файлы]
git commit -m "T[N]: [описание]"
git push origin master
```

---

## Важные правила

### Из CLAUDE.md (секция "Правило памяти"):
- **Сохранение агрессивное и немедленное** — не ждать конца сессии
- Записывать в `.claude/memory/` сразу когда появляется новое решение/факт/gotcha
- После записи — `git commit + git push` немедленно
- GitHub = единственный надёжный источник памяти

### Формат тикетов:
- Каждый тикет содержит секцию **"Алгоритм (шаг за шагом)"** — следовать строго
- Секция **"Файлы для изменения"** — точные пути
- Секция **"Критерии приёмки"** — чеклист для проверки

---

## После выполнения T1-T4

Вернуться к Opus (Claude Code) для проверки. Передать результаты:

```
✅ T1 выполнен: коммит [hash]
   Создан: .claude/skills/project-memory-init/SKILL.md

✅ T2 выполнен: коммит [hash]
   Создано: .git-hooks-templates/post-commit + install-hooks.sh
   Hook установлен: да/нет

✅ T3 выполнен: коммит [hash]
   Создан: .claude/memory/facts/project-dev-trading.md
   Обновлён: .claude/memory/MEMORY.md

✅ T4 выполнен: коммит [hash]
   Создан: .claude/memory/facts/project-kwork-sites.md
   Обновлён: .claude/memory/MEMORY.md
```

---

## Следующие этапы (после T1-T4)

Из старого плана остаётся:
- **Manifest + blind acceptance субагент** — автоматическое принятие повторяемых паттернов
- **Рекомендации** — уже частично работают через auto-learn, но можно улучшить

Детали в `NEXT_SESSION_PROMPT.md` (если есть).

---

## Troubleshooting

### Если git push падает с ошибкой авторизации:
```bash
git config user.name "Максим Горелов"
git config user.email "gorelovmaxon-cyber@users.noreply.github.com"
```

### Если нужно переключить ветку:
```bash
git checkout master
git pull origin master
```

### Если непонятно что делать в тикете:
1. Прочитать секцию "Алгоритм" полностью
2. Прочитать "Файлы для чтения (контекст)" — там ссылки на примеры
3. Следовать шаг за шагом, не пропуская

---

**Главное:** после каждого тикета — коммит + push. Не накапливать.

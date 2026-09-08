---
status: observation
category: gotchas
scope: systemqwen
source: историческая запись и локальная проверка, 2026-09-08
evidence: Правила относятся к Windows, конкретные версии среды зафиксированы в ENVIRONMENT.md
confidence: 0.7
---

# Git + Node.js на Windows

> Исторический fallback на `.system-memory/` в этом документе superseded: единый
> корень теперь разрешается через SC-02; старые примеры сохранены как evidence gotcha.

**Дата:** 2026-08-17  
**Контекст:** Windows 10, Node 24, Git Bash  
**Источник:** auto-learn gotchas + project analysis

## node --test падает с указанием папки

**Проблема:**
```bash
node --test test/
# Error: Cannot find module test/
```

**Причина:**
Node 24 на Windows некорректно обрабатывает путь `test/` в `--test` флаге.

**Решение:**
```bash
node --test
# Найдёт все test файлы автоматически
```

**Применимость:** Windows + Node 24. На Linux работает с папкой.

---

## git stash перед checkout/reset

**Проблема:**
Uncommitted changes теряются при `git checkout` или `git reset --hard`.

**Причина:**
Забыл сохранить изменения перед переключением ветки или сбросом.

**Решение:**
```bash
git stash -u  # -u включает untracked файлы
git checkout другая-ветка
# или
git reset --hard HEAD~1

# Потом вернуть:
git stash pop
```

**Применимость:** ВСЕГДА перед деструктивными Git операциями.

---

## git add . захватывает .env и credentials

**Проблема:**
```bash
git add .
git commit -m "feature"
# Случайно закоммитил .env с API ключами
```

**Причина:**
`git add .` добавляет ВСЁ, включая секреты.

**Решение:**
```bash
# Вместо git add .
git add file1.ts file2.ts config.yml

# Или проверить перед коммитом:
git status
# Если видишь .env или credentials.json → git reset HEAD .env
```

**Применимость:** ВСЕГДА добавлять файлы явно, не через `.`.

---

## Субагент не видит переписку

**Проблема:**
Запустил субагента с промптом "реализуй как обсудили" — субагент не понимает контекст.

**Причина:**
Субагент получает только свой промпт, не видит историю чата с пользователем.

**Решение:**
```markdown
# В тикете T1.md — положить на диск

## Context
Мы обсудили что нужен JWT auth с refresh tokens.

## Algorithm
1. Install jsonwebtoken package
2. Create middleware/auth.ts
3. Generate access token (15min) + refresh (7 days)
...
```

Субагент читает T1.md → видит весь контекст.

**Применимость:** ВСЕГДА класть ТЗ на диск для субагентов.

---

## Параллельные субагенты редактируют один файл

**Проблема:**
Запустил 3 субагента параллельно → все правят `src/index.ts` → конфликты, перезапись.

**Причина:**
Параллельные агенты работают в одном worktree, не видят изменения друг друга.

**Решение:**
```typescript
// Вариант A: Sequential pipeline
await agent('T1'); // Завершился
await agent('T2'); // Завершился
await agent('T3');

// Вариант B: Isolation worktree (дорого ~200-500ms на setup)
await agent('T1', {isolation: 'worktree'});
await agent('T2', {isolation: 'worktree'});
```

**Применимость:** 
- Sequential — по умолчанию
- Worktree — ТОЛЬКО если агенты ДОЛЖНЫ работать параллельно И в одних файлах

---

## /clear забыли между тикетами

**Проблема:**
Реализовал T1, T2, T3 в одном контексте → контекст раздулся до 180k токенов → компрессия → потеря деталей.

**Причина:**
Контекст накапливается, memory pressure растёт.

**Решение:**
```
T1 готов → /clear
T2 готов → /clear
T3 готов → /clear
```

Держать рабочий юнит в ~40% контекста (~100k токенов).

**Применимость:** ВСЕГДА между тикетами (из architecture-prefs.md).

---

## Fallback на .system-memory/ срабатывает случайно

**Проблема:**
На машине с D:\System\memory/ создал .system-memory/ в проекте → дублирование.

**Причина:**
auto-learn проверяет существование D:\System\, но создаёт .system-memory/ "на всякий случай".

**Решение:**
```markdown
# auto-learn SKILL.md gotcha:

Fallback на .system-memory/ работает ТОЛЬКО когда 
D:\System физически недоступен (другая машина, Docker, 
удалённый сервер). Не создавать локальную копию 
"на всякий случай".
```

**Применимость:** Проверить D:\System\memory/ СНАЧАЛА, только потом fallback.

---

## DECISIONS.md дублирован в memory/decisions/

**Проблема:**
Решение "использовать JWT" записано И в DECISIONS.md проекта, И в D:\System\memory/decisions/.

**Причина:**
Не понял разницу между проектной и кросс-проектной памятью.

**Решение:**
- **DECISIONS.md проекта** — ВСЕ решения проекта (включая специфичные)
- **memory/decisions/** — ТОЛЬКО кросс-проектные решения (применимые везде)

Пример:
- "JWT с refresh tokens" → memory/decisions/ (применимо везде)
- "15г желатина для тренировок" → DECISIONS.md проекта (специфично)

**Применимость:** auto-learn gotcha — не дублировать специфичное в общую память.

---

## Дата в DD.MM.YYYY вместо YYYY-MM-DD

**Проблема:**
Файлы в memory/decisions/ названы `12.08.2026-jwt-auth.md` → сортировка неправильная.

**Причина:**
Привычный формат DD.MM.YYYY не сортируется хронологически.

**Решение:**
```
2026-08-12-jwt-auth.md  # Правильно — сортируется
12.08.2026-jwt-auth.md  # Неправильно
```

**Применимость:** ВСЕГДА YYYY-MM-DD для файлов с датой (из auto-learn gotchas).

---

## Применимость

✅ **Перед Git операцией:**
- git stash -u перед checkout/reset
- git add file1.ts file2.ts (не git add .)
- git status ДО git commit

✅ **Перед запуском субагента:**
- Класть ТЗ на диск (не в промпте)
- Sequential > parallel (если файлы пересекаются)
- /clear между тикетами

✅ **При работе с памятью:**
- Проверить D:\System\memory/ существует
- YYYY-MM-DD для дат в именах файлов
- Кросс-проектное в memory/, специфичное в DECISIONS.md проекта

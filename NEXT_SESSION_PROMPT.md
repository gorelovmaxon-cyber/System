# Промпт для следующей сессии: Расширение SystemQwen до полной памяти

## Контекст

У меня система SystemQwen (e:\System2\) с базовой памятью через auto-learn.  
Изучил nick-vels/autopilot и хочу расширить до полноценного персонального ИИ.

**Цели:**
1. Помнить ВСЁ из всех проектов независимо от сессии
2. Анализировать мои коммиты автоматически (Git hooks)
3. Накапливать знания обо мне как разработчике
4. Работать независимо от папки (глобальный контекст)

## Что уже есть

- ✅ SystemQwen: Opus → тикеты → Qwen → проверка
- ✅ auto-learn: D:\System\memory/ (facts, decisions, gotchas, patterns)
- ✅ 46 скиллов в .claude/skills/
- ✅ /autopilot --mode=systemqwen

## Что нужно добавить (Этап 1 — приоритет)

### 1. User Profile (D:\System\memory/user-profile/)

Создать структуру:
```
D:\System\memory/user-profile/
├── coding-style.md       # мои предпочтения в коде
├── architecture-prefs.md # архитектурные решения
├── common-mistakes.md    # повторяющиеся ошибки
└── work-patterns.md      # ритм работы
```

Формат каждого файла:
```markdown
# [Название аспекта]

**Обновлено:** YYYY-MM-DD

## Предпочтения

- [Конкретное предпочтение 1]
- [Конкретное предпочтение 2]

## Примеры

- Проект X: [что было]
- Проект Y: [что сработало]

## Не использовать

- [Антипаттерны]
```

### 2. Скилл /profile-update

Создать `.claude/skills/profile-update/SKILL.md`:

**Когда запускается:**
- Вручную: `/profile-update`
- Автоматически: через Git post-commit hook
- В конце auto-learn (Phase 5)

**Что делает:**
1. Читает последний коммит (git diff, commit message)
2. Анализирует паттерны:
   - Стиль кода (именование, структура)
   - Архитектурные решения
   - Повторяющиеся ошибки (если тесты красные)
3. Обновляет соответствующий файл в user-profile/

**Формат вывода:**
```
✅ Профиль обновлён
- coding-style.md: добавлено "предпочитает async/await над promises"
- architecture-prefs.md: добавлено "JWT с refresh tokens"
```

### 3. Расширить auto-learn

Модифицировать `.claude/skills/auto-learn/SKILL.md`:

**Добавить в Шаг 2 (после определения типа):**
```markdown
2.5. **Если это паттерн кода или архитектурное решение**:
   - Записать в patterns/ как обычно
   - ТАКЖЕ обновить user-profile/architecture-prefs.md
   - Запустить /profile-update для анализа
```

### 4. Память проекта (CLAUDE.md — Phase 0)

Создать скилл `/project-memory-init`:

**Когда запускается:**
- Автоматически в начале /autopilot --mode=systemqwen
- Вручную: `/project-memory-init`

**Что делает (Phase 0):**
1. Определяет файл памяти (CLAUDE.md или AGENTS.md) — логика из nick-vels
2. Пишет скелет между маркерами:
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

### 5. Git Hooks (post-commit)

Создать файл `.git-hooks-templates/post-commit`:
```bash
#!/bin/bash
# SystemQwen: автоанализ коммита

# Проверить, что D:\System\memory/ существует
if [ ! -d "D:/System/memory" ]; then
  exit 0
fi

# Получить последний коммит
COMMIT_HASH=$(git log -1 --format=%H)
COMMIT_MSG=$(git log -1 --format=%B)
DIFF=$(git diff HEAD~1)

# Записать во временный файл
TEMP_FILE=$(mktemp)
echo "Commit: $COMMIT_HASH" > "$TEMP_FILE"
echo "Message: $COMMIT_MSG" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "$DIFF" >> "$TEMP_FILE"

# Вызвать Claude для анализа (если Claude CLI доступен)
# TODO: интеграция с Claude CLI
# claude analyze-commit "$TEMP_FILE" --update-profile

rm "$TEMP_FILE"
```

## Требования

- Использовать существующую структуру SystemQwen
- Opus планирует через /autopilot --mode=systemqwen
- Qwen реализует через VS Code
- Новые скиллы в `.claude/skills/`
- Память остаётся в `D:\System\memory/`

## Желаемый результат

**После Этапа 1:**
```bash
# В любом проекте
/start "добавить авторизацию"

→ Opus читает D:\System\memory/user-profile/
→ Видит: "предпочитает JWT с refresh tokens"
→ Создаёт тикеты с учётом моих предпочтений
→ Qwen реализует
→ После коммита: Git hook → profile-update → память обновлена
```

**Независимо от:**
- Проекта (память глобальная)
- Сессии (всё в файлах)
- Папки (D:\System\memory/ всегда доступна)

## Начни с

1. Создай структуру D:\System\memory/user-profile/
2. Создай скилл /profile-update
3. Модифицируй auto-learn
4. Создай /project-memory-init
5. Создай шаблон Git hook

Используй `/autopilot --mode=systemqwen` для создания тикетов.  
Останови после тикетов — я передам их Qwen по одному.

## Файлы для изучения

- [e:\System2\CLAUDE.md](e:\System2\CLAUDE.md) — главная инструкция
- [e:\System2\OPUS.md](e:\System2\OPUS.md) — роль Opus
- [e:\System2\.claude\skills\auto-learn\SKILL.md](e:\System2\.claude\skills\auto-learn\SKILL.md) — текущий auto-learn
- [e:\System2\.claude\memory\nick-vels-autopilot-analysis.md](e:\System2\.claude\memory\nick-vels-autopilot-analysis.md) — анализ nick-vels

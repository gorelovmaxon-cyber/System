# T8 — Создать Activepieces flow для автообновления профиля

**What to build:** Настроить автоматический workflow: Git push → анализ diff → обновление user-profile

**Blocked by:** T7 (Activepieces должен быть установлен)

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `e:\System2` (File > Open Folder).

## Контекст

После установки Activepieces (T7) нужно создать автоматизацию: при каждом коммите Activepieces анализирует изменения и дописывает важные паттерны в user-profile.

**Пример:**
```
Коммит: "fix: async/await без try/catch"
→ Activepieces анализирует diff
→ Добавляет в common-mistakes.md: "Оборачивать async в try/catch"
```

## Файлы для создания

- `docs/activepieces-flow-config.md` — описание flow и настройки
- `.git/hooks/post-commit` — Git hook для триггера Activepieces

## Файлы для чтения (контекст)

- [docs/activepieces-setup.md](../../docs/activepieces-setup.md) — инструкция из T7
- [.claude/memory/user-profile/common-mistakes.md](../../.claude/memory/user-profile/common-mistakes.md) — формат файла
- [.claude/skills/profile-update/SKILL.md](../../.claude/skills/profile-update/SKILL.md) — логика обновления

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `.claude/memory/user-profile/*.md` — обновлять только через Activepieces flow
- `.git/config` — не менять Git конфигурацию
- `CLAUDE.md` — только читать

## Алгоритм (шаг за шагом)

### Шаг 1: Создать Git hook

1. **Создать файл** `.git/hooks/post-commit` (без расширения):

```bash
#!/bin/bash

# Get commit info
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
DIFF=$(git diff HEAD~1 HEAD)

# Send to Activepieces webhook
curl -X POST http://localhost:8642/api/v1/webhooks/WEBHOOK_ID \
  -H "Content-Type: application/json" \
  -d "{\"commit\":\"$COMMIT_HASH\",\"message\":\"$COMMIT_MSG\",\"diff\":\"$DIFF\"}" \
  || echo "Activepieces unavailable, skipping profile update"
```

2. **Сделать исполняемым** (описать в документации):
   ```bash
   chmod +x .git/hooks/post-commit
   ```

### Шаг 2: Создать документацию flow

1. **Создать файл** `docs/activepieces-flow-config.md`:

```markdown
# Activepieces Flow Configuration

## Flow Overview

**Name:** Git Commit → Profile Auto-Update

**Trigger:** Webhook (http://localhost:8642/api/v1/webhooks/WEBHOOK_ID)

**Steps:**
1. Parse webhook data (commit, message, diff)
2. Analyze diff with AI (find patterns/mistakes)
3. Update user-profile if pattern found
4. Git commit changes

## Setup Instructions

### Step 1: Create Flow in Activepieces

1. Open http://localhost:8642
2. Create New Flow → Webhook Trigger
3. Copy Webhook URL
4. Update .git/hooks/post-commit with actual WEBHOOK_ID

### Step 2: Configure Flow Steps

**Step 1: Data Mapper**
- Input: `{{trigger.body}}`
- Parse: `commit`, `message`, `diff`

**Step 2: HTTP Request (AI Analysis)**
- URL: `https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version`
- Body:
```json
{
  "model": "claude-3-haiku-20240307",
  "max_tokens": 1024,
  "messages": [{
    "role": "user",
    "content": "Analyze git diff, find important patterns:\n\n{{step1.diff}}\n\nCommit: {{step1.message}}\n\nReturn JSON: {\"has_pattern\": bool, \"category\": \"common-mistakes|coding-style|architecture-prefs\", \"pattern\": \"...\", \"why\": \"...\", \"how_to_apply\": \"...\"}"
  }]
}
```

**Step 3: Branch (Condition)**
- IF `{{step2.response.has_pattern}} == true` → Step 4
- ELSE → End

**Step 4: Update File (HTTP or Script)**
- Append to `D:/System/memory/user-profile/{{category}}.md`
- Format: date + pattern + why + how
- Git commit: `git add user-profile/ && git commit -m "auto-learn: {{pattern}}"`

## Testing

1. Make test commit:
```bash
echo "test" > test.txt
git add test.txt
git commit -m "test: проверка auto-learn"
```

2. Check Activepieces logs:
```bash
docker-compose logs -f activepieces
```

3. Verify: user-profile updated if pattern found

## Troubleshooting

**Webhook не срабатывает:**
- Проверить .git/hooks/post-commit исполняемый
- Проверить WEBHOOK_ID корректный

**AI не находит паттерны:**
- Увеличить max_tokens
- Уточнить промпт

**Файл не обновляется:**
- Проверить права доступа к D:/System/memory/
- Проверить format append правильный
```

## Критерии приёмки

- [ ] Файл `.git/hooks/post-commit` создан
- [ ] Hook отправляет POST на Activepieces webhook
- [ ] Файл `docs/activepieces-flow-config.md` создан
- [ ] Документация содержит все 4 шага flow
- [ ] Пример AI промпта включен
- [ ] Инструкция по тестированию включена
- [ ] Troubleshooting с 3 проблемами

## Ограничения

- Не создавать flow в Activepieces (это ручная настройка пользователя)
- Только документация и Git hook
- WEBHOOK_ID заменить на placeholder (пользователь вставит свой)

## Как закончить

1. Проверка:
   ```bash
   ls .git/hooks/post-commit
   ls docs/activepieces-flow-config.md
   ```

2. Коммит:
   ```bash
   git add .git/hooks/post-commit docs/activepieces-flow-config.md
   git commit -m "T8: создать Activepieces flow для автообновления профиля

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
   ```

3. Финальный ответ (максимум 6 строк):
   - Git hook post-commit создан
   - Отправляет commit+diff на Activepieces webhook
   - Документация: 4 шага flow (parse → AI → condition → update)
   - Тест: коммит → проверка логов → user-profile обновлен

---

**Команда запуска тестов:** `bash .git/hooks/post-commit` (ручной тест hook)

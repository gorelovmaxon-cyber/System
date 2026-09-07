# T8 — Создать Activepieces flow для автообновления user-profile

**What to build:** Настроить автоматический workflow в Activepieces: Git push → анализ diff → обновление user-profile

**Blocked by:** T7 (Activepieces должен быть установлен)

**Status:** ready-for-agent

**Executor:** GPT Luna (через инструкции, ручная настройка в UI)

---

## Контекст

После каждого коммита Activepieces должен автоматически анализировать изменения и обновлять user-profile если найдены паттерны.

**Пример:**
```
Коммит: "fix: исправлен баг с async/await в handleSubmit"

Activepieces:
1. Видит коммит через webhook
2. Получает diff
3. Анализирует: "async handler без try/catch"
4. Дописывает в common-mistakes.md:
   "Всегда оборачивать async handlers в try/catch"
```

---

## Файлы для чтения (контекст)

- [.claude/memory/user-profile/common-mistakes.md](../../.claude/memory/user-profile/common-mistakes.md)
- [.claude/skills/profile-update/SKILL.md](../../.claude/skills/profile-update/SKILL.md)

---

## Алгоритм (шаг за шагом)

### Шаг 1: Создать Webhook в Activepieces

В Activepieces UI:

1. **Create New Flow**
2. **Name:** `Git Push → Profile Update`
3. **Trigger:** Webhook
   - Copy Webhook URL (например: `http://localhost:8080/api/v1/webhooks/abc123`)

---

### Шаг 2: Настроить Git Hook

Создать файл `e:\System2\.git\hooks\post-commit`:

```bash
#!/bin/bash

# Получить последний коммит
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
DIFF=$(git diff HEAD~1 HEAD)

# Отправить в Activepieces
curl -X POST http://localhost:8080/api/v1/webhooks/abc123 \
  -H "Content-Type: application/json" \
  -d "{
    \"commit\": \"$COMMIT_HASH\",
    \"message\": \"$COMMIT_MSG\",
    \"diff\": \"$DIFF\"
  }"
```

**Сделать исполняемым:**
```bash
chmod +x e:\System2\.git\hooks\post-commit
```

---

### Шаг 3: Добавить Step 1 — Парсинг данных

В Activepieces flow:

**Step 1: Data Mapper**
- Input: `{{trigger.body}}`
- Parse:
  - `commit_hash`: `{{trigger.body.commit}}`
  - `commit_msg`: `{{trigger.body.message}}`
  - `diff_content`: `{{trigger.body.diff}}`

---

### Шаг 4: Добавить Step 2 — Анализ diff

**Step 2: HTTP Request (к Claude API или GPT)**

```json
{
  "url": "https://api.anthropic.com/v1/messages",
  "method": "POST",
  "headers": {
    "x-api-key": "YOUR_CLAUDE_API_KEY",
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  },
  "body": {
    "model": "claude-3-haiku-20240307",
    "max_tokens": 1024,
    "messages": [{
      "role": "user",
      "content": "Проанализируй этот git diff и найди паттерны ошибок или улучшений кода:\n\n{{step1.diff_content}}\n\nКоммит: {{step1.commit_msg}}\n\nЕсли найдены важные паттерны, верни JSON:\n{\n  \"has_pattern\": true,\n  \"category\": \"common-mistakes | architecture-prefs | coding-style\",\n  \"pattern\": \"краткое описание\",\n  \"why\": \"почему это важно\",\n  \"how_to_apply\": \"как применять\"\n}\n\nЕсли паттернов нет, верни:\n{\n  \"has_pattern\": false\n}"
    }]
  }
}
```

---

### Шаг 5: Добавить Step 3 — Условие

**Step 3: Branch (условие)**

```
IF {{step2.response.content[0].text | parseJson | has_pattern}} == true
  THEN → Step 4
  ELSE → End
```

---

### Шаг 6: Добавить Step 4 — Обновление файла

**Step 4: HTTP Request (к GitHub API или локальный скрипт)**

**Вариант A: Через локальный скрипт** (проще)

Создать файл `D:\System\activepieces\update-profile.ps1`:

```powershell
param(
    [string]$Category,
    [string]$Pattern,
    [string]$Why,
    [string]$HowTo
)

$file = "D:\System\memory\user-profile\$Category.md"

$entry = @"

## $(Get-Date -Format "yyyy-MM-dd") — Auto-learned

**Pattern:** $Pattern

**Why:** $Why

**How to apply:** $HowTo

"@

Add-Content -Path $file -Value $entry

# Commit
cd D:\System\memory
git add user-profile/
git commit -m "auto-learn: $Pattern"
git push origin master
```

**В Activepieces Step 4:**

```json
{
  "method": "POST",
  "url": "http://localhost:3000/run-script",
  "body": {
    "script": "update-profile.ps1",
    "category": "{{step2.response | parseJson | category}}",
    "pattern": "{{step2.response | parseJson | pattern}}",
    "why": "{{step2.response | parseJson | why}}",
    "how_to": "{{step2.response | parseJson | how_to_apply}}"
  }
}
```

---

### Шаг 7: Протестировать flow

1. Сделать тестовый коммит в `e:\System2`:
   ```bash
   echo "test" > test.txt
   git add test.txt
   git commit -m "test: проверка auto-learn"
   ```

2. Проверить что:
   - Webhook сработал
   - Activepieces получил данные
   - Claude проанализировал diff
   - Если найден паттерн → `common-mistakes.md` обновился

---

## Критерии приёмки

- [ ] Flow создан в Activepieces
- [ ] Git hook `post-commit` настроен
- [ ] Webhook триггерит flow при коммите
- [ ] Claude API анализирует diff
- [ ] Условие проверяет `has_pattern`
- [ ] Если паттерн найден → user-profile обновляется
- [ ] Тест: коммит с исправлением → профиль автообновился

---

## Команда для коммита

```bash
git add .git/hooks/post-commit
git add docs/activepieces-flow-config.md
git commit -m "T8: настроить Activepieces flow для auto-learn"
git push origin master
```

---

## Следующий тикет

После T8 → T9 (создать MCP-сервер для Figma интеграции)

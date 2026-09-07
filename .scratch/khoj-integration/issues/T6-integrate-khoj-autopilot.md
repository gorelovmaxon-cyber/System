# T6 — Интегрировать Khoj API в autopilot (Phase 0.5)

**What to build:** Добавить в autopilot скилл новую фазу 0.5 для запроса контекста из Khoj перед Grill

**Blocked by:** T5 (документация должна быть готова)

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `e:\System2` (File > Open Folder).

## Контекст

После установки Khoj (T5) нужно интегрировать его в SystemQwen workflow. При запуске `/autopilot` перед фазой Grill Opus должен спросить Khoj: "Есть ли у меня опыт с этой задачей?"

**Экономия:**
- Сейчас: Opus читает весь `D:\System\memory\` (~50k токенов)
- С Khoj: Opus получает только релевантное (~5k токенов)
- **Экономия: 90% токенов на Phase 0**

## Файлы для изменения

- `.claude/skills/autopilot/SKILL.md` — добавить Phase 0.5

## Файлы для чтения (контекст)

- [.claude/skills/autopilot/SKILL.md](../../../.claude/skills/autopilot/SKILL.md) — текущая версия autopilot
- [docs/khoj-integration.md](../../docs/khoj-integration.md) — спецификация интеграции (после T5)
- [.scratch/khoj-integration/spec.md](../spec.md) — полная спецификация

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `CLAUDE.md` — основная инструкция, не менять
- `OPUS.md` — инструкция для Opus, не менять
- Любые другие фазы в autopilot/SKILL.md (только ДОБАВИТЬ Phase 0.5)

## Алгоритм (шаг за шагом)

### Шаг 1: Найти место для Phase 0.5

1. **Открыть файл** `.claude/skills/autopilot/SKILL.md`

2. **Найти секцию Phase 0** (примерно строки 50-100):
   ```markdown
   ## Phase 0 — context-setting
   ```

3. **Найти где заканчивается Phase 0** и начинается Phase 1:
   ```markdown
   ## Phase 1 — grilling
   ```

4. **Запомнить:** Phase 0.5 должна быть МЕЖДУ Phase 0 и Phase 1

### Шаг 2: Вставить Phase 0.5

**Добавить ПОСЛЕ Phase 0, ПЕРЕД Phase 1:**

```markdown

## Phase 0.5 — khoj-context-retrieval (automatic)

**Цель:** Подтянуть релевантный опыт из прошлых проектов через Khoj.

**Когда:** Автоматически перед каждым Grill (Phase 1).

**Если Khoj недоступен:** Пропустить эту фазу, продолжить с Phase 1.

### Алгоритм для Opus

1. **Проверить доступность Khoj:**
   ```bash
   curl -s http://localhost:42110/health || echo "unavailable"
   ```
   
   Если unavailable → skip Phase 0.5, go to Phase 1.

2. **Сформировать query** на основе задачи пользователя:
   - Задача: "добавить JWT авторизацию"
   - Query: "JWT authorization authentication patterns"

3. **Запрос к Khoj API:**
   ```bash
   curl -s http://localhost:42110/api/search \
     -H "Content-Type: application/json" \
     -d '{"q": "JWT authorization", "n": 3}'
   ```

4. **Получить топ-3 релевантных файла:**
   ```json
   {
     "results": [
       {"entry": "JWT + refresh tokens", "file": "user-profile/architecture-prefs.md", "score": 0.89},
       {"entry": "bcrypt для паролей", "file": "user-profile/coding-style.md", "score": 0.76}
     ]
   }
   ```

5. **Прочитать ТОЛЬКО релевантные файлы** (не весь D:\System\memory\)

### Пример использования

```
User: "/start добавить JWT авторизацию"

→ Phase 0: определить проект (e:\trenya-auth)
→ Phase 0.5: Khoj query "JWT authorization"
   ✅ Найдено: architecture-prefs.md, coding-style.md
   
→ Phase 1: Grill (с контекстом из Khoj)
   Opus: "Вижу ты предпочитаешь JWT + refresh. Redis или in-memory?"
```

### Fallback Logic

Если Khoj вернул `{"results": []}` (ничего не найдено):
- Читать `D:\System\memory\MEMORY.md` (index файл)
- Продолжить с Phase 1 как обычно

```

### Шаг 3: Обновить список фаз

1. **Найти в начале файла** список фаз (примерно строки 20-40)

2. **Найти:**
   ```markdown
   - Phase 0: context-setting (optional)
   - Phase 1: grilling
   ```

3. **Заменить на:**
   ```markdown
   - Phase 0: context-setting (optional)
   - Phase 0.5: khoj-context-retrieval (automatic)
   - Phase 1: grilling
   ```

## Критерии приёмки

- [ ] Phase 0.5 добавлена в `autopilot/SKILL.md`
- [ ] Phase 0.5 находится ПОСЛЕ Phase 0, ПЕРЕД Phase 1
- [ ] Алгоритм включает 5 шагов (check health → query → API call → parse results → read files)
- [ ] Есть fallback если Khoj недоступен или results пустые
- [ ] Пример использования включен (JWT case)
- [ ] Список фаз обновлён в начале файла
- [ ] curl команды валидны для Git Bash
- [ ] JSON примеры корректны

## Ограничения

- Не изменять Phase 0, Phase 1 или другие существующие фазы
- Только ВСТАВИТЬ Phase 0.5 между Phase 0 и Phase 1
- Не менять нумерацию других фаз
- Не добавлять зависимости или установки (только документация)

## Как закончить

1. Проверка:
   ```bash
   grep -n "Phase 0.5" .claude/skills/autopilot/SKILL.md
   ```
   Должна найтись строка с "Phase 0.5 — khoj-context-retrieval"

2. Коммит:
   ```bash
   git add .claude/skills/autopilot/SKILL.md
   git commit -m "T6: интегрировать Khoj API в autopilot Phase 0.5

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
   ```

3. Финальный ответ (максимум 6 строк):
   - Phase 0.5 добавлена между Phase 0 и Phase 1
   - Алгоритм: health check → query → API → parse → read files
   - Fallback: Khoj unavailable → skip Phase 0.5
   - Экономия: 90% токенов (50k → 5k)

---

**Команда запуска тестов:** нет (тестирование вручную после установки Khoj)

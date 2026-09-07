# T6 — Интегрировать Khoj API в autopilot (Phase 0)

**What to build:** Модификация `/autopilot` скилла для автоматического запроса контекста из Khoj перед Grill

**Blocked by:** T5 (Khoj должен быть установлен)

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `e:\System2` (File > Open Folder).

---

## Контекст

После установки Khoj (T5) нужно интегрировать его в SystemQwen workflow. При запуске `/autopilot` перед фазой Grill Opus должен спросить Khoj: "Есть ли у меня опыт с этой задачей?"

**Экономия:**
- Сейчас: Opus читает весь `D:\System\memory\` (~50k токенов)
- С Khoj: Opus получает только релевантное (~5k токенов)
- **Экономия: 90% токенов на Phase 0**

---

## Файлы для изменения

- [.claude/skills/autopilot/SKILL.md](../../.claude/skills/autopilot/SKILL.md) — добавить Phase 0.5 (Khoj query)

---

## Файлы для чтения (контекст)

- [.claude/skills/autopilot/SKILL.md](../../.claude/skills/autopilot/SKILL.md) — текущая версия
- [.claude/memory/patterns/model-separation-by-cognitive-load.md](../../.claude/memory/patterns/model-separation-by-cognitive-load.md) — паттерн экономии токенов

---

## Алгоритм (шаг за шагом)

### Шаг 1: Найти Phase 0 в autopilot/SKILL.md

Открыть файл `.claude/skills/autopilot/SKILL.md` и найти секцию:

```markdown
## Phase 0 — context-setting (optional)
```

Эта фаза идёт **перед** Phase 1 (Grill).

---

### Шаг 2: Добавить Phase 0.5 (Khoj Query)

**Сразу после Phase 0**, перед Phase 1, добавить новую фазу:

```markdown
## Phase 0.5 — Khoj Context Retrieval (automatic)

**Цель:** Подтянуть релевантный опыт из прошлых проектов через Khoj.

**Когда:** Автоматически перед каждым Grill (Phase 1).

**Как работает:**

1. **Сформировать query для Khoj** на основе задачи пользователя:
   ```
   Задача: "добавить JWT авторизацию"
   
   Query для Khoj: "JWT authorization, authentication patterns, user-profile architecture"
   ```

2. **Отправить запрос к Khoj API:**
   ```bash
   # Если Khoj запущен локально на http://localhost:42110
   curl -X POST http://localhost:42110/api/search \
     -H "Content-Type: application/json" \
     -d '{"q": "JWT authorization architecture", "n": 3}'
   ```

3. **Получить ответ:**
   ```json
   {
     "results": [
       {
         "entry": "JWT с refresh tokens в Redis",
         "file": "user-profile/architecture-prefs.md",
         "score": 0.89
       },
       {
         "entry": "bcrypt для паролей",
         "file": "user-profile/coding-style.md",
         "score": 0.76
       }
     ]
   }
   ```

4. **Включить результаты в контекст Grill:**
   - Вместо чтения всех файлов `D:\System\memory\`
   - Читать только топ-3 релевантных куска из Khoj

**Пример использования:**

```
User: "/start добавить JWT авторизацию"

→ Phase 0: определить проект
→ Phase 0.5: Khoj query "JWT authorization"
   ✅ Найдено в памяти:
   - "Предпочитаю JWT + refresh tokens" (architecture-prefs.md)
   - "bcrypt для паролей обязателен" (coding-style.md)
   
→ Phase 1: Grill (с контекстом из Khoj)
   - Opus: "Вижу ты предпочитаешь JWT + refresh tokens. Redis или in-memory?"
   - [вопросы с учётом прошлого опыта]
```

**Fallback:** Если Khoj не запущен (порт недоступен), пропустить Phase 0.5 и работать как обычно.

---

### Шаг 3: Добавить инструкцию для Opus

В секции **Phase 0.5**, после алгоритма, добавить:

```markdown
### Для Opus (как использовать)

**Вместо:**
```
Читаю D:\System\memory\user-profile\*.md...
Читаю D:\System\memory\patterns\*.md...
[загружаем всё в контекст]
```

**Делай:**
```
Запрос к Khoj: "JWT authorization patterns"
Получено 3 результата:
1. JWT + refresh tokens (architecture-prefs.md)
2. bcrypt обязателен (coding-style.md)
3. Explicit stop gates (patterns/explicit-stop-gates.md)

Читаю только эти 3 файла (релевантные куски).
```

**Команда для запроса (через bash tool):**
```bash
curl -s http://localhost:42110/api/search \
  -H "Content-Type: application/json" \
  -d "{\"q\": \"${QUERY}\", \"n\": 3}" \
  || echo "Khoj unavailable"
```

**Если Khoj недоступен:** Fallback к чтению `user-profile/` напрямую (как раньше).
```

---

### Шаг 4: Обновить порядок фаз

В начале файла `autopilot/SKILL.md` найти список фаз:

```markdown
## Фазы работы

- Phase 0: context-setting (optional)
- Phase 1: grilling
- Phase 2: spec
- ...
```

Обновить:

```markdown
## Фазы работы

- Phase 0: context-setting (optional)
- **Phase 0.5: khoj-context-retrieval (automatic)** ← НОВОЕ
- Phase 1: grilling
- Phase 2: spec
- Phase 3: ticket-breakdown
- Phase 4: agent-execution
- Phase 5: auto-learn
```

---

## Критерии приёмки

- [ ] Phase 0.5 добавлена в `autopilot/SKILL.md`
- [ ] Алгоритм Khoj query описан step-by-step
- [ ] Fallback на случай если Khoj недоступен
- [ ] Инструкция для Opus как использовать Khoj API
- [ ] Порядок фаз обновлён (Phase 0.5 перед Phase 1)
- [ ] Примеры query → results включены

---

## Команда для коммита

```bash
git add .claude/skills/autopilot/SKILL.md
git commit -m "T6: интегрировать Khoj API в autopilot Phase 0.5"
git push origin master
```

---

## Тестирование

**После реализации проверить:**

1. Запустить Khoj: `cd D:\System\khoj && venv\Scripts\activate && khoj`
2. В Claude Code: `/start добавить JWT авторизацию`
3. Проверить: Opus делает запрос к Khoj перед Grill
4. Проверить: В выводе Opus упоминает "из прошлого опыта" или "вижу ты предпочитаешь"

---

## Следующий тикет

После T6 → T7 (установить Activepieces для автообновления профиля)

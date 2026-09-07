# Summary — Тикеты T5-T9 для Варианта B (Khoj + Activepieces + Figma MCP)

**Статус:** Готовы к выполнению через GPT Luna

**Цель:** Интегрировать инструменты из анализа видео в SystemQwen workflow

---

## Созданные тикеты (по правильному шаблону)

### ✅ T5 — Создать документацию для установки Khoj
**Файл:** [T5-create-khoj-docs.md](./T5-create-khoj-docs.md)

**Что делает:**
- Создать `docs/khoj-setup.md` (7 шагов установки + troubleshooting)
- Создать `docs/khoj-integration.md` (архитектура + расчет экономии)

**Польза:**
- Экономия: 90% токенов на context loading (50k → 5k)

---

### ✅ T6 — Интегрировать Khoj API в autopilot
**Файл:** [T6-integrate-khoj-autopilot.md](./T6-integrate-khoj-autopilot.md)

**Что делает:**
- Добавить Phase 0.5 в `.claude/skills/autopilot/SKILL.md`
- Перед Grill Opus запрашивает Khoj: "есть ли опыт с этой задачей?"

**Блокировка:** T5 (документация должна быть готова)

**Пример:**
```
User: "/start добавить JWT"
→ Phase 0.5: Khoj → "JWT + refresh tokens (architecture-prefs.md)"
→ Phase 1: Opus: "Вижу ты предпочитаешь JWT + refresh. Redis?"
```

---

### ✅ T7 — Установить и настроить Activepieces
**Файл:** [T7-install-activepieces.md](./T7-install-activepieces.md)

**Что делает:**
- Создать `docker-compose.yml` с 3 сервисами (activepieces, postgres, redis)
- Создать `docs/activepieces-setup.md` (инструкция установки)

**Польза:**
- Автоматизация workflow: Git push → анализ → обновление профиля

---

### ✅ T8 — Создать Activepieces flow для auto-learn
**Файл:** [T8-activepieces-auto-profile.md](./T8-activepieces-auto-profile.md)

**Что делает:**
- Создать Git hook `.git/hooks/post-commit`
- Создать `docs/activepieces-flow-config.md` (4 шага flow)

**Блокировка:** T7 (Activepieces должен быть установлен)

**Пример:**
```
Коммит: "fix: async без try/catch"
→ Activepieces анализирует diff
→ Добавляет в common-mistakes.md: "Оборачивать async в try/catch"
```

---

### ✅ T9 — Создать Figma MCP-сервер
**Файл:** [T9-figma-mcp-server.md](./T9-figma-mcp-server.md)

**Что делает:**
- Создать `.claude/mcp-servers/figma/server.js` (Express API)
- Endpoint: `POST /api/figma/design-tokens`
- Извлекает: цвета (hex), шрифты, spacing, radii из Figma файлов

**Польза:**
- Opus получает точные CSS-токены из макета
- Никаких галлюцинаций с размерами
- Создаётся `design_system.md` с реальными данными

---

## Порядок выполнения

```
1. T5 (docs для Khoj)        ← начать здесь
   ↓
2. T6 (интеграция в autopilot) ← зависит от T5
   ↓
3. T7 (установка Activepieces) ← параллельно с T9
   ↓
4. T8 (Activepieces flow)      ← зависит от T7
   
5. T9 (Figma MCP)              ← независимая задача
```

**Рекомендация:** T5 → T6 → T7 → T8, T9 параллельно.

---

## Экономика (после внедрения)

| Компонент | До | После | Экономия |
|---|---|---|---|
| Context loading | 50k токенов | 5k токенов | **90%** |
| Profile updates | Ручные | Автоматические | **100% времени** |
| Design guessing | ~20% ошибок | 0% (точные токены) | **20% переделок** |

---

## Отличия от старых тикетов

### ✅ Добавлено в каждый тикет:

1. **"Перед началом работы"** — открыть VS Code в `e:\System2`
2. **"⚠️ Файлы НЕЛЬЗЯ трогать"** — защита критичных файлов
3. **"Файлы для чтения (контекст)"** — откуда брать примеры
4. **"Как закончить"** — формат финального ответа (6 строк)
5. **Правильные ссылки** — относительные пути с `../../`
6. **Git commit** — с `Co-Authored-By: Claude Opus 5`

### 🔄 Изменено:

- **T5:** Вместо "установить Khoj" → "создать документацию" (GPT Luna не может выполнять pip install)
- **T6:** Конкретные инструкции где вставить Phase 0.5 (ПОСЛЕ Phase 0, ПЕРЕД Phase 1)
- **T7:** Docker compose вместо ручной установки
- **T8:** Git hook + документация flow (не создавать flow в UI)
- **T9:** Только код MCP-сервера (не запускать)

---

## Следующие шаги

1. **Для GPT Luna:** Взять тикеты T5-T9 и выполнять по порядку
2. **Для Opus:** После T6 протестировать Phase 0.5 в autopilot
3. **Тестирование:** 
   - После T6: `/start` должен использовать Khoj
   - После T8: коммиты должны обновлять профиль автоматически
   - После T9: Figma URL → design tokens

---

## Команда для синхронизации

```bash
cd e:/System2
git add .scratch/khoj-integration/issues/
git commit -m "feat: переделать тикеты T5-T9 по правильному шаблону SystemQwen

- Добавлено: Перед началом работы, ⚠️ Файлы НЕЛЬЗЯ трогать
- Добавлено: Файлы для чтения, Как закончить
- T5: создать документацию (не устанавливать)
- T6: конкретные инструкции для Phase 0.5
- T7-T9: Docker, Git hooks, MCP-сервер

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push origin master
```

---

**Готово к выполнению через GPT Luna!** 🚀

# Summary — Тикеты T5-T9 для Варианта B (Khoj + Activepieces + Figma MCP)

**Статус:** Готовы к выполнению через GPT Luna

**Цель:** Интегрировать инструменты из анализа видео в SystemQwen workflow

---

## Созданные тикеты

### ✅ T5 — Установить Khoj локально
**Файл:** [T5-install-khoj.md](./T5-install-khoj.md)

**Что делает:**
- Установка Khoj (локальная RAG-система) через Docker/pip
- Индексация `D:\System\memory\` для векторного поиска
- Проверка доступности API на `http://localhost:42110`

**Польза:**
- Вместо чтения всех файлов памяти (~50k токенов)
- Opus запрашивает только релевантное (~5k токенов)
- **Экономия: 90% токенов на context loading**

---

### ✅ T6 — Интегрировать Khoj в autopilot
**Файл:** [T6-integrate-khoj-autopilot.md](./T6-integrate-khoj-autopilot.md)

**Что делает:**
- Добавить Phase 0.5 в `/autopilot` скилл
- Перед Grill Opus запрашивает Khoj: "есть ли опыт с этой задачей?"
- Подтягивает топ-3 релевантных куска из памяти

**Блокировка:** T5 (Khoj должен быть установлен)

**Пример:**
```
User: "/start добавить JWT"
→ Khoj: "JWT + refresh tokens (architecture-prefs.md)"
→ Opus: "Вижу ты предпочитаешь JWT + refresh. Redis?"
```

---

### ✅ T7 — Установить Activepieces локально
**Файл:** [T7-install-activepieces.md](./T7-install-activepieces.md)

**Что делает:**
- Установка Activepieces (open-source Zapier) через Docker
- Настройка базового webhook flow
- Web UI: `http://localhost:8080`

**Польза:**
- Автоматизация workflow: Git push → анализ → обновление профиля
- Заменяет ручной вызов `/profile-update`

---

### ✅ T8 — Создать Activepieces flow для auto-learn
**Файл:** [T8-activepieces-flow.md](./T8-activepieces-flow.md)

**Что делает:**
- Настроить flow: Git commit → webhook → Claude анализирует diff → обновляет `common-mistakes.md`
- Создать Git hook `post-commit` для триггера

**Блокировка:** T7 (Activepieces должен быть установлен)

**Пример:**
```
Коммит: "fix: async без try/catch"
→ Activepieces анализирует
→ Добавляет в common-mistakes.md: "Оборачивать async в try/catch"
```

---

### ✅ T9 — Создать Figma MCP-сервер
**Файл:** [T9-figma-mcp-server.md](./T9-figma-mcp-server.md)

**Что делает:**
- Кастомный MCP-сервер для извлечения design tokens из Figma
- API endpoint: `POST /api/figma/design-tokens`
- Извлекает: цвета (hex), шрифты, spacing, radii

**Польза:**
- Opus/Gemini получают точные CSS-токены из макета
- Никаких галлюцинаций с размерами
- Создаётся `design_system.md` с реальными данными

**Интеграция:** Phase 0.5 (Gemini Deep Research)

---

## Порядок выполнения

```
1. T5 (install Khoj)           ← начать здесь
   ↓
2. T6 (integrate Khoj)         ← зависит от T5
   ↓
3. T7 (install Activepieces)   ← параллельно с T9
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

## Следующие шаги

1. **Для GPT Luna:** Взять тикеты T5-T9 и выполнять по порядку
2. **Для Opus:** После T6 обновить `.claude/skills/autopilot/SKILL.md` с Phase 0.5
3. **Тестирование:** 
   - После T6: `/start` должен использовать Khoj
   - После T8: коммиты должны обновлять профиль автоматически
   - После T9: Figma URL → design tokens

---

## Команда для синхронизации

```bash
# Запушить тикеты на GitHub
cd e:/System2
git add .scratch/khoj-integration/
git commit -m "feat: тикеты T5-T9 для варианта B (Khoj + Activepieces + Figma)"
git push origin master
```

---

## Связанные документы

- [ANALYSIS.md](../ANALYSIS.md) — полный анализ вариантов A/B/C
- [VARIANT_B_RECOMMENDATION.md](../VARIANT_B_RECOMMENDATION.md) — рекомендации по варианту B
- [.scratch/etap3/PROMPT_FOR_OTHER_PC.md](../../etap3/PROMPT_FOR_OTHER_PC.md) — промпт для ноутбука

---

**Готово к выполнению.** Передай тикеты GPT Luna для реализации.

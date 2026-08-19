# T4 — Интегрировать SystemQwen в D:\System (CLAUDE.md, autopilot)

**What to build:** Интегрировать документацию и workflow SystemQwen в основную систему D:\System. Обновить CLAUDE.md и autopilot, чтобы они знали про 3-фазный режим через Qwen Code расширение.

**Blocked by:** T1, T2, T3 (документация System2 должна быть готова)

**Status:** ready-for-agent

## Контекст

**Файлы для изменения:**
- [D:\System\CLAUDE.md](D:\System\CLAUDE.md) — основная система
- [D:\System\.claude\skills\autopilot\SKILL.md](D:\System\.claude\skills\autopilot\SKILL.md) — скилл автопилота
- [D:\System\USAGE.md](D:\System\USAGE.md) — документация по использованию

`D:\System` — основная система с Autopilot, Pocock, skill-forge. Сейчас autopilot использует subagent-pipeline для параллельной реализации.

`D:\System2` — новая документация SystemQwen с 3-фазным workflow через Qwen Code расширение.

Нужно связать их: чтобы при вызове `/start` или `/autopilot` система знала про режим работы с Qwen и останавливалась после создания тикетов.

**Смежные файлы для понимания контекста:**
- [D:\System2\README.md](D:\System2\README.md) — документация SystemQwen (финальная версия после T1-T3)
- [D:\System2\OPUS.md](D:\System2\OPUS.md) — инструкция для Opus в SystemQwen режиме
- [D:\System2\QWEN.md](D:\System2\QWEN.md) — инструкция для Qwen через расширение
- [D:\System\.claude\skills\subagent-pipeline\SKILL.md](D:\System\.claude\skills\subagent-pipeline\SKILL.md) — текущий пайплайн (для понимания альтернативы)

## Что сделать

- [ ] Добавить в `D:\System\CLAUDE.md` упоминание про SystemQwen режим
- [ ] Обновить `D:\System\.claude\skills\autopilot\SKILL.md` — добавить режим "systemqwen" с остановкой после тикетов
- [ ] Добавить ссылку на `D:\System2` в основную документацию
- [ ] Опционально: создать skill `/systemqwen` для явного включения этого режима

## Файлы для изменения

- `D:\System\CLAUDE.md` — секция "Как работаем"
- `D:\System\.claude\skills\autopilot\SKILL.md` — добавить режим/параметр
- Возможно: `D:\System\USAGE.md` — упомянуть SystemQwen

## Алгоритм (шаг за шагом)

1. **В `D:\System\CLAUDE.md` (строки ~7-12), секция "## Как работаем":**
   - После пункта про Autopilot добавить:
   ```markdown
   - **Экономичный режим (SystemQwen)**: Opus создаёт детальные тикеты → останавливается → Qwen реализует через VS Code расширение → Opus проверяет. Документация: `D:\System2\README.md`.
   ```

2. **В `D:\System\.claude\skills\autopilot\SKILL.md`, добавить новый параметр в начало:**
   ```markdown
   ## Параметры (опционально)

   - `--mode=systemqwen` — экономичный режим: создать тикеты и остановиться, не реализовывать самому
   ```

3. **В `D:\System\.claude\skills\autopilot\SKILL.md`, в "## Main Phases", после Phase 3 (tickets):**
   - Добавить проверку режима:
   ```markdown
   ### Phase 3.5: Проверка режима (systemqwen)

   Если параметр `--mode=systemqwen`:
   
   ```
   ✅ Тикеты готовы: T1, T2, T3
   Сохранены: `.scratch/[project]/issues/`
   
   Передавай T1 в Qwen Code (VS Code расширение).
   Документация: D:\System2\QWEN.md
   ```
   
   **🛑 СТОП.** Не запускай Phase 4 (Implementation). Жди результата от Qwen.
   
   ---
   
   Если режим обычный (без `--mode=systemqwen`), продолжай Phase 4.
   ```

4. **В `D:\System\.claude\skills\autopilot\SKILL.md`, Phase 5 (Review):**
   - Добавить секцию для проверки результата Qwen:
   ```markdown
   ### Для режима systemqwen
   
   Пользователь передаст результат от Qwen после реализации тикета.
   
   Проверь:
   1. Прочитай ответ Qwen
   2. `git diff` для проверки изменений
   3. Результат тестов
   
   Ответ:
   - ✅ "T[N] проверен: [вывод]. Передавай T[N+1] в Qwen."
   - ⚠️ "T[N]: нужна доработка — [замечания]"
   
   Повторяй для каждого тикета.
   ```

5. **Опционально: создать `D:\System\.claude\skills\systemqwen\SKILL.md`:**
   ```markdown
   # systemqwen — Экономичный режим через Qwen Code расширение

   ## Что это

   Альтернатива subagent-pipeline: вместо параллельных агентов используем Qwen через VS Code расширение. Opus создаёт детальные тикеты → Qwen реализует локально → Opus проверяет.

   **Экономия:** ~5-7× по сравнению с чистым Sonnet.

   ## Когда использовать

   - Когда хочешь контроль на каждом шаге (явные остановки)
   - Когда проект большой и нужна экономия токенов
   - Когда Qwen через расширение видит весь проект локально

   ## Как работает

   1. Запускаешь: `/systemqwen [задача]`
   2. Opus делает grill → spec → тикеты
   3. **🛑 СТОП:** "Передавай T1 в Qwen"
   4. Ты даёшь тикет Qwen через VS Code
   5. Qwen реализует, ты возвращаешь результат Opus
   6. Opus проверяет → даёт T2
   7. Цикл до конца

   ## Документация

   Полное описание: `D:\System2\README.md`
   - Инструкция для Opus: `D:\System2\OPUS.md`
   - Инструкция для Qwen: `D:\System2\QWEN.md`
   - Настройка Qwen: `D:\System2\QWEN_VSCODE_SETUP.md`

   ## Реализация

   Вызов: просто запускаешь `autopilot --mode=systemqwen [задача]`
   ```

6. **В `D:\System\USAGE.md` (если есть секция про режимы), добавить:**
   ```markdown
   ## Экономичный режим (SystemQwen)

   Для больших проектов с контролем на каждом шаге:
   ```bash
   /start [задача]
   # или явно:
   /autopilot --mode=systemqwen [задача]
   ```

   Opus создаёт тикеты → ты передаёшь Qwen через VS Code → Opus проверяет.

   Документация: `D:\System2\README.md`
   ```

## Тесты должны проверить

- `D:\System\CLAUDE.md` упоминает SystemQwen режим
- `autopilot` знает про параметр `--mode=systemqwen` и останавливается после тикетов
- Ссылки на `D:\System2` документацию присутствуют
- Если создан skill `/systemqwen` — он запускается и работает как алиас для `autopilot --mode=systemqwen`

## Как закончить

1. Проверь, что все изменённые файлы связаны логично: CLAUDE.md → autopilot → System2

2. Коммит (в обоих репозиториях):
   ```bash
   cd D:\System
   git add CLAUDE.md .claude/skills/autopilot/SKILL.md USAGE.md
   git commit -m "T4: интеграция SystemQwen режима с остановками"
   
   # Если создан новый skill:
   cd D:\System
   git add .claude/skills/systemqwen/
   git commit -m "T4: добавлен skill /systemqwen"
   ```

3. Финальный ответ (максимум 6 строк):
   - Какие файлы обновлены в D:\System
   - Как теперь включить SystemQwen режим
   - Ссылки на документацию D:\System2
   - Создан ли отдельный skill /systemqwen

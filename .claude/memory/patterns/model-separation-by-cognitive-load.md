---
status: observation
category: patterns
scope: user
source: исторический анализ, 2026-09-08
evidence: Это гипотеза распределения ролей; фактический контракт теперь в docs/system-workflow.md
confidence: 0.5
---

# Model Separation by Cognitive Load

**Дата:** 2026-08-17  
**Контекст:** SystemQwen (D:\System2) + Autopilot (D:\System) + SAIT philosophy  
**Источник:** Proven token economy pattern

## Описание

Разделение работы по моделям на основе когнитивной нагрузки: **Opus думает (~20-40% токенов), Sonnet/Qwen реализует (~60-80% токенов)**. Дорогая модель для рассуждений, дешёвая для выполнения.

## Детали

**Opus ($15/1M output tokens):**
- Grill (интервью с пользователем)
- Spec (детальная спецификация)
- Tickets (алгоритмы реализации с примерами кода)
- Review (проверка результата)
- Synthesis (объединение результатов от субагентов)

**Sonnet/Qwen ($3/1M output tokens):**
- Implementation (написание кода по алгоритму из тикета)
- Bulk I/O (чтение файлов, grep, поиск)
- Testing (прогон тестов)
- Refactoring (по явной инструкции)

**Haiku ($0.25/1M output tokens):**
- Trivial reads (проверка существования файла)
- Quick searches (найти импорт)
- Status checks (git status, npm list)

## Применимость

✅ **Opus нужен когда:**
- Неопределённость (что делать?)
- Принятие решений (как лучше?)
- Сложное рассуждение (почему именно так?)
- Синтез из множества источников
- Ревью чужого кода

✅ **Sonnet достаточен когда:**
- Задача определена (есть алгоритм)
- Нужна реализация (писать код)
- Bulk операции (прочитать 50 файлов)
- Рутинные задачи (тесты, lint)

✅ **Haiku достаточен когда:**
- Trivial операции (ls, grep, cat)
- Быстрые проверки
- Статус команды

## Экономика

### Пример: Добавить JWT авторизацию

**Вариант A: Только Opus**
- Grill: 10k tokens → $0.15
- Spec: 15k tokens → $0.23
- Implement: 80k tokens → $1.20
- Review: 10k tokens → $0.15
- **ИТОГО: ~$1.73**

**Вариант B: Opus + Sonnet (model separation)**
- Opus grill: 10k tokens → $0.15
- Opus spec: 15k tokens → $0.23
- Sonnet implement: 80k tokens → $0.24
- Opus review: 10k tokens → $0.15
- **ИТОГО: ~$0.77**

**Экономия: 55% (~$1)**

### Пример: SystemQwen на 4 тикета

- Opus: grill + spec + tickets (20k) → $0.30
- Qwen: T1-T4 implementation (120k) → $0.15
- Opus: review T1-T4 (15k) → $0.23
- **ИТОГО: ~$0.68 (vs ~$2.50 чистый Opus)**

**Экономия: 73% (~$1.82)**

## Почему работает

**Frontier модели умные:**
- Opus 4.8 может создать спеку для Sonnet
- Sonnet может выполнить спеку от Opus
- Не нужен Opus для выполнения — Sonnet достаточен

**Когнитивная нагрузка ≠ объём работы:**
- Написать 1000 строк кода по алгоритму — низкая нагрузка
- Придумать алгоритм — высокая нагрузка
- Платить $15/1M за низкую нагрузку = слив денег

**Качество не страдает:**
- Opus создаёт детальные алгоритмы в тикетах
- Sonnet следует алгоритму step-by-step
- Opus проверяет результат
- = Качество как у чистого Opus, цена как у Sonnet

## Gotchas

- **Алгоритм должен быть ДЕТАЛЬНЫМ** — иначе Sonnet додумывает неправильно
- **Примеры кода в тикете** — показать Sonnet стиль и паттерны
- **Ссылки на файлы обязательны** — [file.ts:42](src/file.ts#L42) для контекста
- **Review обязателен** — Opus проверяет что Sonnet не отклонился

## Примеры

### D:\System2 (SystemQwen)
```markdown
# Ticket T3: Implement /start command

## Algorithm
1. Read .claude/skills/ to get list of available skills
2. Parse user input to extract task description
3. Match task keywords to skill descriptions:
   - "build" → autopilot
   - "unclear" → grill-me
   - "research" → research
4. Show recommendation with explanation
5. Wait for confirmation
6. Invoke skill via Skill tool

## Example Code
\`\`\`typescript
// src/router.ts
async function routeTask(input: string) {
  const skills = await loadSkills('.claude/skills/');
  const match = matchKeywords(input, skills);
  return match;
}
\`\`\`

## Files
- [src/router.ts](src/router.ts) — создать маршрутизатор
- [.claude/skills/start/SKILL.md](.claude/skills/start/SKILL.md) — обновить документацию
```

Sonnet получает это → реализует точно по алгоритму → Opus проверяет.

### D:\Sait (React Portfolio)
```markdown
# Ticket: Add custom analytics tracking

## Algorithm
1. Create analytics.ts with fire-and-forget client
2. Hash IP with SHA-256 + salt before sending
3. Batch events (up to 20) before flush
4. Always return 204 (even on error)
5. Track: visit, section_view, scroll_depth, cta_click

## Privacy
- Never store raw IP
- Hash = SHA-256(IP + salt)
- Minimal data (no fingerprinting)
```

Sonnet реализует privacy-first подход по спеке от Opus.

## Связанные паттерны

- [[sequential-subagent-pipeline]] — используется вместе с model separation
- [[explicit-stop-gates]] — Opus проверяет результат Sonnet на каждом STOP
- [[ticket-driven-development]] — тикеты = интерфейс между Opus и Sonnet

---
status: observation
category: user-profile
scope: user
source: исторический профиль workflow, проверено 2026-09-08
evidence: Паттерны работы сохранены; прямое подтверждение конкретного предпочтения требуется при обновлении
confidence: 0.6
---

# Work Patterns

> PROFILE-01, сверка 2026-10-22: ниже observation из анализа 2026-09-08, не анкета
> подтверждённых предпочтений. Проектные примеры/числа не являются текущими фактами
> пользователя. Подтверждения и канон — [MEMORY](../MEMORY.md#user-profile).

## Project Memory System (FACTS/DECISIONS/CLAUDE)

### Three-File Pattern

| File | Content | When to Read | When to Write |
|------|---------|--------------|---------------|
| **FACTS.md** | Data, numbers, test results, project state | FIRST, before planning | When you discover/measure new data |
| **DECISIONS.md** | What was decided and WHY | Before asking repeated questions | When architectural choice is made |
| **CLAUDE.md** | Instructions for AI agents | Session start | When rules/workflow changes |

### FACTS.md Pattern

**Purpose**: Single source of truth for project data (NOT instructions)

**Structure**:
```markdown
# FACTS.md

## System Performance
- API latency: avg 2.1s (measured 2026-08-15)
- Database size: 45GB
- Peak traffic: 10k req/min

## Test Results
Test run 2026-08-14:
- Unit tests: 342 passed, 3 failed
- Integration tests: 89 passed, 1 skipped

## Dependencies
- Node.js: 18.16.0
- PostgreSQL: 14.2
- Redis: 7.0.4
```

**Key principle**: Facts, not opinions. Numbers, not plans.

**Example from Bot Stacy** (337 lines of trading data):
```markdown
## Замеры сделок stacybot-impuls (актуально)
Период: 28.05–07.06.2024

Убыточные сделки:
1. 28.05, 14:15 UTC — SELL → -$18 — импульс вниз, но откат вверх
2. 29.05, 09:42 UTC — BUY → -$22 — ложный пробой вверх
...

## Backtest Results (D:\dev trading bot)
Period: 14 months
Initial: $200
Final: ~$290K
Strategy: momentum/trend-following scalper XAUUSD
```

### DECISIONS.md Pattern

**Purpose**: Log architectural decisions with rationale

**Structure**:
```markdown
# DECISIONS.md

## 2026-08-15 (АКТУАЛЬНОЕ) — Decision Title

**Решение:** What was decided (concrete action/choice)

**Почему:** Why this decision was made (reference FACTS.md data)

**How to apply:** When/where this guidance applies

---

## 2026-07-20 — Previous Decision (superseded)
...
```

**Key principle**: Every decision references FACTS.md for data backing

**Example from Bot Stacy**:
```markdown
## 2026-06-08 (АКТУАЛЬНОЕ) — Стратегия «правильного» бота = momentum

**Решение:** строить **momentum/trend-following скальпер** по XAUUSD

**Почему:** замеры сделок stacybot-impuls (FACTS.md) показали:
- 60% прибыльных сделок = ловим продолжение движения
- убытки = контртренд и ложные пробои

**How to apply:** Only trade in direction of established momentum, ignore counter-trend signals
```

**Pattern**: FACTS.md (data) ← DECISIONS.md (rationale)

### CLAUDE.md Pattern

**Purpose**: Instructions for AI agents working in project

**Structure**:
```markdown
# CLAUDE.md — [Project Name]

Brief project description

## Rules
1. Rule one
2. Rule two

## Architecture
[Key architectural decisions]

## Workflow
[Specific workflow for this project]

## Constraints
[Hard constraints, security requirements]
```

**Key principle**: Instructions, not data. Read at session start.

**When to update**:
- New rule/convention established
- Workflow changes
- Architecture evolves
- New constraint added

---

## Ticket Workflow (GRILL → SPEC → TICKETS)

> Старый полный цикл не применяется к каждому запросу: готовый тикет и продолжение
> сохраняют этап, start только рекомендует маршрут. См. [workflow](../../../docs/system-workflow.md#маршруты-задач).

### Phase 1: GRILL (Requirements Elicitation)

**Goal**: Understand what to build

**Process**:
1. Ask clarifying questions
2. Read FACTS.md (current state)
3. Read DECISIONS.md (past rationale)
4. Identify unknowns
5. Scan relevant code files
6. Clarify success criteria

**Output**: Clear understanding of requirements

**Token strategy**: Read broadly here (50-100k tokens OK) — saves tokens later

### Phase 2: SPEC (Specification)

**Goal**: Document what will be built

**Structure**:
```markdown
# SPEC — [Task Name]

## Context
[Why we're doing this]

## Requirements
- Functional requirement 1
- Functional requirement 2
- Non-functional (performance, security)

## Technical Approach
[High-level solution design]

## Files Affected
- [path/file1.ts](path/file1.ts) — what changes
- [path/file2.ts](path/file2.ts) — what changes

## Success Criteria
- [ ] Criterion 1 (measurable)
- [ ] Criterion 2 (testable)

## Out of Scope
[What we're NOT doing]
```

**Key principle**: SPEC fixes requirements, references specific files

**Token cost**: ~2000-3000 tokens

### Phase 3: TICKETS (Detailed Implementation Steps)

**Goal**: Create step-by-step algorithms for executor (Qwen)

> Следующая ссылка сохранена как историческое имя; текущий [шаблон задания](../../../TICKET_TEMPLATE.md).

```markdown
**Ticket Template** (from [TICKET_TEMPLATE.md](../../TICKET_TEMPLATE.md)):
```
```markdown
# T[N] — [Task Title]

**Перед началом работы:**
Открой VS Code в папке `[absolute/path/to/project]` (File > Open Folder).

## Файлы для изменения
- [path/file.js](path/file.js) — what to change
- [path/test.js](path/test.js) — what tests to add

## Алгоритм (шаг за шагом)

### 1. В `file.js` (строки 42-56):
- Find function `processData()`
- Replace line 48:
  ```javascript
  // Old:
  const result = data.map(x => x * 2);

  // New:
  const result = data.map(x => x * 2).filter(x => x > 0);
  ```

### 2. Добавь тест в `test.js`:
```javascript
test('processData filters negative results', () => {
  const input = [-5, 3, -2, 7];
  const output = processData(input);
  expect(output).toEqual([6, 14]);
});
```

### 3. Запусти тесты:
```bash
npm test -- test.js
```

### 4. Сделай коммит:
```bash
git add path/file.js path/test.js
git commit -m "fix(core): filter negative values in processData

- add filter step after map
- add test for negative input handling"
```

## Критерии приёмки
- ✅ Function filters negative values
- ✅ Test passes
- ✅ No other functions changed
- ✅ Commit follows Conventional Commits format
```

**Key principles**:

> «One ticket = one file» ниже не ограничение текущего задания; набор файлов определяется
> результатом по [шаблону](../../../TICKET_TEMPLATE.md). Подробность не требует готового кода в тикете.
- **Exact file paths** with markdown links `[path](path)`
- **Exact line numbers** where possible
- **Step-by-step algorithm** (no exploration needed)
- **Test command** included
- **Commit command** with message
- **One ticket = one file = one commit**

**Token economics**:

> 40,000/650 и 60× ниже — unverified на 2026-10-22: применимого подтверждённого замера нет.
- Vague ticket: "Fix data processing" → Qwen reads entire project → 40,000 tokens
- Precise ticket: "In `file.js:48` add `.filter(x => x > 0)`" → Qwen reads one file → 650 tokens
- **60× difference**

### Workflow Cycle

> Обязательные модели и «одна остановка» ниже заменены [выбором ролей](../../../.system2/decision-journal/abda2410f436b8bc1170e2d7.json)
> и [гейтами блока](../../../docs/system-workflow.md#фазы-и-гейты), не новой схемой трёх проверяющих.

```
Opus: GRILL → SPEC → T1, T2, T3, T4
  ↓ 🛑 STOP
User: передаёт T1 в Qwen
  ↓
Qwen: implements T1 → commit → tests
  ↓ 🛑 STOP
User: передаёт результат T1 в Opus
  ↓
Opus: reviews T1 (git diff, tests)
  ↓ 🛑 STOP: ✅ принят OR ⚠️ доработать
[Repeat for T2, T3, T4]
```

**Critical rule**: "Один тикет = один коммит = одна остановка"

---

## File Reference Pattern (Markdown Links)

### Why Markdown Links

VS Code extension makes markdown links **clickable**:
- `[src/file.js](src/file.js)` — ✅ click to open
- `` `src/file.js` `` — ❌ not clickable

### Syntax

**Basic file**:
```markdown
[path/to/file.js](path/to/file.js)
```

**Specific line**:
```markdown
[file.js:42](file.js#L42)
```

**Line range**:
```markdown
[file.js:42-51](file.js#L42-L51)
```

**Folder**:
```markdown
[src/utils/](src/utils/)
```

### Where to Use

- ✅ All file references in tickets
- ✅ All file references in SPEC
- ✅ Documentation files
- ✅ DECISIONS.md when referencing code
- ❌ NOT for inline code examples (use backticks for actual code)

**Example in ticket**:
```markdown
## Файлы для изменения
- [src/api/client.ts](src/api/client.ts) — add timeout parameter
- [src/api/client.test.ts](src/api/client.test.ts) — add timeout tests

## Алгоритм
1. В [src/api/client.ts:67](src/api/client.ts#L67):
   - Add `timeout: number = 30000` parameter
```

---

## Skills Usage Pattern

> Таблица — исторические примеры, не подтверждение slash-discovery или полной автономии.
> Применять канонические [start](../../skills/start/SKILL.md) и [workflow](../../../docs/system-workflow.md).

### When to Use Skills

User types `/<skill-name>` to invoke:

| Situation | Skill to Use |
|-----------|--------------|
| Starting any task | `/start` — routing skill |
| Economical multi-ticket implementation | `/systemqwen` — three-phase workflow |
| Autonomous full implementation | `/autopilot` — full autonomy |
| Need to understand requirements | `/grill-me` — requirements elicitation |
| Code review needed | `/code-review` — review workflow |
| Create new skill from pattern | `/skill-forge` — skill generation |
| Save memory after task | `/auto-learn` — memory system |
| Large task decomposition | `/wayfinder` — task breakdown |
| Unclear task scope | `/start` first — analyzes and routes |

### Skill Discovery

Before creating new skill:
1. Check `.claude/skills/` directory
2. List existing skills: `ls .claude/skills/`
3. Read similar skill to reuse pattern
4. Use `/skill-forge` if repeated 2-3 times

### Skill Structure

```
.claude/skills/skill-name/
└── SKILL.md
```

**SKILL.md format**:
```markdown
---
name: skill-name
description: One-line description
disable-model-invocation: false
---

# Skill Title

## Instructions
[Step-by-step what to do]

## Examples
[Usage examples]
```

---

## Session Start Checklist

When starting work in a project:

> Список — архивный пример, пути внутри не адреса текущей System2.
> Сегодня читать [CLAUDE](../../../CLAUDE.md), HANDOFF выбранного проекта и
> источники по [workflow](../../../docs/system-workflow.md#контекст-и-retrieval).

```markdown
1. ✅ Read [CLAUDE.md](../../CLAUDE.md) — project instructions
2. ✅ Read [FACTS.md](../../FACTS.md) — current state data (if exists)
3. ✅ Read [DECISIONS.md](../../DECISIONS.md) — past decisions (if exists)
4. ✅ Check `.claude/` structure — available agents/skills
5. ✅ Run `git status` — understand current state
6. ✅ Identify task type → use `/start` if unclear
```

---

## Review Workflow

> Приёмщик независим от автора. Проверяется разрешённый блок и достаточные evidence;
> прежнее требование заново гонять проверки каждого тикета не универсально:
> [приёмка и доказательства](../../../docs/system-workflow.md#приёмка-и-доказательства).

### When Reviewing Tickets (Opus Role)

**Check**:
1. `git diff` — verify only specified files changed
2. `git log -1` — verify commit message format
3. Run tests — verify they pass
4. Read changed code — verify matches ticket algorithm
5. Check edge cases — verify requirements met

**Decision**:
- ✅ **Accept**: "✅ T[N] принят, передавай T[N+1] в Qwen"
- ⚠️ **Reject**: "⚠️ Нужна доработка: [specific issues]"

**Never**:
- Don't accept without running tests
- Don't skip git diff check
- Don't move to next ticket if current failed review

---

## Token Budget Awareness

> Все цены, токены, 60× и 5–7× ниже — unverified на 2026-10-22. Без сопоставимого
> первичного измерения их нельзя использовать как обещание выгоды или основание выбора модели.

### Cost of Operations

| Operation | Tokens | When |
|-----------|--------|------|
| Read one file (200 lines) | ~1000 | During GRILL |
| Write SPEC | ~2000-3000 | After GRILL |
| Write one ticket | ~500-1000 | After SPEC |
| Qwen reads one file | ~600-800 | During implementation |
| Qwen implements change | ~1500-2000 | During implementation |
| Review (git diff + reasoning) | ~2000-3000 | After implementation |

### Optimization Strategy

**Spend tokens on planning** (Opus):
- Read broadly during GRILL: 50-100k tokens OK
- Write detailed tickets: 500-1000 tokens each
- Specify exact files and line numbers

**Save tokens on implementation** (Qwen):
- Precise tickets → Qwen reads only specified files
- 40,000 tokens → 650 tokens (60× savings)

**Total economics**:
- Planning (Opus): ~15-20k tokens (~$0.25)
- Implementation (Qwen): ~120-150k tokens (~$0.15)
- Review (Opus): ~10-15k tokens (~$0.15)
- **Total: ~$0.55 vs ~$2-3 pure Sonnet (5-7× savings)**

---

## Multi-PC Workflow

> Число проектов/ПК, структура и пути ниже — история примеров, не актуальный профиль.
> Канонический корень берётся из локальной привязки; см. [контракт](../../../docs/memory-contract.md).

### Context

**From laptop analysis:**
- Work across **4+ active projects** simultaneously
- Development on **2+ PCs** (desktop E:\ + laptop D:\)
- Frequent transfers via `.tar.gz` archives
- Transfer/handoff готовность обязательна

### Organization

**Each project must have:**
- `CLAUDE.md` — instructions for AI
- `FACTS.md` — project data
- `DECISIONS.md` — architectural decisions
- `.claude/skills/` — custom skills
- `issues/` — ticket tracking
- `_transfer/` — export-ready archives

### Transfer Pattern

**Before archive:**
1. Update `HANDOFF.md` with current status
2. List open tickets and progress
3. Document "what's done, what's next"
4. Create `.tar.gz` in `_transfer/`

**Example:**
```bash
# Create transfer archive
tar -czf _transfer/project-2026-08-17.tar.gz \
  .claude/ \
  src/ \
  CLAUDE.md \
  FACTS.md \
  DECISIONS.md \
  HANDOFF.md \
  issues/
```

**After transfer:**
1. Extract on target PC
2. Read `HANDOFF.md` first
3. Check `git status`
4. Continue from documented state

### Sync Strategy

**Active development:**
- Desktop (E:\) — primary development
- Laptop (D:\) — mobile work, experimentation

**Memory location:**
- Desktop: `E:\System2\memory/`
- Laptop: `D:\System\memory/` or `D:\System2\memory/`
- **Important:** одна система активна, другая в архиве

---

## Rhythm & Habits

### Working Style

**From project analysis:**
- **Documentation-first** (10+ MD files per project)
- **Ticket-driven** (T1, T2, T3, T4...)
- **Iterative refinement** (прототип + итерации)
- **Единая точка входа:** `/start`

### SystemQwen Mode (preferred)

> «Preferred» и старый цикл Opus/Qwen ниже не новый выбор пользователя. Модели/роли
> назначает пользователь по [подтверждённому решению](../../../.system2/decision-journal/abda2410f436b8bc1170e2d7.json).

**Standard workflow:**
1. `/start [задача]`
2. Opus: grill → spec → tickets → 🛑 СТОП
3. Qwen: T1 → коммит → 🛑 СТОП
4. Opus: review T1 → ✅ или ⚠️
5. Повторить 3-4 для T2, T3, T4...

**When to use:**
- Multi-step tasks (3+ tickets)
- Need token optimization
- Clear requirements
- Implementation can be algorithmic

### Auto-learn Обязателен

> Не обязанность добавлять память/skill после каждой задачи: новое знание отделяется
> от повторов, без нового — no-op по [журналу](../../../docs/decision-journal.md).

**After ЛЮБОЙ task:**
- "Что запомнить навсегда?"
- Document patterns in memory
- Create skill if repeated 2-3 times

**Memory growth pattern:**
- user/ — who you are, preferences
- feedback/ — corrections and confirmations
- project/ — ongoing work, deadlines
- reference/ — external resources
- patterns/ — reusable solutions

---

## Project Evolution

> Выводы о тренде пользователя и 7×/15×/40% ниже остаются observation/unverified,
> не подтверждёнными предпочтениями или применимыми измерениями.

**Traced through projects:**

```
SAIT (lean philosophy, spec-first)
  ↓
D:\System (Autopilot + 46 skills, token optimization)
  ↓
Documents (full stack + Pocock methodology)
  ↓
D:\System2 (SystemQwen + explicit stops + model separation)
```

**Тренд:**
- От автономности к контролю
- От параллелизма к качеству
- От сложности к простоте
- От дорогих моделей к экономичным

**Key learning:**
- Agent Teams ~7× дороже → избегать
- Мульти-агент ~15× дороже → только для read-only
- Sequential pipeline + /clear → 40% экономии
- Quality in artifacts > parallelism

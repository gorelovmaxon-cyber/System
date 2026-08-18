# Architecture Preferences

## Core Philosophy

### Quality in Artifacts, Not Parallelism

- **Качество в артефактах, не в параллелизме**
- Agent Teams стоят ~7× дороже обычных агентов
- Мульти-агент оркестрация ~15× дороже
- **Мягкость над сложностью** (lean solutions)
- **Единый домен-агностик поток для ЛЮБЫХ задач**

### Flow Principle

**Порядок всегда одинаковый:**
```
grill → spec → tickets → implement → verify
```

Это универсальный поток для любой задачи, независимо от домена.

## Agent-Based Architecture

Core principle: **specialized agents for specific tasks** rather than monolithic solutions.

### Agent Types

Из анализа проектов:

- **debugger** — isolate and fix bugs
- **documenter** — generate documentation
- **planner** — break down tasks
- **refactor** — improve code structure
- **reviewer** — code review and quality checks
- **security-auditor** — security analysis
- **test-runner** — execute tests
- **test-writer** — create test cases
- **worker** — general implementation
- **design-qa** — design quality checks
- **marketing-analyst** — marketing analysis
- **ui-designer** — UI/UX design
- **wireframe-planner** — wireframe creation

### Agent Organization

```
.claude/
└── agents/
    ├── debugger/
    ├── planner/
    ├── reviewer/
    └── worker/
```

Each agent has specialized system prompt and tools.

## Orchestration Model

### Model Separation by Cognitive Load

**КЛЮЧЕВОЙ ПАТТЕРН из ноутбука (D:\System, D:\System2):**

| Role | Responsibility | Tokens | Cost |
|------|---------------|--------|------|
| **Opus** | Brain/planner: grill, spec, tickets, review, synthesis | ~20-40% | Planning |
| **Sonnet/Qwen** | Hands/executor: implementation, bulk I/O, testing | ~60-80% | Execution |
| **User** | Orchestrator: pass tasks between models | — | — |

**Экономика:** 5-7× дешевле vs чистый Opus

**Принцип:** Opus тратит токены один раз (читает проект, понимает архитектуру) → создаёт детальные тикеты → Qwen тратит мало токенов (читает только указанные файлы).

### Role Separation

**Opus (мозг):**
- GRILL — задаёт вопросы, выявляет требования
- SPEC — пишет спецификацию
- TICKETS — создаёт детальные тикеты с алгоритмами
- REVIEW — проверяет результат работы Qwen

**Qwen/Sonnet (руки):**
- Получает тикет от пользователя
- Читает файлы из тикета
- Пишет код по алгоритму строго
- Запускает тесты
- Делает коммит

**User (оркестратор):**
- Запускает `/start [задача]`
- Передаёт тикеты между Opus ↔ Qwen
- Контролирует процесс на каждом шаге

**Key principle**: "Один тикет = один коммит = одна остановка"

### Orchestration Patterns

**Pattern 1: Sequential with Explicit Stops**
```
Opus (plan) → 🛑 STOP → Qwen (implement T1) → 🛑 STOP →
Opus (review T1) → 🛑 STOP → Qwen (implement T2) → 🛑 STOP
```

**Pattern 2: Commands structure**
```
.claude/
└── commands/
    ├── audit/       # Run security audit
    ├── implement/   # Implement from spec
    ├── orchestrate/ # Multi-agent coordination
    ├── refactor/    # Refactor existing code
    └── review/      # Code review workflow
```

## Explicit Stop Gates

**КРИТИЧЕСКИЙ ПАТТЕРН из SystemQwen:**

### 🛑 STOP после каждой фазы

- 🛑 STOP после GRILL
- 🛑 STOP после SPEC
- 🛑 STOP после TICKETS
- 🛑 STOP после каждого тикета (implementation)
- 🛑 STOP после REVIEW каждого тикета

**Никакой автоматизации без явного подтверждения.**

**Полный контроль на каждом шаге.**

### Why Explicit Stops

1. **Token control** — не тратим токены на неправильное направление
2. **Quality control** — проверяем результат перед следующим шагом
3. **Course correction** — можем изменить план на любом этапе
4. **Clear handoff** — понятно где Opus, где Qwen

## Three-Phase Workflow (SystemQwen)

### Phase 1: Planning (Opus in Claude Code)

```
/start or /systemqwen [task]
  ↓
GRILL (ask questions, clarify requirements)
  ↓
SPEC (write specification, fix requirements)
  ↓
TICKETS (create detailed tickets with algorithms)
  ↓
🛑 STOP: "Тикеты готовы: T1, T2, T3. Передавай T1 в Qwen."
```

**Output**: Detailed tickets in `.scratch/[project]/issues/`

**Token strategy**: Read broadly here (50-100k OK), creates precise tickets

### Phase 2: Implementation (Qwen via VS Code)

```
User gives T1 to Qwen through VS Code chat
  ↓
Qwen reads files (only from ticket)
  ↓
Qwen implements (follows algorithm strictly)
  ↓
Qwen runs tests
  ↓
Qwen commits
  ↓
🛑 STOP: "T1 готов: коммит [hash], тесты зелёные"
```

**Output**: One commit per ticket

**Token economy**: Precise ticket → minimal file reading → ~650 tokens vs ~40,000

### Phase 3: Review (Opus in Claude Code)

```
User gives Qwen result to Opus
  ↓
Opus checks: git diff, tests, matches ticket
  ↓
🛑 STOP:
  - "✅ T1 принят, передавай T2 в Qwen" OR
  - "⚠️ Нужна доработка: [замечания]"
```

**Cycle**: Repeat Phase 2-3 for each ticket until done.

## Sequential Subagent Pipeline

**ПАТТЕРН из D:\System2 (8 коммитов за неделю):**

### Core Rules

- **1 тикет = 1 свежий контекст = 1 агент = 1 коммит**
- `/clear` между тикетами обязателен
- **Parallel только для READ-only задач**
- Write/Edit операции строго sequential

### Why Sequential

**Problem with Parallel:**
- Agents edit same file → merge conflicts
- Context pollution → ~40% wasted tokens
- No clear ownership → unclear which agent did what

**Solution: Sequential Pipeline:**
```
T1 (fresh context) → implement → commit → /clear →
T2 (fresh context) → implement → commit → /clear →
T3 (fresh context) → implement → commit → /clear
```

**Benefits:**
- No conflicts (one agent at a time)
- Clean context (~40% token savings via /clear)
- Clear git history (one commit per ticket)

### When to Use Parallel

**Only for:**
- READ-only research tasks
- Multiple independent lookups
- Gathering data from different sources

**Never for:**
- Writing/editing same files
- Sequential dependencies
- Implementation tasks

## Token Economics

### Cost Comparison

| Approach | Tokens | Cost | Time |
|----------|--------|------|------|
| Pure Opus (full context) | ~800-1000k | ~$2-3 | Fast |
| SystemQwen (Opus plan + Qwen impl) | ~150-185k | ~$0.55 | Slower |
| Agent Teams | ~5.6M | ~$14 | Parallel |
| **Savings SystemQwen** | **~5-7×** | **~5-7×** | **+overhead** |

**D:\System2 реальные замеры:**
- Grill + Spec + Tickets (Opus): ~15-20k tokens (~$0.25)
- Implement T1-T4 (Qwen): ~120-150k tokens (~$0.15)
- Review T1-T4 (Opus): ~10-15k tokens (~$0.15)
- **ИТОГО: ~$0.55 vs ~$2-3 чистый Sonnet**

### Why Detailed Tickets Save Tokens

| Ticket Quality | Qwen Tokens | Reason |
|----------------|-------------|--------|
| ❌ "Fix hanging system" | ~40,000 | Qwen reads entire project |
| ✅ "In `api_client.py:67` add timeout=60" | ~650 | Qwen reads one file |
| **Difference** | **60× cheaper** | Specificity matters |

**Key principle**: Opus spends tokens once (understands architecture) → creates detailed tickets → Qwen spends minimal tokens (reads only specified files).

### Token Budget Strategy

**Дешёвые операции:**
- Читать 1-2 файла (200-300 строк): ~1000-1500 токенов
- Писать SPEC: ~2000-3000 токенов
- Написать тикет: ~500-1000 токенов

**Дорогие операции:**
- Читать весь проект: ~50,000-100,000 токенов
- Переспрашивать забытое: ~10,000 токенов за повтор
- Параллельные агенты: ~7-15× дороже

**Стратегия:**
- Spend tokens on planning (Opus reads broadly once)
- Save tokens on execution (Qwen reads only specified files)
- Use `/clear` between tickets (~40% context reduction)
- Block unknowns first in GRILL phase

## Skills-First Philosophy

### Skill Structure

```
.claude/
└── skills/
    └── skill-name/
        └── SKILL.md  # Frontmatter + instructions
```

### Reusable Assets

**Из D:\System (46 скиллов) и E:\System2 (50+ скиллов):**

**Core Skills:**
- `/start` — routing skill (analyze task, choose workflow)
- `/systemqwen` — three-phase orchestration (preferred для экономии)
- `/autopilot` — autonomous implementation (для сложных задач)
- `/grill-me` — requirements elicitation
- `/implement` — implementation from spec
- `/code-review` — review workflow

**Specialized Skills:**
- `/skill-forge` — create new skill from pattern
- `/auto-learn` — save memory after task completion
- `/wayfinder` — decompose large task
- `/diagnosing-bugs` — debug workflow

### Skill Invocation

User types `/<skill-name>` → Opus loads SKILL.md → follows instructions.

### When to Create New Skill

**Pattern from projects:**
- Repeated 2-3 times → consider skill-forge
- Domain-specific workflow → custom skill
- Reusable across projects → add to .claude/skills/

## Project Memory Pattern

### Three-File System

| File | Purpose | When to Use |
|------|---------|-------------|
| [FACTS.md](../../FACTS.md) | Single source of truth: data, numbers, test results | Read FIRST before planning |
| [DECISIONS.md](../../DECISIONS.md) | What was decided and WHY | Read before asking repeated questions |
| [CLAUDE.md](../../CLAUDE.md) | Instructions for AI agents | Read at session start |

**Pattern from Bot Stacy:**
```markdown
## DECISIONS.md structure
## 2026-06-08 (АКТУАЛЬНОЕ) — Decision title
**Решение:** what was decided
**Почему:** rationale with reference to FACTS.md

**How to apply:** when/where this applies
```

**Key insight**:
- FACTS.md contains data (NOT instructions), read it first
- DECISIONS.md references FACTS.md for backing
- CLAUDE.md contains instructions

### Why This Separation

1. **FACTS.md** — данные не дублируются в CLAUDE.md
2. **DECISIONS.md** — не переспрашиваем уже решённое
3. **CLAUDE.md** — инструкции для AI, не перегружены данными

## Evolution of Architecture

**Прослеживается через проекты:**

```
SAIT (lean philosophy, spec-first)
  ↓
D:\System (Autopilot + 46 skills, token optimization)
  ↓
Documents (full stack + Pocock methodology)
  ↓
D:\System2 (SystemQwen + explicit stops + model separation)
```

**Тренд:** от автономности к контролю, от параллелизма к качеству, от сложности к простоте.

## Architectural Principles (from Bot Stacy)

1. **Think before code** — voice assumptions, ask when unclear
2. **Single source of truth** — FACTS.md for data, read it first
3. **Document decisions** — DECISIONS.md with rationale
4. **Agent orchestration** — Opus plans and reviews, worker implements
5. **Skills-first** — reusable assets in .claude/skills/
6. **Explicit stops** — 🛑 STOP between phases, no automation
7. **Token economy** — detailed planning saves implementation cost
8. **Quality over parallelism** — lean solutions over multi-agent
9. **Sequential pipeline** — /clear между тикетами, one at a time
10. **Model separation** — Opus thinks, Sonnet/Qwen executes

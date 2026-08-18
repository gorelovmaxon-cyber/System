# Common Mistakes & Anti-Patterns

## Top 10 Mistakes (from Laptop Analysis)

### 1. ❌ Параллелизм вместо качества

**Проблема:** Agent Teams ~7×, мульти-агент ~15× дороже обычных агентов

**Почему плохо:**
- Token cost огромный
- Merge conflicts при параллельном редактировании
- Context pollution
- Unclear ownership

**✅ Вместо этого:**
- Sequential pipeline: 1 ticket = 1 agent = 1 commit
- `/clear` между тикетами
- Quality in artifacts, not parallelism

### 2. ❌ Начало до утверждённой спеки

**Проблема:** "Параллель до спеки = слив лимита"

**Почему плохо:**
- Можем делать неправильную задачу
- Тратим токены впустую
- Нет alignment с пользователем

**✅ Вместо этого:**
- GRILL → SPEC → получить подтверждение → TICKETS
- Explicit 🛑 STOP после SPEC
- Не продолжать без "добро"

### 3. ❌ Мелочь через Autopilot

**Проблема:** Однострочная правка через многоагентную оркестрацию

**Почему плохо:**
- $2-3 вместо $0.10
- Overhead на планирование
- Overkill для простой задачи

**✅ Вместо этого:**
- Мелкая правка = делать сразу
- `/start` сначала → анализирует и предлагает маршрут
- Autopilot/SystemQwen только для больших задач

### 4. ❌ Забыл auto-learn

**Проблема:** Память не растёт, повторяем одни и те же разговоры

**Почему плохо:**
- Переспрашиваем уже решённое
- Не накапливаем knowledge
- Wasted tokens на repeated questions

**✅ Вместо этого:**
- После ЛЮБОЙ задачи: "Что запомнить навсегда?"
- Повторилось 2-3 раза → `/skill-forge`
- Регулярно проверять `.claude/memory/`

### 5. ❌ Дублирование FACTS.md в CLAUDE.md

**Проблема:** Данные копируются в инструкции

**Почему плохо:**
- FACTS.md обновляется → CLAUDE.md устаревает
- Data duplication
- Confusion: какие данные актуальные?

**✅ Вместо этого:**
- FACTS.md = данные (numbers, test results, config)
- CLAUDE.md = инструкции (rules, workflow)
- DECISIONS.md = решения с ссылками на FACTS.md

### 6. ❌ Нет HANDOFF.md

**Проблема:** Перенос между ПК затруднён

**Почему плохо:**
- Непонятно что в процессе
- Теряется context
- Нужно переспрашивать всё заново

**✅ Вместо этого:**
- HANDOFF.md с текущим статусом
- Список open tickets
- What's done, what's next
- Transfer-ready archives в `_transfer/`

### 7. ❌ IP без хеширования

**Проблема:** Логирование raw IP адресов

**Почему плохо:**
- GDPR violation
- Personal data exposure
- Legal risk

**✅ Вместо этого:**
- SHA-256 hash + salt
- Privacy-first analytics
- Пример из D:\Sait: `SHA256(IP + dailySalt)`

### 8. ❌ D:\System\memory/ не проверен

**Проблема:** Fallback срабатывает случайно

**Почему плохо:**
- Autopilot читает стаую память
- Непонятно какая система активна
- Inconsistent behavior

**✅ Вместо этого:**
- Регулярно проверять память
- Удалять устаревшие записи
- Один источник истины: E:\System2\memory/ или D:\System\memory/

### 9. ❌ Генерация на лету

**Проблема:** Генерируем контент в ответе, не сохраняем в файлы

**Почему плохо:**
- Нет статики для review
- Теряется при /clear
- Нельзя версионировать

**✅ Вместо этого:**
- Всё в файлы (markdown, JSON, code)
- Git для версионирования
- Ревью на диске, не в chat

### 10. ❌ Огромная задача без декомпозиции

**Проблема:** "Сделай весь проект" без разбивки

**Почему плохо:**
- Token limit hit
- Неясно с чего начать
- Нет промежуточных checkpoints

**✅ Вместо этого:**
- `/wayfinder` → `/grill-me` → `/to-spec`
- Разбивка на T1, T2, T3, T4...
- Explicit stops после каждого тикета

---

## Git & Version Control

### ❌ Don't Do

- **Force push to `main`/`master`** — destroys team's work
- **Commit secrets or credentials** — security risk, can't be fully removed from history
- **Commit large binary files** — bloats repository forever
- **Create huge PRs (> 1000 lines)** — impossible to review properly
- **Amend published commits** — breaks other people's history
- **Use `git add .` blindly** — may include secrets, large files, unrelated changes
- **Skip pre-commit hooks with `--no-verify`** — bypasses safety checks
- **Leave WIP commits in final PR** — pollutes git history
- **Forget `git stash` before checkout/reset** — lose uncommitted work

### ✅ Do Instead

- Push to feature branches, merge via PR
- Use `.gitignore` and `.env.example` pattern
- Store large files in LFS or external storage
- Split large changes into multiple PRs (< 400 lines ideal)
- Create new commits instead of amending
- Review `git status`, stage files explicitly: `git add file1.ts file2.ts`
- Fix issues that cause hooks to fail
- Squash/rebase WIP commits before final PR
- Always `git stash` before destructive operations

---

## Code Implementation

### ❌ Don't Do

- **Implement before understanding** — write code before reading existing patterns
- **Add features not requested** — scope creep, wasted effort
- **Premature abstraction** — three similar lines is better than wrong abstraction
- **Over-engineer for hypothetical future** — YAGNI (You Aren't Gonna Need It)
- **Change files not in ticket** — causes merge conflicts, scope creep
- **Add defensive code for impossible scenarios** — clutters codebase
- **Write multi-paragraph docstrings** — code should be self-documenting
- **Explain WHAT in comments** — use clear naming instead
- **Reference current task in comments** — "added for Y flow" rots as code evolves

### ✅ Do Instead

- Read existing code first, match project patterns
- Implement exactly what's requested, nothing more
- Extract abstractions only when pattern emerges 3+ times
- Design for today's requirements
- Modify only files specified in ticket
- Validate only at system boundaries (user input, external APIs)
- Write one-line comments only when WHY is non-obvious
- Use self-documenting function/variable names
- Put task context in commit message and PR description

---

## Planning & Specification

### ❌ Don't Do

- **Vague tickets without file paths** — "Fix system hanging" → Qwen reads entire project (40k tokens)
- **Generic instructions** — "improve performance" → no clear success criteria
- **Forget to specify test requirements** — implementation without verification
- **Skip GRILL phase** — miss critical requirements, build wrong thing
- **Write SPEC without reading existing code** — propose solutions that conflict with architecture
- **Continue after 🛑 STOP without user confirmation** — breaks orchestration model
- **Create tickets without exact line numbers** — Qwen wastes tokens searching

### ✅ Do Instead

- Specific tickets with paths: "In `api_client.py:67` add timeout=60" → 650 tokens
- Measurable criteria: "reduce API latency from 2s to <500ms"
- Include test command in ticket: "Run `npm test -- api.test.ts`"
- Always GRILL first: ask questions, clarify unknowns
- Read existing files during GRILL, reference them in SPEC
- Stop at 🛑 STOP markers, wait for user to hand off
- Provide exact locations: `[file.js:42-51](file.js#L42-L51)`

---

## Token Economy Mistakes

### ❌ Don't Do

- **Re-read entire project for each task** — 50-100k tokens wasted
- **Ask questions already answered in FACTS.md** — 10k tokens per repeat
- **Write tickets that make Qwen explore** — "find and fix all bugs" → massive token cost
- **Duplicate work between Opus and Qwen** — both reading same files
- **Use expensive model for mechanical tasks** — Opus for simple file edits
- **Skip ticket detail to save upfront tokens** — costs 60× more in implementation

### ✅ Do Instead

- Read project once during GRILL, reference in tickets
- Check FACTS.md and DECISIONS.md first
- Write precise tickets: exact files, line numbers, operations
- Opus reads and analyzes, Qwen only reads specified files
- Use Qwen/Sonnet for implementation, Opus for planning/review
- Spend tokens on detailed tickets (500-1000) to save implementation tokens (40k → 650)

---

## Workflow & Orchestration

### ❌ Don't Do

- **Implement without creating ticket** — no clear algorithm for executor
- **Create ticket and implement in same turn** — breaks Opus/Qwen separation
- **Skip review phase** — merge without verification
- **Multiple files in one ticket** — makes rollback impossible
- **Continue to next ticket after failed review** — compounds errors
- **Mix planning and implementation** — confused role boundaries
- **Parallel agents editing same files** — merge conflicts

### ✅ Do Instead

- Always create ticket first (Opus role)
- Stop after tickets: "🛑 STOP: Тикеты готовы, передавай T1 в Qwen"
- Review each ticket before proceeding to next
- One ticket = one file = one commit = one stop
- Fix issues before moving forward
- Clear phases: Opus plans → 🛑 → Qwen implements → 🛑 → Opus reviews → 🛑
- Sequential pipeline with `/clear` between tickets

---

## Documentation

### ❌ Don't Do

- **Use backticks for file paths** — `` `src/file.js` `` not clickable in VS Code
- **Forget frontmatter in SKILL.md** — breaks skill loading
- **Put memory content in MEMORY.md** — it's an index, not storage
- **Create duplicate skills** — check existing skills first
- **Write stale documentation** — docs that describe old code state

### ✅ Do Instead

- Use markdown links: `[src/file.js](src/file.js)` — clickable
- Always include frontmatter: `name`, `description`, `disable-model-invocation`
- Write memory in separate files, link from MEMORY.md
- Check `.claude/skills/` directory before creating new skill
- Update docs when code changes, or remove outdated docs

---

## Testing & Verification

### ❌ Don't Do

- **Skip running tests after changes** — merge broken code
- **Mock everything in tests** — tests pass but prod fails
- **Test only happy path** — miss edge cases
- **Claim success without verification** — "should work" without running
- **Ignore failing tests** — "tests are flaky" without investigation

### ✅ Do Instead

- Run full test suite after every change
- Use real database/services in integration tests (lesson from Bot Stacy)
- Test edge cases, error conditions, boundary values
- Actually run the code, show output
- Fix root cause of test failures

---

## Project Structure

### ❌ Don't Do

- **Create FACTS.md with instructions** — it's for data only
- **Skip DECISIONS.md when making architectural choice** — lose rationale
- **Put everything in one huge CLAUDE.md** — use .claude/rules/ for specific topics
- **Ignore existing .claude/ structure** — inconsistent with project patterns
- **Create skills without SKILL.md** — breaks skill system

### ✅ Do Instead

- FACTS.md = data, numbers, test results (read first)
- Document decisions in DECISIONS.md with **Why:** and **How to apply:**
- Split rules into .claude/rules/[topic].md
- Follow .claude/agents/, .claude/commands/, .claude/rules/, .claude/skills/ structure
- Every skill needs .claude/skills/[name]/SKILL.md with frontmatter

---

## Security

### ❌ Don't Do

- **Commit `.env` files** — exposes secrets
- **Hardcode API keys in code** — security vulnerability
- **Skip input validation** — opens to injection attacks
- **Trust user input directly** — XSS, SQL injection risk
- **Disable security features** — "for convenience" becomes prod vulnerability
- **Use `eval()` or similar** — code injection risk
- **Log raw IP addresses** — GDPR violation

### ✅ Do Instead

- Use `.env.example` as template, add `.env` to .gitignore
- Use environment variables for secrets
- Validate at system boundaries (user input, external APIs)
- Sanitize and escape user input
- Keep security features enabled, fix underlying issues
- Use safe parsing (JSON.parse, not eval)
- Hash IP addresses: `SHA256(IP + salt)` for analytics

---

## Platform-Specific Gotchas

### Windows Development

```bash
# ❌ Bad: node --test test/ fails on Windows
node --test test/

# ✅ Good: works on Windows
node --test

# ❌ Bad: path separators
path = "folder\subfolder\file.txt"

# ✅ Good: forward slashes work everywhere
path = "folder/subfolder/file.txt"
```

### Subagent Context

**❌ Subagent не видит переписку** — закладывай ТЗ на диск

**✅ Solution:**
- Write SPEC to `.scratch/[project]/SPEC.md`
- Write tickets to `.scratch/[project]/issues/T1.md`
- Subagent reads files, not chat history

### Parallel vs Sequential

**❌ Параллельные агенты в одном файле** — merge conflicts

**✅ Solution:**
- Sequential pipeline для write operations
- Parallel только для READ-only tasks
- Use worktree isolation if parallel writes needed

### Date Format

```markdown
# ❌ Bad: ambiguous format
created: 17.08.2026

# ✅ Good: ISO 8601 (YYYY-MM-DD)
created: 2026-08-17
```

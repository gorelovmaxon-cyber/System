# T1 — Создать coding-style.md

**Перед началом работы:**
Открой VS Code в папке `E:\System2` (File > Open Folder).

## Файлы для создания

- [memory/user-profile/coding-style.md](memory/user-profile/coding-style.md) — новый файл с паттернами кодирования

## Алгоритм (шаг за шагом)

### 1. Создай файл `memory/user-profile/coding-style.md`

Структура файла:

```markdown
# Coding Style

## Languages & Stack

**Primary Languages:**
- **TypeScript** (strict mode) — фронтенд, основной язык для веб
- **Python 3.x** — бэкенд, трейдинг, автоматизация
- **C# .NET 8** — системные интеграции (ATAS trading platform)
- **PowerShell** — аналитика (28 скриптов в trading bot)
- **Markdown** — документация, память, спецификации

**Technology Stack:**

*Frontend:*
- React 18 + Vite + Tailwind CSS + Framer Motion
- TypeScript strict mode обязателен
- Path aliases: `@/` для `src/`
- Component-based architecture: `layout/`, `sections/`, `ui/`

*Backend:*
- Python: Flask, asyncio, WebSockets
- .NET 8: C# интеграции
- Node.js 18.16.0 для инструментов

*Deployment:*
- Cloudflare Pages/Workers (статика + serverless)
- VPS (production trading bots)
- cloudflared tunnels для удаленного доступа

*Tools:*
- VS Code (primary IDE)
- Git + GitHub
- Claude Code CLI
- PowerShell для аналитики

*AI Stack:*
- Opus (~20-40% токенов): planning, grill, spec, tickets, review
- Sonnet/Qwen (~60-80% токенов): implementation, bulk I/O, testing
- Economics: 5-7× savings vs pure Opus

## Code Style Preferences

### Naming Conventions

- **Descriptive names over short**: `position_manager`, `risk_manager` > `pm`, `rm`
- **snake_case** для Python
- **camelCase** для TypeScript/JavaScript
- **PascalCase** для React компонентов и C# классы
- **kebab-case** для файлов CSS/markdown

### Architecture

- **Async/await** над promises
- **Component-based** архитектура (много маленьких файлов > мало больших)
- **Small, focused modules** — один файл = одна ответственность
- **No premature abstraction** — три похожих строки лучше чем неправильная абстракция

### TypeScript

```typescript
// ✅ Good: strict mode, explicit types
interface UserProfile {
  id: string;
  name: string;
  createdAt: Date;
}

async function fetchUser(id: string): Promise<UserProfile> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// ❌ Bad: any types, implicit returns
async function fetchUser(id) {
  return fetch(`/api/users/${id}`).then(r => r.json());
}
```

### Python

```python
# ✅ Good: type hints, descriptive names, async
from typing import Optional
import asyncio

async def calculate_position_size(
    account_balance: float,
    risk_percent: float,
    stop_loss_distance: float
) -> Optional[float]:
    """Calculate position size based on risk management."""
    if stop_loss_distance <= 0:
        return None
    
    risk_amount = account_balance * (risk_percent / 100)
    return risk_amount / stop_loss_distance

# ❌ Bad: no types, unclear names
def calc(b, r, s):
    return (b * r) / s if s > 0 else None
```

## Documentation Format

- **Markdown-heavy documentation** with YAML frontmatter
- All documentation files use `.md` extension
- Frontmatter format for SKILL.md files:
  ```yaml
  ---
  name: skill-name
  description: One-line description of what the skill does
  disable-model-invocation: false
  ---
  ```

## .claude/ Directory Structure

Standard structure across all projects:

```
.claude/
├── agents/          # Specialized AI agents for specific tasks
├── commands/        # Reusable command scripts
├── rules/           # Project rules and conventions
└── skills/          # Reusable skills (main assets)
    └── skill-name/
        └── SKILL.md # Skill definition with frontmatter
```

## File References in Documentation

**MANDATORY**: All file paths in documentation and tickets must use markdown link syntax for VS Code clickability:

- ✅ `[path/to/file.js](path/to/file.js)` — clickable in VS Code
- ❌ `` `path/to/file.js` `` — not clickable, DON'T use backticks for paths

**Examples:**
```markdown
## Files to modify
- [src/components/Button.tsx](src/components/Button.tsx) — add new prop
- [src/utils/api.ts:42](src/utils/api.ts#L42) — fix timeout
- [src/utils/api.ts:42-51](src/utils/api.ts#L42-L51) — refactor range
- [src/utils/](src/utils/) — folder reference
```

## Git Workflow

### Branch Naming

Format: `<type>/<short-description>`

**Types:**
- `feature/` — New functionality
- `fix/` — Bug fixes
- `hotfix/` — Urgent production fix
- `refactor/` — Code improvement without changing behavior
- `docs/` — Documentation only
- `test/` — Test additions or modifications

**Examples:**
- `feature/user-authentication`
- `fix/memory-leak-in-parser`
- `hotfix/critical-security-patch`

### Commit Messages

**Format**: Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `refactor` — Code change (no feature/fix)
- `test` — Test additions/changes
- `chore` — Build/tooling changes

**Rules:**
- Subject: lowercase, no period at end, max 50 characters
- Use imperative mood: "add" not "added"
- Scope optional but recommended
- Body optional, wrap at 72 characters
- Footer for breaking changes: `BREAKING CHANGE: description`

**Examples:**
```
feat(auth): add JWT token refresh mechanism

fix(api): prevent timeout on large file uploads

docs(readme): update installation instructions

refactor(parser): simplify regex pattern matching
```

### Commit Practices

- **Atomic commits**: each commit = one logical change
- **One ticket = one commit = one stop**
- No WIP commits in PR
- No secrets, credentials, or large binaries in commits
- Use `git add file1.ts file2.ts` (explicit) over `git add .`
- Always `git stash` before `checkout`/`reset`

### Pull Request Guidelines

**Size limits:**
- **Ideal**: < 400 lines changed
- **Maximum**: 1000 lines changed
- Split larger changes into multiple PRs

**Before PR:**
- All tests pass
- Code reviewed by at least one person
- No merge conflicts with target branch

**Don't:**
- ❌ Force push to `main`/`master`
- ❌ Merge without review
- ❌ Leave WIP commits in final PR
- ❌ Create huge PRs (> 1000 lines)

## Code Comments

**Default: write NO comments.**

Only add comments when:
- The WHY is non-obvious (hidden constraint, subtle invariant)
- Workaround for a specific bug
- Behavior that would surprise a reader

**Don't comment:**
- WHAT the code does (use clear naming instead)
- Current task or fix ("added for Y flow", "handles case from issue #123")
- Removed code (use git history)

**Example of good comment:**
```javascript
// Safari < 14 doesn't support lookbehind regex, fallback to split
const tokens = isSafari ? text.split(/\s+/) : text.match(/(?<=\s)\w+/g);
```

**Example of bad comment:**
```javascript
// Get user name from the user object
const userName = user.name;
```

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

### Date Format

```markdown
# ✅ Good: ISO 8601 (YYYY-MM-DD)
created: 2026-08-17

# ❌ Bad: ambiguous format
created: 17.08.2026
```

## Multi-Project Workflow

**Context:**
- Work across 4+ active projects simultaneously
- Development on 2+ PCs (desktop + laptop)
- Frequent transfers via `.tar.gz` archives
- Transfer/handoff готовность обязательна

**Organization:**
- CLAUDE.md, FACTS.md, DECISIONS.md обязательны в каждом проекте
- `.claude/skills/` для кастомных скиллов
- `issues/` для тикетов
- `_transfer/` для экспортов
```

### 2. Проверь содержимое файла

Убедись что:
- Все языки указаны: TypeScript, Python, C#, PowerShell, Markdown
- Stack включает: React 18, Vite, Tailwind, Python Flask, .NET 8, Cloudflare
- AI Stack упомянут: Opus (20-40%), Sonnet/Qwen (60-80%)
- Code style показывает примеры для TypeScript и Python
- Все примеры путей используют markdown link syntax `[path](path)`
- Conventional Commits format описан полностью
- Git workflow включает branch naming и PR guidelines
- Platform-specific gotchas для Windows добавлены
- Multi-project workflow описан
- .claude/ структура описана правильно
- Паттерн frontmatter показан для SKILL.md файлов

### 3. Сделай коммит

```bash
git add memory/user-profile/coding-style.md
git commit -m "feat(memory): add coding-style.md to user profile

- languages: TypeScript, Python, C#, PowerShell
- stack: React 18, Python Flask, .NET 8, Cloudflare
- AI stack: Opus (planning) + Sonnet/Qwen (implementation)
- code style examples for TS and Python
- mandatory file links in [path](path) format
- git workflow: branch naming, commits, PRs
- Conventional Commits format specification
- Windows gotchas and multi-project workflow"
```

## Критерии приёмки

- ✅ Файл создан по пути [memory/user-profile/coding-style.md](memory/user-profile/coding-style.md)
- ✅ Содержит разделы: Languages & Stack, Code Style Preferences, Documentation Format, .claude/ Structure, File References, Git Workflow, Commit Messages, Code Comments, Platform-Specific Gotchas, Multi-Project Workflow
- ✅ Все языки из обоих ПК: TypeScript, Python, C#, PowerShell
- ✅ Technology Stack полный: React, Python, .NET, Cloudflare
- ✅ AI Stack economics: 5-7× savings
- ✅ Все примеры file paths в формате `[path](path)` (clickable)
- ✅ Conventional Commits format описан с примерами
- ✅ Git workflow включает branch naming и PR size limits
- ✅ Windows-specific gotchas добавлены
- ✅ Multi-project workflow (2+ PCs, .tar.gz transfers)
- ✅ Коммит сделан с Conventional Commits форматом
- ✅ Коммит содержит только этот один файл

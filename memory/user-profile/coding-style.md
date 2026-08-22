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
interface UserProfile {
  id: string;
  name: string;
  createdAt: Date;
}

async function fetchUser(id: string): Promise<UserProfile> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

### Python

```python
from typing import Optional

async def calculate_position_size(
    account_balance: float,
    risk_percent: float,
    stop_loss_distance: float,
) -> Optional[float]:
    """Calculate position size based on risk management."""
    if stop_loss_distance <= 0:
        return None

    risk_amount = account_balance * (risk_percent / 100)
    return risk_amount / stop_loss_distance
```

## Documentation Format

- **Markdown-heavy documentation** with YAML frontmatter
- All documentation files use `.md` extension
- Frontmatter format for [SKILL.md](.claude/skills/skill-name/SKILL.md) files:

```yaml
---
name: skill-name
description: One-line description of what the skill does
disable-model-invocation: false
---
```

## .claude/ Directory Structure

Standard structure across all projects:

```text
.claude/
├── agents/          # Specialized AI agents for specific tasks
├── commands/        # Reusable command scripts
├── rules/           # Project rules and conventions
└── skills/          # Reusable skills (main assets)
    └── skill-name/
        └── SKILL.md # Skill definition with frontmatter
```

## File References in Documentation

**MANDATORY:** All file paths in documentation and tickets must use Markdown link syntax for VS Code clickability:

- `[path/to/file.js](path/to/file.js)` — clickable in VS Code
- Do not use bare backtick paths for file references.

**Examples:**

```markdown
## Files to modify
- [src/components/Button.tsx](src/components/Button.tsx) — add new prop
- [src/utils/api.ts:42](src/utils/api.ts#L42) — fix timeout
- [src/utils/](src/utils/) — folder reference
```

## Git Workflow

### Branch Naming

Format: `<type>/<short-description>`.

**Types:**
- `feature/` — new functionality
- `fix/` — bug fixes
- `hotfix/` — urgent production fix
- `refactor/` — code improvement without changing behavior
- `docs/` — documentation only
- `test/` — test additions or modifications

Examples: `feature/user-authentication`, `fix/memory-leak-in-parser`.

### Commit Messages

Use Conventional Commits:

```text
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `refactor` — Code change without changing behavior
- `test` — Test additions or modifications
- `chore` — Build/tooling changes

**Rules:**
- Subject: lowercase, no period at end, maximum 50 characters
- Use imperative mood: “add”, not “added”
- Scope is optional but recommended
- Body is optional and wrapped at 72 characters
- Use a footer for breaking changes: `BREAKING CHANGE: description`

Examples:

```text
feat(auth): add JWT token refresh mechanism
fix(api): prevent timeout on large file uploads
docs(readme): update installation instructions
refactor(parser): simplify regex pattern matching
```

### Commit Practices

- **Atomic commits:** each commit represents one logical change
- **One ticket = one commit = one stop**
- No WIP commits in a PR
- No secrets, credentials, or large binaries in commits
- Prefer explicit file lists in `git add`
- Always stash before `checkout` or `reset`

### Pull Request Guidelines

**Size limits:**
- **Ideal:** fewer than 400 changed lines
- **Maximum:** 1000 changed lines
- Split larger changes into multiple PRs

**Before PR:**
- All tests pass
- Code reviewed by at least one person
- No merge conflicts with the target branch

**Don't:**
- Force-push to `main`/`master`
- Merge without review
- Leave WIP commits in a final PR
- Create huge PRs over 1000 lines

## Code Comments

**Default: write no comments.**

Only add comments when the why is non-obvious, a workaround documents a specific bug, or behavior would surprise a reader. Do not comment what clear names already express.

## Platform-Specific Gotchas

### Windows Development

```text
# Bad: node --test test/ fails on Windows
node --test test/

# Good: works on Windows
node --test

# Bad: backslash paths can be interpreted as escapes
folder\subfolder\file.txt

# Good: forward slashes work everywhere
folder/subfolder/file.txt
```

## Multi-Project Workflow

**Context:**
- Work across 4+ active projects simultaneously
- Development on 2+ PCs (desktop + laptop)
- Frequent transfers via `.tar.gz` archives
- Transfer/handoff readiness is mandatory

**Organization:**
- [CLAUDE.md](CLAUDE.md), [FACTS.md](FACTS.md), and [DECISIONS.md](DECISIONS.md) are expected in each project
- [.claude/skills/](.claude/skills/) stores custom skills
- [issues/](issues/) stores tickets
- `[_transfer/](_transfer/)` stores exports

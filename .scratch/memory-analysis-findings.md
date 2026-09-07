# Findings: Массовый анализ проектов для User Profile

**Дата:** 2026-08-17  
**Источник:** Анализ 5 субагентов (Sonnet 5) по 8 проектам/папкам  
**Цель:** Подготовка данных для создания зрелой системы памяти

---

## Проанализированные проекты

1. **D:\System** — Autopilot framework (46 скиллов, пустая память)
2. **D:\System2** — SystemQwen (текущая система, 8 коммитов)
3. **D:\Sait** — React портфолио на Cloudflare (586 TS файлов)
4. **D:\dev** — Binance trading bot (.NET + Python, 28 PS скриптов)
5. **Documents\SAIT** — Lean Spec-First философия
6. **Documents\ТЗ на поиск подрядчика** — Полный стек (41 скилл)
7. **Documents\инструменты** — Идентично ТЗ (базовая версия)

---

## Key Findings

### 1. Coding Style

**Языки:**
- TypeScript (strict mode) — фронтенд
- Python 3.x — бэкенд, трейдинг, автоматизация
- C# .NET 8 — системные интеграции (ATAS)
- PowerShell — аналитика (28 скриптов в trading)
- Markdown — документация, память

**Stack:**
- Frontend: React 18 + Vite + Tailwind + Framer Motion
- Backend: Python + Flask, asyncio, WebSockets
- Deployment: Cloudflare Pages/Workers, VPS
- Tools: VS Code, Git, Claude Code CLI

**Предпочтения:**
- async/await над promises
- Component-based архитектура (layout/sections/ui)
- Path aliases (@/ для src/)
- TypeScript strict mode обязателен
- Много маленьких файлов > мало больших
- Descriptive names (position_manager, risk_manager)

---

### 2. Architecture Preferences

**Философия:**
- Качество в артефактах, не в параллелизме
- Лёгкость над сложностью (lean solutions)
- Один домен-агностик поток для ЛЮБЫХ задач
- Порядок: grill → spec → tickets → implement → verify

**Ключевые паттерны:**

**Model Separation by Cognitive Load**
- Opus (~20-40% токенов): grill, spec, tickets, review, synthesis
- Sonnet/Qwen (~60-80% токенов): implementation, bulk I/O, testing
- Экономия: 5-7× vs чистый Opus

**Explicit Stop Gates**
- 🛑 STOP после: grill, spec, tickets, каждого тикета, review
- Никакой автоматизации без явного подтверждения
- Полный контроль на каждом шаге

**Sequential Subagent Pipeline**
- 1 тикет = 1 свежий контекст = 1 агент = 1 коммит
- /clear между тикетами обязателен
- Parallel только для READ-only задач

**Token Economy:**
- /clear между тикетами (~40% контекста)
- Осознанный выбор модели (Opus/Sonnet/Haiku)
- Блокирующие неизвестные — первыми в grill
- Не гонять мелочь через Autopilot

---

### 3. Common Mistakes

1. **Параллелизм вместо качества** — Agent Teams ≈7×, мульти-агент ≈15× дороже
2. **Начало до утверждённой спеки** — "параллель до спеки = слив лимита"
3. **Мелочь через Autopilot** — однострочная правка = делать сразу
4. **Забыл auto-learn** — память не растёт
5. **Дублирование FACTS.md в CLAUDE.md** — данные ≠ инструкции
6. **Нет HANDOFF.md** — перенос между ПК затруднён
7. **IP без хеширования** — GDPR violation
8. **D:\System\memory/ не проверен** — fallback срабатывает случайно
9. **Генерация на лету** — всё в файлы (статика)
10. **Огромная задача без декомпозиции** — /wayfinder → /grill-me → /to-spec

**Gotchas:**
- `node --test test/` падает на Windows → `node --test`
- `git stash` перед checkout/reset
- `git add .` → лучше явно file1.ts file2.ts
- Субагент не видит переписку → класть ТЗ на диск
- Параллельные агенты в одном файле → sequential или worktree
- YYYY-MM-DD для дат (не DD.MM.YYYY)

---

### 4. Work Patterns

**Ритм:**
- Многопроектность (4+ активных проекта)
- Работа на 2+ ПК (десктоп + ноутбук)
- Частый перенос через .tar.gz archives
- Transfer/handoff готовность обязательна

**Workflow:**
- Documentation-first (10+ MD файлов на проект)
- Ticket-driven (T1, T2, T3, T4...)
- Iterative refinement (прототип + итерации)
- Единая точка входа: /start

**SystemQwen Mode (preferred):**
1. /start [задача]
2. Opus: grill → spec → tickets → 🛑 СТОП
3. Qwen: T1 → коммит → 🛑 СТОП
4. Opus: review T1 → ✅ или ⚠️
5. Повторить 3-4 для T2, T3, T4...

**Auto-learn обязателен:**
- После ЛЮБОЙ задачи: "Что запомнить навсегда?"
- Повторилось 2-3 раза → skill-forge

**Организация:**
- CLAUDE.md, FACTS.md, DECISIONS.md обязательны
- .claude/skills/ для кастомных скиллов
- issues/ для тикетов
- _transfer/ для экспортов

---

### 5. Projects Insights

**D:\System2 (SystemQwen):**
- 8 коммитов за неделю
- T1-T8 pattern (ticket-driven)
- Экономика: ~$0.55 на фичу (vs ~$2-3 Sonnet)

**D:\Sait (Portfolio):**
- React 18 + Cloudflare Pages
- Privacy-first аналитика (IP хешируется SHA-256 + соль)
- Custom event tracking (fire-and-forget)

**D:\dev (Trading Bot):**
- Hybrid: C# (ATAS) → Python (Binance)
- 28 PowerShell analysis scripts
- Production-ready (VPS, 7.6GB archive)
- Backtest: $200 → ~$290K за 14 месяцев

**Evolution:**
```
SAIT (lean philosophy) 
  → D:\System (Autopilot + 46 skills) 
  → Documents (full stack + Pocock) 
  → D:\System2 (SystemQwen + explicit stops)
```

---

## Technology Stack Summary

**Frontend:** React 18, TypeScript, Vite, Tailwind, Framer Motion, Cloudflare Pages  
**Backend:** Python, Flask, asyncio, WebSockets, .NET 8  
**Tools:** VS Code, Git, Claude Code, PowerShell  
**AI:** Opus (planning), Sonnet (implementation), Qwen (cheap execution)  
**Deployment:** Cloudflare Pages/Workers, VPS, cloudflared tunnels  
**Security:** SHA-256 hashing, JWT, privacy-first

---

## Recommended Memory Structure

### user-profile/
- coding-style.md — языки, стек, стиль, именование
- architecture-prefs.md — философия, паттерны, token economy
- common-mistakes.md — 10 ошибок + gotchas
- work-patterns.md — ритм, workflow, организация

### patterns/
- model-separation-by-cognitive-load.md — Opus думает, Sonnet реализует
- explicit-stop-gates.md — явные остановки
- sequential-subagent-pipeline.md — 1 тикет = 1 коммит

### facts/
- technology-stack.md — весь стек из всех проектов
- projects-overview.md — активные проекты + эволюция

### gotchas/
- git-node-windows.md — Git+Node проблемы на Windows

### decisions/
- 2026-08-17-systemqwen-architecture.md — почему SystemQwen

---

## Субагенты токены (Sonnet 5)

- D:\System: 30,275 tokens
- D:\System2: 65,490 tokens
- D:\Sait: 26,054 tokens
- D:\dev: 39,816 tokens
- Documents: 46,273 tokens

**Итого анализ: ~207,908 tokens Sonnet 5 (~$0.62)**

---

## Статус

✅ Анализ завершён  
✅ Findings собраны  
⏭️ Готово к передаче Opus для grill → spec → tickets

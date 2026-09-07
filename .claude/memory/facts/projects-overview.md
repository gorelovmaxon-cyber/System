# Projects Overview — Максим Горелов

**Дата:** 2026-08-17  
**Контекст:** Массовый анализ текущих проектов  
**Источник:** Анализ D:\System, D:\System2, D:\Sait, D:\dev, Documents

## Active Projects

### D:\System2 — SystemQwen
**Тип:** AI Development Framework  
**Статус:** Активная разработка (8 коммитов за неделю)  
**Цель:** Экономичная система разработки (Opus планирует → Qwen реализует)

**Stack:**
- Markdown (документация)
- Python (legacy API scripts)
- Claude Code Skills (49 скиллов)
- VS Code integration (Qwen Code extension)

**Ключевые файлы:**
- CLAUDE.md — главная инструкция
- OPUS.md — для планирования
- QWEN.md — для реализации
- TICKET_TEMPLATE.md — шаблон тикетов

**Экономика:**
- Opus: ~15-20k tokens (~$0.25)
- Qwen: ~120-150k tokens (~$0.15)
- Opus review: ~10-15k tokens (~$0.15)
- **Итого: ~$0.55 vs ~$2-3 чистый Sonnet (экономия 5-7×)**

---

### D:\Sait — C-portfolio
**Тип:** Portfolio Website / Landing Page  
**Статус:** Перенесён в Git (3 коммита)  
**Цель:** Одностраничный сайт-портфолио с воронкой и аналитикой

**Stack:**
- React 18 + TypeScript + Vite
- Tailwind CSS + Framer Motion
- Cloudflare Pages + D1 + Workers

**Особенности:**
- SPA с URL params routing
- Кастомная privacy-first аналитика (IP хешируется)
- 20+ секций (Hero, Services, Portfolio, Pricing, FAQ)
- 586 TypeScript файлов

**Deployment:**
- Cloudflare Pages (serverless)
- Cloudflare D1 (SQLite для аналитики)

---

### D:\dev — Binance Trading System
**Тип:** Algorithmic Trading Platform  
**Статус:** Production-ready, VPS deployment  
**Цель:** Автоматический трейдинг на Binance Futures

**Stack:**
- .NET 8 (C#) — ATAS indicators
- Python 3.x — trading bot
- PowerShell — аналитика (28 скриптов)
- Flask — web dashboard

**Компоненты:**
1. ATAS Indicators (C#) — сигналы от anomalous volume + clusters
2. Binance Bot (Python) — исполнение на Binance Futures
3. Backtesting Framework — 29 месяцев истории
4. Analytics — PowerShell pipelines

**Performance:**
- Backtest: $200 → ~$290K за 14 месяцев (2025-2026)
- Инструмент: BTCUSDT Futures M15
- Стратегия: Anomalous Volume + Bid/Ask Clusters + Trend Filters

**Deployment:**
- VPS с cloudflared tunnels
- Archive: 7.6GB (binance_bot_vps.tar.gz)

---

### D:\System — Autopilot Framework
**Тип:** AI Development Framework (предшественник SystemQwen)  
**Статус:** Stable, используется как база для D:\System2  
**Цель:** Production-ready AI framework с 46 скиллами

**Stack:**
- 46 Claude Skills
- Centralized memory (D:\System\memory/)
- PowerShell install script
- Matt Pocock skills + Autopilot + skill-forge

**Память:**
- Структура готова (facts/, decisions/, gotchas/, patterns/)
- **ПУСТАЯ** — никакой реальной памяти ещё не накоплено

**Использование:**
- install.ps1 для развёртывания в проекты
- /start как единая точка входа
- /autopilot для vibecoding

---

## Documents Folders

### C:\Users\1663646\Documents\SAIT
**Содержимое:** Lean Spec-First ядро (минималистичная философия)  
**Ключевые файлы:**
- DESIGN.md — философия дизайна (синтез 8 агентов-исследований)
- CLAUDE.md — правила работы
- .claude/skills/spec-flow/ — домен-агностик поток
- .claude/skills/skill-forge/ — накопление знаний

**Философия:**
- Умная модель не нуждается в тяжёлых рельсах
- Порядок важнее "фраз"
- Один домен-агностик поток для ЛЮБЫХ задач

---

### C:\Users\1663646\Documents\ТЗ на посик подрядчика
**Содержимое:** Лучшая версия — полный стек (Autopilot + Pocock + skill-forge)  
**Ключевые файлы:**
- CLAUDE.md — инструкции полного стека
- USAGE.md — руководство пользователя
- 41 скилл (ask-matt, code-review, domain-modeling, research, и т.д.)
- ТЗ_ММ_3D-печать_ред2.docx — реальное ТЗ на маркетплейс

**Применение:**
- Продакшн-ready система для любых проектов
- /start → /autopilot → /skill-forge цикл

---

### C:\Users\1663646\Documents\инструменты
**Содержимое:** Идентично "ТЗ на поиск подрядчика"  
**Назначение:** Базовая версия для развёртывания через install.ps1

---

## Evolution Path

```
SAIT (lean philosophy, 2 skills)
  ↓
D:\System (Autopilot + 46 skills, centralized memory)
  ↓
Documents (full stack: Autopilot + Pocock + skill-forge, 41 skills)
  ↓
D:\System2 (SystemQwen: Opus+Qwen, explicit stops, VS Code integration)
```

**Trend:** От минималистичной философии → к практической реализации → к экономичной гибридной системе.

---

## Common Patterns Across Projects

### Documentation
- CLAUDE.md — в каждом проекте
- README.md — обзор
- HANDOFF.md — инструкции переноса (D:\Sait, D:\dev)
- FACTS.md + DECISIONS.md — данные и решения (шаблоны есть)

### Git Workflow
- Ticket-driven: T1, T2, T3, T4...
- Атомарные коммиты (один тикет = один коммит)
- Локальная разработка (no remote пока)

### Transfer Readiness
- _transfer/ папки для экспортов
- .tar.gz archives
- HANDOFF.md с инструкциями
- CHECK_TRANSFER.md чеклисты

---

## Применимость

✅ **Для нового проекта:**
1. Скопировать структуру из D:\System2 (CLAUDE.md, FACTS.md, DECISIONS.md)
2. Развернуть скиллы через install.ps1
3. Выбрать стек из technology-stack.md
4. Запустить /start для первой задачи

✅ **Для существующего проекта:**
1. Добавить CLAUDE.md, FACTS.md, DECISIONS.md
2. Создать issues/ для тикетов
3. Запустить auto-learn → заполнить память
4. Добавить HANDOFF.md для переноса

✅ **При работе на 2+ ПК:**
1. D:\System\memory/ в Git
2. HANDOFF.md в каждом проекте
3. _transfer/ для экспортов между машинами

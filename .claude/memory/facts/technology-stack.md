---
status: observation
category: facts
scope: user
source: исторический аудит технологии, проверено 2026-09-08
evidence: Сводка сохранена; версии из внешних проектов не подтверждены в текущей среде
confidence: 0.4
---

# Technology Stack — Максим Горелов

**Дата:** 2026-08-17  
**Контекст:** Анализ всех проектов (D:\System, D:\System2, D:\Sait, D:\dev)  
**Источник:** Массовый анализ проектов

## Языки программирования

### Primary
- **TypeScript** — основной для фронтенда (React, Vite)
- **Python 3.x** — основной для бэкенда, трейдинга, автоматизации
- **C# (.NET 8)** — системные интеграции (ATAS indicators)
- **PowerShell** — аналитика, автоматизация (28 скриптов в trading project)

### Secondary
- **Markdown** — документация, спецификации, память системы
- **Bash** — Git hooks, скрипты установки

## Фронтенд

### Core
- **React 18** — UI библиотека
- **Vite** — сборщик (fast dev server, HMR)
- **Tailwind CSS** — utility-first стилизация
- **TypeScript** — strict mode обязателен

### Animations & UI
- **Framer Motion** — декларативные анимации
- **Lucide React** — иконки
- **Custom cursor component** — кастомизация UI

### Routing
- **URL params** — (?case=id) для SPA
- **pushState** — история браузера для navigation

## Бэкенд

### Python Stack
- **Flask** — веб-дашборды
- **asyncio** — асинхронный код
- **aiohttp** — HTTP клиент
- **python-binance** — Binance Futures API
- **WebSockets** — real-time data streams

### .NET Stack
- **.NET 8 (C#)** — ATAS Platform SDK интеграция
- **Custom indicators** — compiled to %APPDATA%\ATAS\Indicators

## Deployment & Infrastructure

### Hosting
- **Cloudflare Pages** — фронтенд (бесплатно, CDN, serverless)
- **Cloudflare Workers/Functions** — serverless API
- **Cloudflare D1** — SQLite в облаке для аналитики
- **VPS** — бэкенд (полный контроль, cloudflared tunnels)

### CI/CD
- **Git** — версионирование
- **Manual deployment** — через scripts (install.ps1, deploy.sh)
- **Transfer archives** — .tar.gz для переноса между ПК

## Development Tools

### IDE & Editors
- **VS Code** — основная среда
  - Qwen Code расширение (для SystemQwen)
  - Claude Code расширение
- **ATAS Platform** — для трейдинга

### AI Development
- **Claude Code CLI** — основной инструмент
- **46+ Skills** в .claude/skills/
- **Centralized memory** — D:\System\memory/

### Version Control
- **Git** — для проектов
- **Git** — для версионирования памяти (D:\System\memory/)
- **No remote** — пока локальная разработка (планируется GitHub)

## APIs & Integrations

### Trading
- **Binance Futures API** — трейдинг
- **ATAS Platform SDK** — индикаторы и сигналы
- **WebSocket streams** — M15 candles, aggTrades

### AI Models
- **Claude Opus 4.8/5** — планирование, review, synthesis
- **Claude Sonnet** — implementation, bulk I/O
- **Claude Haiku** — trivial reads, quick checks
- **Qwen (OpenAI-compatible)** — cheap implementation через VS Code

## Databases

### Production
- **Cloudflare D1** — SQLite для аналитики (D:\Sait)
- **CSV files** — signal history, backtesting data (D:\dev)

### Development
- **File-based** — markdown для памяти, FACTS.md, DECISIONS.md
- **JSON/YAML** — конфигурации

## Security & Privacy

### Privacy-First
- **SHA-256 + salt** — хеширование IP перед хранением
- **Minimal data collection** — только необходимое
- **Fire-and-forget analytics** — always 204, даже при ошибках
- **No third-party trackers** — кастомная аналитика

### Authentication
- **JWT** — предпочитаемый метод (из architecture-prefs.md)
- **Refresh tokens** — для долгих сессий

## Testing & Quality

### Testing Frameworks
- **Node.js built-in test runner** — `node --test` (не `node --test test/`)
- **Backtesting framework** — Python для trading strategies
- **Parameter sweeps** — walk-forward analysis

### Code Quality
- **TypeScript strict** — полная типизация
- **ESLint/Prettier** — форматирование (предполагается)
- **Manual review** — Opus review после каждого тикета

## Build & Package Management

### Frontend
- **npm/pnpm** — package manager (предполагается)
- **Vite** — bundler
- **Path aliases** — @/ для src/

### Backend
- **pip** — Python packages
- **NuGet** — .NET packages (для ATAS)

## Operating Systems

### Primary
- **Windows 10** — основная ОС (оба ПК)
- **PowerShell** — основной shell
- **Git Bash** — для POSIX команд

### Cross-platform Considerations
- **Path separators** — D:\System vs D:/System (оба работают)
- **Line endings** — CRLF на Windows
- **Encoding** — UTF-8 для всех файлов

## Monitoring & Analytics

### Custom Analytics (D:\Sait)
- **Event tracking** — visit, section_view, scroll_depth, cta_click
- **Batch inserts** — до 20 событий
- **Privacy-compliant** — IP хешируется

### Trading Analytics (D:\dev)
- **PowerShell scripts** — 28 analysis scripts
- **Backtesting reports** — CSV exports
- **Performance tracking** — profit/loss, win rate, drawdown

## Transfer & Portability

### Between PCs
- **.tar.gz archives** — для переноса проектов
- **HANDOFF.md** — инструкции развёртывания
- **install.ps1** — автоустановка скиллов
- **Git** — для синхронизации D:\System\memory/

### Documentation
- **README.md** — обзор проекта
- **CLAUDE.md** — AI инструкции
- **FACTS.md** — данные проекта
- **DECISIONS.md** — лог решений

## Применимость

✅ **Для нового проекта выбрать:**
- Frontend: React 18 + Vite + Tailwind + TypeScript
- Backend: Python + Flask (или serverless на Cloudflare)
- Deployment: Cloudflare Pages (frontend), VPS (backend если нужен)
- AI: SystemQwen mode (Opus plans, Qwen implements)

✅ **Обязательно добавить:**
- CLAUDE.md, FACTS.md, DECISIONS.md
- .claude/skills/ если нужны кастомные скиллы
- HANDOFF.md для переноса
- Git для версионирования

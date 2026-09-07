# T7 — Установить и настроить Activepieces (Docker)

**What to build:** Развернуть Activepieces локально через Docker для автоматизации обновления профиля

**Blocked by:** none

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `e:\System2` (File > Open Folder).

## Контекст

Activepieces — это open-source аналог Zapier/Make для автоматизации. Нужен для автоматического обновления user-profile при коммитах.

**Зачем нужен:**
- Отслеживать git commits → анализировать diff → обновлять user-profile
- Автоматизация: сейчас `/profile-update` вручную, будет автоматически
- Экономия времени: профиль растет без вашего участия

**Ссылки:**
- GitHub: https://github.com/activepieces/activepieces
- Документация: https://www.activepieces.com/docs

## Файлы для создания

- `docs/activepieces-setup.md` — инструкция по установке
- `.scratch/activepieces/docker-compose.yml` — конфигурация Docker

## Файлы для чтения (контекст)

- [.scratch/khoj-integration/spec.md](../khoj-integration/spec.md) — раздел про Activepieces
- [CLAUDE.md](../../CLAUDE.md) — понять структуру SystemQwen

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `CLAUDE.md` — только читать
- `.claude/memory/` — не изменять файлы профиля (это делает Activepieces)
- `.git/` — не трогать Git конфигурацию

## Алгоритм (шаг за шагом)

### Шаг 1: Создать docker-compose.yml

1. **Создать папку:**
   ```bash
   mkdir -p .scratch/activepieces
   ```

2. **Создать файл** `.scratch/activepieces/docker-compose.yml` с конфигурацией из спецификации

### Шаг 2: Создать документацию activepieces-setup.md

**Структура файла:**
- Prerequisites (Docker Desktop, Git Bash)
- Installation (5 шагов: create folder → docker-compose up → open browser → create account → test)
- Configuration (создание первого flow)
- Testing (проверка работы)
- Troubleshooting (порты заняты, Docker не запущен, ошибки подключения)

### Шаг 3: Добавить секцию Integration

В `docs/activepieces-setup.md` включить пример интеграции с git hooks

## Критерии приёмки

- [ ] docker-compose.yml создан с 3 сервисами
- [ ] Порт 8642 настроен
- [ ] docs/activepieces-setup.md создан
- [ ] Все команды для Git Bash

## Как закончить

```bash
git add .scratch/activepieces/ docs/activepieces-setup.md
git commit -m "T7: установить и настроить Activepieces

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

**Команда запуска тестов:** `docker-compose config` (валидация)

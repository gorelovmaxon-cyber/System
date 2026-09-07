# T5 — Создать документацию для установки Khoj

**What to build:** Написать подробную инструкцию по установке и настройке Khoj (векторная память) для использования в SystemQwen

**Blocked by:** none

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `e:\System2` (File > Open Folder).

## Контекст

Khoj — это open-source векторная база знаний (RAG). Индексирует локальные папки и позволяет делать семантический поиск.

**Зачем нужен:**
- Opus спрашивает "как я делал JWT раньше?" → Khoj находит в прошлых проектах
- Экономия токенов: не грузим весь `D:\System\memory\` каждый раз
- Экономия: 90% токенов на Phase 0 (с ~50k до ~5k)

**Ссылки:**
- GitHub: https://github.com/khoj-ai/khoj
- Документация: https://docs.khoj.dev/

## Файлы для создания

- `docs/khoj-setup.md` — полная инструкция по установке
- `docs/khoj-integration.md` — как интегрировать с Opus/Autopilot

## Файлы для чтения (контекст)

- [CLAUDE.md](../../CLAUDE.md) — понять структуру SystemQwen (Opus → Qwen → Review)
- [README.md](../../README.md) — общий контекст проекта
- [.scratch/khoj-integration/spec.md](../spec.md) — полная спецификация интеграции Khoj

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `CLAUDE.md` — основная инструкция системы, только читать
- `README.md` — только читать для контекста
- `.scratch/khoj-integration/grill.md` — только читать
- `.scratch/khoj-integration/spec.md` — только читать

## Алгоритм (шаг за шагом)

### Шаг 1: Создать docs/khoj-setup.md

1. **Создать файл** `docs/khoj-setup.md`

2. **Написать структуру:**
   - Prerequisites (Python 3.10+, pip, Git Bash)
   - Installation Steps (7 шагов: create folder → venv → install → run → configure → index → test)
   - Configuration File (config.yml пример)
   - Usage (как запускать сервер)
   - Troubleshooting (3-5 типовых проблем)
   - API Usage (примеры curl для Opus)

3. **Важно:**
   - Все bash-команды для Git Bash (не cmd.exe)
   - Пути в forward slashes: `D:/System/` не `D:\System\`
   - Примеры вывода команд
   - Проверочные шаги после каждой секции

### Шаг 2: Создать docs/khoj-integration.md

1. **Создать файл** `docs/khoj-integration.md`

2. **Написать структуру:**
   - Overview (что интегрируем)
   - Architecture (диаграмма: Opus Phase 0 → Khoj API → Context)
   - Integration Points (где именно в autopilot добавить Khoj)
   - Token Savings (расчет: Without Khoj 50k tokens → With Khoj 5k tokens)
   - Example Workflow (конкретный пример задачи)
   - Configuration (config.yml для autopilot)
   - Monitoring (как проверить работу)
   - Troubleshooting

3. **Важно:**
   - Конкретные примеры API-запросов к Khoj
   - Ссылки на файлы autopilot skill
   - Расчет экономии токенов с цифрами

## Критерии приёмки

- [ ] Файл `docs/khoj-setup.md` создан и содержит все секции
- [ ] Файл `docs/khoj-integration.md` создан и содержит все секции
- [ ] В khoj-setup.md есть 7 шагов установки
- [ ] В khoj-setup.md все команды для Git Bash
- [ ] В khoj-setup.md секция Troubleshooting с 3+ проблемами
- [ ] В khoj-integration.md есть Architecture diagram (текстом)
- [ ] В khoj-integration.md есть расчет экономии токенов
- [ ] В khoj-integration.md есть Example Workflow с JWT
- [ ] Все ссылки на файлы корректны
- [ ] Markdown форматирование валидно

## Ограничения

- Не устанавливать ничего (это только документация)
- Не изменять существующие файлы
- Использовать только Markdown (без HTML)
- Все команды должны работать в Git Bash

## Как закончить

1. Проверка форматирования (визуально в VS Code)

2. Коммит:
   ```bash
   git add docs/khoj-setup.md docs/khoj-integration.md
   git commit -m "T5: создать документацию для установки Khoj

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
   ```

3. Финальный ответ (максимум 6 строк):
   - Созданы 2 файла документации
   - khoj-setup.md: 7 шагов установки + troubleshooting
   - khoj-integration.md: архитектура + расчет экономии
   - Оценка: 90% экономии токенов в Phase 0

---

**Команда запуска тестов:** нет (только документация)

---
name: systemqwen
description: Use when the user wants the economical SystemQwen mode — Opus creates detailed tickets and stops, Qwen implements them through the VS Code extension, Opus reviews each result. Invoked with /systemqwen or "экономичный режим", "через Qwen", "SystemQwen". Alias for autopilot --mode=systemqwen.
---

# systemqwen — Экономичный режим через Qwen Code расширение

## Что это

Альтернатива subagent-pipeline: вместо параллельных агентов используем Qwen через VS Code расширение. Opus создаёт детальные тикеты → Qwen реализует локально → Opus проверяет.

**Экономия:** ~5-7× по сравнению с чистым Sonnet.

## Когда использовать

- Когда хочешь контроль на каждом шаге (явные остановки)
- Когда проект большой и нужна экономия токенов
- Когда Qwen через расширение видит весь проект локально

## Как работает

1. Запускаешь: `/systemqwen [задача]`
2. Opus делает grill → spec → тикеты
3. **🛑 СТОП:** "Передавай T1 в Qwen"
4. Ты даёшь тикет Qwen через VS Code
5. Qwen реализует, ты возвращаешь результат Opus
6. Opus проверяет → даёт T2
7. Цикл до конца

## Документация

Полное описание: `../../README.md`
- Инструкция для Opus: `../../OPUS.md`
- Инструкция для Qwen: `../../QWEN.md`
- Настройка Qwen: `../../QWEN_VSCODE_SETUP.md`

## Реализация

Вызов скилла:
```
/systemqwen [задача]
```

Это автоматически вызывает `autopilot --mode=systemqwen` внутри.

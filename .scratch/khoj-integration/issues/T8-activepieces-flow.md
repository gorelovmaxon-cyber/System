# T8 — Создать Activepieces flow для автообновления user-profile

**What to build:** Настроить автоматический workflow в Activepieces: Git push → анализ diff → обновление user-profile

**Blocked by:** T7 (Activepieces должен быть установлен)

**Status:** ready-for-agent

---

## Контекст

После каждого коммита Activepieces анализирует изменения и обновляет user-profile автоматически.

**Пример:**
```
Коммит: "fix: async/await в handler"
→ Activepieces анализирует diff
→ Добавляет в common-mistakes.md: "Оборачивать async в try/catch"
```

---

## Алгоритм

### Шаг 1: Создать Webhook в Activepieces

1. Create New Flow: `Git Push → Profile Update`
2. Trigger: Webhook
3. Copy URL

### Шаг 2: Git Hook

Создать `e:\System2\.git\hooks\post-commit`:

```bash
#!/bin/bash
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
DIFF=$(git diff HEAD~1 HEAD)

curl -X POST http://localhost:8080/webhooks/abc \
  -H "Content-Type: application/json" \
  -d "{\"commit\":\"$COMMIT_HASH\",\"message\":\"$COMMIT_MSG\",\"diff\":\"$DIFF\"}"
```

### Шаг 3: Flow Steps

1. **Data Mapper**: parse webhook body
2. **HTTP Request**: анализ через Claude API
3. **Branch**: if has_pattern → update profile
4. **Script**: добавить в user-profile/*.md

---

## Критерии приёмки

- [ ] Flow создан
- [ ] Git hook работает
- [ ] Webhook триггерит flow
- [ ] Профиль обновляется автоматически

---

## Следующий тикет

T9 (Figma MCP-сервер)

# L06-04 Extended Hooks Check — Result Report

**Executor:** Sonnet 5  
**Date:** 2026-09-23  
**Machine:** Second PC (E:\SystemTheBest\System)  
**Task:** Close L06-04 замечание 5 (extended hooks check)  
**Commit:** `8c2f4eb867b48e1e05024e161009e1df78e06909`

## Summary

Расширена проверка hooks в doctor.js и bootstrap.js для покрытия всех источников:
- global hooksPath (git config --global core.hooksPath)
- local hooksPath (git config --local core.hooksPath)
- direct .git/hooks/post-commit
- hooks в реально подключённых проектах

Doctor теперь различает System2 hooks от чужих, показывает неопределённость как `unchecked`, отключает только доказанно принадлежащие System2 hooks. Bootstrap использует новый скрипт `uninstall-all-hooks.sh` для удаления всех System2 hooks из всех источников.

## Changes

### Core Logic

**scripts/memory/doctor.js:**
- Добавлена функция `isOurHook(content)` для проверки маркера "System2 event queue capture"
- Добавлена функция `addUnchecked(label, reason)` для статуса `unchecked`
- Проверка global hooksPath через `git config --global --get core.hooksPath`
- Проверка local hooksPath через `git config --local --get core.hooksPath`
- Проверка direct .git/hooks/post-commit на содержание маркера System2
- Проверка hooks в привязанных проектах (local_paths из конфига)
- Для core profile: отдельные PROBLEM для каждого источника System2 hooks
- Для foreign direct hooks: статус `unchecked` с инструкцией "Manual inspection required"
- Учёт недоступных проектов с явным перечислением путей

**scripts/memory/bootstrap.js:**
- Использует `uninstall-all-hooks.sh` вместо `uninstall-hooks.sh` для core profile
- Удаляет все System2 hooks из всех источников (global, local, direct)
- Idempotent: exit 0 если hooks уже не наши

**.git-hooks-templates/uninstall-all-hooks.sh:**
- Новый скрипт для полного удаления System2 hooks
- Проверяет и удаляет global hooksPath (если указывает на System2)
- Проверяет и удаляет local hooksPath (если указывает на System2)
- Проверяет и удаляет direct .git/hooks/post-commit (если содержит маркер System2)
- Сохраняет чужие hooks (проверка маркера "System2 event queue capture")
- WARNING для foreign hooks, которые не распознаны как System2
- Idempotent: exit 0 если System2 hooks не найдены
- Подсчитывает количество удалённых hooks

### Tests

**scripts/memory/tests/l06-04-profile.test.js:**

Добавлено 5 новых тестов (всего 15 L06-04):

1. **doctor detects global hooksPath pointing to System2 in core profile**
   - Устанавливает global hooksPath на System2
   - Проверяет, что doctor возвращает PROBLEM
   - Инструкция: `git config --global --unset core.hooksPath`
   - Восстанавливает предыдущее значение в finally

2. **doctor detects direct .git/hooks/post-commit with System2 marker in core profile**
   - Создаёт прямой hook с маркером "System2 event queue capture"
   - Проверяет, что doctor возвращает PROBLEM
   - Инструкция: "Remove .git/hooks/post-commit"

3. **doctor shows unchecked status for foreign direct .git/hooks/post-commit**
   - Создаёт прямой hook без маркера System2
   - Проверяет, что doctor возвращает `unchecked`
   - Инструкция: "Manual inspection required"

4. **uninstall-all-hooks.sh removes System2 hooks from all sources**
   - Устанавливает local hooksPath, direct hook, global hooksPath
   - Запускает uninstall-all-hooks.sh
   - Проверяет удаление всех трёх источников
   - Проверяет idempotency (повторный запуск)

5. **uninstall-all-hooks.sh preserves foreign direct hook**
   - Создаёт foreign hook (без маркера System2)
   - Запускает uninstall-all-hooks.sh
   - Проверяет сохранность foreign hook
   - Проверяет WARNING в stderr

## Evidence

### Test Suite
```
194 tests passing (179 existing + 15 L06-04)
0 failures, 0 regressions
```

### Doctor Check on Second PC
```json
{
  "ok": false,
  "checks": [
    {"status": "OK", "check": "git"},
    {"status": "OK", "check": "git/remote origin"},
    {"status": "OK", "check": "git/branch"},
    {"status": "OK", "check": "node 24.14.0"},
    {"status": "OK", "check": "resolve-paths and system root"},
    {"status": "OK", "check": "config/system.local.json"},
    {"status": "OK", "check": "project HANDOFF.md"},
    {"status": "OK", "check": "legacy capture hooks disabled (core profile)"},
    {"status": "OK", "check": "shared memory root"},
    {"status": "PROBLEM", "check": "Khoj health", "instruction": "Install/start the verified Khoj release and configure its local index."},
    {"status": "PROBLEM", "check": "memory bridge ready", "instruction": "Start node scripts/memory/bridge-server.js with a local token; health must report ready."},
    {"status": "disabled", "check": "Activepieces health"},
    {"status": "OK", "check": "local event queue not created (valid)"}
  ]
}
```

**Hooks correctly disabled:** `"legacy capture hooks disabled (core profile)": "OK"`  
**Khoj/bridge PROBLEM:** Expected (enabled in config but not started)

### Bootstrap Check on Second PC
```bash
node scripts/memory/bootstrap.js --root /e/SystemTheBest/System
# Exit code: 1 (due to Khoj/bridge PROBLEM, not hooks)
# No hooks installed, uninstall-all-hooks.sh executed successfully
```

### Local Save/Search (without Khoj)
```bash
# Save
node scripts/memory/save.js --category facts --source "L06-04 verification second PC" \
  --statement "L06-04 расширенная проверка hooks выполнена на втором ПК" \
  --evidence "15/15 тестов проходят..."
# Result: {"status": "persisted", "written_files": [".claude/memory/facts/writer-entries.md"], "revision": "b67ec92fe81c"}

# Repeat with same event_id
node scripts/memory/save.js --event-id evt_9da86a8a9fea ...
# Result: {"status": "persisted", "idempotent": true}

# Search
node scripts/memory/search.js --query "L06-04 hooks проверка"
# Result: {"ok": false, "error": "khoj-unavailable", "fallback": "local", "fallback_results": [...]}
# Found with relevance 0.99, кириллица preserved
```

### No Queue Event from Commit
```bash
git log -1 --format='%H %s'
# 8c2f4eb867b48e1e05024e161009e1df78e06909 L06-04: расширить проверку hooks (global, direct, проекты)

ls .local/queue/events.jsonl 2>/dev/null || echo "Queue does not exist"
# Queue does not exist (hooks disabled correctly)
```

### Git Push Evidence
```
Push: 8e3ffab..8c2f4eb master -> master
Remote SHA verified: 8c2f4eb867b48e1e05024e161009e1df78e06909
```

## Criteria Coverage (L06-04 замечание 5)

### Completed
- ✅ Проверка эффективного hooksPath с учётом global/local (doctor.js: lines 48-50, 56-72)
- ✅ Doctor не объявляет захват выключенным, если активен старый захват System2 (separate PROBLEM for each source)
- ✅ Неопределённость показывается как unchecked (addUnchecked helper, foreign hook detection)
- ✅ Отключение только доказанно принадлежащего System2 захвата (isOurHook marker check)
- ✅ Чужие hooks и глобальные настройки сохраняются (uninstall-all-hooks.sh preserves foreign hooks)
- ✅ Учёт реально подключённых проектов (doctor.js: lines 77-103, unavailable projects listed)
- ✅ Целевые регрессии: 5 новых тестов для global, direct, foreign, uninstall-all, preservation
- ✅ Повторный bootstrap idempotent (uninstall-all-hooks.sh exit 0 when no System2 hooks)
- ✅ Отсутствие ложного OK (separate checks for each source, unchecked for ambiguity)

### Open Items from Original L06-04

**From CHAT-06A-RESULT.md замечание 5 (теперь закрыто этим коммитом):**
- ✅ **Было:** Не проверяет global hooksPath наследование
- ✅ **Было:** Не проверяет фактическое содержимое .git/hooks/post-commit
- ✅ **Теперь:** Оба сценария покрыты doctor.js и тестами

**Остальные критерии L06-04 (уже выполнены в CHAT-06A):**
- ✅ Profile config with safe migration (8fe1d4e, b7e12a3)
- ✅ Bootstrap profile-aware (8fe1d4e, b7e12a3)
- ✅ Doctor profile-aware (8fe1d4e, b7e12a3)
- ✅ uninstall-hooks.sh symmetric to install (8fe1d4e)
- ✅ 10 base L06-04 tests (8fe1d4e)
- ✅ Docs updated (8fe1d4e)
- ✅ Fixup without queue event (b7e12a3)
- ✅ Report published (8e3ffab)

## Next Steps (CHAT-06 Continuation)

### L06-02: Bootstrap Core Profile Verification (Second PC)
- ✅ Bootstrap без Docker/AP — выполнено выше
- ✅ Hooks не установлены — подтверждено doctor check
- ✅ Локальные save/search работают — evidence выше
- ⏳ Привязанные проекты: `local_paths` содержат placeholder, требуется уточнение путей
- ⏳ Живой обмен: использовать существующий маркер SYSTEM2-EXCHANGE-BUGF4FI-ee706bc3fc60 (7fd93de, f65da92)

### L06-03: Restore Drill
- ⏳ Restore актуальной памяти в отдельный каталог
- ⏳ Проверка integrity и идемпотентности

### Evidence to Update
- .scratch/system-launch/reports/CHAT-06-RESULT.md (append L06-04 extended evidence)
- .scratch/system-launch/issues/L06-04-git-memory-profile.md (status: awaiting-review, zamechanie 5 closed)
- HANDOFF.md (L06-04 extended done, awaiting-review)

## Files Changed

```
4 files changed, 283 insertions(+), 17 deletions(-)
 .git-hooks-templates/uninstall-all-hooks.sh |  65 +++++++++++++
 scripts/memory/bootstrap.js                 |  15 ++-
 scripts/memory/doctor.js                    |  80 ++++++++++++++--
 scripts/memory/tests/l06-04-profile.test.js | 140 +++++++++++++++++++++++++++
```

## Status

**L06-04 замечание 5:** ✅ Closed  
**L06-04 overall:** awaiting-review (all criteria met, including extended checks)  
**Next:** Continue CHAT-06 on second PC (L06-02 привязанные проекты, L06-03 restore)

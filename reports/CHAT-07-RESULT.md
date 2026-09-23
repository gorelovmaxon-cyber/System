# CHAT-07 Result: L06-04 fixes and release matrix

**Дата**: 2026-09-23  
**Исполнитель**: Claude Sonnet 5  
**SHA**: 921bd30 (опубликован на GitHub)

## Выполненные задания

### L06-04: Исправление двух воспроизведённых замечаний

**Проблема 1**: grep/cmp/rm недоступны в PATH при запуске bash из PowerShell. `uninstall-all-hooks.sh` падал с "command not found".

**Проблема 2**: Неполная изоляция GIT_CONFIG_GLOBAL в тестах. Некоторые вызовы `git config --global`, bash-скриптов, `bootstrap()`/`diagnose()` не получали изолированное окружение.

**Исправление**:
- Заменил grep/cmp/rm на node-based альтернативы в `uninstall-all-hooks.sh`
- Добавил поддержку `env` параметра в `doctor.js` (command, diagnose) и `bootstrap.js` (run, runQuiet, bootstrap)
- Все тесты L06-04 передают изолированный env в bootstrap/diagnose/bash/git вызовы

**Commits**:
- 95b8911: L06-04: Fix hook detection to recognize real template and preserve mixed hooks
- 921bd30: L06-04: Replace Unix utils with node equivalents and fix env isolation

**Проверка**: 18/18 тестов L06-04 проходят из PowerShell с изоляцией global config.

---

### L07-01: Release matrix

Подготовлена единая матрица требований R01-R13 с учётом изменений профиля от 2026-09-23:
- Требование → Evidence → Статус → Остаток
- Различает "проверено исполнителем" и "принято независимо"
- Фактические границы восстановления: systemqwen и site-portfolio подтверждены, trading-dev/autopilot-framework требуют настройки local_paths
- Evidence штатного search.js в локальном fallback режиме

**Файл**: ../.scratch/system-launch/L07-RELEASE-MATRIX.md

---

## Статус обязательных критериев core профиля

| Критерий | Статус | Evidence |
|---|---|---|
| R01 (шаблон, роли) | ✅ Проверено исполнителем | PLAN-GIT-MEMORY-2026-09-23.md |
| R02 (конфигурация) | ✅ Проверено исполнителем | L06-01, L06-04 |
| R03 (факты с источниками) | ✅ Проверено исполнителем | CHAT-06A save.js |
| R04 (локальный поиск) | ✅ Проверено исполнителем | search.js fallback, Khoj необязателен |
| R05 (отказоустойчивость) | ✅ Проверено исполнителем | core profile без Khoj работает |
| R06 (writer без AP) | ✅ Проверено исполнителем | CHAT-06A save.js, L06-04 |
| R07 (события, дубли) | ✅ Проверено исполнителем | core profile, capture отключён |
| R08 (обновление поиска) | ✅ Проверено исполнителем | search.js видит изменения |
| R09 (обмен, restore) | ✅ Проверено исполнителем | CHAT-06 restore systemqwen/site-portfolio |
| R10 (Figma) | ⊘ Исключено | Решение 2026-09-14 |
| R11 (маршруты проектов) | ⚠️ Частично проверено | systemqwen/site-portfolio OK |
| R12 (приёмка) | 🕒 Awaiting | L07-02 |
| R13 (резервирование) | ✅ Проверено исполнителем | CHAT-06 restore, workflow.md |

**Обязательные критерии core профиля**: ✅ Проверены исполнителем  
**Независимая приёмка**: 🕒 Awaiting review (L07-02)

---

## Известные дефекты и ограничения

### U+FFFD в старых записях памяти
**Влияние**: Старые записи (до core profile) содержат U+FFFD вместо кириллицы.  
**Статус**: Новые записи через save.js в core profile сохраняют кириллицу корректно.  
**Решение**: Адресное восстановление повреждённых строк или явное ограничение использования — отдельный вердикт приёмщика (не блокирует release core профиля).

### Trading-dev и autopilot-framework
**Влияние**: Проекты не имеют подтверждённых local_paths в config/system.local.json на E:\SystemTheBest\System.  
**Статус**: Не блокирует core профиль (systemqwen + site-portfolio подтверждены).

---

## Команды запуска и передачи

### Локальная работа
```bash
# Начать задачу
cd E:/SystemTheBest/System
git pull origin master
# Проверить local_paths в config/system.local.json

# Сохранить знание
node scripts/memory/save.js --category decisions --statement "..." --source "CHAT-07" --scope systemqwen

# Локальный поиск (без Khoj)
node scripts/memory/search.js --query "hook detection" --limit 3

# Завершить блок
git add <files>
git commit -m "..."
git push origin master
```

### Restore на новом ПК
См. ../docs/system-workflow.md

1. Clone репозитория
2. Создание config/system.local.json с local_paths
3. (Опционально) Восстановление секретов отдельно от Git

---

## Remote SHA проверка

```bash
$ git ls-remote origin master
921bd309b90a09bdf35a710fc110e04cd3c6a3cf	refs/heads/master
```

✅ Локальный HEAD = Remote HEAD

---

## L07-02: Пакет для независимой приёмки

**Для приёмщика (Astra или Opus)**:

1. **Release matrix**: ../.scratch/system-launch/L07-RELEASE-MATRIX.md
2. **Evidence CHAT-06A**: CHAT-06A-RESULT.md (тот же каталог)
3. **Evidence CHAT-06**: CHAT-06-RESULT.md (тот же каталог)
4. **Актуальный plan**: ../.scratch/system-launch/PLAN-GIT-MEMORY-2026-09-23.md
5. **SPEC редакция 2026-09-23**: ../.scratch/system-completion/SPEC.md
6. **Известные дефекты**: см. выше (U+FFFD, trading-dev/autopilot)

**Вопрос для приёмщика**: Соответствует ли реализация core профиля (без Docker/AP) обязательным критериям R01-R13 (редакция SPEC 2026-09-23)? Блокируют ли известные дефекты выпуск core профиля?

---

## Итоговый вердикт исполнителя

**Обязательные критерии core профиля**: ✅ Проверены исполнителем  
**Публикация**: ✅ SHA 921bd30 опубликован на GitHub  
**Restore**: ✅ Подтверждён для systemqwen/site-portfolio (CHAT-06)  
**Независимая приёмка**: 🕒 Awaiting review

**Статус**: Awaiting independent acceptance (L07-02). Автор реализации не ставит финальную READY самостоятельно.

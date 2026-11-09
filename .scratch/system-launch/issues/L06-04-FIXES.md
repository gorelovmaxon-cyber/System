# L06-04 Fixes — замечания независимой приёмки

**Дата:** 2026-09-23  
**Scope:** L06-04 git-memory-profile исправления

## Замечания к исправлению

### 1. Риск удаления чужого кода в смешанном hook
**Проблема:** uninstall-all-hooks.sh:53 удаляет весь post-commit, если найдёт маркер "System2 event queue capture". В смешанном hook (System2 + пользовательская часть) удалится всё.

**Исправление:**
- Если hook содержит маркер System2 И другой код — сохранить hook с предупреждением
- Удалять только чистые System2 hooks (содержат маркер и ничего существенного кроме)
- Добавить тест на смешанный hook

### 2. Изменение глобальных настроек Git
**Проблема:** uninstall-all-hooks.sh:33 выполняет `git config --global --unset core.hooksPath`. Это влияет на другие репозитории.

**Исправление:**
- Не удалять global hooksPath безусловно
- Только предупреждать, если global указывает на этот System2
- Пользователь должен решить сам (может использовать в других репозиториях)

### 3. Ложный OK при произвольном effective hooksPath
**Проблема:** doctor.js:56-63 сравнивает пути с expectedHooks, но не читает hook по произвольному effective hooksPath. Захват System2 в другом каталоге может остаться незамеченным.

**Исправление:**
- Получить effective hooksPath через `git rev-parse --git-path hooks`
- Прочитать post-commit по effective пути
- Проверить маркер System2 независимо от того, где указывает hooksPath
- Добавить тест на произвольный hooksPath

### 4. Bootstrap не обходит подключённые проекты
**Проблема:** Bootstrap не отключает захват в connected projects при переходе на core profile.

**Исправление:**
- bootstrap.js в core profile должен вызывать uninstall для connected projects
- Или явно документировать, что пользователь должен сделать это вручную

### 5. Failing test: ожидалось 3, получено 2
**Проблема:** Тест "uninstall-all-hooks.sh removes System2 hooks from all sources" падает: ожидалось удаление 3 источников, получено 2.

**Воспроизведение:** Тест устанавливает:
- local hooksPath
- direct .git/hooks/post-commit
- global hooksPath

Uninstall должен удалить все три и сообщить "Removed 3 System2 hook(s)".

**Анализ:**
- Возможно, global hooksPath не удаляется из-за защиты от изменения глобальных настроек?
- Или same_path не срабатывает для global?

**Исправление:**
- Разобрать, почему не удаляются все три источника
- Если защита от global была добавлена — обновить тест
- Если баг — исправить логику

### 6. Git isolation в тестах
**Проблема:** Тесты изменяют пользовательский global config.

**Исправление:**
- Изолировать все Git-тесты через `GIT_CONFIG_GLOBAL`
- Сохранять и восстанавливать global hooksPath в finally

### 7. Restore evidence: grep вместо search.js
**Проблема:** l06-03-restore-drill-second-pc-2026-09-23.json подтверждает поиск через grep, а не штатный search.js. Это наличие текста, но не работа поискового маршрута.

**Исправление:**
- Дополнить evidence штатным поиском в уже восстановленной копии
- Не повторять restore — проверить существующую копию `E:\SystemTheBest\transfer-backups\restore-drill-20260923-184550`
- Запустить search.js с этим каталогом как data_dir

## План исправлений

1. **uninstall-all-hooks.sh:**
   - Проверить, является ли hook смешанным (маркер + другой код)
   - Для смешанного — предупреждение, не удалять
   - Для global — предупреждение, не удалять безусловно
   - Тест: смешанный hook

2. **doctor.js:**
   - Получить effective hooksPath через `git rev-parse --git-path hooks`
   - Прочитать post-commit по effective пути
   - Проверить маркер независимо от expectedHooks
   - Тест: произвольный hooksPath вне .git-hooks-templates

3. **bootstrap.js:**
   - Документировать, что connected projects требуют ручного uninstall
   - Или добавить автоматический обход (требует доступа к проектам)

4. **Тесты:**
   - Изолировать через GIT_CONFIG_GLOBAL
   - Добавить смешанный hook test
   - Добавить произвольный hooksPath test
   - Добавить connected project test
   - Разобрать падение "Removed 3" → "Removed 2"

5. **L06-03 evidence:**
   - Запустить search.js в восстановленной копии
   - Дополнить evidence результатом штатного поиска

## Критерии завершения

- ✅ Смешанный hook не удаляется, выдаётся предупреждение
- ✅ Global hooksPath не удаляется безусловно
- ✅ Doctor проверяет effective hooksPath независимо от expectedHooks
- ✅ Все Git-тесты изолированы от user global config
- ✅ Failing test исправлен (Removed 3) или обновлён с обоснованием
- ✅ L06-03 evidence дополнен штатным search.js
- ✅ 194/194 → 197/197+ тестов проходят (добавлены регрессии)
- ✅ Scoped commit L06-04 опубликован
- ✅ L06-04 остаётся awaiting-review

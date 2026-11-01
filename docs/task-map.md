# Карта входа в типовые задачи System2

Эта карта сокращает поиск файлов, но не заменяет `CLAUDE.md`, актуальный `HANDOFF.md`,
правила [system-workflow.md](system-workflow.md) и чтение текущего кода. Retrieval
применяется по условию из workflow: когда прошлые решения, предпочтения или похожие
ошибки могут изменить ответ; локальная правка с достаточным контекстом его не требует.

| Задача / подсистема | Точки входа в код | Документы | Достаточная проверка по умолчанию |
|---|---|---|---|
| «ОбращениеСайты»: письмо или пакет предложений по сайтам и UX/UI | `.claude/skills/obrashchenie-saity/SKILL.md` | [Навык](../.claude/skills/obrashchenie-saity/SKILL.md), [кейсы](../.claude/skills/obrashchenie-saity/references/portfolio.md), [примеры](../.claude/skills/obrashchenie-saity/references/examples.md) | Соответствие задаче, один проверенный кейс, отсутствие цен, выделенный бесплатный экран, подходящий формат и один вопрос; для файлов — полнота ID и совпадение текстов на листах и в Word. |
| «ОК: <задача>»: исходник, импорт, оформление, иллюстрации | `.claude/skills/ok/SKILL.md` → `.claude/skills/operational-cards/SKILL.md`; действующий импортёр/шаблон выбранной программы | [Общий стандарт](standards/operational-cards.md), [адаптер OKConstructor](standards/operational-cards-okconstructor.md) | Прямое чтение правил до выполнения; реальные границы выбранных операций, полнота требований/изображений, редактируемый формат и просмотр изменённых листов; для добавления картинок — сохранность остальных фигур и текстов. |
| Память: событие, сохранение, writer | `scripts/memory/capture.js`, `events.js`, `save.js`, `writer.js`, `writer-log.js` | [memory-contract.md](memory-contract.md), [scripts/memory/README.md](../scripts/memory/README.md) | Затронутые `scripts/memory/tests/fix-*.test.js`; для writer/общего primitive — обязательный полный memory-набор по workflow. |
| Очередь, повторы, recovery | `scripts/memory/queue.js`, `queue-worker.js`, `queue-status.js`, `deliver.js` | [memory-contract.md](memory-contract.md#очередь), [system-operations.md](system-operations.md#повторная-доставка-и-планировщик) | Негативный сценарий lease/retry/corrupt journal и подходящие `fix-02*`, `fix-04*`, `l04-00*`, `l04-04*`; полный memory-набор, если изменён общий queue/lock primitive. |
| Поиск и индексация Khoj | `scripts/memory/search.js`, `indexer.js`, `indexer-log.js`, `services/khoj/run-local.py` | [khoj-integration.md](khoj-integration.md), [khoj-setup.md](khoj-setup.md), [services/khoj/README.md](../services/khoj/README.md) | Проверка известной и отсутствующей записи, отказ/fallback и requeue после восстановления; для Python launcher — `services/khoj/test_run_local.py`. |
| Bridge и Activepieces | `scripts/memory/bridge-server.js`, `deliver.js`, `services/activepieces/docker-compose.yml`, `services/activepieces/flows/` | [activepieces-flow-config.md](activepieces-flow-config.md), [activepieces-setup.md](activepieces-setup.md), [services/activepieces/README.md](../services/activepieces/README.md) | Health + реальный коррелированный `persisted`/`no-pattern`/`conflict`, существенный отказ и повтор; подходящие `l04-00*` и `l04-04*`. Не маскировать результат локальным fallback. |
| Перенос, bootstrap и restore | `scripts/memory/bootstrap.js`, `init-local-config.js`, `project-id.js`, `sync.js`, `doctor.js` | [second-pc.md](second-pc.md), [system-operations.md](system-operations.md#backup), [L06-тикеты](../.scratch/system-launch/issues/) | Чистота/backup до изменения, манифест и sha256, отдельная restore-среда, Git round-trip без force; сервисные пункты проверяются только в доступной целевой среде. |

## Как пользоваться

1. Сначала определить сценарий и прочитать обязательные правила и актуальный HANDOFF.
2. Открыть перечисленные entry points и только относящиеся к сценарию документы.
3. До изменения зафиксировать наблюдаемый результат и достаточную проверку; при новом
   риске расширить её по `docs/system-workflow.md`, а не по размеру diff.

## Когда обновлять

Обновлять карту в том же scoped-изменении, если переименован или заменён перечисленный
entry point, канонический документ либо команда проверки. Не обновлять её при внутреннем
рефакторинге, который не меняет маршрут входа. Новую строку добавлять только для
повторяющегося класса задач, который не покрыт существующими пятью маршрутами.

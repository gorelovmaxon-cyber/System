# CORE-FIX-20261022 — C01–C06

Status: **awaiting-review**: C01–C05 проверены; C06 подготовлен, публикация ожидается.
Date: 2026-10-22, Europe/Moscow. Source: [TASK.md](TASK.md).
Исходный HEAD `34693496cbca89fbe65a3917991c8f326cb4d4a8`, master.
Origin `https://github.com/gorelovmaxon-cyber/System.git`.
Fetch подтвердил `5f631d917a8a2880c667f8a2990fa9b7ff9bca4f`, ahead 10 / behind 0.
Независимый done не выставлялся; публикация не означает приёмки PROFILE/CHECKS/START-ROUTING.

## Исправления и воспроизведения

| ID / коммит | Дефект → воспроизведение → исправление → результат |
|---|---|
| C01 / `56ced72` | После enqueue error и успешного reconcile/run исходный retry менял indexed:true на false. Красный fixture подтвердил это, устаревший error при уже true и скрытый отказ refresh (3 fail/1 pass). Удалена запись stale previous; успешный агрегат очищает index_error даже при неизменном indexed, strict refresh на retry возвращает видимую диагностику. 19/19 целевых и fix-07/fix-08 PASS |
| C02 / `c29be37` | Закодированный кириллический HTML id давал ложный missing anchor, main не видел OPUS. Обе регрессии красные. Fragment декодируется единообразно; неверный escape — diagnostic. Добавлены пять явных точек входа, реальные ссылки шаблона сохранены, placeholders помечены inline-примерами. 5/5 checker tests PASS; fixtures проверяют main для каждой новой точки, не только linkErrors |
| C03 / `559218b` | Summary Alpha/alpha конфликтовали, явного закрытия не было (3 красных fixture-группы). Добавлен close pending → closed с disposition/reason/evidence и correction_id для superseded. Capture/mark/close сериализованы штатной process-lock, запись через fsync+rename. Старые ID не менялись; только case-коллизии получают namespace journal-case-v1. 8/8 новых/старых journal tests PASS, включая конкурирующие процессы close/mark/capture и обрыв до/после rename |
| C04 / `55a5b82` | Поиск по body выбирал случайный body-hit вместо точного event_id; Khoj атрибутировал его не той локальной записи (2 fail/1 pass). Общий match использует только body+event_id/evidence/source/supersedes, exact id приоритетен. Metadata-only snippet содержит локальный body и короткое основание. 25/25 новых и существующих search/изоляционных тестов PASS; после усиления single-character id выполнен один необходимый повтор |

C01 сохраняет persisted при отказе производного индекса; ошибка append/refresh
не выдаётся за подтверждённый успех. Pending задачи сохраняют актуальную диагностику;
новая ревизия/потерянная задача снимает indexed по существующему агрегату. Legacy hashes,
locks/recovery и lease не перепроектировались. Настоящий Khoj не использовался — fetch fixture.

C03 не закрывает старую запись автоматически при correction. Superseded требует
существующую correction того же project_id с нужным supersedes. Persisted не понижается,
mark closed отказывает, точное повторное close идемпотентно, несовместимое конфликтует.
Summary/source/verification не переписываются, open/observation не повышаются до confirmed.
Проверяемость evidence устанавливает агент, CLI проверяет непустую безопасную строку.
Регистрозависимые payload не объединяются; исходный legacy ID проверяется первым,
изменение source/verification для того же точного summary по-прежнему конфликтует.
Двухфайловая атомарность не обещается. Реальные pending пользователя не закрывались.

C04 не расширяет scope/status: duplicate scope скрыт от проекта, duplicate status
остаётся unknown; при обоих metadata-match отключён. Это сохраняет старый body-путь
и его fail-closed диагностику. Неизвестный project_id отвергается до HTTP; junction,
неподтверждённый/внешний source и поддельный service snippet не принимаются за локальные
данные. Короткое основание metadata — данные, не инструкция. Частичный запрос не
обещает top-N; exact priority Khoj действует среди локально подтверждённых полученных файлов.

## Проверки C05

Команды из `D:\SystemTheBest\System`; воспроизведения/целевые memory-тесты запускались
через ограниченную копию allowlist official runner во временном source/fixtures.
Внешний helper лежит рядом с резервом (`run-target.cjs`), целевая System/память не копируется.
Очищались System2/интеграционные/секретные env, Git global/system config отключён,
ROOT/LOCK/TMP/Git templates временные. Итоговый suite — штатный `npm run test:memory`.
Git push тестов направлен только на временные локальные bare-remotes.

| Проверка | Реальный результат / evidence |
|---|---|
| C01 red / green | Exit 1 / 0; [red](evidence/C01-red.log), [green](evidence/C01-green.log), 19/19 PASS |
| C02 red / green | Exit 1 / 0; [red](evidence/C02-red.log), [green](evidence/C02-green.log), 5/5 PASS |
| C03 red / green | Exit 1 / 0; [red](evidence/C03-red.log), [green](evidence/C03-green.log), 8/8 PASS |
| C04 red / final green | Exit 1 / 0; [red](evidence/C04-red.log), [green](evidence/C04-green-final.log), 25/25 PASS |
| `npm run check` | Exit 0; 69 JS, 52 skills, 112 docs, 5 checker tests. 11.18 с checker; [log](evidence/check.log), [meta](evidence/check.json) |
| `npm run test:memory` | Exit 0; 220/220 PASS, 0 fail/skip, 249.739 с runner. [log](evidence/memory.log), [result](evidence/memory-result.json), [TAP](evidence/memory.tap) |
| `git diff --check`, `git diff --cached --check` | Exit 0 на границах scoped-коммитов; финальная проверка в receipt |

Резерв до правок: 70 файлов с проверенным SHA-256, полные dirty/untracked,
память/journals/writer-log, config/hooks, ОК/стандарты, refs/status и binary patches:
`D:\SystemTheBest\System-update-backups\CORE-FIX-20261022-2026-10-22T12-41-57-579Z`.
Writer/search tests не создают тестовые факты в общей памяти, не изменяют рабочую очередь.
Сохранность сверяется с манифестом; чужие 180 строк памяти, редакция отчёта UPDATE,
вердикты/HANDOFF и прочие untracked не включаются в коммиты реализации.
Нужные документы передачи из untracked разрешены отдельно C06 и перечислены ниже.
Сверка манифеста после тестов: 68/70 исходных файлов побайтно совпали, включая
память/writer-log, журналы, ОК, config/hooks и прежние dirty. Два различия — собственная
секция HANDOFF и статус TASK; прежний текст HANDOFF сохранён полностью.
[preservation.json](evidence/preservation.json).
В финальном документальном коммите дополнения C01/C04 контракта только перемещены
под соответствующие существующие заголовки «Актуальность индекса»/«Поиск», без смены смысла.

## Проверка и публикация C06

Предварительно проверен **весь** `origin/master..HEAD`: 14 коммитов (10 накопленных +
четыре исправления), 73 уникальных исходящих blob. Полный список коммитов/путей и
результаты scan — [outgoing-initial.json](evidence/outgoing-initial.json).
Проверены сигнатуры приватных ключей, API/GitHub/cloud credentials и длинных
credential assignments без печати значений; кандидатов не обнаружено. Это сочеталось
с просмотром состава/диффов, а не заявляется абсолютной защитой от любых секретов.
Продуктового кода сайтов/конфигов VPS в исходящих локальных коммитах нет.

Проверка по committed tree, а не наличию файлов на диске, выявила три missing TASK
из опубликованных отчётов. По прямому разрешению C06 отдельно включаются ровно:

- `.scratch/system-update-20261013/TASK.md` и `evidence/final-state.json` этого задания;
- `.scratch/system-update-20261022/TASK.md` и `evidence/final-state.json` этого задания;
- `.scratch/profile-refresh-20261022/TASK.md` и `evidence/final-state.json` этого задания.

Артефакты проверены на состав/секреты; source-задачи и прежние статусы/ограничения
сохраняются. Dirty независимый вердикт UPDATE в RESULT/HANDOFF в этот пакет не входит.
[Перечень и обнаруженные ссылки](evidence/handoff-artifacts.json).
Намеренные AP-EVAL/remediation/pending не staging-уются. TASK CORE меняется только в статусе.
Обычный push выполняется после итогового suite и финальной сверки remote/диапазона;
SHA и receipt будут дополнены после фактической публикации.

## Ограничения и передача

Сайты/runtime/VPS/SSH/transfer-код/личные документы не изменялись и не запускались.
Профиль core, настройки, ОК и существующая память сохраняются. Docker/AP/WSL/Figma,
Khoj/bridge и платные API не запускались; Python/Figma suites для незатронутых контуров
не требуются. Нет изменений route.js, схемы lease/reconcile/блокировок, старых ID,
обязательного запрета U+FFFD, batch подтверждения Khoj или публичности GitHub.
PROFILE-01 повторно не выполнялся. Старая история приёмок не переписывалась.

Red-сценарии намеренно выполнялись до изменения и падали по целевым причинам;
green и единый итоговый suite проверяют исправление и прежние инварианты.
Доступные времена запусков — evidence JSON; начало резерва 15:41:57 МСК.
Контекст/токены/денежная стоимость unknown: метрики провайдера недоступны,
неподтверждённая экономия и O(1) не заявляются.

После публикации следующий шаг — независимая приёмка C01–C06 по TASK/diff/evidence;
synced не означает done и не открывает автоматическую очередь отложенных идей.

# L01-02 — Сохранить резерв и опубликовать передачу с планами

**What to build:** Новый untracked материал сохранён отдельным резервом до публикации;
документы приёмки, передача `HANDOFF-GPT-NEXT-2026-09-12.md` и пакет
`.scratch/system-launch/` закоммичены и отправлены обычным push; `ls-remote` совпадает с `HEAD`.
**Requirement IDs:** R09, R13 (переносимость и сохранность), L01
**Blocked by:** L01-01
**Status:** in-progress
**Перед началом работы:** Открой VS Code в папке D:\SystemTheBest\System. Проверь корень Git и текущие изменения.

## Контекст

Существующий проверенный резерв `D:\SystemTheBest\transfer-backups\pre-push-20260912-182546`
(bundle, INVENTORY, MANIFEST.sha256, копии runtime и untracked) снят до публикации `f254a5f`.
Повторять полный архив не нужно: он не устарел. Требуется дополнить его **новым** untracked
материалом приёмки (пакет вердикта, передача, планы семи чатов) и уже после этого публиковать.

## Файлы для изменения

- `D:\SystemTheBest\transfer-backups\pre-push-20260912-182546\` — существующий резерв;
  добавить подкаталог дополнения со снимком нового untracked материала и его манифестом.
  Исходный `MANIFEST.sha256` не переписывать.
- `.scratch/system-launch/` — новый; публикуется целиком (задания, README, тикеты, отчёты).
- `HANDOFF-GPT-NEXT-2026-09-12.md` — новый; публикуется.
- `.scratch/system-remediation/INDEPENDENT-ACCEPTANCE-PHASE1-2026-09-12.md` и шесть
  файлов evidence/вердикта — новые; публикуются.
- Пять изменённых документов из L01-01 — публикуются тем же коммитом.

## Файлы для чтения (контекст)

- `.scratch/system-launch/README.md` — общий договор, раздел 6 (коммиты и push).
- `.scratch/system-remediation/evidence/publish-2026-09-12.md` — как публиковался PUB-04.
- `.scratch/system-remediation/evidence/pre-push-backup-2026-09-12.md` — состав резерва.

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `.scratch/system-remediation/ASTRA-ORCHESTRATION-IDEAS-2026-09-12.md`,
  `.scratch/system-remediation/evidence/status-check-current-tests.txt` — остаются вне Git.
- `config/system.local.json`, `services/activepieces/.env`, `.env`, `.local/**` — секреты,
  не коммитить и не печатать содержимое.
- Существующие worktree `s2-red-block4`, `s2-red-v1g15` — не удалять.
- Сохранять чужие незакоммиченные изменения.

## Входные/выходные данные

Вход: список новых untracked-файлов из `git status`.
Выход: дополнение к резерву с манифестом; один scoped-коммит документов; push; сверенный remote SHA.

## Алгоритм (шаг за шагом)

1. Проверить резерв: существует ли каталог, проходит ли `sha256sum -c MANIFEST.sha256`,
   включает ли bundle ревизию `f254a5f`.
2. Скопировать **новый** untracked материал (пакет приёмки, передача, `.scratch/system-launch/`)
   в подкаталог дополнения внутри существующего резерва; сгенерировать для него отдельный
   манифест и проверить его. Полный bundle/архив заново не собирать.
3. Стейджить только перечисленные пути явными именами; `git add .` не применять.
4. Проверить `git status` после стейджинга: нет `.env`, `system.local.json`, `.local/`,
   нет чужих черновиков.
5. Один scoped-коммит; `git push origin master` (обычный, без force);
   сверить `git ls-remote origin refs/heads/master` с `git rev-parse HEAD`.
6. Зафиксировать оставшиеся untracked как намеренные и перечислить их в отчёте.

## Критерии приёмки

- [ ] Дополнение к резерву создано и его манифест проверен; новый огромный архив не создавался.
- [ ] `git show --stat HEAD` содержит только документы и пакет планов; ни одного файла кода.
- [ ] `git ls-remote origin refs/heads/master` совпадает с `git rev-parse HEAD`.
- [ ] `git check-ignore` подтверждает, что `.env`, `system.local.json`, `.local/**` вне коммита.
- [ ] Оставшиеся untracked перечислены и обоснованы как намеренные.

## Проверки

**Среда и предпосылки:** локально; доступ к `origin` (`github.com/gorelovmaxon-cyber/System`).
**Команды:** `sha256sum -c MANIFEST.sha256`; `git status --short`; `git show --stat HEAD`;
`git push origin master`; `git ls-remote origin refs/heads/master`; `git rev-list --left-right --count origin/master...HEAD`.
**Ожидаемый результат:** резерв проверен; коммит содержит только документы; remote SHA = `HEAD`, ahead/behind `0 0`.
**Если проверка недоступна:** при отказе сети — сохранить коммит локально, резерв уже снят,
статус не повышать и явно сообщить о недоставленной публикации.

## Ограничения

Force push, rebase, amend и `reset --hard` запрещены. Push не означает READY.
Сервисы в этой фазе не устанавливаются и не поднимаются.

## Как закончить

1. Diff и результат push — в `.scratch/system-launch/reports/CHAT-01-RESULT.md`.
2. Коммит один, вместе с L01-01.
3. Статус: `verified-local` для сохранения; публикация подтверждается сверкой remote SHA.

# L03-02 — Стек Activepieces, persistence и защищённый bridge

**What to build:** Резерв проверен; host bridge защищён токеном и доступен из контейнера; стек Activepieces (`app`, `worker`, Postgres, Redis) поднят из закреплённого compose, owner и flow сохраняются после `restart`.
**Requirement IDs:** R06, R07; SC-06, SC-08
**Blocked by:** L03-01 (рабочий Docker/Compose)
**Status:** blocked
**Перед началом работы:** Открой `D:\SystemTheBest\System`, проверь корень Git и текущие изменения.

## Контекст

Пользователь недавно останавливал исполнение фазы 3 субагентом; часть работы
незавершена. Что уже сделано и подтверждено — не переделывать:

- **Резерв проверен 2026-09-13.** Каталог
  `D:\SystemTheBest\transfer-backups\pre-activepieces-20260913-105607\` содержит
  `system.local.json`, `activepieces.env`, `MANIFEST.sha256`. Сверка выполнена:
  оба файла — `OK` (`sha256sum -c` после снятия CRLF из манифеста). Это
  **не** полный backup runtime/базы: восстановление из него не проверялось.
- **Host bridge уже работает и проверен.** Проба
  [activepieces-phase3-preflight.cjs](../evidence/activepieces-phase3-preflight.cjs)
  на живом bridge дала: `health {status:"ready", writer:true}`, `POST /write` без
  токена → `401`, повтор известного события → `200 {status:"persisted", idempotent:true, revision:"0a471effda65"}`,
  память/журналы/конфиг не изменились. Результат — [activepieces-phase3-preflight-host-smoke-2026-09-13.json](../evidence/activepieces-phase3-preflight-host-smoke-2026-09-13.json).
  Это host-smoke; **границу контейнер→bridge он не доказывает**.

## План и неизвестное

- **Подтверждено:** bridge слушает `127.0.0.1:8643` и требует token; writer
  идемпотентен по `event_id` при совпадении содержимого. Образ
  `ghcr.io/activepieces/activepieces:0.86.3` существует в registry
  (`docker-content-digest: sha256:208517c4…638c6c`, платформы linux/amd64 и
  linux/arm64) — но это **lookup манифеста, не pull и не запуск**.
- **Предполагается:** `host.docker.internal` из контейнера может не разрешаться —
  это проверяется фактически, а не считается работающим по умолчанию.
- **Основной путь:** существующий `services/activepieces/docker-compose.yml` без
  переписывания архитектуры; bridge остаётся на loopback, а связность
  контейнер→host решается минимально необходимым маршрутом с сохранением токена.
- **Первая проверка:** `docker compose -f docker-compose.yml config` (валидация
  без запуска), затем `pull` и `up -d`; `docker compose ps` до healthy.
- **Рубеж пересмотра → альтернатива:** `host.docker.internal` не работает и не
  даёт минимального защищённого маршрута без открытия bridge всей сети. Тогда
  остановиться, зафиксировать адрес/маршрут и согласовать вариант; не публиковать
  сервис в сеть произвольно. Изменение bind в `scripts/memory/bridge-server.js`
  допустимо только при доказанной необходимости и с регрессией.

## Файлы для изменения

- [services/activepieces/docker-compose.yml](services/activepieces/docker-compose.yml) — существующий; правки только по фактам проверки
- [services/activepieces/.env.example](services/activepieces/.env.example) — существующий; привести к фактическим переменным
- [services/activepieces/README.md](services/activepieces/README.md) — существующий; фактический порядок запуска и проверок
- [docs/activepieces-setup.md](docs/activepieces-setup.md) — существующий; реальные версии и команды
- [services/activepieces/.env](services/activepieces/.env) — gitignored; только необходимые поля, значения не коммитить
- [config/system.local.json](config/system.local.json) — gitignored; только необходимые поля bridge
- [.scratch/system-launch/evidence/](../evidence/) — префлайт и результаты проверок
- [scripts/memory/bridge-server.js](scripts/memory/bridge-server.js) — **только** при доказанной необходимости изменения bind, с регрессией

## Файлы для чтения (контекст)

- [docs/memory-contract.md](docs/memory-contract.md) — разделы «Writer» и «Подтверждение доставки через webhook»
- [.scratch/system-completion/issues/SC-06-activepieces-running.md](.scratch/system-completion/issues/SC-06-activepieces-running.md), [SC-08](.scratch/system-completion/issues/SC-08-memory-writer-bridge.md) — критерии
- [scripts/memory/bridge-server.js](scripts/memory/bridge-server.js) — контракт `/health` и `/write`

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `.claude/memory`, writer/queue/ipc-lock/jsonl/path-safety и принятая общая приёмка — не превращать в новый аудит.
- Существующие AP/JWT/encryption/Postgres значения и tokens bridge — не перегенерировать, не печатать, не коммитить.
- `.local`, backup-каталог и чужие worktree — не удалять «для чистоты».
- `.scratch/system-remediation/ASTRA-ORCHESTRATION-IDEAS-2026-09-12.md` и `evidence/status-check-current-tests.txt` — намеренные untracked.

## Входные/выходные данные

Вход: рабочий Docker и проверенный резерв. Выход: healthy-стек, persistence после
`restart`, подтверждённая достижимость bridge из контейнера и отказ `/write` без
токена. Секреты только в gitignored `.env`/UI.

## Алгоритм (шаг за шагом)

1. Повторить сверку манифеста резерва и убедиться, что фактический ignored runtime
   (`services/activepieces/.env`, `config/system.local.json`) сохранён отдельно.
2. Проверить `docker compose config`; сверить закреплённые теги и переменные.
3. `pull` и `up -d`; дождаться healthy у `app`, `worker`, `postgres`, `redis`.
   Записать версии и логи миграций.
4. Из **контейнера, исполняющего flow**, проверить достижимость bridge; зафиксировать
   фактический адрес. Проверить, что без токена и с неверным токеном `/write` даёт
   отказ и **ничего не записывает**.
5. Создать owner в UI; создать тестовый flow; выполнить `docker compose restart`
   и подтвердить, что owner, flow и данные сохранились.
6. Записать в отчёт фактический адрес контейнер→host для последующего L03-03.

## Критерии приёмки

- [ ] `docker compose ps` — `app`/`worker`/`postgres`/`redis` в состоянии healthy;
      `/api/v1/health` отвечает; UI доступен локально.
- [ ] В логах `app`/`worker` нет ошибок конфигурации и миграций; worker реально
      способен исполнять flow.
- [ ] Контейнер, исполняющий flow, достигает bridge по зафиксированному адресу;
      отсутствие или неверный token даёт отказ **без записи**. Host health эту
      границу не доказывает.
- [ ] После `docker compose restart` owner, flow и данные сохранены (persistence).
- [ ] `git check-ignore services/activepieces/.env` подтверждает игнорирование;
      в коммите нет значений ключей и tokens.
- [ ] Манифест резерва проверен, и это в отчёте отделено от утверждения
      «восстановление проверено» (последнее не выполнялось).
- [ ] Регрессии изменённых модулей пройдены, если менялся production-код.

## Проверки

**Среда и предпосылки:** рабочий Docker Desktop с Compose v2; Windows-host; bridge запущен локально.
**Команды:** `docker compose -f docker-compose.yml config|pull|up -d|ps|restart`, `docker compose logs --tail=100 app worker`, `docker compose exec app sh -lc 'wget -qO- "$AP_HOST_BRIDGE_URL/health"'`, `git check-ignore services/activepieces/.env`.
**Ожидаемый результат:** каждая команда показывает фактическое состояние стека и границы защиты bridge.
**Данные и наблюдение:** проверки записи вести только на изолированной fixture или контролируемом тестовом событии; основную память не менять вручную.
**Если проверка недоступна:** указать причину и оставить `blocked`/`awaiting-validation`; не объявлять `done`.

## Ограничения

Требуется реальный запуск контейнеров. Bridge не открывается произвольно всей сети.
Секреты не коммитятся и не печатаются. `down -v` не применяется без явного согласования.

## Как закончить

1. Проверить diff; доказательства health/worker/restart/container→bridge сохранить
   в [reports/CHAT-03-RESULT.md](../reports/CHAT-03-RESULT.md) вместе с командами и выводом.
2. Отдельный коммит с явным списком файлов тикета.
3. `awaiting-review` на границе блока; `done` ставит приёмщик.
4. Ответ до 6 строк: ID, результат, проверки, коммит, ограничения, следующий тикет.

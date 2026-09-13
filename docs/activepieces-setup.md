# Activepieces: локальный запуск System2

Канонический стек находится в `services/activepieces/`. Он фиксирует
Activepieces `0.86.3`, отдельные `app` и `worker`, Postgres с pgvector и Redis.
Версия выбрана по официальному compose Activepieces и должна быть повторно
проверена pull/health перед приёмкой на конкретной машине.

## Предварительные условия

Нужны Docker Desktop с Compose v2, свободный порт `8642` и доступ к интернету
для загрузки образов. Проверка:

```powershell
docker --version
docker compose version
docker info
```

## Первый запуск

```powershell
cd D:\SystemTheBest\System\services\activepieces
Copy-Item .env.example .env
```

Сгенерируйте значения секретов, например:

```powershell
node -e "const c=require('node:crypto'); console.log('AP_API_KEY='+c.randomBytes(32).toString('hex')); console.log('AP_ENCRYPTION_KEY='+c.randomBytes(16).toString('hex')); console.log('AP_JWT_SECRET='+c.randomBytes(32).toString('hex')); console.log('AP_POSTGRES_PASSWORD='+c.randomBytes(32).toString('hex'))"
```

Перенесите результаты в `.env`, оставьте
`AP_HOST_BRIDGE_URL=http://host.docker.internal:8643`, затем запустите:

```powershell
docker compose -f docker-compose.yml config -q
docker compose -f docker-compose.yml pull
docker compose -f docker-compose.yml up -d
docker compose -f docker-compose.yml ps
```

`-q` здесь не украшение: без него `config` печатает развёрнутый compose вместе с
подставленными секретами. Проверка синтаксиса и подстановок этим флагом сохраняется.

Откройте <http://localhost:8642> и создайте owner account в UI при первом
входе. Health приложения:

```powershell
curl.exe -fsS http://localhost:8642/api/v1/health
docker compose logs --tail=100 app worker
```

## Проверка host bridge

В контейнере нельзя использовать `localhost` для Windows-host: это сам
контейнер. До импорта flow SC-09 запустите локальный bridge SC-08 и проверьте:

```powershell
docker compose exec app sh -lc 'curl -fsS "$AP_HOST_BRIDGE_URL/health"'
```

`curl` выбран не произвольно: в образе `0.86.3` есть `curl` и нет `wget`.

Ожидается HTTP 200 и JSON health. Если `host.docker.internal` не разрешается,
проверьте Docker Desktop/WSL и зафиксируйте фактический адрес в `.env`; не
подставляйте его молча в flow.

## AI-подключение

В UI откройте Connections и создайте connection нужного провайдера. Ключ
вводится в UI/секретное хранилище Activepieces; `AP_OPENAI_API_KEY` в example
служит только как необязательная локальная переменная и не является готовым
подключением. Имя connection и выбранную модель нужно записать в отчёте SC-09
без ключа.

## Персистентность и управление

Postgres, Redis и cache используют named volumes. После создания owner и
тестового flow выполните `docker compose restart`, затем проверьте, что UI и
flow сохранились. `down` сохраняет volumes; `down -v` удаляет их и требует
осознанного подтверждения.

```powershell
docker compose stop
docker compose start
docker compose logs -f worker
docker compose down
```

Обновление выполняется явно: изменить закреплённый тег после сверки release
notes, выполнить `docker compose pull` и `up -d --remove-orphans`, затем
повторить health и smoke-проверку. `.env` не коммитится.

## Проверено на этой машине 2026-09-13

Стек запущен и проверен: Docker Desktop `4.90.0`, движок `29.7.2`, Compose `v5.5.1`.
Все четыре сервиса `Up (healthy)`, `/api/v1/health` → `{"status":"Healthy"}`,
воркер подключён к API по Socket.IO, данные переживают `docker compose restart`,
а из контейнера достижим host bridge (`host.docker.internal` → `192.168.65.254`).

Две оговорки, которые нужно держать в уме:

- Docker Desktop запускается вручную и в автозапуск не входит; после перезагрузки
  ПК движок нужно поднять заново, прежде чем обращаться к стеку.
- Windows 10 Home Single Language отсутствует в формальном списке поддерживаемых
  редакций Docker Desktop. Движок на ней работает (Home допускает Linux-контейнеры),
  но это расхождение с документацией, а не гарантия.

Оставшееся — реальный flow, AI connection и экспорт — [L03-03](../.scratch/system-launch/issues/L03-03-flow-to-writer.md).
Доказательства и ограничения: [evidence/l03-02](../.scratch/system-launch/evidence/l03-02-stack-and-bridge-2026-09-13.json).

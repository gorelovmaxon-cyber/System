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
docker compose -f docker-compose.yml config
docker compose -f docker-compose.yml pull
docker compose -f docker-compose.yml up -d
docker compose -f docker-compose.yml ps
```

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
docker compose exec app sh -lc 'wget -qO- "$AP_HOST_BRIDGE_URL/health"'
```

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

Проверено 2026-09-13 на этой машине: `wsl.exe --status` завершается с
`Wsl/WSL_E_WSL_OPTIONAL_COMPONENT_REQUIRED` («требуется дополнительный компонент
подсистемы Windows для Linux»), команда `docker` не найдена. Требуются права
администратора для компонентов Windows. Поэтому реальный запуск, health, worker,
persistence и container-to-host connectivity остаются `blocked`; конфигурация не
выдаётся за живой сервис. Точная точка остановки и следующий шаг —
[L03-01](../.scratch/system-launch/issues/L03-01-activepieces-environment.md).

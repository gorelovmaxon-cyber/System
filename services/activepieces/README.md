# Activepieces service

Канонический compose находится в `docker-compose.yml`; подробный runbook — в
[`docs/activepieces-setup.md`](../../docs/activepieces-setup.md).

```powershell
Copy-Item .env.example .env
# заполнить секреты локально
docker compose config -q
docker compose pull
docker compose up -d
docker compose ps
curl.exe -fsS http://localhost:8642/api/v1/health
```

Первичная owner-учётка и AI connection создаются в UI. Для flow bridge адресом
из контейнера является `AP_HOST_BRIDGE_URL`, по умолчанию
`http://host.docker.internal:8643`; `localhost` внутри контейнера не подходит.
Остановить без удаления данных: `docker compose stop`; удалить volumes можно
только осознанной командой `docker compose down -v`.

Порт контейнера задаёт `AP_PORT` из `.env`, а не только host-публикация:
`ports` и healthcheck подставляют то же значение. Воркеру адрес API задаётся
отдельно — `AP_FRONTEND_URL: http://app:${AP_PORT:-8642}` в сервисе `worker`;
`.env` хранит браузерный URL, где `localhost` для воркера означает его самого.

Стек проверен запуском на этой машине 2026-09-13: все четыре сервиса `Up (healthy)`,
`/api/v1/health` → `{"status":"Healthy"}`, воркер подключён к API по Socket.IO,
persistence переживает `docker compose restart`. Доказательства —
[evidence/l03-02](../.scratch/system-launch/evidence/l03-02-stack-and-bridge-2026-09-13.json).

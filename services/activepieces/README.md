# Activepieces service

Канонический compose находится в `docker-compose.yml`; подробный runbook — в
[`docs/activepieces-setup.md`](../../docs/activepieces-setup.md).

```powershell
Copy-Item .env.example .env
# заполнить секреты локально
docker compose config
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

Текущий стек не запускался: Docker Desktop/WSL отсутствуют в среде System2.

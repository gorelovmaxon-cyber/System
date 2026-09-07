# T7 — Установить Activepieces локально

**What to build:** Установка Activepieces (автоматизация workflow) + настройка базового flow для автообновления user-profile

**Blocked by:** none

**Status:** ready-for-agent

**Executor:** GPT Luna (через инструкции, выполнение вручную)

---

## Контекст

Activepieces — это open-source аналог Zapier/Make для автоматизации workflow. 

**Зачем нужен:**
- Git push → Activepieces видит новый коммит
- Activepieces анализирует diff (что изменилось)
- Если это исправление кода → автоматически обновляет `user-profile/common-mistakes.md`
- Заменяет ручной вызов `/profile-update`

**Ссылки:**
- GitHub: https://github.com/activepieces/activepieces
- Документация: https://www.activepieces.com/docs

---

## Файлы для создания

- `D:\System\activepieces\` — папка установки
- `D:\System\activepieces\docker-compose.yml` — конфигурация Docker
- `D:\System\activepieces\install.md` — инструкция установки

---

## Алгоритм (шаг за шагом)

### Шаг 1: Проверить Docker

Activepieces работает через Docker. Проверить установлен ли Docker:

```bash
docker --version
docker-compose --version
```

**Если не установлен:**
- Скачать Docker Desktop: https://www.docker.com/products/docker-desktop/
- Установить и запустить

**Ожидаемый вывод:**
```
Docker version 24.x.x
Docker Compose version 2.x.x
```

---

### Шаг 2: Создать папку и конфигурацию

```bash
# Создать папку
mkdir D:\System\activepieces
cd D:\System\activepieces
```

Создать файл `docker-compose.yml`:

```yaml
version: "3.8"

services:
  activepieces:
    image: activepieces/activepieces:latest
    container_name: activepieces
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      - AP_ENCRYPTION_KEY=generate-random-key-32-chars
      - AP_JWT_SECRET=generate-another-key-32-chars
      - AP_POSTGRES_DATABASE=activepieces
      - AP_POSTGRES_HOST=postgres
      - AP_POSTGRES_PORT=5432
      - AP_POSTGRES_USERNAME=postgres
      - AP_POSTGRES_PASSWORD=postgres
    depends_on:
      - postgres
    volumes:
      - activepieces_data:/data

  postgres:
    image: postgres:14-alpine
    container_name: activepieces-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=activepieces
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  activepieces_data:
  postgres_data:
```

**Важно:** Заменить ключи на реальные (32 символа).

---

### Шаг 3: Запустить Activepieces

```bash
cd D:\System\activepieces
docker-compose up -d
```

---

### Шаг 4: Открыть Web UI

Открыть: **http://localhost:8080**

1. Создать аккаунт
2. Войти в dashboard

---

### Шаг 5: Создать тестовый flow

В UI:
1. Create New Flow
2. Trigger: Webhook
3. Action: HTTP Request (test)
4. Save Flow

---

## Критерии приёмки

- [ ] Docker установлен
- [ ] Activepieces запущен
- [ ] Web UI доступен
- [ ] Тестовый flow работает

---

## Следующий тикет

T8 (создать flow для автообновления профиля)

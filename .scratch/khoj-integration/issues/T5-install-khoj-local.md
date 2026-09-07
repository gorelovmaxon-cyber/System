# T5 — Установить Khoj локально

**What to build:** Установка Khoj (векторная память) локально + индексация D:\System\memory\ и GitHub репозиториев

**Blocked by:** none

**Status:** ready-for-agent

**Executor:** GPT Luna (через инструкции, выполнение вручную)

---

## Контекст

Khoj — это open-source векторная база знаний (RAG). Индексирует локальные папки и позволяет делать семантический поиск. 

**Зачем нужен:**
- Opus спрашивает "как я делал JWT раньше?" → Khoj находит в прошлых проектах
- Экономия токенов: не грузим весь `D:\System\memory\` каждый раз
- Экономия: 90% токенов на Phase 0 (с ~50k до ~5k)

**Ссылки:**
- GitHub: https://github.com/khoj-ai/khoj
- Документация: https://docs.khoj.dev/

---

## Файлы для создания

- `D:\System\khoj\` — папка установки (создать)
- `D:\System\khoj\config.yml` — конфигурация Khoj
- `D:\System\khoj\install.md` — инструкция по установке (для следующих ПК)

---

## Алгоритм (шаг за шагом)

### Шаг 1: Установка Khoj

**Через pip (рекомендуется):**
```bash
# Создать папку
mkdir D:\System\khoj
cd D:\System\khoj

# Создать виртуальное окружение
python -m venv venv

# Активировать
venv\Scripts\activate

# Установить Khoj
pip install khoj-assistant

# Проверить установку
khoj --version
```

**Ожидаемый вывод:** `khoj version X.X.X`

---

### Шаг 2: Первый запуск

```bash
# Запустить Khoj
khoj

# Откроется браузер: http://localhost:42110
```

**Проверить:** Web UI открылся, есть интерфейс настройки

---

### Шаг 3: Настройка индексации

В Web UI (http://localhost:42110):

1. **Settings → Content Sources**
2. **Add Local Folder:**
   - Path: `D:\System\memory\`
   - Name: `SystemQwen Memory`
   - Enable: ✅
   
3. **Add Local Folder:**
   - Path: `e:\System2\`
   - Name: `System2 Project`
   - Enable: ✅

4. **Save Settings**

---

### Шаг 4: Индексация

```bash
# В терминале (с активированным venv)
khoj index

# Ожидаемый вывод:
# Indexing D:\System\memory\...
# Indexing e:\System2\...
# Indexed X files, Y tokens
```

**Проверить:** Индексация завершена без ошибок

---

### Шаг 5: Тест поиска

В Web UI:

1. Перейти в **Chat**
2. Спросить: "Как я использую JWT?"
3. Проверить: Khoj находит информацию из `user-profile/architecture-prefs.md`

**Ожидаемый результат:** Khoj возвращает релевантный ответ со ссылками на файлы

---

### Шаг 6: Создать конфигурацию

Создать файл `D:\System\khoj\config.yml`:

```yaml
# Khoj Configuration for SystemQwen
server:
  host: localhost
  port: 42110

content:
  folders:
    - path: D:\System\memory\
      name: SystemQwen Memory
      recursive: true
    - path: e:\System2\
      name: System2 Project
      recursive: true

search:
  model: sentence-transformers/all-MiniLM-L6-v2
  
indexing:
  auto: false  # Индексация по требованию
  schedule: null
```

---

### Шаг 7: Создать инструкцию установки

Создать файл `D:\System\khoj\install.md`:

```markdown
# Khoj Installation Guide

## Prerequisites
- Python 3.10+
- pip

## Installation Steps

1. Create folder: `mkdir D:\System\khoj`
2. Create venv: `python -m venv D:\System\khoj\venv`
3. Activate: `D:\System\khoj\venv\Scripts\activate`
4. Install: `pip install khoj-assistant`
5. Copy config: `copy config.yml D:\System\khoj\`
6. Run: `khoj`
7. Index: `khoj index`

## Usage

Start server:
```bash
cd D:\System\khoj
venv\Scripts\activate
khoj
```

Access: http://localhost:42110

## Troubleshooting

- Port already in use: change port in config.yml
- Indexing fails: check paths exist
- Search returns nothing: run `khoj index` first
```

---

## Критерии приёмки

- [ ] Khoj установлен: `khoj --version` работает
- [ ] Khoj запускается: `khoj` открывает Web UI на http://localhost:42110
- [ ] Индексация работает: `khoj index` без ошибок
- [ ] Поиск работает: тест "Как я использую JWT?" возвращает результаты
- [ ] Конфигурация создана: `D:\System\khoj\config.yml` существует
- [ ] Инструкция создана: `D:\System\khoj\install.md` существует

---

## Команда для коммита

```bash
git add D:\System\khoj/
git commit -m "T5: установить Khoj локально + индексация памяти"
```

**Примечание:** `D:\System\` не в репозитории, но `install.md` можно скопировать в `e:\System2\docs\khoj-setup.md` для синхронизации

---

## Следующий тикет

После выполнения T5 → переходить к T6 (интеграция Khoj API в Opus)

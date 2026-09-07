# T9 — Создать MCP-сервер для Figma интеграции

**What to build:** Кастомный MCP-сервер для извлечения design tokens из Figma

**Blocked by:** none

**Status:** ready-for-agent

---

## Контекст

MCP-сервер для Figma позволит Opus/Gemini извлекать точные CSS-токены из макетов: цвета, шрифты, отступы, радиусы.

**Экономия:** Вместо угадывания дизайна — точные данные из Figma.

---

## Файлы для создания

- `e:\System2\.claude\mcp-servers\figma\server.js`
- `e:\System2\.claude\mcp-servers\figma\package.json`
- `e:\System2\.claude\mcp-servers\figma\README.md`

---

## Алгоритм

### Шаг 1: Структура

```bash
mkdir -p e:/System2/.claude/mcp-servers/figma
cd e:/System2/.claude/mcp-servers/figma
```

### Шаг 2: package.json

```json
{
  "name": "figma-mcp-server",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.0",
    "axios": "^1.6.0",
    "dotenv": "^16.0.0"
  }
}
```

### Шаг 3: server.js (базовая структура)

```javascript
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

app.post('/api/figma/design-tokens', async (req, res) => {
  const { fileUrl } = req.body;
  const fileKey = fileUrl.match(/\/file\/([a-zA-Z0-9]+)/)[1];

  const response = await axios.get(
    `https://api.figma.com/v1/files/${fileKey}`,
    { headers: { 'X-Figma-Token': process.env.FIGMA_API_KEY } }
  );

  const tokens = extractDesignTokens(response.data);
  res.json({ success: true, tokens });
});

function extractDesignTokens(figmaFile) {
  return {
    colors: {},
    typography: {},
    spacing: {},
    radii: {}
  };
}

app.listen(3001);
```

### Шаг 4: .env

```
FIGMA_API_KEY=your_token_here
```

---

## Критерии приёмки

- [ ] Сервер запускается
- [ ] API возвращает tokens
- [ ] README создан

---

## Следующий шаг

Интегрировать в autopilot

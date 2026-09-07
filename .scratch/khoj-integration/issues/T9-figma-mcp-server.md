# T9 — Создать MCP-сервер для Figma интеграции

**What to build:** Кастомный MCP-сервер для извлечения design tokens из Figma файлов

**Blocked by:** none

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `e:\System2` (File > Open Folder).

## Контекст

MCP-сервер для Figma позволит Opus/Gemini извлекать точные CSS-токены из макетов: цвета (hex), шрифты, отступы, радиусы.

**Зачем нужен:**
- Вместо "угадывания" дизайна — точные данные из Figma
- Opus создаёт `design_system.md` с реальными токенами из макета
- Никаких галлюцинаций с размерами/цветами

**Ссылки:**
- Figma API: https://www.figma.com/developers/api
- MCP Protocol: https://modelcontextprotocol.io/docs

## Файлы для создания

- `.claude/mcp-servers/figma/server.js` — MCP-сервер (Node.js)
- `.claude/mcp-servers/figma/package.json` — зависимости
- `.claude/mcp-servers/figma/README.md` — документация

## Файлы для чтения (контекст)

- [.scratch/khoj-integration/spec.md](../../.scratch/khoj-integration/spec.md) — раздел про Figma MCP
- [CLAUDE.md](../../CLAUDE.md) — общий контекст SystemQwen

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `.claude/skills/` — не изменять существующие скиллы
- `CLAUDE.md` — только читать
- `.env` файлы — не коммитить (содержат API keys)

## Алгоритм (шаг за шагом)

### Шаг 1: Создать package.json

1. **Создать папку:**
   ```bash
   mkdir -p .claude/mcp-servers/figma
   ```

2. **Создать файл** `.claude/mcp-servers/figma/package.json`:

```json
{
  "name": "figma-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for extracting design tokens from Figma",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "axios": "^1.6.0",
    "dotenv": "^16.0.0"
  }
}
```

### Шаг 2: Создать server.js

1. **Создать файл** `.claude/mcp-servers/figma/server.js`:

```javascript
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const FIGMA_API_KEY = process.env.FIGMA_API_KEY;

// Endpoint: extract design tokens
app.post('/api/figma/design-tokens', async (req, res) => {
  const { fileUrl } = req.body;

  if (!fileUrl) {
    return res.status(400).json({ error: 'fileUrl required' });
  }

  try {
    // Extract fileKey from Figma URL
    const fileKey = fileUrl.match(/\/file\/([a-zA-Z0-9]+)/)?.[1];
    if (!fileKey) {
      return res.status(400).json({ error: 'Invalid Figma URL' });
    }

    // Fetch file from Figma API
    const response = await axios.get(
      `https://api.figma.com/v1/files/${fileKey}`,
      {
        headers: {
          'X-Figma-Token': FIGMA_API_KEY
        }
      }
    );

    const figmaFile = response.data;

    // Extract design tokens
    const tokens = extractDesignTokens(figmaFile);

    res.json({
      success: true,
      tokens
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Extract tokens function
function extractDesignTokens(figmaFile) {
  const tokens = {
    colors: {},
    typography: {},
    spacing: {},
    radii: {}
  };

  // Parse styles
  const styles = figmaFile.styles || {};

  Object.entries(styles).forEach(([id, style]) => {
    if (style.styleType === 'FILL' && style.fills?.[0]) {
      const color = style.fills[0].color;
      tokens.colors[style.name] = rgbToHex(color);
    } else if (style.styleType === 'TEXT') {
      tokens.typography[style.name] = {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeightPx
      };
    }
  });

  return tokens;
}

// RGB to HEX converter
function rgbToHex({ r, g, b }) {
  const toHex = (c) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

app.listen(PORT, () => {
  console.log(`Figma MCP Server running on http://localhost:${PORT}`);
});
```

### Шаг 3: Создать README.md

1. **Создать файл** `.claude/mcp-servers/figma/README.md`:

```markdown
# Figma MCP Server

Извлекает design tokens из Figma файлов.

## Setup

1. Get Figma API token: Figma → Settings → Personal Access Tokens
2. Create `.env`:
   ```
   FIGMA_API_KEY=your_token_here
   PORT=3001
   ```
3. Install: `npm install`
4. Run: `npm start`

## Usage

```bash
curl -X POST http://localhost:3001/api/figma/design-tokens \
  -H "Content-Type: application/json" \
  -d '{"fileUrl": "https://figma.com/file/ABC123/Project"}'
```

**Response:**
```json
{
  "success": true,
  "tokens": {
    "colors": {
      "Primary": "#3B82F6",
      "Background": "#0F172A"
    },
    "typography": {
      "Heading": {
        "fontFamily": "Inter",
        "fontSize": 48,
        "fontWeight": 700
      }
    }
  }
}
```

## Integration with Opus

В Phase 0.5 (Gemini Deep Research), Opus может вызвать:

```bash
curl http://localhost:3001/api/figma/design-tokens \
  -d '{"fileUrl": "USER_PROVIDED_URL"}'
```

Результат → создать `design_system.md` с точными токенами.

## Troubleshooting

**401 Unauthorized:** проверить FIGMA_API_KEY
**Invalid URL:** использовать формат https://figma.com/file/KEY/Name
**Port in use:** изменить PORT в .env
```

### Шаг 4: Создать .env.example

1. **Создать файл** `.claude/mcp-servers/figma/.env.example`:

```
FIGMA_API_KEY=your_figma_personal_access_token
PORT=3001
```

2. **НЕ СОЗДАВАТЬ `.env`** (пользователь создаст сам с реальным ключом)

## Критерии приёмки

- [ ] Файл `package.json` создан с 3 зависимостями
- [ ] Файл `server.js` создан с функцией extractDesignTokens
- [ ] Файл `README.md` создан с инструкцией
- [ ] Файл `.env.example` создан (без реального ключа)
- [ ] В README есть примеры curl запросов
- [ ] В README есть секция Integration with Opus
- [ ] В README есть Troubleshooting
- [ ] Функция rgbToHex корректна

## Ограничения

- Не устанавливать npm packages (пользователь сделает сам)
- Не создавать .env с реальным ключом (только .env.example)
- Не запускать сервер (только код)
- Использовать Express (не другие фреймворки)

## Как закончить

1. Проверка:
   ```bash
   ls .claude/mcp-servers/figma/package.json
   ls .claude/mcp-servers/figma/server.js
   ls .claude/mcp-servers/figma/README.md
   ```

2. Коммит:
   ```bash
   git add .claude/mcp-servers/figma/
   git commit -m "T9: создать Figma MCP-сервер для design tokens

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
   ```

3. Финальный ответ (максимум 6 строк):
   - Создан MCP-сервер для Figma API
   - Endpoint: POST /api/figma/design-tokens
   - Извлекает: colors (hex), typography, spacing, radii
   - Интеграция: Opus → MCP → design_system.md

---

**Команда запуска тестов:** `node -c .claude/mcp-servers/figma/server.js` (проверка синтаксиса)

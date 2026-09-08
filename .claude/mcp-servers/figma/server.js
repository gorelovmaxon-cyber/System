'use strict';

const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const { extractDesignTokens } = require('./lib/extract');

const SERVER_VERSION = '1.1.0';
const TOOL_NAME = 'figma_get_design_tokens';

function fileKeyFromUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  return fileUrl.match(/\/(?:file|design)\/([A-Za-z0-9_-]+)/)?.[1] || null;
}

function apiError(error, fileKey) {
  const status = error.status || error.response?.status;
  if (status === 401 || status === 403) return new Error('Figma authentication/permission failed for file ' + fileKey);
  if (status === 404) return new Error('Figma file was not found: ' + fileKey);
  if (status === 429) return new Error('Figma rate limit reached; retry later');
  return new Error('Figma API request failed' + (status ? ' (HTTP ' + status + ')' : '') + ': ' + error.message);
}

async function fetchFile(fileKey, nodeId) {
  if (!/^[A-Za-z0-9_-]+$/.test(fileKey)) throw new Error('invalid Figma fileKey');
  const fixture = process.env.FIGMA_FIXTURE_PATH;
  if (fixture) return JSON.parse(fs.readFileSync(path.resolve(fixture), 'utf8'));
  const token = process.env.FIGMA_API_KEY;
  if (!token) throw new Error('FIGMA_API_KEY is not configured');
  const url = new URL('https://api.figma.com/v1/files/' + encodeURIComponent(fileKey));
  if (nodeId) url.searchParams.set('ids', nodeId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { headers: { 'X-Figma-Token': token }, signal: controller.signal });
    if (!response.ok) {
      const error = new Error((await response.text()).slice(0, 300));
      error.status = response.status;
      throw error;
    }
    return response.json();
  } catch (error) {
    throw apiError(error, fileKey);
  } finally {
    clearTimeout(timer);
  }
}

function containsNode(node, nodeId) {
  if (!node || typeof node !== 'object') return false;
  if (node.id === nodeId) return true;
  return (node.children || []).some(child => containsNode(child, nodeId));
}

function toolSchema() {
  return {
    type: 'object',
    properties: {
      fileUrl: { type: 'string', description: 'Figma file or design URL' },
      fileKey: { type: 'string', description: 'Figma file key' },
      nodeId: { type: 'string', description: 'Optional node id' },
      scope: { type: 'string', enum: ['colors', 'typography', 'spacing', 'radii', 'all'], default: 'all' },
    },
    additionalProperties: false,
  };
}

function createServer() {
  const server = new Server(
    { name: 'figma-mcp-server', version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{
      name: TOOL_NAME,
      description: 'Extract supported Figma colors, typography, spacing and corner radii with node provenance.',
      inputSchema: toolSchema(),
    }],
  }));
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const args = request.params.arguments || {};
    const fileKey = args.fileKey || fileKeyFromUrl(args.fileUrl);
    if (!fileKey) return { isError: true, content: [{ type: 'text', text: 'fileUrl or fileKey is required' }] };
    try {
      const file = await fetchFile(fileKey, args.nodeId);
      if (args.nodeId && !containsNode(file.document, args.nodeId)) {
        throw new Error('Figma node was not found: ' + args.nodeId);
      }
      const tokens = extractDesignTokens(file, { scope: args.scope || 'all', nodeId: args.nodeId });
      return { content: [{ type: 'text', text: JSON.stringify(tokens, null, 2) }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error.message }] };
    }
  });
  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (require.main === module) main().catch(error => {
  process.stderr.write(error.stack + '\n');
  process.exitCode = 1;
});

module.exports = { createServer, fileKeyFromUrl, fetchFile, containsNode, SERVER_VERSION };

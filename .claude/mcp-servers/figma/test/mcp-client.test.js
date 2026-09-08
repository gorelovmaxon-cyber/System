'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

test('real MCP client initializes, lists and calls the tool', async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(__dirname, '..', 'server.js')],
    env: { ...process.env, FIGMA_FIXTURE_PATH: path.join(__dirname, 'fixtures/tokens.json') },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'figma-test-client', version: '1.0.0' });
  await client.connect(transport);
  const listed = await client.listTools();
  assert.equal(listed.tools.some(tool => tool.name === 'figma_get_design_tokens'), true);
  const result = await client.callTool({ name: 'figma_get_design_tokens', arguments: { fileKey: 'fixture-key', scope: 'all' } });
  assert.equal(result.isError, undefined);
  const payload = JSON.parse(result.content[0].text);
  assert.equal(payload.colors.some(item => item.node_id === '2:1'), true);
  const missingNode = await client.callTool({ name: 'figma_get_design_tokens', arguments: { fileKey: 'fixture-key', nodeId: 'missing:node' } });
  assert.equal(missingNode.isError, true);
  assert.match(missingNode.content[0].text, /node was not found/);
  await transport.close();
});

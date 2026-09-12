'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { fileKeyFromUrl, nodeIdFromUrl } = require('../server');

test('file key and node id are read from a Figma URL', () => {
  // RED on original: nodeIdFromUrl отсутствовал, и выделенный в макете узел
  // не ограничивал ответ.
  const url = 'https://www.figma.com/design/ABC123/Project?node-id=12-34&t=xyz';
  assert.equal(fileKeyFromUrl(url), 'ABC123');
  assert.equal(nodeIdFromUrl(url), '12:34');
  assert.equal(nodeIdFromUrl('https://www.figma.com/design/ABC123/Project'), null);
  assert.equal(nodeIdFromUrl('not a url'), null);
});

test('real MCP client initializes, lists and calls the tool', async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(__dirname, '..', 'server.js')],
    env: { ...process.env, FIGMA_FIXTURE_PATH: path.join(__dirname, 'fixtures/tokens.json') },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'figma-test-client', version: '1.0.0' });
  await client.connect(transport);
  try {
    const listed = await client.listTools();
    assert.equal(listed.tools.some(tool => tool.name === 'figma_get_design_tokens'), true);
    const result = await client.callTool({ name: 'figma_get_design_tokens', arguments: { fileKey: 'fixture-key', scope: 'all' } });
    assert.equal(result.isError, undefined);
    const payload = JSON.parse(result.content[0].text);
    assert.equal(payload.colors.some(item => item.node_id === '2:1'), true);
    const scoped = await client.callTool({ name: 'figma_get_design_tokens', arguments: { fileKey: 'fixture-key', nodeId: '2:2' } });
    const scopedPayload = JSON.parse(scoped.content[0].text);
    assert.equal(scopedPayload.radii.some(item => item.node_id === '2:2'), true);
    assert.equal(scopedPayload.typography.some(item => item.name === 'Heading/H1'), false);
    assert.equal(scopedPayload.ignored.filter(item => item.kind === 'style').length, 3);
    const missingNode = await client.callTool({ name: 'figma_get_design_tokens', arguments: { fileKey: 'fixture-key', nodeId: 'missing:node' } });
    assert.equal(missingNode.isError, true);
    assert.match(missingNode.content[0].text, /node was not found/);
  } finally {
    // Без этого падение проверки оставляет сервер живым и RED-прогон висит
    // до таймаута вместо честного падения.
    await transport.close();
  }
});

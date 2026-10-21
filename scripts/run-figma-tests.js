'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const original = path.resolve(__dirname, '../.claude/mcp-servers/figma');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'system2-figma-tests-'));
for (const item of ['server.js', 'lib', 'test', 'package.json']) fs.cpSync(path.join(original, item), path.join(root, item), { recursive: true });
const env = { ...process.env, NODE_PATH: path.join(original, 'node_modules') };
for (const key of Object.keys(env)) if (/^(FIGMA_|OPENAI_|ANTHROPIC_)/i.test(key) || /(?:TOKEN|SECRET|API_KEY)$/i.test(key)) delete env[key];
env.FIGMA_FIXTURE_PATH = path.join(root, 'test/fixtures/tokens.json');
const files = fs.readdirSync(path.join(root, 'test')).filter(f => f.endsWith('.test.js')).map(f => path.join(root, 'test', f));
const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, env, stdio: 'inherit', windowsHide: true, timeout: 60000 });
if (result.error) console.error(result.error.message);
process.exitCode = result.status === 0 ? 0 : 1;

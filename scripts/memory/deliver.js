#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');

function endpoint() {
  if (process.env.MEMORY_DELIVERY_ENDPOINT) return process.env.MEMORY_DELIVERY_ENDPOINT;
  const paths = resolvePaths();
  const read = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const example = read(path.join(paths.system_root, 'config/system.example.json'));
  const local = read(paths.localConfig);
  return local.delivery?.endpoint || example.delivery?.endpoint || '';
}

async function deliverEvent(event, options = {}) {
  const url = options.endpoint || endpoint();
  if (!url || url.includes('<')) return { ok: false, error: 'delivery endpoint is not configured' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout_ms || 5000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
      signal: controller.signal,
    });
    if (response.ok) return { ok: true, status: response.status };
    const body = await response.text();
    const retryable = response.status >= 500 || response.status === 429;
    return { ok: false, retryable, error: `HTTP ${response.status}: ${body.slice(0, 200)}` };
  } catch (error) {
    return { ok: false, retryable: true, error: error.name === 'AbortError' ? 'request timeout' : error.message };
  } finally {
    clearTimeout(timer);
  }
}

if (require.main === module) {
  deliverEvent(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')))
    .then(result => {
      process.stdout.write(JSON.stringify(result) + '\n');
      process.exitCode = result.ok ? 0 : 1;
    })
    .catch(error => {
      process.stderr.write(error.message + '\n');
      process.exitCode = 1;
    });
}

module.exports = { deliverEvent, endpoint };


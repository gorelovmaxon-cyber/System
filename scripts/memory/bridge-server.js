#!/usr/bin/env node
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');
const { writeProposal } = require('./writer');

function bridgeConfig() {
  const paths = resolvePaths();
  const bridge = paths.config.bridge || {};
  return {
    port: Number(process.env.MEMORY_BRIDGE_PORT || bridge.port || 8643),
    token: process.env.MEMORY_BRIDGE_TOKEN || bridge.token || '',
  };
}

function response(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body) + '\n');
}

function tokenFrom(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function server(options = {}) {
  const config = { ...bridgeConfig(), ...options };
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      const ready = Boolean(config.token && !config.token.includes('<'));
      return response(res, ready ? 200 : 503, { status: ready ? 'ready' : 'not-ready', writer: ready });
    }
    if (req.method !== 'POST' || req.url !== '/write') return response(res, 404, { error: 'not found' });
    if (!config.token || config.token.includes('<')) return response(res, 503, { error: 'bridge token is not configured' });
    if (tokenFrom(req) !== config.token) return response(res, 401, { error: 'unauthorized' });
    let size = 0;
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      size += Buffer.byteLength(chunk, 'utf8');
      if (size > 100000) req.destroy();
      else body += chunk;
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.event_id || !Array.isArray(payload.proposals)) return response(res, 400, { error: 'event_id and proposals are required' });
        return response(res, 200, writeProposal(payload.event_id, payload.proposals));
      } catch (error) {
        const status = error.code === 'CONFLICT' ? 409 : /invalid|must be|too large|escapes/.test(error.message) ? 400 : 500;
        return response(res, status, { error: error.message });
      }
    });
  });
}

if (require.main === module) {
  const config = bridgeConfig();
  server(config).listen(config.port, '127.0.0.1', () => {
    process.stdout.write(`bridge listening on http://127.0.0.1:${config.port}\n`);
  });
}

module.exports = { bridgeConfig, server };


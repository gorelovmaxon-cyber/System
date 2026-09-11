#!/usr/bin/env node
'use strict';

// The keeper owns the operating-system IPC endpoint used as the writer mutex.
// The endpoint is released by the OS when this process exits, including when
// the writer dies. The metadata file is deliberately not the lock authority.
const fs = require('node:fs');
const net = require('node:net');

const endpoint = JSON.parse(process.argv[2]);
const parentPid = Number(process.argv[3]);
const statusFile = process.argv[4];
const releaseRequest = process.argv[5];
const releaseAck = process.argv[6];
if (!endpoint || !Number.isInteger(parentPid) || !statusFile || !releaseRequest || !releaseAck) process.exit(64);

function publish(value) {
  try { fs.writeFileSync(statusFile, JSON.stringify(value), { flag: 'wx' }); } catch {}
}

function parentAlive() {
  try {
    process.kill(parentPid, 0);
    return true;
  } catch (error) {
    return error.code === 'ESRCH' ? false : true;
  }
}

const server = net.createServer();
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  server.close(() => {
    try { fs.writeFileSync(releaseAck, 'released', { flag: 'wx' }); } catch {}
    process.exit(code);
  });
  setTimeout(() => process.exit(code), 250).unref();
}

server.on('error', error => {
  publish({ status: error.code === 'EADDRINUSE' ? 'busy' : 'error', code: error.code, message: error.message });
  process.exit(error.code === 'EADDRINUSE' ? 2 : 1);
});

server.listen(endpoint, () => {
  publish({ status: 'acquired', pid: process.pid });
});

setInterval(() => {
  if (!parentAlive() || fs.existsSync(releaseRequest)) close(0);
}, 10).unref();

const net = require('net');
const fs = require('fs');
const { spawnSync } = require('child_process');

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const PG_CTL = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_ctl.exe';
const PG_DATA = 'C:\\Program Files\\PostgreSQL\\18\\data';
const PG_LOG = 'C:\\Program Files\\PostgreSQL\\18\\data\\pg_local.log';

function checkPortOpen(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const done = (isOpen) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(isOpen);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

async function ensurePostgresRunning() {
  const isRunning = await checkPortOpen(PG_HOST, PG_PORT);
  if (isRunning) {
    console.log('[PostgreSQL 18] Local database server is active on port 5432.');
    return;
  }

  if (!fs.existsSync(PG_CTL) || !fs.existsSync(PG_DATA)) {
    console.log('[PostgreSQL 18] Local pg_ctl binary not found at default path; skipping auto-start.');
    return;
  }

  console.log('[PostgreSQL 18] Starting local PostgreSQL 18 daemon on port 5432...');
  const result = spawnSync(PG_CTL, ['start', '-D', PG_DATA, '-l', PG_LOG, '-w'], {
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.status === 0) {
    console.log('[PostgreSQL 18] Local database server started successfully.');
  } else {
    console.warn('[PostgreSQL 18] Notice while starting pg_ctl:', result.stderr || result.stdout);
  }
}

ensurePostgresRunning();

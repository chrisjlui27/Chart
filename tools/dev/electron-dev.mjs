// Single-command dev launcher: start the Vite dev server (unless one is already
// listening) and open Electron against it. Ctrl-C stops both.
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const port = Number(process.env.HAV_DEV_PORT ?? 5173);
const url = `http://localhost:${port}`;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function probe() {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.setTimeout(500);
    const done = (up) => { socket.destroy(); resolve(up); };
    socket.on('connect', () => done(true));
    socket.on('error', () => done(false));
    socket.on('timeout', () => done(false));
  });
}

async function waitFor(deadlineMs) {
  const until = Date.now() + deadlineMs;
  while (Date.now() < until) {
    if (await probe()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

const children = [];
const group = process.platform !== 'win32';
function run(args, extraEnv) {
  // Own process group so the whole npm -> vite/electron tree goes down together;
  // npm does not forward signals to its child on every platform.
  const child = spawn(npm, args, {
    cwd: root, stdio: 'inherit', detached: group, env: { ...process.env, ...extraEnv },
  });
  children.push(child);
  return child;
}
function shutdown(code) {
  for (const child of children) {
    if (child.exitCode !== null || child.pid === undefined) continue;
    try { group ? process.kill(-child.pid, 'SIGTERM') : child.kill('SIGTERM'); }
    catch { try { child.kill('SIGTERM'); } catch { /* already gone */ } }
  }
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const alreadyUp = await probe();
if (alreadyUp) {
  console.log(`[hav] dev server already listening on ${url}; attaching Electron`);
} else {
  console.log(`[hav] starting dev server on ${url}`);
  const vite = run(['--workspace', 'app', 'run', 'dev', '--', '--port', String(port), '--strictPort']);
  vite.on('exit', (code) => { if (code !== 0) shutdown(code ?? 1); });
  if (!(await waitFor(60_000))) {
    console.error(`[hav] dev server did not come up on ${url} within 60s`);
    shutdown(1);
  }
}

const electron = run(['--workspace', 'app', 'run', 'electron'], { VITE_DEV_SERVER_URL: url });
electron.on('exit', (code) => shutdown(code ?? 0));

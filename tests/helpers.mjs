// Black-box test helpers: the server is always run through its CLI and
// queried over HTTP, so the tests do not depend on the internal modules.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP = fileURLToPath(new URL('../web-server/app.js', import.meta.url));

/**
 * finds a free TCP port.
 */
export const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});

/**
 * creates a temporary directory with the given files ({ 'relative/path': content }).
 * It is outside of this package, like a user project.
 */
export const makeProject = (files) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-web-server-'));
  for (const [file, content] of Object.entries(files)) {
    const filePath = path.join(dir, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
  return dir;
};

export const removeProject = (dir) => fs.rmSync(dir, { recursive: true, force: true });

/**
 * sends a raw request (the path is not normalized by the client).
 */
export const request = (port, requestPath, { method = 'GET', body, host = '127.0.0.1', headers } = {}) =>
  new Promise((resolve, reject) => {
    // Content-Length is needed for the verbs without chunked encoding by default (e.g. DELETE).
    if (body !== undefined) {
      headers = { 'content-length': Buffer.byteLength(body), ...headers };
    }
    const req = http.request({ host, port, path: requestPath, method, headers }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body !== undefined) {
      req.write(body);
    }
    req.end();
  });

const canConnect = (port, host) => new Promise(resolve => {
  const socket = net.connect(port, host);
  socket.on('connect', () => { socket.end(); resolve(true); });
  socket.on('error', () => resolve(false));
});

/**
 * runs the CLI with the given arguments until it exits. After the timeout,
 * the process is killed and the code is null, so a test fails instead of hanging.
 */
export const runCli = (args, { cwd, timeout = 10000 } = {}) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [APP, ...args], { cwd, env: { ...process.env, FORCE_COLOR: '0' } });
  let output = '';
  const timer = setTimeout(() => {
    output += `\n[the process did not exit after ${timeout} ms]`;
    child.kill();
  }, timeout);
  child.stdout.on('data', data => output += data);
  child.stderr.on('data', data => output += data);
  child.on('error', reject);
  child.on('exit', (code, signal) => {
    clearTimeout(timer);
    resolve({ code: signal ? null : code, output });
  });
});

/**
 * starts the server through the CLI and waits until it accepts connections.
 * @returns {Promise<{ port, host, output: () => string, stop: () => Promise }>}
 */
export const startCli = async (args, { cwd, port, host = '127.0.0.1' } = {}) => {
  const child = spawn(process.execPath, [APP, ...args], { cwd, env: { ...process.env, FORCE_COLOR: '0' } });
  let output = '';
  let exited = false;
  child.stdout.on('data', data => output += data);
  child.stderr.on('data', data => output += data);
  child.on('exit', () => exited = true);

  const stop = () => new Promise(resolve => {
    if (exited) {
      resolve();
      return;
    }
    child.on('exit', resolve);
    child.kill();
  });

  for (let i = 0; i < 100; i++) {
    if (exited) {
      throw new Error('the server has exited:\n' + output);
    }
    if (await canConnect(port, host)) {
      return { port, host, output: () => output, stop };
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  await stop();
  throw new Error('the server did not start:\n' + output);
};

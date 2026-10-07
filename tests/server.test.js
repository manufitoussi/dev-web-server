const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const HttpServer = require('../web-server/server/http-server.js');
const DEFAULT = require('../web-server/config/default');
const merge = require('../web-server/tools/merge');

/**
 * sends a raw GET request (the path is not normalized by the client).
 */
const get = (port, requestPath, method = 'GET') => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, path: requestPath, method }, res => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', chunk => body += chunk);
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
  });
  req.on('error', reject);
  req.end();
});

const startServer = (config) => new Promise(resolve => {
  const server = new HttpServer(merge(DEFAULT, { domain: '127.0.0.1', port: 0 }, config)).start();
  server.on('listening', () => resolve(server));
});

describe('dev-web-server', () => {
  let tmpDir, baseDir, server, spaServer, port, spaPort;
  const logs = { log: console.log, error: console.error };

  before(async () => {
    // keeps the test output readable.
    console.log = () => {};
    console.error = () => {};

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-web-server-'));
    baseDir = path.join(tmpDir, 'httpdocs');
    fs.mkdirSync(path.join(baseDir, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(baseDir, 'index.html'), 'root index');
    fs.writeFileSync(path.join(baseDir, 'sub', 'index.html'), 'sub index');
    fs.writeFileSync(path.join(baseDir, 'my file é.txt'), 'encoded name');
    fs.writeFileSync(path.join(tmpDir, 'secret.txt'), 'secret');

    const endPointsFilePath = path.join(tmpDir, 'endpoints.js');
    fs.writeFileSync(endPointsFilePath, `
      module.exports = {
        '/hello': (req, res, params, sendSuccess) => sendSuccess(req, res, { hello: params.name }),
        '/params': (req, res, params, sendSuccess) => sendSuccess(req, res, params),
        '/boom': () => { throw new Error('boom'); },
      };
    `);

    server = await startServer({ baseDir, endPointsFilePath });
    port = server.address().port;
    spaServer = await startServer({ baseDir, isSPA: true });
    spaPort = spaServer.address().port;
  });

  after(() => {
    server.close();
    spaServer.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log = logs.log;
    console.error = logs.error;
  });

  it('serves the root index file', async () => {
    const res = await get(port, '/');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body, 'root index');
  });

  it('serves files with url encoded names', async () => {
    const res = await get(port, '/' + encodeURIComponent('my file é.txt'));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body, 'encoded name');
  });

  it('serves the index file of a directory', async () => {
    for (const p of ['/sub/', '/sub']) {
      const res = await get(port, p);
      assert.strictEqual(res.status, 200, p);
      assert.strictEqual(res.body, 'sub index', p);
    }
  });

  it('returns 404 for a missing file', async () => {
    const res = await get(port, '/missing.txt');
    assert.strictEqual(res.status, 404);
  });

  it('returns 400 for a malformed url', async () => {
    const res = await get(port, '/%E0%A4%A');
    assert.strictEqual(res.status, 400);
  });

  it('never serves files outside of the base directory', async () => {
    for (const p of ['/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt', '/..%5csecret.txt']) {
      const res = await get(port, p);
      assert.notStrictEqual(res.body, 'secret', p);
    }
  });

  it('runs an endpoint', async () => {
    const res = await get(port, '/api/hello?name=world');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(JSON.parse(res.body), { hello: 'world' });
  });

  it('passes the query string parameters to an endpoint', async () => {
    const res = await get(port, '/api/params?a=1&b=x%20y&a=2');
    assert.deepStrictEqual(JSON.parse(res.body), { a: ['1', '2'], b: 'x y' });
  });

  it('returns 500 and keeps running when an endpoint throws', async () => {
    const res = await get(port, '/api/boom');
    assert.strictEqual(res.status, 500);
    assert.match(JSON.parse(res.body).error.message, /boom/);

    const next = await get(port, '/');
    assert.strictEqual(next.status, 200);
  });

  it('sends no-cache headers unless CACHE is set', async () => {
    const res = await get(port, '/');
    assert.strictEqual(res.headers['cache-control'], 'no-cache');
  });

  describe('SPA mode', () => {
    it('serves the root file for unknown routes', async () => {
      const res = await get(spaPort, '/some/client/route');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body, 'root index');
    });

    it('still serves existing files and directories', async () => {
      assert.strictEqual((await get(spaPort, '/sub/')).body, 'sub index');
      assert.strictEqual((await get(spaPort, '/' + encodeURIComponent('my file é.txt'))).body, 'encoded name');
    });
  });
});

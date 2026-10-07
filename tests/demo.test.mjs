import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { freePort, request, startCli } from './helpers.mjs';

// the demo started like 'npm start': its test card checks the server from the browser.
const DEMO = fileURLToPath(new URL('../demo/', import.meta.url));

describe('demo test card', () => {
  let server;

  before(async () => {
    const port = await freePort();
    server = await startCli(['DOMAIN', '127.0.0.1', 'PORT', String(port), 'BASEDIR', DEMO + 'public', 'ENDPOINTS', DEMO + 'endpoints.js'], { port });
  });

  after(() => server.stop());

  it('serves the test card and its files', async () => {
    const page = await request(server.port, '/');
    assert.strictEqual(page.status, 200);
    assert.match(page.body, /Test Card/);

    const files = [...page.body.matchAll(/(?:src|href)="([^":]+)"/g)].map(match => match[1]);
    assert.ok(files.length >= 3, files.join());
    for (const file of [...files, 'data.json', 'sub/', encodeURIComponent('fichier été.txt')]) {
      const res = await request(server.port, '/' + file, { method: 'HEAD' });
      assert.strictEqual(res.status, 200, file);
    }
  });

  it('answers the endpoints used by the test card', async () => {
    const info = JSON.parse((await request(server.port, '/api/info')).body);
    assert.match(info.version, /^\d+\.\d+\.\d+/);

    const echo = JSON.parse((await request(server.port, '/api/echo?name=demo')).body);
    assert.strictEqual(echo.params.name, 'demo');

    assert.strictEqual((await request(server.port, '/api/error')).status, 401);
    assert.strictEqual((await request(server.port, '/api/boom')).status, 500);
    assert.strictEqual((await request(server.port, '/api/jsonp?callback=cb')).body, 'cb({"jsonp":true});');
  });
});

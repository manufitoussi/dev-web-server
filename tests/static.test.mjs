import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { freePort, makeProject, removeProject, request, startCli } from './helpers.mjs';

const FILES = {
  'httpdocs/index.html': 'root index',
  'httpdocs/sub/index.html': 'sub index',
  'httpdocs/my file é.txt': 'encoded name',
  'httpdocs/styles.css': 'body {}',
  'httpdocs/script.js': 'alert(1);',
  'httpdocs/data.json': '{}',
  'httpdocs/file.unknownext': 'unknown',
  'httpdocs/image.png': 'png',
  'secret.txt': 'secret',
};

const start = async (args, opts = {}) => {
  const port = await freePort();
  return startCli(['DOMAIN', '127.0.0.1', 'PORT', String(port), ...args], { ...opts, port });
};

describe('static files', () => {
  let project, server;

  before(async () => {
    project = makeProject(FILES);
    server = await start(['BASEDIR', path.join(project, 'httpdocs')]);
  });

  after(async () => {
    await server.stop();
    removeProject(project);
  });

  it('serves the root index file', async () => {
    const res = await request(server.port, '/');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body, 'root index');
    assert.strictEqual(res.headers['content-type'], 'text/html; charset=utf-8');
  });

  it('serves a file by its path', async () => {
    const res = await request(server.port, '/index.html');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body, 'root index');
  });

  it('ignores the query string', async () => {
    const res = await request(server.port, '/index.html?v=1');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body, 'root index');
  });

  it('serves files with url encoded names', async () => {
    const res = await request(server.port, '/' + encodeURIComponent('my file é.txt'));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body, 'encoded name');
  });

  it('serves the index file of a directory', async () => {
    for (const p of ['/sub/', '/sub']) {
      const res = await request(server.port, p);
      assert.strictEqual(res.status, 200, p);
      assert.strictEqual(res.body, 'sub index', p);
    }
  });

  it('sends the content type of the file, with its charset for the text files', async () => {
    const expected = {
      '/styles.css': 'text/css; charset=utf-8',
      '/script.js': 'application/javascript; charset=utf-8',
      '/data.json': 'application/json; charset=utf-8',
      '/image.png': 'image/png',
      '/file.unknownext': 'application/octet-stream',
    };
    for (const [p, contentType] of Object.entries(expected)) {
      const res = await request(server.port, p);
      assert.strictEqual(res.status, 200, p);
      assert.strictEqual(res.headers['content-type'], contentType, p);
    }
  });

  it('returns a 404 html error for a missing file', async () => {
    const res = await request(server.port, '/missing.txt');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.headers['content-type'], 'text/html; charset=utf-8');
    assert.match(res.body, /not found/);
  });

  it('escapes the requested url in the html error page', async () => {
    const res = await request(server.port, '/<script>alert("x")</script>');
    assert.strictEqual(res.status, 404);
    assert.doesNotMatch(res.body, /<script>/);
    assert.match(res.body, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  });

  it('answers OPTIONS requests with the allowed methods', async () => {
    const res = await request(server.port, '/index.html', { method: 'OPTIONS' });
    assert.strictEqual(res.status, 204);
    assert.strictEqual(res.headers['allow'], 'GET, HEAD, OPTIONS');
    assert.strictEqual(res.headers['access-control-allow-origin'], undefined);
    assert.strictEqual(res.body, '');
  });

  it('returns 400 for a malformed url', async () => {
    const res = await request(server.port, '/%E0%A4%A');
    assert.strictEqual(res.status, 400);
  });

  it('never serves files outside of the base directory', async () => {
    for (const p of ['/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt', '/..%5csecret.txt']) {
      const res = await request(server.port, p);
      assert.notStrictEqual(res.body, 'secret', p);
    }
  });

  it('sends no-cache headers and no CORS headers by default', async () => {
    for (const p of ['/', '/missing.txt']) {
      const res = await request(server.port, p);
      assert.strictEqual(res.headers['cache-control'], 'no-cache', p);
      assert.strictEqual(res.headers['access-control-allow-origin'], undefined, p);
    }
  });
});

describe('BASEDIR', () => {
  let project;

  before(() => project = makeProject(FILES));
  after(() => removeProject(project));

  it('defaults to the launching directory', async () => {
    const server = await start([], { cwd: path.join(project, 'httpdocs') });
    try {
      assert.strictEqual((await request(server.port, '/')).body, 'root index');
    } finally {
      await server.stop();
    }
  });

  it('accepts a path relative to the launching directory', async () => {
    const server = await start(['BASEDIR', 'httpdocs/sub'], { cwd: project });
    try {
      assert.strictEqual((await request(server.port, '/')).body, 'sub index');
    } finally {
      await server.stop();
    }
  });
});

describe('SPA mode', () => {
  let project, server;

  before(async () => {
    project = makeProject(FILES);
    server = await start(['BASEDIR', path.join(project, 'httpdocs'), 'SPA']);
  });

  after(async () => {
    await server.stop();
    removeProject(project);
  });

  it('serves the root file for unknown routes', async () => {
    const res = await request(server.port, '/some/client/route?id=1');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body, 'root index');
    assert.strictEqual(res.headers['content-type'], 'text/html; charset=utf-8');
  });

  it('still serves existing files and directories', async () => {
    assert.strictEqual((await request(server.port, '/sub/')).body, 'sub index');
    assert.strictEqual((await request(server.port, '/styles.css')).body, 'body {}');
    assert.strictEqual((await request(server.port, '/' + encodeURIComponent('my file é.txt'))).body, 'encoded name');
  });
});

describe('CORS and CACHE', () => {
  let project, server;

  before(async () => {
    project = makeProject(FILES);
    server = await start(['BASEDIR', path.join(project, 'httpdocs'), 'CORS', 'CACHE']);
  });

  after(async () => {
    await server.stop();
    removeProject(project);
  });

  it('sends CORS headers and no cache header on files and errors', async () => {
    for (const p of ['/', '/missing.txt']) {
      const res = await request(server.port, p);
      assert.strictEqual(res.headers['access-control-allow-origin'], '*', p);
      assert.match(res.headers['access-control-allow-methods'], /GET/, p);
      assert.match(res.headers['access-control-allow-headers'], /Content-Type/, p);
      assert.strictEqual(res.headers['cache-control'], undefined, p);
    }
  });

  it('sends CORS headers on the preflight requests of the files', async () => {
    const res = await request(server.port, '/styles.css', { method: 'OPTIONS' });
    assert.strictEqual(res.status, 204);
    assert.strictEqual(res.headers['access-control-allow-origin'], '*');
    assert.match(res.headers['access-control-allow-methods'], /GET/);
  });
});

describe('DELAY', () => {
  let project, server;

  before(async () => {
    project = makeProject(FILES);
    server = await start(['BASEDIR', path.join(project, 'httpdocs'), 'DELAY', '300']);
  });

  after(async () => {
    await server.stop();
    removeProject(project);
  });

  it('delays the file responses', async () => {
    const begin = Date.now();
    const res = await request(server.port, '/');
    assert.strictEqual(res.status, 200);
    assert.ok(Date.now() - begin >= 290, 'the response came too early');
  });
});

describe('streaming', () => {
  // 0123456789 repeated: the byte at index i is the digit i % 10.
  const DIGITS = '0123456789'.repeat(3);
  const BIG_SIZE = 5 * 1024 * 1024;
  let project, server;

  before(async () => {
    project = makeProject({
      'digits.txt': DIGITS,
      'empty.txt': '',
      'big.bin': 'x'.repeat(BIG_SIZE),
      'locked.txt': 'locked',
    });
    fs.chmodSync(path.join(project, 'locked.txt'), 0o000);
    server = await start(['BASEDIR', project]);
  });

  after(async () => {
    await server.stop();
    removeProject(project);
  });

  it('sends the size of the file and accepts ranges', async () => {
    const res = await request(server.port, '/digits.txt');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['content-length'], String(DIGITS.length));
    assert.strictEqual(res.headers['accept-ranges'], 'bytes');
    assert.strictEqual(res.body, DIGITS);
  });

  it('streams a big file', async () => {
    const res = await request(server.port, '/big.bin');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['content-length'], String(BIG_SIZE));
    assert.strictEqual(res.body.length, BIG_SIZE);
  });

  it('serves an empty file', async () => {
    const res = await request(server.port, '/empty.txt');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['content-length'], '0');
    assert.strictEqual(res.body, '');
  });

  it('sends the requested range', async () => {
    const cases = {
      'bytes=2-5': [2, 5],
      'bytes=25-': [25, 29],
      'bytes=-3': [27, 29],
      'bytes=28-100': [28, 29],
      'bytes=-100': [0, 29],
    };
    for (const [range, [start, end]] of Object.entries(cases)) {
      const res = await request(server.port, '/digits.txt', { headers: { range } });
      assert.strictEqual(res.status, 206, range);
      assert.strictEqual(res.headers['content-range'], `bytes ${start}-${end}/${DIGITS.length}`, range);
      assert.strictEqual(res.headers['content-length'], String(end - start + 1), range);
      assert.strictEqual(res.body, DIGITS.slice(start, end + 1), range);
    }
  });

  it('returns 416 for a range outside of the file', async () => {
    for (const range of ['bytes=30-40', 'bytes=10-5', 'bytes=-0']) {
      const res = await request(server.port, '/digits.txt', { headers: { range } });
      assert.strictEqual(res.status, 416, range);
      assert.strictEqual(res.headers['content-range'], `bytes */${DIGITS.length}`, range);
    }
  });

  it('sends the whole file for an unsupported range', async () => {
    for (const range of ['items=1-2', 'bytes=0-1,4-5', 'bytes=-']) {
      const res = await request(server.port, '/digits.txt', { headers: { range } });
      assert.strictEqual(res.status, 200, range);
      assert.strictEqual(res.body, DIGITS, range);
    }
  });

  it('sends only the headers for a HEAD request', async () => {
    const res = await request(server.port, '/digits.txt', { method: 'HEAD' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['content-length'], String(DIGITS.length));
    assert.strictEqual(res.headers['content-type'], 'text/plain; charset=utf-8');
    assert.strictEqual(res.body, '');
  });

  it('returns 500 when the file cannot be read', { skip: process.getuid?.() === 0 && 'root can read any file' }, async () => {
    const res = await request(server.port, '/locked.txt');
    assert.strictEqual(res.status, 500);
    assert.match(res.body, /EACCES/);
  });
});

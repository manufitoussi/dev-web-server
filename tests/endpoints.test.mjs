import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { freePort, makeProject, removeProject, request, runCli, startCli } from './helpers.mjs';

// a CommonJS endpoints file, as written by the users today.
const ENDPOINTS = `
let count = 0;
const route = name => (req, res, params, sendSuccess) =>
  sendSuccess(req, res, { route: name, params, routeParams: req.params, query: req.query });
module.exports = {
  '/hello': (req, res, params, sendSuccess) => sendSuccess(req, res, { hello: params.name }),
  '/echo': (req, res, params, sendSuccess) =>
    sendSuccess(req, res, { method: req.method, params, query: req.query, body: req.body ?? null, routeParams: req.params }),
  '/count': (req, res, params, sendSuccess) => sendSuccess(req, res, { count: count++ }),
  '/jsonp': (req, res, params, sendSuccess) => sendSuccess(req, res, { ok: true }, params.callback),
  '/error': (req, res, params, sendSuccess, sendError) => sendError(req, res, 401, 'not allowed'),
  '/errorWithResult': (req, res, params, sendSuccess, sendError) =>
    sendError(req, res, 409, 'conflict', { id: 42 }),
  '/jsonpError': (req, res, params, sendSuccess, sendError) =>
    sendError(req, res, 400, 'bad', undefined, params.callback),
  '/boom': () => { throw new Error('boom'); },
  '/sub/path': (req, res, params, sendSuccess) => sendSuccess(req, res, 'sub path'),
  '/users/:id': route('user'),
  '/users/me': route('me'),
  '/users/:userId/posts/:postId': route('user post'),
  '/:kind/:id/posts': route('posts of anything'),
  '/users/:id/posts': route('user posts'),
  '/files/:name': route('file'),
};
`;

const start = async (args, opts = {}) => {
  const port = await freePort();
  return startCli(['DOMAIN', '127.0.0.1', 'PORT', String(port), ...args], { ...opts, port });
};

describe('endpoints', () => {
  let project, server;

  before(async () => {
    project = makeProject({ 'endpoints.js': ENDPOINTS, 'httpdocs/index.html': 'root index' });
    server = await start(['BASEDIR', path.join(project, 'httpdocs'), 'ENDPOINTS', path.join(project, 'endpoints.js')]);
  });

  after(async () => {
    await server.stop();
    removeProject(project);
  });

  it('sends a json success response', async () => {
    const res = await request(server.port, '/api/hello?name=world');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8');
    assert.deepStrictEqual(JSON.parse(res.body), { hello: 'world' });
  });

  it('keeps the endpoint state between requests', async () => {
    const first = JSON.parse((await request(server.port, '/api/count')).body).count;
    const second = JSON.parse((await request(server.port, '/api/count')).body).count;
    assert.strictEqual(second, first + 1);
  });

  it('routes endpoints with a sub path', async () => {
    const res = await request(server.port, '/api/sub/path');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(JSON.parse(res.body), 'sub path');
  });

  // sends a request to the echo endpoint and returns its json response.
  const echo = async (path, options) => {
    const res = await request(server.port, '/api/echo' + path, options);
    assert.strictEqual(res.status, 200, res.body);
    return JSON.parse(res.body);
  };

  it('passes the query string parameters', async () => {
    for (const method of ['GET', 'DELETE', 'POST']) {
      const result = await echo('?a=1&b=x%20y&a=2', { method });
      const query = { a: ['1', '2'], b: 'x y' };
      assert.deepStrictEqual(result, { method, params: query, query, body: null, routeParams: {} }, method);
    }
  });

  it('parses a JSON body and merges its fields into the params', async () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const result = await echo('?a=1&b=2', {
        method,
        body: '{"b":"body","c":[1,2]}',
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
      assert.deepStrictEqual(result.body, { b: 'body', c: [1, 2] }, method);
      assert.deepStrictEqual(result.query, { a: '1', b: '2' }, method);
      // the body fields override the query string parameters.
      assert.deepStrictEqual(result.params, { a: '1', b: 'body', c: [1, 2] }, method);
    }
  });

  it('parses the +json content types', async () => {
    const result = await echo('', { method: 'POST', body: '{"a":1}', headers: { 'content-type': 'application/merge-patch+json' } });
    assert.deepStrictEqual(result.params, { a: 1 });
  });

  it('does not merge a JSON body that is not an object', async () => {
    const result = await echo('?a=1', { method: 'POST', body: '[1,2]', headers: { 'content-type': 'application/json' } });
    assert.deepStrictEqual(result.body, [1, 2]);
    assert.deepStrictEqual(result.params, { a: '1' });
  });

  it('parses a url encoded form body', async () => {
    const result = await echo('', {
      method: 'POST',
      body: 'name=John+Doe&tag=a&tag=b',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    assert.deepStrictEqual(result.body, { name: 'John Doe', tag: ['a', 'b'] });
    assert.deepStrictEqual(result.params, { name: 'John Doe', tag: ['a', 'b'] });
  });

  it('keeps the raw body for the other content types', async () => {
    for (const headers of [{ 'content-type': 'text/plain' }, {}]) {
      const result = await echo('?a=1', { method: 'POST', body: '{"a":2}', headers });
      assert.strictEqual(result.body, '{"a":2}');
      assert.deepStrictEqual(result.params, { a: '1' });
    }
  });

  it('returns 400 for an invalid JSON body', async () => {
    const res = await request(server.port, '/api/echo', { method: 'POST', body: '{a:1}', headers: { 'content-type': 'application/json' } });
    assert.strictEqual(res.status, 400);
    assert.match(JSON.parse(res.body).error.message, /^invalid JSON body/);
  });

  it('reads a body sent in several chunks with multibyte characters', async () => {
    const big = 'é'.repeat(100000);
    const result = await echo('', { method: 'POST', body: JSON.stringify({ big }), headers: { 'content-type': 'application/json' } });
    assert.strictEqual(result.params.big, big);
  });

  describe('routes with parameters', () => {
    const call = async path => {
      const res = await request(server.port, '/api' + path);
      return { status: res.status, body: JSON.parse(res.body) };
    };

    it('passes the route parameters in req.params and params', async () => {
      const { status, body } = await call('/users/42');
      assert.strictEqual(status, 200);
      assert.deepStrictEqual(body, { route: 'user', params: { id: '42' }, routeParams: { id: '42' }, query: {} });

      const post = await call('/users/42/posts/7');
      assert.strictEqual(post.body.route, 'user post');
      assert.deepStrictEqual(post.body.routeParams, { userId: '42', postId: '7' });
    });

    it('prefers the exact endpoint', async () => {
      assert.strictEqual((await call('/users/me')).body.route, 'me');
    });

    it('prefers the route with the most static segments', async () => {
      assert.strictEqual((await call('/users/1/posts')).body.route, 'user posts');
      const other = await call('/books/1/posts');
      assert.strictEqual(other.body.route, 'posts of anything');
      assert.deepStrictEqual(other.body.routeParams, { kind: 'books', id: '1' });
    });

    it('decodes the route parameters', async () => {
      assert.deepStrictEqual((await call('/files/John%20Doe%20%C3%A9t%C3%A9')).body.routeParams, { name: 'John Doe été' });
    });

    it('gives priority to the route parameters over the query string', async () => {
      const { body } = await call('/users/42?id=1&sort=asc');
      assert.deepStrictEqual(body.params, { id: '42', sort: 'asc' });
      assert.deepStrictEqual(body.query, { id: '1', sort: 'asc' });
    });

    it('returns 404 when no route matches', async () => {
      for (const path of ['/users/', '/users/1/2', '/files/a/b']) {
        assert.strictEqual((await call(path)).status, 404, path);
      }
    });
  });

  it('answers OPTIONS requests without calling the endpoint', async () => {
    const res = await request(server.port, '/api/error', { method: 'OPTIONS' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(JSON.parse(res.body), '');
  });

  it('sends a json error response', async () => {
    const res = await request(server.port, '/api/error');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8');
    assert.deepStrictEqual(JSON.parse(res.body), { error: { code: 401, message: 'not allowed' } });
  });

  it('adds the error to the given result object', async () => {
    const res = await request(server.port, '/api/errorWithResult');
    assert.strictEqual(res.status, 409);
    assert.deepStrictEqual(JSON.parse(res.body), { id: 42, error: { code: 409, message: 'conflict' } });
  });

  it('sends JSONP responses', async () => {
    const res = await request(server.port, '/api/jsonp?callback=myCallback');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['content-type'], 'application/javascript; charset=utf-8');
    assert.strictEqual(res.body, 'myCallback({"ok":true});');

    const dotted = await request(server.port, '/api/jsonp?callback=app.callbacks.$done_1');
    assert.strictEqual(dotted.body, 'app.callbacks.$done_1({"ok":true});');

    const error = await request(server.port, '/api/jsonpError?callback=myCallback');
    assert.strictEqual(error.status, 400);
    assert.strictEqual(error.headers['content-type'], 'application/javascript; charset=utf-8');
    assert.strictEqual(error.body, 'myCallback({"error":{"code":400,"message":"bad"}});');
  });

  it('refuses an invalid JSONP callback name', async () => {
    for (const p of ['/api/jsonp', '/api/jsonpError']) {
      const res = await request(server.port, p + '?callback=' + encodeURIComponent('alert(1);x'));
      assert.strictEqual(res.status, 400, p);
      assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8', p);
      assert.deepStrictEqual(JSON.parse(res.body), { error: { code: 400, message: 'invalid JSONP callback name' } }, p);
    }
  });

  it('returns a json 404 error for an unknown endpoint', async () => {
    const res = await request(server.port, '/api/unknown');
    assert.strictEqual(res.status, 404);
    assert.deepStrictEqual(JSON.parse(res.body), { error: { code: 404, message: 'endPoint not found' } });
  });

  it('returns 500 and keeps running when an endpoint throws', async () => {
    const res = await request(server.port, '/api/boom');
    assert.strictEqual(res.status, 500);
    assert.match(JSON.parse(res.body).error.message, /boom/);

    const next = await request(server.port, '/api/hello?name=again');
    assert.strictEqual(next.status, 200);
  });

  it('still serves the static files', async () => {
    const res = await request(server.port, '/');
    assert.strictEqual(res.body, 'root index');
  });

  it('sends no-cache headers and no CORS headers by default', async () => {
    for (const p of ['/api/hello', '/api/error', '/api/unknown']) {
      const res = await request(server.port, p);
      assert.strictEqual(res.headers['cache-control'], 'no-cache', p);
      assert.strictEqual(res.headers['access-control-allow-origin'], undefined, p);
    }
  });

  it('does not route the paths only starting like the endpoints root (e.g. /apifoo)', async () => {
    const res = await request(server.port, '/apifoo');
    assert.match(res.headers['content-type'], /text\/html/);
  });
});

describe('endpoints options', () => {
  let project;

  before(() => {
    project = makeProject({ 'server/endpoints.js': ENDPOINTS, 'httpdocs/index.html': 'root index' });
  });

  after(() => removeProject(project));

  it('accepts an endpoints file path relative to the launching directory', async () => {
    const server = await start(['ENDPOINTS', 'server/endpoints.js'], { cwd: project });
    try {
      assert.strictEqual((await request(server.port, '/api/hello?name=a')).status, 200);
    } finally {
      await server.stop();
    }
  });

  it('uses ENDPOINTSROOT as the endpoints root url', async () => {
    const server = await start(['ENDPOINTS', 'server/endpoints.js', 'ENDPOINTSROOT', '/my-api', 'BASEDIR', 'httpdocs'], { cwd: project });
    try {
      assert.deepStrictEqual(JSON.parse((await request(server.port, '/my-api/hello?name=a')).body), { hello: 'a' });
      assert.strictEqual((await request(server.port, '/api/hello')).status, 404);
    } finally {
      await server.stop();
    }
  });

  it('accepts an ENDPOINTSROOT with a trailing slash', async () => {
    const server = await start(['ENDPOINTS', 'server/endpoints.js', 'ENDPOINTSROOT', '/my-api/', 'BASEDIR', 'httpdocs'], { cwd: project });
    try {
      assert.deepStrictEqual(JSON.parse((await request(server.port, '/my-api/hello?name=a')).body), { hello: 'a' });
      assert.match((await request(server.port, '/my-apifoo')).headers['content-type'], /text\/html/);
    } finally {
      await server.stop();
    }
  });

  it('sends CORS headers and no cache header with CORS and CACHE', async () => {
    const server = await start(['ENDPOINTS', 'server/endpoints.js', 'CORS', 'CACHE'], { cwd: project });
    try {
      for (const p of ['/api/hello', '/api/error', '/api/unknown']) {
        const res = await request(server.port, p);
        assert.strictEqual(res.headers['access-control-allow-origin'], '*', p);
        assert.strictEqual(res.headers['cache-control'], undefined, p);
      }
      const preflight = await request(server.port, '/api/hello', { method: 'OPTIONS' });
      assert.strictEqual(preflight.status, 200);
      assert.match(preflight.headers['access-control-allow-methods'], /PATCH/);
    } finally {
      await server.stop();
    }
  });

  it('delays the endpoint responses with DELAY', async () => {
    const server = await start(['ENDPOINTS', 'server/endpoints.js', 'DELAY', '300'], { cwd: project });
    try {
      const begin = Date.now();
      assert.strictEqual((await request(server.port, '/api/hello')).status, 200);
      assert.ok(Date.now() - begin >= 290, 'the response came too early');
    } finally {
      await server.stop();
    }
  });

  it('starts without endpoints when the endpoints file cannot be loaded', async () => {
    const broken = makeProject({ 'endpoints.js': 'this is not javascript', 'index.html': 'root index' });
    const server = await start(['ENDPOINTS', 'endpoints.js'], { cwd: broken });
    try {
      assert.match(server.output(), /cannot load endpoints file/);
      assert.strictEqual((await request(server.port, '/')).body, 'root index');
      assert.strictEqual((await request(server.port, '/api/hello')).status, 404);
    } finally {
      await server.stop();
      removeProject(broken);
    }
  });

  it('loads an ES module endpoints file (export default)', async () => {
    const esm = makeProject({
      'endpoints.mjs': `export default {
        '/hello': (req, res, params, sendSuccess) => sendSuccess(req, res, { hello: params.name }),
      };`,
    });
    const server = await start(['ENDPOINTS', 'endpoints.mjs'], { cwd: esm });
    try {
      assert.deepStrictEqual(JSON.parse((await request(server.port, '/api/hello?name=esm')).body), { hello: 'esm' });
    } finally {
      await server.stop();
      removeProject(esm);
    }
  });
});

describe('endpoints file reload', () => {
  // waits until check() returns true.
  const waitFor = async (check, message) => {
    for (let i = 0; i < 100; i++) {
      if (await check()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail('timeout: ' + message);
  };

  const versionOf = async port => {
    const res = await request(port, '/api/version');
    return res.status === 200 ? JSON.parse(res.body).version : res.status;
  };

  const cjs = (version, extra = '') => `module.exports = {
    '/version': (req, res, params, sendSuccess) => sendSuccess(req, res, { version: ${version} }),
    ${extra}
  };`;

  it('reloads a CommonJS endpoints file when it changes', async () => {
    const project = makeProject({ 'endpoints.js': cjs(1, `'/old': (req, res, params, sendSuccess) => sendSuccess(req, res, 'old'),`) });
    const server = await start(['ENDPOINTS', 'endpoints.js'], { cwd: project });
    try {
      assert.strictEqual(await versionOf(server.port), 1);
      fs.writeFileSync(path.join(project, 'endpoints.js'), cjs(2, `'/new': (req, res, params, sendSuccess) => sendSuccess(req, res, 'new'),`));
      await waitFor(async () => await versionOf(server.port) === 2, 'version 2');

      assert.strictEqual((await request(server.port, '/api/old')).status, 404);
      assert.strictEqual((await request(server.port, '/api/new')).body, '"new"');
      await waitFor(() => /Endpoints file reloaded/.test(server.output()), 'reload log');
    } finally {
      await server.stop();
      removeProject(project);
    }
  });

  it('reloads an ES module endpoints file when it changes', async () => {
    const esm = version => `export default {
      '/version': (req, res, params, sendSuccess) => sendSuccess(req, res, { version: ${version} }),
    };`;
    const project = makeProject({ 'endpoints.mjs': esm(1) });
    const server = await start(['ENDPOINTS', 'endpoints.mjs'], { cwd: project });
    try {
      assert.strictEqual(await versionOf(server.port), 1);
      for (const version of [2, 3]) {
        fs.writeFileSync(path.join(project, 'endpoints.mjs'), esm(version));
        await waitFor(async () => await versionOf(server.port) === version, `version ${version}`);
      }
    } finally {
      await server.stop();
      removeProject(project);
    }
  });

  it('keeps the previous endpoints when the new file is invalid', async () => {
    const project = makeProject({ 'endpoints.js': cjs(1) });
    const server = await start(['ENDPOINTS', 'endpoints.js'], { cwd: project });
    try {
      fs.writeFileSync(path.join(project, 'endpoints.js'), 'module.exports = { broken');
      await waitFor(() => /the endpoints file is not reloaded/.test(server.output()), 'error log');
      assert.strictEqual(await versionOf(server.port), 1);

      fs.writeFileSync(path.join(project, 'endpoints.js'), cjs(2));
      await waitFor(async () => await versionOf(server.port) === 2, 'version 2 after the fix');
    } finally {
      await server.stop();
      removeProject(project);
    }
  });

  it('loads an endpoints file created after the start', async () => {
    const project = makeProject({ 'index.html': 'root index' });
    const server = await start(['ENDPOINTS', 'endpoints.js'], { cwd: project });
    try {
      assert.strictEqual(await versionOf(server.port), 404);
      fs.writeFileSync(path.join(project, 'endpoints.js'), cjs(1));
      await waitFor(async () => await versionOf(server.port) === 1, 'version 1');
    } finally {
      await server.stop();
      removeProject(project);
    }
  });

  it('exits when the port is already in use, even with an endpoints file', async () => {
    const project = makeProject({ 'endpoints.js': cjs(1) });
    const server = await start(['ENDPOINTS', 'endpoints.js'], { cwd: project });
    try {
      const { code, output } = await runCli(['DOMAIN', '127.0.0.1', 'PORT', String(server.port), 'ENDPOINTS', 'endpoints.js'], { cwd: project });
      assert.strictEqual(code, 1);
      assert.match(output, /already in use/);
    } finally {
      await server.stop();
      removeProject(project);
    }
  });
});

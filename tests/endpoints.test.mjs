import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { freePort, makeProject, removeProject, request, startCli } from './helpers.mjs';

// a CommonJS endpoints file, as written by the users today.
const ENDPOINTS = `
let count = 0;
module.exports = {
  '/hello': (req, res, params, sendSuccess) => sendSuccess(req, res, { hello: params.name }),
  '/echo': (req, res, params, sendSuccess) => sendSuccess(req, res, { method: req.method, params }),
  '/count': (req, res, params, sendSuccess) => sendSuccess(req, res, { count: count++ }),
  '/jsonp': (req, res, params, sendSuccess) => sendSuccess(req, res, { ok: true }, params.callback),
  '/error': (req, res, params, sendSuccess, sendError) => sendError(req, res, 401, 'not allowed'),
  '/errorWithResult': (req, res, params, sendSuccess, sendError) =>
    sendError(req, res, 409, 'conflict', { id: 42 }),
  '/jsonpError': (req, res, params, sendSuccess, sendError) =>
    sendError(req, res, 400, 'bad', undefined, params.callback),
  '/boom': () => { throw new Error('boom'); },
  '/sub/path': (req, res, params, sendSuccess) => sendSuccess(req, res, 'sub path'),
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

  it('passes the query string parameters for GET and DELETE', async () => {
    for (const method of ['GET', 'DELETE']) {
      const res = await request(server.port, '/api/echo?a=1&b=x%20y&a=2', { method });
      assert.deepStrictEqual(JSON.parse(res.body), { method, params: { a: ['1', '2'], b: 'x y' } }, method);
    }
  });

  it('passes the raw body for the other verbs', async () => {
    for (const method of ['POST', 'PUT', 'PATCH']) {
      const res = await request(server.port, '/api/echo?ignored=1', { method, body: '{"a":1}' });
      assert.strictEqual(res.status, 200, method);
      assert.deepStrictEqual(JSON.parse(res.body), { method, params: '{"a":1}' }, method);
    }
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

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { freePort, makeProject, removeProject, request, runCli, startCli } from './helpers.mjs';

const ENDPOINTS = `
module.exports = {
  '/hello': (req, res, params, sendSuccess) => sendSuccess(req, res, { hello: params.name }),
};
`;

describe('help', () => {
  for (const arg of ['HELP', '--help', '-h', '-?']) {
    it(`prints the help and exits with ${arg}`, async () => {
      const { code, output } = await runCli([arg]);
      assert.strictEqual(code, 0);
      assert.match(output, /DEV WEB SERVER/);
      assert.match(output, /Parameters:/);
      for (const param of ['BASEDIR', 'PORT', 'ENDPOINTS', 'ENDPOINTSROOT', 'SPA', 'DELAY', 'CORS', 'CACHE', 'HELP']) {
        assert.match(output, new RegExp(`\\b${param}\\b`), param);
      }
    });
  }

  it('prints the package version', async () => {
    const { version } = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
    const { output } = await runCli(['HELP']);
    assert.ok(output.includes('v' + version), output);
  });
});

describe('server start', () => {
  let project;

  before(() => project = makeProject({ 'index.html': 'root index' }));
  after(() => removeProject(project));

  it('listens on the given DOMAIN and PORT and prints its url', async () => {
    const port = await freePort();
    const server = await startCli(['DOMAIN', '127.0.0.1', 'PORT', String(port)], { cwd: project, port });
    try {
      assert.strictEqual((await request(port, '/')).body, 'root index');
      assert.ok(server.output().includes(`http://127.0.0.1:${port}/`), server.output());
    } finally {
      await server.stop();
    }
  });

  it('listens on localhost by default', async () => {
    const port = await freePort();
    const server = await startCli(['PORT', String(port)], { cwd: project, port, host: 'localhost' });
    try {
      assert.strictEqual((await request(port, '/', { host: 'localhost' })).body, 'root index');
    } finally {
      await server.stop();
    }
  });
});

describe('configuration file (dev-web-server.json)', () => {
  let project, port;

  before(async () => {
    port = await freePort();
    project = makeProject({
      'dist/index.html': 'root index',
      'dist/sub/index.html': 'sub index',
      'server/endpoints.js': ENDPOINTS,
      'dev-web-server.json': JSON.stringify({
        domain: '127.0.0.1',
        port,
        baseDir: './dist',
        endPointsFilePath: './server/endpoints.js',
        endPointsRoot: '/my-api',
        isSPA: true,
        withCORS: true,
        withCache: true,
      }),
    });
  });

  after(() => removeProject(project));

  it('is read from the launching directory', async () => {
    const server = await startCli([], { cwd: project, port });
    try {
      const res = await request(port, '/my-api/hello?name=file');
      assert.deepStrictEqual(JSON.parse(res.body), { hello: 'file' });
      assert.strictEqual(res.headers['access-control-allow-origin'], '*');
      assert.strictEqual(res.headers['cache-control'], undefined);

      // SPA mode.
      assert.strictEqual((await request(port, '/client/route')).body, 'root index');
      assert.strictEqual((await request(port, '/sub/')).body, 'sub index');
    } finally {
      await server.stop();
    }
  });

  it('is overridden by the command line arguments', async () => {
    const cliPort = await freePort();
    const server = await startCli(['PORT', String(cliPort), 'BASEDIR', 'dist/sub', 'ENDPOINTSROOT', '/cli-api'], { cwd: project, port: cliPort });
    try {
      assert.strictEqual((await request(cliPort, '/')).body, 'sub index');
      assert.strictEqual((await request(cliPort, '/cli-api/hello')).status, 200);
    } finally {
      await server.stop();
    }
  });

  it('defaults baseDir to the launching directory', async () => {
    const otherPort = await freePort();
    const other = makeProject({
      'index.html': 'launching dir',
      'dev-web-server.json': JSON.stringify({ domain: '127.0.0.1', port: otherPort }),
    });
    const server = await startCli([], { cwd: other, port: otherPort });
    try {
      assert.strictEqual((await request(otherPort, '/')).body, 'launching dir');
    } finally {
      await server.stop();
      removeProject(other);
    }
  });

  it('accepts a null endPointsFilePath', async () => {
    const otherPort = await freePort();
    const other = makeProject({
      'index.html': 'root index',
      'dev-web-server.json': JSON.stringify({ domain: '127.0.0.1', port: otherPort, endPointsFilePath: null }),
    });
    const server = await startCli([], { cwd: other, port: otherPort });
    try {
      assert.strictEqual((await request(otherPort, '/')).body, 'root index');
    } finally {
      await server.stop();
      removeProject(other);
    }
  });
});

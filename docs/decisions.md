# Decisions

This file records the decisions taken on the project, with their context, so that they are not questioned again without a good reason. Add a new entry for each new decision, and mark an entry as *replaced* instead of deleting it.

## 2026-10-07 — Node.js 22 or later

**Context.** Node.js 14 to 20 are end of life.
**Decision.** The package requires Node.js `>=22.0.0` (`engines` field).
**Consequences.** The modern Node.js features are available: `node:test`, `util.styleText`, `import()` of CommonJS files, top-level `await`. The users of an older Node.js keep the 2.x versions.

## 2026-10-07 — ES modules

**Context.** The code used CommonJS (`require` / `module.exports`).
**Decision.** The package is an ES module (`"type": "module"`). The endpoints file is loaded with `import()`, so it can be an ES module (`export default`) or a CommonJS module (`module.exports`): the existing endpoints files keep working.
**Consequences.** Loading the endpoints file is asynchronous: `start()` is async. The JSON files are read with `fs` instead of `require`. This is a breaking change for the code using the internal modules: the next release should be a major version.

## 2026-10-07 — Black-box tests

**Context.** There were no tests, and the migration to ES modules needed a safety net.
**Decision.** The tests use `node:test` without dependency (`npm test`). They run the real CLI in a child process and query it over HTTP: they do not import the internal modules. They are `.mjs` files, and their fixtures are created in a temporary directory outside of the package, like a user project.
**Consequences.** The tests stay unchanged when the internal code is refactored. A test for a known bug can be written as `it.todo` before the fix.

## 2026-10-07 — `util.styleText` instead of `colors`

**Context.** `colors` extends `String.prototype`, and its versions above 1.4.0 were sabotaged by their author.
**Decision.** The terminal styles use `util.styleText`, through the `style()` helper (`web-server/tools/style.js`).
**Consequences.** One dependency less. Before Node.js 22.13, the styles are also applied when the output is not a terminal.

## 2026-10-07 — Only `web-server/` is published

**Decision.** The `files` field of `package.json` limits the npm package to the `web-server` directory (plus `package.json` and `readme.md`, always included by npm). The tests are not published.

## 2026-10-07 — `CACHE` keeps its behavior

**Context.** The documentation said that `CACHE` adds cache control headers, but without `CACHE` the responses have a `Cache-Control: no-cache` header, and `CACHE` removes it.
**Decision.** The behavior is kept and the documentation is fixed: changing the behavior would break the existing users.

## 2026-10-07 — Endpoint parameters

**Context.** The `params` argument of an endpoint is an object for `GET` and `DELETE` (the query string), and the raw body string for the other verbs.
**Decision.** This behavior is kept and documented: changing it would break the existing endpoints files. A repeated query string key gives an array of values, like `url.parse()` did.

## 2026-10-07 — Static files

**Decision.**
- The requested path is decoded (`/my%20file.txt` serves `my file.txt`); a malformed url gives a `400` error.
- A path outside of the base directory is never served (`404`).
- A directory serves its index file (`/docs` and `/docs/` serve `docs/index.html`).
- The content type of the text files includes their charset (`text/html; charset=utf-8`).
- An `OPTIONS` request gives a `204` response with an `Allow: GET, HEAD, OPTIONS` header, and the CORS headers with `CORS`, so the CORS preflight requests succeed.
- The requested url is escaped in the html error page.

## 2026-10-07 — Endpoints

**Decision.**
- An exception thrown by an endpoint gives a `500` JSON error: the server keeps running.
- Only the endpoints root itself and its sub paths are endpoint requests: `/apifoo` is not an endpoint of `/api`. A trailing slash in the endpoints root is ignored.
- A JSONP response has the `application/javascript` content type. The callback name has to be a JavaScript identifier or a dotted path of identifiers, otherwise a `400` JSON error is sent: the name is never injected as is in the response.

## 2026-10-07 — Configuration errors stop the application

**Decision.** The port and the delay are converted to numbers and validated, from the command line and from `dev-web-server.json`. A missing parameter value, an invalid value, an invalid `dev-web-server.json`, or a server that cannot start (e.g. the port is already in use) display an error message and exit with the code `1`. The help is displayed before reading the configuration.
**Consequences.** A mistake is reported at once, instead of a raw stack trace or a server running with an unexpected configuration.

## 2026-10-07 — Logs kept as they are

**Context.** Each request logs about 8 lines.
**Decision.** The logs are kept as they are for now. The unused `isDebug` option is removed: a `DEBUG` option reducing the logs may be added later.

## Pending — Next version number

The ES modules migration and the async `start()` are breaking changes for the code using the internal modules: the next release should be `3.0.0`. The version stays `2.0.0` until the release is decided.

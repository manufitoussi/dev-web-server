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

## 2026-10-07 — Endpoint parameters (*replaced by "Merged endpoint parameters"*)

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

## 2026-10-07 — Logs kept as they are (*replaced by "QUIET option"*)

**Context.** Each request logs about 8 lines.
**Decision.** The logs are kept as they are for now. The unused `isDebug` option is removed: a `DEBUG` option reducing the logs may be added later.

## 2026-10-07 — MIT license and continuous integration

**Decision.** The `LICENSE` file contains the MIT license declared in `package.json`. A GitHub Actions workflow (`.github/workflows/ci.yml`) runs the tests with Node.js 22 and 24 for each push and pull request, with the `pnpm` lockfile. The readme shows the CI status of `develop`.

## 2026-10-07 — QUIET option

**Context.** The detailed request logs are useful by default, but too verbose in some uses.
**Decision.** The logs stay detailed by default. The `QUIET` option (`isQuiet` in the configuration file) hides the request logs, including the `4xx` error responses. The server errors (`5xx` responses, endpoint exceptions, endpoints file loading), the start errors and the startup lines (version, `Server running at`) are still displayed. The logs go through a small logger (`web-server/tools/logger.js`).

## 2026-10-07 — Streamed files and ranges

**Context.** The files were read entirely in memory before being sent, and the `Range` requests were ignored: a video could not be played from any position.
**Decision.** The files are streamed with `fs.createReadStream`, with a `Content-Length` header. A single `Range` (`bytes=start-end`, `bytes=start-` or `bytes=-length`) gives a `206` response with the requested bytes, a range outside of the file gives a `416` response, and an unsupported range (multiple ranges, other unit) gives the whole file, as allowed by the HTTP specification. The headers are sent once the file is opened, so an opening error still gives a `500` error. `HEAD` gives the headers only.

## 2026-10-07 — Merged endpoint parameters

**Context.** `params` was the query string object for `GET` and `DELETE`, and the raw body string for the other verbs: the endpoints had to parse the body themselves, and lost the query string for a `POST`.
**Decision.** As the next release is a major version, `params` becomes one object for every verb: the query string parameters, then the body fields, then the route parameters, the last ones winning. The body is parsed according to its content type: JSON (`application/json` or `*+json`), url encoded form, or raw string otherwise. Each source stays available separately: `req.query`, `req.body`, `req.params`. An invalid JSON body gives a `400` error. A JSON body that is not an object (an array for example) is not merged: it is only in `req.body`.
**Consequences.** The `GET` endpoints keep working. The endpoints reading the raw body from `params` have to use `req.body` (see [upgrade-3.md](upgrade-3.md)).

## 2026-10-07 — Test card demo

**Context.** `npm start` served a minimal page that did not show what the server does.
**Decision.** `npm start` serves a test card (`demo/public/`, endpoints in `demo/endpoints.js`), like a TV test card: color bars, a clock, and checks run from the browser for each feature, green, red or blue (information on the active options). It is interactive: each check shows its requests and responses and can be run again, and a playground sends any request, with examples, and copies it as a `curl` command. It is not published on npm. A node test checks that the files and endpoints used by the test card answer; the page itself is checked in a browser during the development, not in the CI, to keep the CI without a browser.
**Consequences.** The test script lists the test files explicitly (`tests/*.test.mjs`), as `test-card.js` matches a default test file name pattern of `node --test`.

## 2026-10-07 — Routes with parameters

**Decision.** An endpoint key can contain parameters (`/users/:id`). The exact keys are matched first, then the routes with the same number of segments: the route with the most static segments wins, then the first declared, so the result does not depend on the declaration order in the usual cases. A parameter matches one non-empty segment, decoded. The route parameters are in `req.params` and override the query string and body fields in `params`.

## 2026-10-07 — Endpoints file reload

**Decision.** The server watches the directory of the endpoints file (some editors replace the file when saving it) and reloads the file when it changes, after 100 ms without change. An ES module is imported again with a new url (`?version=n`), and a CommonJS module is removed from the require cache first. If the new version cannot be loaded, the error is displayed and the previous endpoints are kept. An endpoints file missing at the start is loaded when it is created. There is no option to disable the reload.
**Consequences.** The state of the endpoints file is reset by a reload, and the modules it imports are not reloaded. Each version of an ES module stays in memory, which is acceptable for a development server. The watcher starts once the server listens, so the application still exits when the server cannot start.

## 2026-10-08 — Automatic publication on npm

**Context.** The 3.0.0 was published by hand, and npm now requires a two-factor authentication or a granular token to publish.
**Decision.** A GitHub Actions workflow (`.github/workflows/publish.yml`) publishes the package when a GitHub release is published, with the npm trusted publishing (OpenID Connect): no npm token is stored, and the package gets a provenance statement. The workflow runs the tests and checks that the release tag matches the version of `package.json` (`scripts/check-release-version.js`) before publishing. A pre-release is published with the `next` npm tag.
**Consequences.** The release order becomes: merge into `master`, then create the GitHub release (with its tag), which publishes on npm. The trusted publisher has to be declared once in the settings of the package on npmjs.com. The previous order of the 3.0.0 entry is replaced.

## 2026-10-07 — Version 3.0.0

**Context.** The merged endpoint parameters (the raw body moves from `params` to `req.body`), the Node.js 22 requirement, the stricter parameter validation, and the ES modules migration with the async `start()` are breaking changes.
**Decision.** The release is `3.0.0`. Its notes are in `CHANGELOG.md`, and the upgrade guide in [upgrade-3.md](upgrade-3.md). The release order is: merge into `master`, tag `v3.0.0`, publish on npm, then create the GitHub release, so the announced version is already installable.

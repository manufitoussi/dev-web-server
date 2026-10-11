# CLAUDE.md

Guidance for Claude Code on this repository. Read [CONTRIBUTING.md](CONTRIBUTING.md) first (setup, commands, branches, code style, tests, documentation): this file only adds what it does not say. Keep both files consistent.

## Project

A small development web server published on npm (static files, mocked API endpoints, SPA, CORS), as a command line application configured by parameters or a `dev-web-server.json` file. Node.js 22+, ES modules, no build step, one runtime dependency (`mime-types`). The decisions and their reasons are in `docs/decisions.md`: do not question them without a good reason.

## Layout

- `web-server/app.js`: entry point (the `bin`): help, configuration, start and its errors.
- `web-server/config/`: configuration chain `default.js` → `from-default.js` → `from-file.js` → `from-cli.js` → `validate.js`. A new option needs a default, a CLI parameter (tables in `from-cli.js`), a line in the help (`app.js`), the readme tables and tests.
- `web-server/server/http-server.js`: static files (streaming, ranges, directory index, SPA), routing to the endpoints, loading and reloading of the endpoints file.
- `web-server/server/service.js`: the endpoints: route matching (`/users/:id`), body parsing, `params` / `req.query` / `req.body` / `req.params`, `sendSuccess` / `sendError`, JSONP.
- `demo/`: the test card served by `npm start`, not published. `scripts/`: the release version check.

## Maintainer rules

- The maintainer usually discusses in French; everything in the repository is in English.
- Merge a branch into `develop` with `git merge --no-ff` (message `Merge branch '<branch>' into develop`). `develop` goes to `master` through a pull request.
- Releases: see the readme. A breaking change needs a major version and an upgrade guide (like `docs/upgrade-3.md`).

## Pitfalls

- Keep the explicit `tests/*.test.mjs` glob of the test script: `node --test` alone would also run `demo/public/test-card.js`.
- The server writes its logs asynchronously: in a test, wait for an expected line before asserting on the output.
- The endpoints file is loaded with `import()` (CommonJS or ES module). To reload it, an ES module is imported with a new url (`?version=n`), a CommonJS module is removed from the require cache first.
- The endpoints file watcher starts only once the server listens, otherwise a failed `listen` would keep the process running.
- Read the HTTP body with `req.setEncoding('utf8')`, and send a `Content-Length` with a body in the test requests (a `DELETE` has no chunked encoding by default).
- A path from a url is decoded, then checked to stay inside the base directory: keep this check for any new file access.

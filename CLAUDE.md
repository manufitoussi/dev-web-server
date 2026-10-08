# CLAUDE.md

Guidance for Claude Code (and any contributor) working on this repository.

## Project

`dev-web-server` is a small development web server published on npm: static files, mocked API endpoints defined in a JavaScript file, SPA mode, CORS. It is a command line application (`dev-web-server PORT 8080 BASEDIR ./public ENDPOINTS ./mock.js`), configured by command line parameters or a `dev-web-server.json` file.

- Node.js 22 or later, ES modules (`"type": "module"`), no build step.
- One runtime dependency: `mime-types`. Do not add dependencies without a good reason (the terminal styles use `util.styleText`, the tests use `node:test`).
- `pnpm` is the package manager of the repository (`pnpm-lock.yaml`); the users install the package with any package manager.

## Commands

```bash
pnpm install          # install the dependencies
npm test              # all the tests (node --test "tests/*.test.mjs")
npm start             # the test card demo at http://localhost:8080/
npm start -- CORS QUIET DELAY 500   # the demo with parameters
node web-server/app.js HELP         # the help of the command line
npm pack --dry-run    # the files published on npm
```

Run one test file or one test: `node --test tests/endpoints.test.mjs`, `node --test --test-name-pattern="routes" tests/endpoints.test.mjs`.

## Layout

- `web-server/app.js`: entry point (the `bin`): help, configuration, start and its errors.
- `web-server/config/`: configuration chain `default.js` → `from-default.js` → `from-file.js` (`dev-web-server.json`) → `from-cli.js` → `validate.js`. A new option needs a default, a CLI parameter (tables in `from-cli.js`), a line in the help (`app.js`), the readme tables and tests.
- `web-server/server/http-server.js`: the HTTP server: static files (streaming, ranges, directory index, SPA), routing to the endpoints, loading and reloading of the endpoints file.
- `web-server/server/service.js`: the endpoints: route matching (`/users/:id`), body parsing, `params` / `req.query` / `req.body` / `req.params`, `sendSuccess` / `sendError`, JSONP.
- `web-server/server/headers.js`, `content-types.js`, `web-server/tools/` (logger, style, merge).
- `demo/`: the interactive test card served by `npm start` (`demo/public/`, endpoints in `demo/endpoints.js`). Not published on npm.
- `tests/`: the tests, `scripts/`: the release version check, `docs/`: decisions, upgrade guide, readme screenshots.

## Tests

- The tests are **black-box**: they run the real CLI in a child process (`startCli`, `runCli` in `tests/helpers.mjs`) and query it over HTTP. Do not import the internal modules in the tests: this keeps them valid through refactorings.
- The test files are `tests/*.test.mjs`. Their fixtures are created in a temporary directory outside of the package (`makeProject`), like a user project.
- Every behavior change comes with tests. A known bug can be written first as `it.todo`.
- The server writes its logs asynchronously: wait for an expected line (see the `logs` tests) before asserting on the output.
- `runCli` kills a process that does not exit after 10 s: a test fails instead of hanging the suite.
- The CI (`.github/workflows/ci.yml`) runs the tests with Node.js 22 and 24 on each push and pull request.

## Conventions

- Code, comments, documentation and commit messages are in **English**. The maintainer usually discusses in French.
- Match the style of the surrounding code: 2 spaces, single quotes, semicolons, `const` / `let`, JSDoc comments starting with a lowercase verb (`/** loads the endpoints file. ... */`).
- Commit messages: a short imperative title, then a body explaining what and why, as bullet points if needed. **No `Co-Authored-By` or other AI attribution lines** in the commits.
- The commits are authored by the maintainer: `Emmanuel Fitoussi <manu.fitoussi@gmail.com>`.

## Workflow

- `develop` is the development branch, `master` the released one (the default branch).
- Work on a branch created from an up-to-date `develop` (`feat/...`, `fix/...`, `docs/...`, `chore/...`, `refactor/...`), one topic per branch.
- Before merging: tests green locally and on the CI, documentation updated.
- Merge into `develop` with a merge commit (`git merge --no-ff`, message `Merge branch '<branch>' into develop`).
- `develop` goes to `master` through a pull request.

## Documentation

Update with each change, when relevant:

- `readme.md`: the user documentation (features, parameters, configuration file, endpoints file, test card, releasing).
- `CHANGELOG.md`: add the change to the `Unreleased` section.
- `docs/decisions.md`: record each decision with its context and consequences; mark a replaced decision as *replaced* instead of deleting it.
- The help message in `web-server/app.js` lists all the parameters, in the order of the readme table.
- The test card (`demo/`): add a check when a new feature can be seen from a browser. Check it in a browser after a change.

## Releasing

1. On `develop`: update the `version` of `package.json` and move the `Unreleased` section of `CHANGELOG.md` to the new version.
2. Pull request `develop` → `master`, then merge.
3. Create a GitHub release on `master` with a new tag `v<version>` and the changelog of the version.

`.github/workflows/publish.yml` then runs the tests, checks that the tag matches the version (`scripts/check-release-version.js`) and publishes on npm with the trusted publishing (no npm token). A pre-release is published with the `next` npm tag. A breaking change needs a major version and an upgrade guide (see `docs/upgrade-3.md`).

## Pitfalls

- `node --test` without arguments would also run `demo/public/test-card.js` (it matches the default `test-*` pattern): keep the explicit `tests/*.test.mjs` glob of the test script.
- The endpoints file can be CommonJS or an ES module: it is loaded with `import()`. To reload it, an ES module is imported with a new url (`?version=n`) and a CommonJS module is removed from the require cache first.
- The endpoints file watcher starts only once the server listens: a watcher started before a failed `listen` would keep the process running.
- Read the HTTP body with `req.setEncoding('utf8')` (multibyte characters across chunks), and send a `Content-Length` with a body in the test requests (a `DELETE` has no chunked encoding by default).
- A path from a url is decoded, then checked to stay inside the base directory: keep this check for any new file access.

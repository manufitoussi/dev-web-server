# Contributing

Thank you for your interest in `dev-web-server`! Bug reports, ideas and pull requests are welcome.

## Reporting a bug or proposing a feature

Open an [issue](https://github.com/manufitoussi/dev-web-server/issues) with:

- the version of `dev-web-server` (`dev-web-server HELP` shows it) and of Node.js (`node --version`),
- the command line or the `dev-web-server.json` file you use,
- what you expected, and what happened (the logs, the response status and body),
- if possible, a minimal endpoints file or set of files to reproduce it.

For a large change, open an issue first to discuss it: the project stays small on purpose, with a single runtime dependency.

The possible evolutions already considered are listed in [docs/roadmap.md](docs/roadmap.md).

## Setting up

You need Node.js 22 or later and [pnpm](https://pnpm.io/) (the repository has a `pnpm-lock.yaml`).

```bash
git clone https://github.com/manufitoussi/dev-web-server.git
cd dev-web-server
git checkout develop
pnpm install
npm test     # all the tests
npm start    # the test card at http://localhost:8080/
```

There is no build step: the code in `web-server/` runs as is. `npm start -- CORS DELAY 500` runs the test card with parameters, and `node web-server/app.js HELP` shows the help of the command line.

## Branches

- `master` is the released branch, `develop` the development branch.
- Create your branch from an up-to-date `develop`, with a prefix for its topic: `feat/...`, `fix/...`, `docs/...`, `chore/...` or `refactor/...`. One topic per branch.
- Open your pull request against `develop`, not `master`.

## Making a change

### Code

- ES modules, no build, no TypeScript.
- Match the style of the surrounding code: 2 spaces, single quotes, semicolons, `const` / `let`, JSDoc comments starting with a lowercase verb (`/** loads the endpoints file. */`).
- Do not add a dependency without a good reason: the terminal styles use `util.styleText`, the tests use `node:test`.
- Any file access from a url must stay inside the base directory: keep the existing check.

### Tests

Every behavior change comes with tests. The tests are **black-box**: they run the real command line in a child process and query it over HTTP, with the helpers of `tests/helpers.mjs` (`startCli`, `runCli`, `makeProject`). Do not import the internal modules from the tests, so that the tests stay valid when the code is refactored.

```bash
npm test                                                    # all the tests
node --test tests/endpoints.test.mjs                        # one file
node --test --test-name-pattern="routes" tests/endpoints.test.mjs   # some tests
```

A known bug can be written first as an `it.todo` test. The CI runs the tests with Node.js 22 and 24 on each push and pull request.

When a feature can be seen from a browser, add a check to the test card (`demo/`), and look at it in a browser.

### Documentation

Update, when relevant:

- `readme.md`: the user documentation. A new option also needs a line in the help message of `web-server/app.js`, in the order of the readme table.
- `CHANGELOG.md`: add your change to the `Unreleased` section.
- `docs/decisions.md`: record a design decision with its context and consequences. Mark a replaced decision as *replaced* instead of deleting it.

### Commits

Code, comments, documentation and commit messages are in English. A commit message has a short imperative title (`Add the QUIET option`), then, if needed, a body explaining what and why.

## Using AI tools

AI-assisted contributions are welcome. You are responsible for what you submit: read, understand and test every line, as for any other contribution. Instructions for AI coding agents are in `CLAUDE.md`.

## Pull requests

Before opening a pull request, check that:

- the tests pass (`npm test`),
- the documentation and the changelog are updated,
- the branch is up to date with `develop`.

Describe what the change does and why, and link the related issue.

## Releasing

The releases are made by the maintainer: see [Releasing](readme.md#releasing) in the readme.

## License

By contributing, you agree that your contributions are licensed under the [MIT license](LICENSE).

# Changelog

## 3.0.0 — 2026-10-07

A major version: modernized, tested, and with new features for mocking APIs. See [docs/upgrade-3.md](https://github.com/manufitoussi/dev-web-server/blob/master/docs/upgrade-3.md) to upgrade from 2.x.

### Breaking changes

- **Node.js 22 or later** is required.
- **Endpoint parameters**: `params` is now one object for every verb, merging the query string, the body fields and the route parameters. The raw body moves from `params` (for `POST`, `PUT`, `PATCH`) to `req.body`. An invalid JSON body gives a `400` error.
- **Stricter configuration**: a missing parameter value, an invalid `PORT` or `DELAY`, or an invalid `dev-web-server.json` stop the application with an error instead of being ignored.
- **ES modules**: the package is an ES module and the internal `HttpServer.start()` is async. This only matters if you import the internal modules.

### New features

- **Routes with parameters** in the endpoints file: `/users/:id` gives `req.params.id`.
- **Parsed request bodies**: JSON (`application/json`, `*+json`) and url encoded forms, with `req.query`, `req.body` and `req.params`.
- **Endpoints file reload**: the file is reloaded when it changes, without restarting the server. A broken version keeps the previous endpoints.
- **ES module endpoints files** (`export default`), the CommonJS ones still work.
- **Streamed static files** with `Range` requests (videos and audio files can be played from any position), `Content-Length` and `HEAD` requests.
- **`QUIET` option** to hide the request logs.
- **Interactive test card**: `npm start` in the repository serves a page that checks all the features live, and lets you try your own requests.
- The content types include their charset (`text/html; charset=utf-8`).
- `OPTIONS` requests on static files succeed (CORS preflight).
- A directory serves its `index.html`.
- Clear error messages when the server cannot start (e.g. the port is already in use).

### Fixes

- An exception thrown by an endpoint no longer crashes the server: it gives a `500` error.
- The url encoded file names are served (`/my%20file.txt`).
- A request to a directory no longer gives a `500` error.
- `/apifoo` is no longer routed to the `/api` endpoints.
- A `null` `endPointsFilePath` in `dev-web-server.json` no longer crashes the server.
- The JSONP callback name is validated, and the requested url is escaped in the error pages.
- The help lists all the parameters.

### Maintenance

- The `colors` dependency (sabotaged by its author in its versions above 1.4.0) is replaced by `util.styleText`: `mime-types` is the only dependency left.
- Black-box tests (`npm test`) and a continuous integration on Node.js 22 and 24.
- MIT `LICENSE` file, updated documentation, and a record of the decisions ([docs/decisions.md](https://github.com/manufitoussi/dev-web-server/blob/master/docs/decisions.md)).

## 2.0.0 and before

See the [git history](https://github.com/manufitoussi/dev-web-server/commits/master).

# Roadmap

Possible evolutions of the project, not yet scheduled. They have to keep the project small, without new runtime dependency, and compatible with the 3.x versions. To work on one of them, open an issue first to discuss it.

When an evolution is done, remove it from this file: the changelog and `docs/decisions.md` record it.

## Endpoints

- **Value returned by an endpoint.** An endpoint that returns a value, or a promise of a value, without calling `sendSuccess` or `sendError`, sends it as a successful response: `'/users/:id': async (req) => db.find(req.params.id)`. To decide: what happens when an endpoint returns a value *and* calls a callback.
- **Status and headers of a successful response.** `sendSuccess` always sends a `200`: let it send a `201` with a `Location` header, or a `204` without body, without writing the response by hand.

## Proxy

- **`PROXY` option.** `PROXY http://localhost:3000` (`proxy` in `dev-web-server.json`) forwards the requests of the endpoints root that match no endpoint to a real API: only the missing routes are mocked. With `node:http` only. To decide: the forwarded headers (`Host`, `X-Forwarded-*`), and the CORS headers on the forwarded responses.

## Static files

- **Live reload.** A `LIVERELOAD` option watches the website root and reloads the browser when a file changes, with Server-Sent Events and a small script injected in the HTML pages. Injecting a script changes the served files: it needs a decision in `docs/decisions.md`.

## Command line

- **Free port.** When the port is in use, try the next ones instead of stopping with an error, and display the port actually used.
- **`OPEN` option.** Open the website in the default browser when the server starts (also from WSL).

## Maintenance

- **GitHub Actions.** `pnpm/action-setup@v4` runs on Node.js 20, deprecated on the GitHub runners: update it when a version running on Node.js 24 is available.

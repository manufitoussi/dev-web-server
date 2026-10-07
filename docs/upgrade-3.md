# Upgrading from 2.x to 3.0

## What's new

- Routes with parameters in the endpoints file (`/users/:id`).
- The JSON and form bodies are parsed: `params`, `req.query`, `req.body`, `req.params`.
- The endpoints file is reloaded when it changes, and can be an ES module.
- The static files are streamed, with `Range` support (videos and audio files can be played from any position) and `HEAD` requests.
- The `QUIET` option hides the request logs.
- The content types include their charset, the CORS preflight requests on static files succeed, and the errors (invalid parameters, port already in use) are reported clearly.
- `npm start` serves an interactive test card.
- No dependency left but `mime-types`.

The changes below may need an update of your project.

## Node.js 22 or later

The 3.0 version requires Node.js 22 or later.

## Endpoint parameters

`params` is now one object for every verb, merging the query string parameters, the body fields and the route parameters. The body is parsed according to its content type.

| | 2.x | 3.0 |
| --- | --- | --- |
| `GET` / `DELETE` | query string object | query string object (unchanged), plus the JSON or form body fields |
| `POST` / `PUT` / `PATCH` | raw body string | query string object, plus the JSON or form body fields |
| raw body | `params` (other verbs) | `req.body` (the parsed value for JSON and forms, the raw string otherwise) |

If an endpoint parses the body itself:

```js
// 2.x
'/users': (req, res, params, sendSuccess) => {
  const user = JSON.parse(params);
  sendSuccess(req, res, user);
},

// 3.0 (with a JSON content type)
'/users': (req, res, params, sendSuccess) => {
  sendSuccess(req, res, req.body);
},
```

An invalid JSON body (with a JSON content type) now gives a `400` error without calling the endpoint.

## Endpoints file

The endpoints file can stay a CommonJS module (`module.exports`), or become an ES module (`export default`).

## Command line and configuration

A missing parameter value or an invalid `PORT` or `DELAY` (command line or `dev-web-server.json`) now stops the application with an error, instead of being ignored.

## Internal modules

The package is an ES module, and `start()` of the internal `HttpServer` is async. This only matters if you import the internal modules.

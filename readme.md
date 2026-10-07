DEV WEB SERVER
==============
[![CI](https://github.com/manufitoussi/dev-web-server/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/manufitoussi/dev-web-server/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dev-web-server)](https://www.npmjs.com/package/dev-web-server)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A simple web & API server for your development.
-----------------------------------------------

# Definition
This project is a [NodeJS] application that creates a local web server simply and quickly. It serves static files and dynamic data: it is useful to mock an API or to serve your website project.

# Features
This application creates, by default, a web server on `http://localhost:8080/` that targets the *website root* from the *launching directory*.

You can:
- choose a domain,
- choose a port,
- choose the directory of the *website root*,
- add a delay before each response,
- define a set of API endpoints,
- choose the root URL of the API endpoints,
- activate the SPA mode,
- activate the CORS headers,
- allow browser caching (responses are sent with `Cache-Control: no-cache` by default),
- hide the request logs.

## Default webpage

The default webpage at the *website root* is `index.html`. A request to a directory (e.g. `/docs/` or `/docs`) serves its `index.html` file.

File names with special characters are supported: the requested URL is decoded (e.g. `/my%20file.txt` serves `my file.txt`). Files outside of the *website root* are never served.

## Favicon

The web server supports using `favicon.ico`. It has to be located at the site root.

## Endpoint verbs

The web server supports all endpoint verbs.

## SPA mode

In SPA mode, the requests of missing files are answered with your base file (default: `index.html`). This is useful for single page applications without a hash-based routing system.

## Content types

The content type of the requested file is resolved with [mime-types]. This tool looks up the content type from the requested file extension, with its charset for the text files (e.g. `text/html; charset=utf-8`). If nothing matches, the default content type is used: `application/octet-stream`.

## Streaming and ranges

The files are streamed: big files are not loaded in memory. The responses have a `Content-Length` header and support the `Range` requests (`bytes=start-end`, `bytes=start-` and `bytes=-length`), so the videos and the audio files can be played from any position. A range outside of the file gives a `416` response, and an unsupported range (e.g. multiple ranges) gives the whole file. A `HEAD` request gives the headers only.

## OPTIONS requests

An `OPTIONS` request on a static file is answered with a `204` status and an `Allow: GET, HEAD, OPTIONS` header (and the CORS headers if `CORS` is active), so the CORS preflight requests succeed.

# Required environment

* A release of [NodeJS] >= `22.0.0` must be installed on your system.

# Installation

Install the package on your system like this:

```bash
npm install -g dev-web-server
```

# Uninstallation
Uninstall the package with the following command:

```bash
npm uninstall -g dev-web-server
```

# Usage

## Launch server
To launch the web server with default parameters:

```bash
dev-web-server
```

With this command, the application creates a web server:
- at the URL `http://localhost:8080/`,
- serving the *website root* from the *launching directory*,
- without any delay,
- without API endpoints.

If the server cannot start (e.g. the port is already in use), an error message is displayed and the application exits with the code `1`.

## The CLI Parameters

| Parameter   | Description      |
|------------ | ---------------- |
| `--help` or `HELP`    |  Display help    |
| `DOMAIN`    |  Domain of the server (default: `localhost`) |
| `PORT`      |  Port of the server (default: `8080`) |
| `BASEDIR`   |  *relative* or *absolute* path to the *website root* (default: *launching directory*) |
| `DELAY`     |  Time delay in milliseconds before each server response (default: `0` ms) |
| `ENDPOINTS` |  *relative* or *absolute* path to the file that contains API endpoints *(see definition below)* |
| `ENDPOINTSROOT` |  Root URL for routing API endpoints (default: `/api`) |
| `SPA`       |  Activate the SPA mode (default: `false`) |
| `CORS`      |  Activate the CORS headers in responses |
| `QUIET`     |  No request logs: only the server errors (`5xx` responses, endpoints file loading) are displayed |
| `CACHE`     |  Allow browser caching: without it, responses are sent with a `Cache-Control: no-cache` header |

`PORT` has to be an integer between `0` and `65535`, and `DELAY` a positive integer. If a parameter value is missing or invalid, an error message is displayed and the application exits with the code `1`.

## Examples

```bash
dev-web-server DOMAIN 0.0.0.0 PORT 1234 BASEDIR ..\rep\httpdocs DELAY 2000 ENDPOINTS ..\rep\server\my-endpoints.js ENDPOINTSROOT /my-api
```

This command launches a web server:
- listening on all network interfaces (`0.0.0.0`) on port `1234`, e.g. at the URL `http://localhost:1234/`,
- serving the *website root* from the directory `..\rep\httpdocs\`,
- with a delay of `2000` ms before each response,
- with API endpoints defined in the file at path `..\rep\server\my-endpoints.js` accessible at the root URL `/my-api`.

## The JSON Configuration File

You can use a JSON configuration file in the launching directory: `dev-web-server.json`.
Any argument in the command line will override the corresponding one in this file.
The values are validated like the command line arguments: an invalid value, or a file that is not valid JSON, stops the application with an error message.

The JSON configuration file can contain the following properties:

| Property | Type | Description | Default value |
| --- | --- | --- | --- |
| domain | `string` | Domain name of the server | `localhost` |
| port | `numeric` | Port number of the server | `8080` |
| baseDir | `string` | *relative* or *absolute* path to the *website root* | *launching directory* |
| delay | `numeric` | Time delay in milliseconds before each server response | `0` |
| endPointsFilePath | `string` | *relative* or *absolute* path to the file that contains API endpoints *(see definition below)* | `null` |
| endPointsRoot | `string` | Root URL for routing API endpoints | `/api` |
| isSPA | `boolean` | Activate SPA mode | `false` |
| withCORS | `boolean` | Activate CORS headers in responses | `false` |
| isQuiet | `boolean` | No request logs: only the server errors are displayed | `false` |
| withCache | `boolean` | Allow browser caching (if `false`, responses are sent with a `Cache-Control: no-cache` header) | `false` |

Example:

```JSON
{
  "domain": "0.0.0.0",
  "port": 13002,
  "baseDir": "./dist/test-pages",
  "delay": 0,
  "endPointsFilePath": "./api-proxy/api.js",
  "withCORS": true
}
```

## Definition of the API endpoints file

The API endpoints can be defined in a [NodeJS] script file. It has to export a `JavaScript` object. Each of its properties declares an endpoint: the key is the URL path after the endpoints root URL (default: `/api`), and the value is the `function` to execute.

The file can be an ES module (`export default { ... }`) or a CommonJS module (`module.exports = { ... }`). Its format is chosen by [NodeJS] as usual: the `.mjs` and `.cjs` extensions, or the `type` field of the nearest `package.json` for a `.js` file.

### Endpoint function

The endpoint function sends the response. It takes the following arguments:

| Argument | Type | Description |
| --- | --- | --- |
| req | `Request` | [NodeJS] request object |
| res | `Response` | [NodeJS] response object |
| params | `Object` or `string` | For `GET` and `DELETE` requests: hash object of the `query string` parameters (a repeated key gives an array of values). For the other verbs: the raw request `body` string |
| sendSuccess | `Function` | Callback function to call to send a successful response |
| sendError | `Function` | Callback function to call to send a failed response |

If the endpoint function throws an exception, the server responds with a `500` error and keeps running.

#### Successful callback

The `sendSuccess` callback sends a successful response with the result object of the request. It takes the following arguments:

| Argument | Type | Description |
| --- | --- | --- |
| req | `Request` | [NodeJS] request object |
| res | `Response` | [NodeJS] response object |
| result | `Object` | Result object of the request |
| jsonpCallback | `string` | **[optional]** JSONP callback function name to activate JSONP response |

A JSONP response is sent with the `application/javascript` content type. The callback name has to be a JavaScript identifier or a dotted path of identifiers (e.g. `myCallback` or `app.callbacks.done`): otherwise a `400` JSON error is sent.

#### Failed callback

The `sendError` callback sends an error response. It takes the following arguments:

| Argument | Type | Description |
| --- | --- | --- |
| req | `Request` | [NodeJS] request object |
| res | `Response` | [NodeJS] response object |
| httpCode | `number` | `HTTP` code of the response |
| message | `string` | Error text message |
| result | `Object` | **[optional]** Result object of the request: the `error` property is added to it |
| jsonpCallback | `string` | **[optional]** JSONP callback function name to activate JSONP response |

Example:

```js
var Repository = {
  count:0
};

export default {
  '/example': function (req, res, params, sendSuccess, sendError) {

    // Response result is: '{"test":"coucou","count":0}', then 1, 2...
    // HTTP code is 200
    sendSuccess(req, res, {
      test: 'coucou',
      count: Repository.count++
    });

  },

  '/exampleJSONP': function (req, res, params, sendSuccess, sendError) {

    // With '?myCallbackName=myCallback', the response result is: myCallback({"test":"coucou","count":0});
    // HTTP code is 200
    sendSuccess(req, res, {
      test: 'coucou',
      count: Repository.count++
    }, params.myCallbackName);

  },

  '/exampleError': function (req, res, params, sendSuccess, sendError) {

    // Response result is: '{"error":{"code":401,"message":"An error occurred while doing something"}}'.
    // HTTP code is 401
    sendError(req, res, 401, 'An error occurred while doing something');

  }
};

```

The same file as a CommonJS module:

```js
module.exports = {
  '/example': function (req, res, params, sendSuccess, sendError) {
    sendSuccess(req, res, { test: 'coucou' });
  },
};
```

## Stop the server

To stop the server, type `Ctrl+C`.

# Development

Run the unit tests:

```bash
npm test
```

The tests run the real command line application and query it over HTTP (see `tests/`). They also run on GitHub Actions with Node.js 22 and 24 for each push and pull request.

The decisions taken on the project are recorded in [docs/decisions.md](docs/decisions.md).

# License

[MIT](LICENSE)

[NodeJS]: http://nodejs.org/
[npm]: https://npmjs.org/
[mime-types]: https://www.npmjs.com/package/mime-types

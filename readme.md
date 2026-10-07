DEV WEB SERVER
==============
A simple web & API server for your development.
-----------------------------------------------

# Definition
This project is a [NodeJS] application that permits to simply and quickly create a WEB local server. It can distribute any static or dynamic data and file. This will be useful to mock an API or serve your web site project.

# Features
This application creates, by default, a web server on `http://localhost:8080/` that targets the *website root* from the *launching directory*.

You can specify :
- a domain,
- a port,
- a target directory for the* web site root*,
- a response time delay,
- an set of an API endpoints
- an root url for routing API endpoints.
- activate SPA mode.
- activate CORS.
- allow browser caching (responses are sent with `Cache-Control: no-cache` by default).

## Default webpage

The default webpage at the *website root* is `index.html`. A request to a directory (e.g. `/docs/` or `/docs`) serves its `index.html` file.

File names with special characters are supported: the requested URL is decoded (e.g. `/my%20file.txt` serves `my file.txt`). Files outside of the *website root* are never served.

## Favicon

The web server supports using `favicon.ico`. It has to be located at the site root.

## Endpoint verbs

The web server supports all endpoint verbs.

## SPA mode

The SPA mode permits to redirect all requests to your base file (default: `index.html`). This is useful for single page applications with no hashed-base routing system.

## Content types

The requested file content types is resolved with [mime-types]. This tool looks up the content type from the requested file extension, with its charset for the text files (e.g. `text/html; charset=utf-8`). If nothing matches, default content type is used : `application/octet-stream`.

## OPTIONS requests

An `OPTIONS` request on a static file is answered with a `204` status and an `Allow: GET, HEAD, OPTIONS` header (and the CORS headers if `CORS` is active), so the CORS preflight requests succeed.

# Required environment

* A release of [NodeJS] >= `22.0.0` must be installed on your system.

# Installation

Install the package on your system like this:

```bash
npm install -g dev-web-server
```

# Un-installation
Uninstall the package by typing the next command:

```bash
npm uninstall -g dev-web-server
```

# Uses

## Launch server
To launch the web server with default parameters:

```bash
dev-web-server
```

With this command, the application will create a web server :
- on URL `http://localhost:8080/`
- that will target *website root* to the *launching directory*
- without any time delay
- without API endpoints.

If the server cannot start (e.g. the port is already in use), an error message is displayed and the application exits with the code `1`.

## The CLI Parameters

| Parameter   | Description      |
|------------ | ---------------- |
| `--help` or `HELP`    |  Display help    |
| `DOMAIN`    |  To choose a domain (default : `localhost`) |
| `PORT`      |  To choose a port (default : `8080`) |
| `BASEDIR`   |  *relative* or *absolute* path to the *website root* (default : *launching directory*) |
| `DELAY`     |  Time delay in milliseconds before each server response (default : `0` ms) |
| `ENDPOINTS` |  *relative* or *absolute* path to the file that contains API endpoints *(see definition below)* |
| `ENDPOINTSROOT` |  Root URL for routing API endpoints (default : `/api`) |
| `SPA`       |  Activate SPA mode (default : `false`) |
| `CORS`      |  active CORS headers in responses |
| `CACHE`     |  allow browser caching: without it, responses are sent with a `Cache-Control: no-cache` header |

## Examples

```bash
dev-web-server DOMAIN 0.0.0.0 PORT 1234 BASEDIR ..\rep\httpdocs DELAY 2000 ENDPOINTS ..\rep\server\my-endpoints.js ENDPOINTSROOT /my-api
```

This command will launch a web server :
- listening on all network interfaces (`0.0.0.0`) on port `1234`, e.g. at url `http://localhost:1234/`
- that will target *website root* to the directory `..\rep\httpdocs\`
- with a time delay of `2000ms` before each response
- with API endpoints defined in the file at path `..\rep\server\my-endpoints.js` accessible at the root URL `/my-api`.

## The JSON Configuration File

We can use a JSON configuration file at the launching directory : `dev-web-server.json`.
Any argument in the command line will override the corresponding one in this file.

The JSON configuration file has to contain the following properties:

| Property | Type | Description | default value |
| --- | --- | --- | --- |
| domain | `string` | Domain name of the server | `localhost` |
| port | `numeric` | Port number of the server | `8080` |
| baseDir | `string` | *relative* or *absolute* path to the *website root* | *launching directory* |
| delay | `numeric` | Time delay in milliseconds before each server response | `0` |
| endPointsFilePath | `string` | *relative* or *absolute* path to the file that contains API endpoints *(see definition below)* | `null` |
| endPointsRoot | `string` | Root URL for routing API endpoints | `/api` |
| isSPA | `boolean` | Activate SPA mode | `false` |
| withCORS | `boolean` | Activate CORS headers in responses | `false` |
| withCache | `boolean` | Allow browser caching (if `false`, responses are sent with a `Cache-Control: no-cache` header) | `false` |


example :

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

The API endpoints can be defined in a [NodeJS] script file. It has to export a `JavaScript` hash object. Each one of its properties is endpoint declaration: the key is the URL part string before the endpoints root url (default: `/api`) and the value is a `function` to execute.

The file can be an ES module (`export default { ... }`) or a CommonJS module (`module.exports = { ... }`). Its format is chosen by [NodeJS] as usual: the `.mjs` and `.cjs` extensions, or the `type` field of the nearest `package.json` for a `.js` file.

### Endpoint function

The endpoint function permits to define the response. It takes in arguments:

| Argument | Type | Description |
| --- | --- | --- |
| req | `Request` | [NodeJS] request object |
| res | `Response` | [NodeJS] response object |
| params | `Object` or `string` | For `GET` and `DELETE` requests: hash object of the `query string` parameters (a repeated key gives an array of values). For the other verbs: the raw request `body` string |
| sendSuccess | `Function` | Callback function to call to send a successful response |
| sendError | `Function` | Callback function to call to send a failed response |

If the endpoint function throws an exception, the server responds with a `500` error and keeps running.

#### Successful callback

The `sendSuccess` callback allows to send a successful response. It contains the result object of the request. It takes in arguments:

| Argument | Type | Description |
| --- | --- | --- |
| req | `Request` | [NodeJS] request object |
| res | `Response` | [NodeJS] response object |
| result | `Object` | Result object of the request |
| jsonpCallback | 'string' | **[optional]** JSONP callback function name to activate JSONP response |

A JSONP response is sent with the `application/javascript` content type. The callback name has to be a JavaScript identifier or a dotted path of identifiers (e.g. `myCallback` or `app.callbacks.done`): otherwise a `400` JSON error is sent.

#### Failed callback

The `sendError` callback allows to send a failed response. It contains the error result object of the request. It takes in arguments:

| Arguments | Types | Description |
| --- | --- | --- |
| req | `Request` | [NodeJS] request object |
| res | `Response` | [NodeJS] response object |
| httpCode | `Numeric` | `HTTP` code of the response |
| message | `string` | Error text message |
| result | `Object` | Result object of the request |
| jsonpCallback | 'string' | **[optional]** JSONP callback function name to activate JSONP response |

Example :

```js
var Repository = {
  count:0
};

export default {
  '/example': function (req, res, params, sendSuccess, sendError) {

    // Response result is: '{"test":"coucou","count":1}'.
    // HTTP code is 200
    sendSuccess(req, res, {
      test: 'coucou',
      count: Repository.count++
    });

  },

  '/exampleJSONP': function (req, res, params, sendSuccess, sendError) {

    // Response result is: myCallback({"test":"coucou","count":1}).
    // HTTP code is 200
    sendSuccess(req, res, {
      test: 'coucou',
      count: Repository.count++
    }, params.myCallbackName);

  },

  '/exampleError': function (req, res, params, sendSuccess, sendError) {

    // Response result is: '{"error":{"code":401,"message":"An error occurred during doing something"}}'.
    // HTTP code is 401
    sendError(req, res, 401, 'An error occurred during doing something');

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

## Stop server

To stop the server, type `Ctrl+C`.

# Development

Run the unit tests:

```bash
npm test
```

[NodeJS]: http://nodejs.org/
[npm]: https://npmjs.org/
[mime-types]: https://www.npmjs.com/package/mime-types

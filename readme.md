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
- activate CORS.

## Default webpage

The default webpage at the *website root* is `index.html`.

## Favicon

The web server supports using `favicon.ico`. It has to be located at the site root.

## Endpoint verbs

The web server supports all endpoint verbs.

## Content types

The requested file content types is resolved with [mime-types]. This tool looks up the content type from the requested file extension. If nothing matches, default content type is used : `application/octet-stream`.

# Required environment

* A release of [NodeJS] >= `5.0.0` must be installed on your system.

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

## The CLI Parameters

| Parameter   | Description      |
|------------ | ---------------- |
| `DOMAIN`    |  To choose a domain (default : `localhost`) |
| `PORT`      |  To choose a port (default : `8080`) |
| `BASEDIR`   |  *relative* or *absolute* path to the *website root* (default : *launching directory*) |
| `DELAY`     |  Time delay in milliseconds before each server response (default : `0` ms) |
| `ENDPOINTS` |  *relative* or *absolute* path to the file that contains API endpoints *(see definition below)* |
| `WITHCORS`  |  active CORS headers in responses |

## Examples

```console
dev-web-server DOMAIN 0.0.0.0 PORT 1234 BASEDIR ..\rep\httpdocs DELAY 2000 ENDPOINTS ..\rep\server\my-endpoints.js
```
This command will launch a web server :
- accessible at url `http://mon-domain.fr:1234/`
- that will target *website root* to the directory `..\rep\httpdocs\`
- with a time delay of `2000ms` before each response
- with API endpoints defined in the file at path `..\rep\server\my-endpoints.js`.

## The JSON Configuration File

We can use a JSON configuration file at the launching directory : `dev-web-server.json`.
Any argument in the command line will override the corresponding one in this file.

example :

```JSON
{
  "domain": "0.0.0.0",
  "port": 13002,
  "baseDir": "./dist/test-pages",
  "delay": 0,
  "endPointsFilePath": "./api-proxy/api.js",
  "withCORS": "true"
}
```

## Definition of the API endpoints file

The API endpoints can be defined in a [NodeJS] script file. It has to export a `JavaScript` hash object. Each one of its properties is endpoint declaration: the key is the URL part string and the value is a `function` to execute.

### Endpoint function

The endpoint function permits to define the response. It takes in arguments:

| Argument | Type | Description |
| --- | --- | --- |
| req | `Request` | [NodeJS] request object |
| res | `Response` | [NodeJS] response object |
| params | `Object` | Hash object parameters of the request (taken from `body` or the `query string`) |
| sendSuccess | `Function` | Callback function to call to send a successful response |
| sendError | `Function` | Callback function to call to send a failed response |

#### Successful callback

The `sendSuccess` callback allows to send a successful response. It contains the result object of the request. It takes in arguments:

| Argument | Type | Description |
| --- | --- | --- |
| req | `Request` | [NodeJS] request object |
| res | `Response` | [NodeJS] response object |
| result | `Object` | Result object of the request |
| jsonpCallback | 'string' | **[optional]** JSONP callback function name to activate JSONP response |

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

module.exports = {
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

    // Response result is: '{"code":401,"message":"An error occurred during doing something"}'.
    // HTTP code is 401
    sendError(req, res, 401, 'An error occurred during doing something');

  }
};

```

## Stop server

To stop the server, type `Ctrl+C`.

[NodeJS]: http://nodejs.org/
[npm]: https://npmjs.org/
[mime-types]: https://www.npmjs.com/package/mime-types
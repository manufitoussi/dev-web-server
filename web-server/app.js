#!/usr/bin/env node

/**
 * @fileOverview Run web server.
 *
 * run with arguments:
 * - BASEDIR x: path to dir containing httpdocs root (default: current dir).
 * - PORT x: port of the wev server (default: 8080).
 * - ENDPOINTS x: relative path to the endpoints definition file.
 * - DELAY x: delay in ms before response (default: 0).
 *  TODO: complete arguments.
 */

require('colors');
const VERSION = require('../package').version;
const HttpServer = require('./server/http-server.js');
const defaultConfig = require('./config/default');
const configFromDefault = require('./config/from-default');
const configFromCLI = require('./config/from-cli');
const configFromFile = require('./config/from-file');
const config = configFromCLI(configFromFile(configFromDefault(defaultConfig)), process.argv);

console.log(' DEV WEB SERVER '.bold.bgBrightGreen, ' v' + VERSION);
console.log();

// help message.
if (process.argv.indexOf('HELP') !== -1 || process.argv.indexOf('--help') !== -1
  || process.argv.indexOf('-h') !== -1 || process.argv.indexOf('-?') !== -1) {
  console.log('Parameters:'.bold.green);
  console.log('  BASEDIR'.bold.blue, '<x>'.italic.blue, ': path to dir containing httpdocs root (default: current dir).');
  console.log('  PORT'.bold.blue, '<x>'.italic.blue, ': port of the wev server (default: 8080).');
  console.log('  ENDPOINTS'.bold.blue,'<x>'.italic.blue, ': relative path to the endpoints definition file.');
  console.log('  ENDPOINTSROOT'.bold.blue,'<x>'.italic.blue, ':root url for the endpoints (default: /api).');
  console.log('  SPA'.bold.blue, ': single page application mode.');
  console.log('  DELAY'.bold.blue,'<x>'.italic.blue, ': delay in ms before response (default: 0).');
  console.log('  CORS'.bold.blue, ': add CORS headers.');
  console.log('  CACHE'.bold.blue, ': add cache control headers.');
  console.log('  HELP'.bold.blue, ': this help message.');

  console.log() // empty line.
  console.log('You can also use a configuration file. See https://www.npmjs.com/package/dev-web-server for more information.');
  console.log();

  process.exit(0);
}

// start the web server.
var httpServer = new HttpServer(config);
httpServer.start();

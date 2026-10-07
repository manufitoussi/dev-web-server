#!/usr/bin/env node

/**
 * @fileOverview Run web server.
 *
 * Run with the HELP argument to display the available arguments.
 */

import fs from 'node:fs';
import HttpServer from './server/http-server.js';
import style from './tools/style.js';
import defaultConfig from './config/default.js';
import configFromDefault from './config/from-default.js';
import configFromCLI from './config/from-cli.js';
import configFromFile from './config/from-file.js';
import validateConfig from './config/validate.js';

const VERSION = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).version;

console.log(style(['bold', 'bgGreenBright'], ' DEV WEB SERVER '), ' v' + VERSION);
console.log();

// help message.
if (process.argv.indexOf('HELP') !== -1 || process.argv.indexOf('--help') !== -1
  || process.argv.indexOf('-h') !== -1 || process.argv.indexOf('-?') !== -1) {
  console.log(style(['bold', 'green'], 'Parameters:'));
  console.log(style(['bold', 'blue'], '  BASEDIR'), style(['italic', 'blue'], '<x>'), ': path to dir containing httpdocs root (default: current dir).');
  console.log(style(['bold', 'blue'], '  PORT'), style(['italic', 'blue'], '<x>'), ': port of the web server (default: 8080).');
  console.log(style(['bold', 'blue'], '  ENDPOINTS'), style(['italic', 'blue'], '<x>'), ': relative path to the endpoints definition file.');
  console.log(style(['bold', 'blue'], '  ENDPOINTSROOT'), style(['italic', 'blue'], '<x>'), ':root url for the endpoints (default: /api).');
  console.log(style(['bold', 'blue'], '  SPA'), ': single page application mode.');
  console.log(style(['bold', 'blue'], '  DELAY'), style(['italic', 'blue'], '<x>'), ': delay in ms before response (default: 0).');
  console.log(style(['bold', 'blue'], '  CORS'), ': add CORS headers.');
  console.log(style(['bold', 'blue'], '  QUIET'), ': no request logs (the server errors are still displayed).');
  console.log(style(['bold', 'blue'], '  CACHE'), ': allow browser caching (default: responses are sent with a "Cache-Control: no-cache" header).');
  console.log(style(['bold', 'blue'], '  HELP'), ': this help message.');

  console.log() // empty line.
  console.log('You can also use a configuration file. See https://www.npmjs.com/package/dev-web-server for more information.');
  console.log();

  process.exit(0);
}

// start the web server.
let config;
try {
  config = validateConfig(configFromCLI(configFromFile(configFromDefault(defaultConfig)), process.argv));
  await new HttpServer(config).start();
} catch (e) {
  const reason = e.code === 'EADDRINUSE' ?
    `the port ${config.port} is already in use on ${config.domain}.` :
    e.message;
  console.error(style('red', '[ERROR]'), 'cannot start the server: ' + reason);
  process.exitCode = 1;
}

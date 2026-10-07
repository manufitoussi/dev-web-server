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
  const parameters = [
    ['DOMAIN', true, 'domain of the server (default: localhost).'],
    ['PORT', true, 'port of the server (default: 8080).'],
    ['BASEDIR', true, 'path to the website root (default: the launching directory).'],
    ['DELAY', true, 'delay in ms before each response (default: 0).'],
    ['ENDPOINTS', true, 'path to the endpoints file (reloaded when it changes).'],
    ['ENDPOINTSROOT', true, 'root url of the endpoints (default: /api).'],
    ['SPA', false, 'single page application mode: the missing files are answered with index.html.'],
    ['CORS', false, 'add the CORS headers.'],
    ['QUIET', false, 'no request logs (the server errors are still displayed).'],
    ['CACHE', false, 'allow browser caching (default: responses are sent with a "Cache-Control: no-cache" header).'],
    ['HELP', false, 'this help message (also --help, -h or -?).'],
  ];
  for (const [name, hasValue, description] of parameters) {
    console.log(' ', style(['bold', 'blue'], name) + (hasValue ? ' ' + style(['italic', 'blue'], '<x>') : ''), ': ' + description);
  }

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

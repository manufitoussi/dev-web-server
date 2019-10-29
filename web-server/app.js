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

console.log('DEV WEB SERVER'.bold.green, '- v' + VERSION);

// start the web server.
var httpServer = new HttpServer(config);
httpServer.start();
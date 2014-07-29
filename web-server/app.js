#!/usr/bin/env node

/**
 * @fileOverview Run web server.
 *
 * VERSION 1.4.0
 *
 * run with arguments:
 * - BASEDIR x: path to dir containing httpdocs root (default: current dir).
 * - PORT x: port of the wev server (default: 8080).
 * - ENDPOINTS x: relative path to the endpoints definition file.
 * - DELAY x: delay in ms before response (default: 0).
 */

var VERSION = "1.4.0";

var path = require('path');
var HttpServer = require('./server/http-server.js');

var config = {
  baseDir: process.cwd(), // set to the current dir by default.
  delay: 0 // no delay by default.
};

// apply BASEDIR argument if present in the command line.
var baseDirIndex = process.argv.indexOf('BASEDIR');
if (baseDirIndex !== -1 && (baseDirIndex + 1) < process.argv.length) {
  var baseDir = process.argv[baseDirIndex + 1];
  config.baseDir = path.resolve(config.baseDir, baseDir);
}

// apply PORT argument if present in the command line.
var portIndex = process.argv.indexOf('PORT');
if (portIndex !== -1 && (portIndex + 1) < process.argv.length) {
  var port = process.argv[portIndex + 1];
  config.port = port;
}

// apply DOMAIN argument if present in the command line.
var domainIndex = process.argv.indexOf('DOMAIN');
if (domainIndex !== -1 && (domainIndex + 1) < process.argv.length) {
  var domain = process.argv[domainIndex + 1];
  config.domain = domain;
}

// apply DELAY argument if present in the command line.
var delayIndex = process.argv.indexOf('DELAY');
if (delayIndex !== -1 && (delayIndex + 1) < process.argv.length) {
  var delay = process.argv[delayIndex + 1];
  config.delay = delay;
}

// apply ENDPOINTS argument if present in the command line.
var endPointsFilePathIndex = process.argv.indexOf('ENDPOINTS');
if (endPointsFilePathIndex !== -1 && (endPointsFilePathIndex + 1) < process.argv.length) {
  var endPointsFilePath = process.argv[endPointsFilePathIndex + 1];
  config.endPointsFilePath = path.resolve(process.cwd(), endPointsFilePath);
}

console.log('WIT WEB SERVER'.bold.green, '- v' + VERSION);

// start the web server.
var httpServer = new HttpServer(config);
httpServer.start();
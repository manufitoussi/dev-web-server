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

var VERSION = require('../package').version;

var path = require('path');
var HttpServer = require('./server/http-server.js');
var fs = require('fs');
var o = require('object-tools');

var config = {
  baseDir: process.cwd(), // set to the current dir by default.
  delay: 0 // no delay by default.
};

var parseCLI = function parseCLI () {

  // apply BASEDIR argument if present in the command line.
  var baseDirIndex = process.argv.indexOf('BASEDIR');
  if (baseDirIndex !== -1 && (baseDirIndex + 1) < process.argv.length) {
    var baseDir = process.argv[baseDirIndex + 1];
    config.baseDir = path.resolve(process.cwd(), baseDir);
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

  // apply WITHCORS argument if present in the command line.
  if (process.argv.indexOf('WITHCORS') !== -1) {
    config.withCORS = true;
  }

  // apply ENDPOINTS argument if present in the command line.
  var endPointsFilePathIndex = process.argv.indexOf('ENDPOINTS');
  if (endPointsFilePathIndex !== -1 &&
      (endPointsFilePathIndex + 1) <
      process.argv.length) {
    var endPointsFilePath = process.argv[endPointsFilePathIndex + 1];
    config.endPointsFilePath = path.resolve(process.cwd(), endPointsFilePath);
  }

  console.log('DEV WEB SERVER'.bold.green, '- v' + VERSION);

  // start the web server.
  var httpServer = new HttpServer(config);
  httpServer.start();
};

var packageJSONPath = path.resolve(process.cwd(), 'dev-web-server.json');
fs.exists(packageJSONPath, function(exists) {
  if (exists) {

    var defaultConfig = require(packageJSONPath);
    if (defaultConfig) {
      defaultConfig.endPointsFilePath = defaultConfig.hasOwnProperty('endPointsFilePath') ? path.resolve(process.cwd(), defaultConfig.endPointsFilePath) : defaultConfig.endPointsFilePath;
      defaultConfig.baseDir = defaultConfig.hasOwnProperty('baseDir') ? path.resolve(process.cwd(), defaultConfig.baseDir) : defaultConfig.baseDir;
      config = o.extend(config, defaultConfig);
    }
  }

  parseCLI();
});

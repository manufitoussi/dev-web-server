var http = require('http');
var fs = require('fs');
var path = require('path');
var util = require('util');
var url = require('url');
var colors = require('colors');

var ContentTypes = require('./content-types.js');
var createActions = require('./service.js');

var DEFAULT = {
  domain: 'localhost',
  port: '8080',
  baseDir: '.',
  root: '/index.html',
  isDebug: false,
  endPointsFilePath: null,
  delay: 0,
  withCORS: false
};

/**
 * HttpServer class.
 * @param {object} config
 * @returns {HttpServer}
 */
var HttpServer = function(config) {
  "use strict";
  config = config || {};
  var isDebug = config.isDebug === undefined ? DEFAULT.isDebug : config.isDebug,
    domain = config.domain || DEFAULT.domain,
    port = config.port || DEFAULT.port,
    baseDir = config.baseDir || DEFAULT.baseDir,
    root = config.root || DEFAULT.root,
    endPointsFilePath = config.endPointsFilePath || DEFAULT.endPointsFilePath,
    endpoints = {},
    service = null;

  try { 
    endpoints = endPointsFilePath ? require(endPointsFilePath) : {};
  } catch(e) {
    console.error('[ERROR]'.red, 'cannot load endpoints file.');
    console.error((e.stack || e.toString()).red);
  }

  service = createActions({
    delay: config.delay || DEFAULT.delay,
    endPoints: endpoints,
    withCORS: config.hasOwnProperty('withCORS') ? config.withCORS : DEFAULT.withCORS
  });

  var html = {
    error: function(errMsg, res, opt_code) {
      opt_code = opt_code === undefined ? 500 : opt_code;
      console.error('[ERROR]'.red, opt_code.toString().bold.red, errMsg.red);
      var htmlError = '<div style="color: red;">' + errMsg + '</div>';
      res.writeHead(opt_code, {
        "Content-Type": ContentTypes.lookup('.html')
      });
      res.end(htmlError, 'utf-8');
    }
  };

  var start = function() {
    http.createServer(function(req, res) {
      console.log('------------------------');
      console.log('time:', (new Date()).toISOString());
      console.log('method: ' + req.method.yellow);
      console.log('url: ' + req.url.toString().bold.green);

      var render = function(askedUrl) {

        var parsedUrl = url.parse(askedUrl);
        if (parsedUrl.query) {
          console.log('query: ' + parsedUrl.query);
        }

        if (parsedUrl.pathname === '/') {
          parsedUrl.pathname = root;
        }

        // full path of the file
        var filePath = path.resolve(baseDir, '.' + parsedUrl.pathname);
        console.log('filePath: ' + filePath);

        // file name with extension
        var baseFile = path.basename(filePath);
        console.log('base: ' + baseFile);

        // file extension
        var fileExt = path.extname(filePath);
        console.log('ext: ' + fileExt);

        // the full path of directory that contains the file.
        var dirFile = path.dirname(filePath);
        console.log('dir: ' + dirFile);

        if (fileExt === '') {
          // no extension : this is an action endpoint!
          service.runEndPoint(req, res, parsedUrl.pathname);
          return;
        }

        const contentType = ContentTypes.lookup(fileExt);
        console.log('content type:', contentType.bold);

        // displays the requested file:
        fs.exists(filePath, function(exists) {
          if (exists) {
            fs.readFile(filePath, function(err, file) {
              if (err) {
                html.error(err, res);
                return;
              }

              setTimeout(function() {
                res.writeHead(200, {
                  "Content-Type": contentType,
                  "Cache-Control": "no-cache"
                });
                res.end(file, 'utf-8');
              }, config.delay || DEFAULT.delay);
            });
            return;
          }

          html.error(askedUrl + ' not found.', res, 404);
          return;
        });
      };

      render(req.url);

    }).listen(port, domain);

    console.log('Server running at', util.format('http://%s:%s/'.yellow.underline, domain, port));
    console.log('Type [Ctrl+C] to stop the server.');
  };
  return {
    start: start,
    service: service
  };
};

module.exports = HttpServer;
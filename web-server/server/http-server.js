require('colors');
var http = require('http');
var fs = require('fs');
var path = require('path');
var util = require('util');
var url = require('url');
const ContentTypes = require('./content-types.js');
const createActions = require('./service.js');
const DEFAULT = require('../config/default');
const merge = require('../tools/merge');

/**
 * HttpServer class.
 * @param {object} config
 * @returns {HttpServer}
 */
var HttpServer = function (config) {
  "use strict";
  config = config || merge(DEFAULT);
  let endpoints = {};
  let service;
  try {
    endpoints = config.endPointsFilePath ? require(config.endPointsFilePath) : {};
  } catch (e) {
    console.error('[ERROR]'.red, 'cannot load endpoints file.');
    console.error((e.stack || e.toString()).red);
  }

  service = createActions({
    delay: config.delay || DEFAULT.delay,
    endPoints: endpoints,
    withCORS: config.withCORS
  });

  var html = {
    error: function error(errMsg, res, opt_code) {
      opt_code = opt_code === undefined ? 500 : opt_code;
      console.error('[ERROR]'.red, opt_code.toString().bold.red, errMsg.red);
      var htmlError = '<div style="color: red;">' + errMsg + '</div>';
      if(config.withCORS) {
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-Requested-With, Content-Type, Origin, Accept');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader("Cache-Control", "no-cache" );
      }
      res.writeHead(opt_code, {
        "Content-Type": ContentTypes.lookup('.html')
      });

      res.end(htmlError, 'utf-8');
    }
  };

  var start = function start() {
    http.createServer(function (req, res) {
      console.log('------------------------');
      console.log('time:', (new Date()).toISOString().bold);
      console.log('method: ' + req.method.bold.yellow);
      console.log('url: ' + req.url.toString().bold.green);

      var render = function render(askedUrl) {

        var parsedUrl = url.parse(askedUrl);
        if (parsedUrl.query) {
          console.log('query: ' + parsedUrl.query);
        }

        if (parsedUrl.pathname === '/') {
          parsedUrl.pathname = config.root;
        }

        // full path of the file
        var filePath = path.resolve(config.baseDir, '.' + parsedUrl.pathname);
        console.log('filePath: ' + filePath.bold);

        // file name with extension
        var baseFile = path.basename(filePath);
        console.log('base: ' + baseFile.bold);

        // file extension
        var fileExt = path.extname(filePath);
        console.log('ext: ' + fileExt.bold);

        // the full path of directory that contains the file.
        var dirFile = path.dirname(filePath);
        console.log('dir: ' + dirFile.bold);

        if (fileExt === '') {
          // no extension : this is an action endpoint!
          service.runEndPoint(req, res, parsedUrl.pathname);
          return;
        }

        const contentType = ContentTypes.lookup(fileExt);
        console.log('content type:', contentType.bold);

        // displays the requested file:
        if (fs.existsSync(filePath)) {
          fs.readFile(filePath, function (err, file) {
            if (err) {
              html.error(err, res);
              return;
            }

            setTimeout(function () {
              if(config.withCORS) {
                res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-Requested-With, Content-Type, Origin, Accept');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
                res.setHeader('Access-Control-Allow-Origin', '*');
              }
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
      };

      render(req.url);

    }).listen(config.port, config.domain);

    console.log('Server running at', util.format('http://%s:%s/'.yellow.underline, config.domain, config.port));
    console.log('Type [Ctrl+C] to stop the server.');
  };
  return {
    start: start,
    service: service
  };
};

module.exports = HttpServer;

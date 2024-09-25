require('colors');
var http = require('http');
var fs = require('fs');
var path = require('path');
var util = require('util');
const ContentTypes = require('./content-types.js');
const createActions = require('./service.js');
const DEFAULT = require('../config/default');
const merge = require('../tools/merge');
const { addCorsHeaders, addCashControlHeader } = require('./add-cors-headers');

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
    withCORS: config.withCORS,
    withCache: config.withCache,
  });

  var html = {
    error: function error(errMsg, res, opt_code) {
      opt_code = opt_code === undefined ? 500 : opt_code;
      console.error('[ERROR]'.red, opt_code.toString().bold.red, errMsg.red);
      var htmlError = '<div style="color: red;">' + errMsg + '</div>';
      if(config.withCORS) {
        addCorsHeaders(res)
      }

      if(!config.withCache) {
        addCashControlHeader(res, 'no-cache');
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
        var url = new URL(askedUrl, `http://${config.domain}:${config.port}`);
        console.log('url:', url);

        if (url.search) {
          console.log('search: ' + url.search);
        }

        if (url.pathname === '/') {
          url.pathname = config.root;
        }

        if (url.pathname.startsWith(config.endPointsRoot)) {
          // this is an endpoint request.
          const endPoint = url.pathname.substring(config.endPointsRoot.length);
          console.log('endPoint:', endPoint);
          service.runEndPoint(req, res, endPoint);
          return;
        }

        // full path of the file
        var filePath = path.resolve(config.baseDir, '.' + url.pathname);
        console.log('filePath: ' + filePath.bold);

        if (config.isSPA && !fs.existsSync(filePath)) {
          // if the file does not exist, the server will return the SPA root file.
          filePath = path.resolve(config.baseDir, '.' + config.root);
          console.log('Redirect to SPA root file:', filePath.bold);

          // pass the requested url to the SPA.
          req.url = askedUrl;
        }

        // file name with extension
        var baseFile = path.basename(filePath);
        console.log('base: ' + baseFile.bold);

        // file extension
        var fileExt = path.extname(filePath);
        console.log('ext: ' + fileExt.bold);

        // the full path of directory that contains the file.
        var dirFile = path.dirname(filePath);
        console.log('dir: ' + dirFile.bold);

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
                addCorsHeaders(res)
              }

              if(!config.withCache) {
                addCashControlHeader(res, 'no-cache');
              }

              res.writeHead(200, {
                "Content-Type": contentType,
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

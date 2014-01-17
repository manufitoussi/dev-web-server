var http = require('http');
var fs = require('fs');
var path = require('path');
var util = require('util');

var ContentTypes = require('./content-types.js');
var Actions = require('./actions.js');

var DEFAULT = {
  domain: 'localhost',
  port: '8080',
  baseDir: '.',//../httpdocs',
  root: '/index.html',
  isDebug: false
};

/**
 * HttpServer class.
 * @param {object} config
 * @returns {HttpServer}
 */
var HttpServer = function (config) {
  "use strict";
  config = config || {};
  var
    isDebug = config.isDebug === undefined ?
        DEFAULT.isDebug
    : config.isDebug,
    domain = config.domain || DEFAULT.domain,
    port = config.port || DEFAULT.port,
    baseDir = config.baseDir || DEFAULT.baseDir,
    root = config.root || DEFAULT.root,
    actions = Actions({isDebug: isDebug, delay: config.delay});

  var html = {
    error: function (errMsg, res, opt_code) {
      opt_code = opt_code === undefined ? 500 : opt_code;
      console.error('[ERROR]', opt_code, errMsg);
      var htmlError = '<div style="color: red;">' + errMsg + '</div>';
      res.writeHead(opt_code, {
        "Content-Type": ContentTypes['.html']
      });
      res.end(htmlError, 'utf-8');
    }
  };

  var start = function () {
    http.createServer(function (req, res) {
      console.log('------------------------');
      console.log('method: ' + req.method);
      console.log('url: ' + req.url);


      var render = function (url) {

        if (url === '/') {
          url = root;
        }

        var filePath = baseDir + url;
        var fileExt = path.extname(filePath);
        console.log('ext: ' + fileExt);

        if (fileExt === '') {
          console.log('Action: ' + url);
          var words = url.split('/');
          var sessionKey = null;
          var actionName = url;
          if (words.length > 2) {
            sessionKey = words[1];
            words.shift();
            words.shift();
            actionName = '/' + words.join('/');
          }

          console.log('sessionKey:', sessionKey);
          console.log('actionName:', actionName);

          var action = actions.actions[actionName];
          if (action === undefined) {
            html.error('action not found', res, 404);
          } else {
            if (req.method === 'POST') {
              var body = '';
              req.on('data', function (data) {
                body += data;
              });
              req.on('end', function () {
                req.body = body;
                console.log('Body: ' + req.body);
                action(req, res, sessionKey);
              });

            } else {
              action(req, res, sessionKey);
            }
          }

          return;
        }

        fs.exists(filePath, function (exists) {
          if (exists) {
            fs.readFile(filePath, function (err, file) {
              if (err) {
                html.error(err, res);
                return;
              }

              res.writeHead(200, {
                "Content-Type": ContentTypes[fileExt],
                "Cache-Control": "no-cache"
              });
              res.end(file, 'utf-8');
            });
            return;
          }

          html.error(url + ' not found.', res, 404);
          return;
        });
      };

      render(req.url);

    }).listen(port, domain);

    console.log(util.format('Server running at http://%s:%s/', domain, port));
    console.log('Type [Ctrl+C] to stop the server.');
  };
  return {
    start: start,
    actions: actions,
    repository: actions.repository
  };
};

module.exports = HttpServer;

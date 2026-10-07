import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { pathToFileURL } from 'node:url';
import ContentTypes from './content-types.js';
import createActions from './service.js';
import DEFAULT from '../config/default.js';
import merge from '../tools/merge.js';
import style from '../tools/style.js';
import { applyCommonHeaders } from './headers.js';

/**
 * HttpServer class.
 * @param {object} config
 * @returns {HttpServer}
 */
var HttpServer = function (config) {
  config = config || merge(DEFAULT);
  let service;

  /**
   * loads the endpoints file. It can be a CommonJS module (module.exports)
   * or an ES module (export default).
   * @returns {Promise<Object>}
   */
  var loadEndPoints = async function loadEndPoints() {
    if (!config.endPointsFilePath) {
      return {};
    }

    try {
      const module = await import(pathToFileURL(config.endPointsFilePath).href);
      return module.default || {};
    } catch (e) {
      console.error(style('red', '[ERROR]'), 'cannot load endpoints file.');
      console.error(style('red', e.stack || e.toString()));
      return {};
    }
  };

  /**
   * escapes the html special characters of a text.
   * @param {string} text
   * @returns {string}
   */
  var escapeHtml = function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  };

  var html = {
    error: function error(errMsg, res, opt_code) {
      opt_code = opt_code === undefined ? 500 : opt_code;
      console.error(style('red', '[ERROR]'), style(['bold', 'red'], opt_code), style('red', errMsg));
      var htmlError = '<div style="color: red;">' + escapeHtml(errMsg) + '</div>';
      applyCommonHeaders(res, config);

      res.writeHead(opt_code, {
        "Content-Type": ContentTypes.lookup('.html')
      });

      res.end(htmlError, 'utf-8');
    }
  };

  var stat = function stat(filePath) {
    try {
      return fs.statSync(filePath);
    } catch (e) {
      return null;
    }
  };

  var isFile = function isFile(filePath) {
    var stats = stat(filePath);
    return !!stats && stats.isFile();
  };

  var isDirectory = function isDirectory(filePath) {
    var stats = stat(filePath);
    return !!stats && stats.isDirectory();
  };

  /**
   * starts the server.
   * @returns {Promise<http.Server>} resolved when the server listens.
   */
  var start = async function start() {
    service = createActions({
      delay: config.delay || DEFAULT.delay,
      endPoints: await loadEndPoints(),
      withCORS: config.withCORS,
      withCache: config.withCache,
    });

    var server = http.createServer(function (req, res) {
      console.log('------------------------');
      console.log('time:', style('bold', (new Date()).toISOString()));
      console.log('method: ' + style(['bold', 'yellow'], req.method));
      console.log('url: ' + style(['bold', 'green'], req.url));

      var render = function render(askedUrl) {
        var url = new URL(askedUrl, `http://${config.domain}:${config.port}`);

        if (url.search) {
          console.log('search: ' + url.search);
        }

        if (url.pathname === '/') {
          url.pathname = config.root;
        }

        // endpoints root without its trailing slash (e.g. '/api/' -> '/api').
        const endPointsRoot = config.endPointsRoot.replace(/\/+$/, '');
        if (url.pathname === endPointsRoot || url.pathname.startsWith(endPointsRoot + '/')) {
          // this is an endpoint request.
          const endPoint = url.pathname.substring(endPointsRoot.length);
          console.log('endPoint:', endPoint);
          service.runEndPoint(req, res, endPoint);
          return;
        }

        // answers the preflight requests on static files.
        if (req.method === 'OPTIONS') {
          applyCommonHeaders(res, config);
          res.writeHead(204, { 'Allow': 'GET, HEAD, OPTIONS' });
          res.end();
          return;
        }

        // decoded path name (e.g. '/my%20file.txt' -> '/my file.txt').
        var pathname;
        try {
          pathname = decodeURIComponent(url.pathname);
        } catch (e) {
          html.error(askedUrl + ' is not a valid url.', res, 400);
          return;
        }

        // full path of the file
        var filePath = path.resolve(config.baseDir, '.' + pathname);
        console.log('filePath: ' + style('bold', filePath));

        // refuses any path outside of the base directory (e.g. '/..%2f..%2fetc/passwd').
        var baseDir = path.resolve(config.baseDir);
        if (filePath !== baseDir && !filePath.startsWith(baseDir + path.sep)) {
          html.error(askedUrl + ' not found.', res, 404);
          return;
        }

        // a directory serves its index file.
        if (isDirectory(filePath)) {
          filePath = path.join(filePath, path.basename(config.root));
        }

        if (config.isSPA && !isFile(filePath)) {
          // if the file does not exist, the server will return the SPA root file.
          filePath = path.resolve(config.baseDir, '.' + config.root);
          console.log('Redirect to SPA root file:', style('bold', filePath));
        }

        // file name with extension
        var baseFile = path.basename(filePath);
        console.log('base: ' + style('bold', baseFile));

        // file extension
        var fileExt = path.extname(filePath);
        console.log('ext: ' + style('bold', fileExt));

        // the full path of directory that contains the file.
        var dirFile = path.dirname(filePath);
        console.log('dir: ' + style('bold', dirFile));

        const contentType = ContentTypes.lookup(fileExt);
        console.log('content type:', style('bold', contentType));

        // displays the requested file:
        if (isFile(filePath)) {

          fs.readFile(filePath, function (err, file) {
            if (err) {
              html.error(err.message, res);
              return;
            }

            setTimeout(function () {
              applyCommonHeaders(res, config);
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

    });

    // waits until the server listens (rejects if the port is already in use for example).
    await new Promise(function (resolve, reject) {
      server.once('error', reject);
      server.listen(config.port, config.domain, function () {
        server.off('error', reject);
        resolve();
      });
    });

    console.log('Server running at', style(['yellow', 'underline'], util.format('http://%s:%s/', config.domain, config.port)));
    console.log('Type [Ctrl+C] to stop the server.');
    return server;
  };
  return {
    start: start
  };
};

export default HttpServer;

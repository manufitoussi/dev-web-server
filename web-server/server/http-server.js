import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import ContentTypes from './content-types.js';
import createActions from './service.js';
import DEFAULT from '../config/default.js';
import merge from '../tools/merge.js';
import style from '../tools/style.js';
import createLogger from '../tools/logger.js';
import { applyCommonHeaders } from './headers.js';

/**
 * HttpServer class.
 * @param {object} config
 * @returns {HttpServer}
 */
const HttpServer = function (config) {
  config = config || merge(DEFAULT);
  const logger = createLogger(config.isQuiet);
  let service;

  // version of the endpoints file, incremented at each reload.
  let endPointsVersion = 0;

  /**
   * loads the endpoints file. It can be a CommonJS module (module.exports)
   * or an ES module (export default).
   * @returns {Promise<Object|null>} the endpoints, or null if the file cannot be loaded.
   */
  const loadEndPoints = async function loadEndPoints() {
    const filePath = config.endPointsFilePath;
    const version = endPointsVersion++;
    try {
      // a new version is imported with a new url, and a CommonJS module is removed from the require cache.
      delete createRequire(import.meta.url).cache[filePath];
      const url = pathToFileURL(filePath).href + (version ? `?version=${version}` : '');
      const module = await import(url);
      return module.default || {};
    } catch (e) {
      logger.error(style('red', '[ERROR]'), 'cannot load endpoints file.');
      logger.error(style('red', e.stack || e.toString()));
      return null;
    }
  };

  /**
   * watches the endpoints file and reloads it when it changes. If the new
   * version cannot be loaded, the previous endpoints are kept.
   * The directory is watched, as some editors replace the file when saving it.
   * @returns {fs.FSWatcher|null}
   */
  const watchEndPoints = function watchEndPoints() {
    const fileName = path.basename(config.endPointsFilePath);
    let timer = null;

    const reload = async function reload() {
      if (!isFile(config.endPointsFilePath)) {
        return;
      }

      const endPoints = await loadEndPoints();
      if (endPoints === null) {
        logger.error(style('red', '[ERROR]'), 'the endpoints file is not reloaded: the previous endpoints are kept.');
        return;
      }

      service.setEndPoints(endPoints);
      logger.request(style('cyan', 'Endpoints file reloaded:'), Object.keys(endPoints).join(', '));
    };

    try {
      return fs.watch(path.dirname(config.endPointsFilePath), function (event, changedFile) {
        if (changedFile === fileName) {
          // an editor can trigger several events for one save.
          clearTimeout(timer);
          timer = setTimeout(reload, 100);
        }
      });
    } catch (e) {
      logger.error(style('red', '[ERROR]'), 'cannot watch the endpoints file: ' + e.message);
      return null;
    }
  };

  /**
   * escapes the html special characters of a text.
   * @param {string} text
   * @returns {string}
   */
  const escapeHtml = function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  };

  const html = {
    error: function error(errMsg, res, opt_code) {
      opt_code = opt_code === undefined ? 500 : opt_code;
      logger.requestError(opt_code, style('red', '[ERROR]'), style(['bold', 'red'], opt_code), style('red', errMsg));
      const htmlError = '<div style="color: red;">' + escapeHtml(errMsg) + '</div>';
      applyCommonHeaders(res, config);

      res.writeHead(opt_code, {
        "Content-Type": ContentTypes.lookup('.html')
      });

      res.end(htmlError, 'utf-8');
    }
  };

  const stat = function stat(filePath) {
    try {
      return fs.statSync(filePath);
    } catch (e) {
      return null;
    }
  };

  const isFile = function isFile(filePath) {
    const stats = stat(filePath);
    return !!stats && stats.isFile();
  };

  const isDirectory = function isDirectory(filePath) {
    const stats = stat(filePath);
    return !!stats && stats.isDirectory();
  };

  /**
   * parses the Range header of a request ('bytes=start-end', 'bytes=start-' or 'bytes=-length').
   * @param {string} [header]
   * @param {number} size size of the file.
   * @returns {{ start: number, end: number }|null|false} null to send the whole file (no range,
   *  or an unsupported one like multiple ranges), false if the range cannot be satisfied.
   */
  const parseRange = function parseRange(header, size) {
    const match = /^bytes=(\d*)-(\d*)$/.exec((header || '').trim());
    if (!match || (match[1] === '' && match[2] === '')) {
      return null;
    }

    if (match[1] === '') {
      // the last bytes of the file.
      const length = Number(match[2]);
      return length === 0 ? false : { start: Math.max(size - length, 0), end: size - 1 };
    }

    const start = Number(match[1]);
    const end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
    return start >= size || start > end ? false : { start, end };
  };

  /**
   * streams a file (or the requested range of it) to the response.
   * @param {IncomingMessage} req
   * @param {ServerResponse} res
   * @param {string} filePath
   * @param {string} contentType
   */
  const sendFile = function sendFile(req, res, filePath, contentType) {
    const stats = stat(filePath);
    const range = parseRange(req.headers.range, stats.size);
    applyCommonHeaders(res, config);
    res.setHeader('Accept-Ranges', 'bytes');

    if (range === false) {
      res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
      res.end();
      return;
    }

    const { start, end } = range || { start: 0, end: stats.size - 1 };
    const headers = {
      'Content-Type': contentType,
      'Content-Length': end - start + 1,
    };
    if (range) {
      headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
    }
    const status = range ? 206 : 200;

    if (req.method === 'HEAD' || stats.size === 0) {
      res.writeHead(status, headers);
      res.end();
      return;
    }

    // the headers are sent once the file is opened, so an opening error can still give a 500 error.
    const stream = fs.createReadStream(filePath, { start, end });
    stream.once('open', function () {
      res.writeHead(status, headers);
      stream.pipe(res);
    });
    stream.on('error', function (err) {
      if (res.headersSent) {
        logger.error(style('red', '[ERROR]'), style('red', err.message));
        res.destroy(err);
        return;
      }
      html.error(err.message, res);
    });
  };

  /**
   * starts the server.
   * @returns {Promise<http.Server>} resolved when the server listens.
   */
  const start = async function start() {
    service = createActions({
      delay: config.delay,
      endPoints: config.endPointsFilePath ? (await loadEndPoints()) || {} : {},
      withCORS: config.withCORS,
      withCache: config.withCache,
      logger: logger,
    });

    const server = http.createServer(function (req, res) {
      logger.request('------------------------');
      logger.request('time:', style('bold', (new Date()).toISOString()));
      logger.request('method: ' + style(['bold', 'yellow'], req.method));
      logger.request('url: ' + style(['bold', 'green'], req.url));

      const render = function render(askedUrl) {
        const url = new URL(askedUrl, `http://${config.domain}:${config.port}`);

        if (url.search) {
          logger.request('search: ' + url.search);
        }

        if (url.pathname === '/') {
          url.pathname = config.root;
        }

        // endpoints root without its trailing slash (e.g. '/api/' -> '/api').
        const endPointsRoot = config.endPointsRoot.replace(/\/+$/, '');
        if (url.pathname === endPointsRoot || url.pathname.startsWith(endPointsRoot + '/')) {
          // this is an endpoint request.
          const endPoint = url.pathname.substring(endPointsRoot.length);
          logger.request('endPoint:', endPoint);
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
        let pathname;
        try {
          pathname = decodeURIComponent(url.pathname);
        } catch (e) {
          html.error(askedUrl + ' is not a valid url.', res, 400);
          return;
        }

        // full path of the file
        let filePath = path.resolve(config.baseDir, '.' + pathname);
        logger.request('filePath: ' + style('bold', filePath));

        // refuses any path outside of the base directory (e.g. '/..%2f..%2fetc/passwd').
        const baseDir = path.resolve(config.baseDir);
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
          logger.request('Redirect to SPA root file:', style('bold', filePath));
        }

        // file name with extension
        const baseFile = path.basename(filePath);
        logger.request('base: ' + style('bold', baseFile));

        // file extension
        const fileExt = path.extname(filePath);
        logger.request('ext: ' + style('bold', fileExt));

        // the full path of directory that contains the file.
        const dirFile = path.dirname(filePath);
        logger.request('dir: ' + style('bold', dirFile));

        const contentType = ContentTypes.lookup(fileExt);
        logger.request('content type:', style('bold', contentType));

        // displays the requested file:
        if (isFile(filePath)) {

          setTimeout(function () {
            sendFile(req, res, filePath, contentType);
          }, config.delay);
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

    // watches the endpoints file once the server listens (a watcher keeps the process running).
    if (config.endPointsFilePath) {
      const watcher = watchEndPoints();
      server.on('close', () => watcher?.close());
    }

    console.log('Server running at', style(['yellow', 'underline'], util.format('http://%s:%s/', config.domain, config.port)));
    console.log('Type [Ctrl+C] to stop the server.');
    return server;
  };
  return {
    start: start
  };
};

export default HttpServer;

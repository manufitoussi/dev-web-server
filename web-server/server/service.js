import ContentTypes from './content-types.js';
import { applyCommonHeaders } from './headers.js';
import style from '../tools/style.js';
import createLogger from '../tools/logger.js';

/**
 * a valid JSONP callback name: a JavaScript identifier, or a dotted path
 * of identifiers (e.g. 'myCallback' or 'app.callbacks.done').
 */
const JSONP_CALLBACK = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/;

/**
 * Service class.
 *
 * @param {object}
 *          configuration
 * @returns {Service}
 */
const Service = function (config) {
  config = config || {};

  /**
   * Delay before running process in ms.
   * @type {int}
   */
  const delay = config.delay || 0;

  /**
   * all the endPoint callbacks.
   * @type {Object}
   */
  const endPoints = config.endPoints || {};

  /**
   * logger of the server.
   */
  const logger = config.logger || createLogger(false);

  /**
   * sends an error json result object to client.
   * @param  {Request} req
   * @param  {Response} res
   * @param  {Number} httpCode
   * @param  {String} message
   * @param  {Object} result
   * @param  {String} [jsonpCallback]
   */
  const sendError = function (req, res, httpCode, message, result, jsonpCallback) {
    if (jsonpCallback !== undefined && !JSONP_CALLBACK.test(jsonpCallback)) {
      sendError(req, res, 400, 'invalid JSONP callback name');
      return;
    }

    logger.requestError(httpCode, style('red', '[ERROR]'), style(['bold', 'red'], httpCode), style('red', message));
    const isJSONP = jsonpCallback !== undefined;
    if (!result) {
      result = {};
    }

    result.error = {
      code: httpCode,
      message: message
    };

    applyCommonHeaders(res, config);

    if (!isJSONP) {
      res.writeHead(httpCode, {
        "Content-Type": ContentTypes.lookup('.json')
      });
      res.end(JSON.stringify(result), 'utf-8');
    } else {
      res.writeHead(httpCode, {
        "Content-Type": ContentTypes.lookup('.js')
      });
      res.end(jsonpCallback + '(' + JSON.stringify(result) + ');', 'utf-8');
    }
  };

  /**
   * sends a success json result object to client.
   * @param  {Request} req
   * @param  {Response} res
   * @param  {Object} result
   * @param  {String} [jsonpCallback]
   */
  const sendSuccess = function (req, res, result, jsonpCallback) {
    if (jsonpCallback !== undefined && !JSONP_CALLBACK.test(jsonpCallback)) {
      sendError(req, res, 400, 'invalid JSONP callback name');
      return;
    }

    applyCommonHeaders(res, config);

    const isJSONP = jsonpCallback !== undefined;
    if (!isJSONP) {
      res.writeHead(200, {
        "Content-Type": ContentTypes.lookup('.json')
      });
      res.end(JSON.stringify(result), 'utf-8');
    } else {
      res.writeHead(200, {
        "Content-Type": ContentTypes.lookup('.js')
      });
      res.end(jsonpCallback + '(' + JSON.stringify(result) + ');', 'utf-8');
    }
  };

  /**
   * runs an endpoint process.
   * @param  {Request} req
   * @param  {Response} res
   * @param  {String} endPointName
   */
  const runEndPoint = function (req, res, endPointName) {
    logger.request(style('cyan', 'Endpoint: ' + endPointName));
    setTimeout(function () {
      const endPoint = endPoints[endPointName];
      if (endPoint === undefined) {
        sendError(req, res, 404, 'endPoint not found');
        return;
      }

      if (req.method === 'OPTIONS') {
        sendSuccess(req, res, '');
        return;
      }

      let rawBody = '';
      req.setEncoding('utf8');
      req.on('data', function (data) {
        rawBody += data;
      });
      req.on('end', function () {
        if (rawBody) {
          logger.request(style('bold', 'Body: ') + rawBody);
        }

        try {
          req.body = parseBody(rawBody, req.headers['content-type']);
        } catch (e) {
          sendError(req, res, 400, 'invalid JSON body: ' + e.message);
          return;
        }

        req.query = parseQuery(req.url);
        req.params = {};
        callEndPoint(endPoint, req, res, mergeParams(req));
      });
    }, delay);
  };

  /**
   * parses the body of a request according to its content type.
   * @param  {String} rawBody
   * @param  {String} [contentType]
   * @return {Object|Array|String|Number|Boolean|null|undefined} undefined for an empty body,
   *  the parsed value for JSON, an object for a url encoded form, the raw string otherwise.
   * @throws {SyntaxError} for an invalid JSON body.
   */
  const parseBody = function (rawBody, contentType) {
    if (!rawBody) {
      return undefined;
    }

    const mimeType = (contentType || '').split(';')[0].trim().toLowerCase();
    if (mimeType === 'application/json' || mimeType.endsWith('+json')) {
      return JSON.parse(rawBody);
    }

    if (mimeType === 'application/x-www-form-urlencoded') {
      return searchParamsToObject(new URLSearchParams(rawBody));
    }

    return rawBody;
  };

  /**
   * merges the parameters of a request: the query string, the body fields
   * (when the body is an object) and the route parameters, the last ones winning.
   * @param  {Request} req
   * @return {Object}
   */
  const mergeParams = function (req) {
    const body = req.body !== null && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    return Object.assign({}, req.query, body, req.params);
  };

  /**
   * parses the query string of an url. A repeated key gives an array of values.
   * @param  {String} reqUrl
   * @return {Object}
   */
  const parseQuery = function (reqUrl) {
    return searchParamsToObject(new URL(reqUrl, 'http://localhost').searchParams);
  };

  /**
   * converts url search params to an object. A repeated key gives an array of values.
   * @param  {URLSearchParams} searchParams
   * @return {Object}
   */
  const searchParamsToObject = function (searchParams) {
    const query = {};
    searchParams.forEach(function (value, key) {
      if (!Object.prototype.hasOwnProperty.call(query, key)) {
        query[key] = value;
      } else {
        query[key] = [].concat(query[key], value);
      }
    });
    return query;
  };

  /**
   * calls an endpoint callback, sending a 500 error instead of crashing
   * the server if it throws.
   * @param  {Function} endPoint
   * @param  {Request} req
   * @param  {Response} res
   * @param  {Object|String} params
   */
  const callEndPoint = function (endPoint, req, res, params) {
    try {
      endPoint(req, res, params, sendSuccess, sendError);
    } catch (e) {
      logger.error(style('red', e.stack || e.toString()));
      if (res.headersSent) {
        res.end();
        return;
      }
      sendError(req, res, 500, 'endPoint error: ' + (e.message || e.toString()));
    }
  };

  return {
    runEndPoint: runEndPoint
  };
};

export default Service;

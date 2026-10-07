import ContentTypes from './content-types.js';
import { addCorsHeaders, addCashControlHeader } from './add-cors-headers.js';
import style from '../tools/style.js';

var DELAY = 0;

/**
 * Service class.
 *
 * @param {object}
 *          configuration
 * @returns {Service}
 */
var Service = function (config) {
  config = config || {};

  /**
   * Delay before running process in ms.
   * @type {int}
   */
  var delay = config.delay === undefined ? DELAY : config.delay;

  /**
   * all the endPoint callbacks.
   * @type {Object}
   */
  var endPoints = config.endPoints || {};

  /**
   * sends an error json result object to client.
   * @param  {Request} req
   * @param  {Response} res
   * @param  {Number} httpCode
   * @param  {String} message
   * @param  {Object} result
   * @param  {String} [jsonpCallback]
   */
  var sendError = function (req, res, httpCode, message, result, jsonpCallback) {
    console.error(style('red', '[ERROR]'), style(['bold', 'red'], httpCode), style('red', message));
    var isJSONP = jsonpCallback !== undefined;
    if (!result) {
      result = {};
    }

    result.error = {
      code: httpCode,
      message: message
    };

    if (config.withCORS) {
      addCorsHeaders(res);
    }

    if (!config.withCache) {
      addCashControlHeader(res, 'no-cache');
    }

    if (!isJSONP) {
      res.writeHead(httpCode, {
        "Content-Type": ContentTypes.lookup('.json')
      });
      res.end(JSON.stringify(result), 'utf-8');
    } else {
      res.writeHead(httpCode);
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
  var sendSuccess = function (req, res, result, jsonpCallback) {

    if (config.withCORS) {
      addCorsHeaders(res);
    }

    if (!config.withCache) {
      addCashControlHeader(res, 'no-cache');
    }

    var isJSONP = jsonpCallback !== undefined;
    if (!isJSONP) {
      res.writeHead(200, {
        "Content-Type": ContentTypes.lookup('.json')
      });
      res.end(JSON.stringify(result), 'utf-8');
    } else {
      res.writeHead(200);
      res.end(jsonpCallback + '(' + JSON.stringify(result) + ');', 'utf-8');
    }
  };

  /**
   * runs an endpoint process.
   * @param  {Request} req
   * @param  {Response} res
   * @param  {String} endPointName
   */
  var runEndPoint = function (req, res, endPointName) {
    console.log(style('cyan', 'Endpoint: ' + endPointName));
    setTimeout(function () {
      var endPoint = endPoints[endPointName];
      if (endPoint === undefined) {
        sendError(req, res, 404, 'endPoint not found');
        return;
      }

      if (req.method === 'OPTIONS') {
        sendSuccess(req, res, '');
        return;
      }

      if (req.method !== 'DELETE' && req.method !== 'GET') {
        var body = '';
        req.on('data', function (data) {
          body += data;
        });
        req.on('end', function () {
          req.body = body;
          console.log(style('bold', 'Body: ') + req.body);
          callEndPoint(endPoint, req, res, req.body);
        });
        return;
      }

      callEndPoint(endPoint, req, res, parseQuery(req.url));
    }, delay);
  };

  /**
   * parses the query string of an url. A repeated key gives an array of values.
   * @param  {String} reqUrl
   * @return {Object}
   */
  var parseQuery = function (reqUrl) {
    var query = {};
    new URL(reqUrl, 'http://localhost').searchParams.forEach(function (value, key) {
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
  var callEndPoint = function (endPoint, req, res, params) {
    try {
      endPoint(req, res, params, sendSuccess, sendError);
    } catch (e) {
      console.error(style('red', e.stack || e.toString()));
      if (res.headersSent) {
        res.end();
        return;
      }
      sendError(req, res, 500, 'endPoint error: ' + (e.message || e.toString()));
    }
  };

  return {
    endPoints: endPoints,
    sendSuccess: sendSuccess,
    sendError: sendError,
    runEndPoint: runEndPoint
  };
};

export default Service;

var ContentTypes = require('./content-types.js');
var url = require('url');
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
   * @param  {[type]} httpCode
   * @param  {[type]} message
   * @param  {[type]} result
   */
  var sendError = function (req, res, httpCode, message, result) {
    console.error(message);
    if (!result) {
      result = {};
    }

    result.error = {
      code: httpCode,
      message: message
    };

    res.writeHead(httpCode, {
      "Content-Type": ContentTypes['.json']
    });
    res.end(JSON.stringify(result), 'utf-8');
  };

  /**
   * sends a success json result object to client.
   * @param  {Request} req
   * @param  {Response} res
   * @param  {Object} result
   */
  var sendSuccess = function (req, res, result) {
    res.writeHead(200, {
      "Content-Type": ContentTypes['.json']
    });
    res.end(JSON.stringify(result), 'utf-8');
  };

  /**
   * runs an endpoint process.
   * @param  {Request} req
   * @param  {Response} res
   * @param  {String} endPointName
   */
  var runEndPoint = function (req, res, endPointName) {
    console.log('Endpoint: ' + endPointName);
    setTimeout(function () {
      var endPoint = endPoints[endPointName];
      if (endPoint === undefined) {
        sendError(req, res, 404, 'endPoint not found');
        return;
      }

      if (req.method === 'POST') {
        var body = '';
        req.on('data', function (data) {
          body += data;
        });
        req.on('end', function () {
          req.body = body;
          console.log('Body: ' + req.body);
          endPoint(req, res, req.body, sendSuccess, sendError);
        });
        return;
      }

      var reqUrl = url.parse(req.url, true);
      endPoint(req, res, reqUrl.query, sendSuccess, sendError);
    }, delay);
  };

  return {
    endPoints: endPoints,
    sendSuccess: sendSuccess,
    sendError: sendError,
    runEndPoint: runEndPoint,
  };
};

module.exports = Service;
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

  var _corsHeaders = function _corsHeaders(res) {
    if(config.withCORS) {
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-Requested-With, Content-Type, Origin, Accept');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  };

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
    console.error('[ERROR]'.red, httpCode.toString().bold.red, message.red);
    var isJSONP = jsonpCallback !== undefined;
    if (!result) {
      result = {};
    }

    result.error = {
      code: httpCode,
      message: message
    };

    _corsHeaders(res);

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

    _corsHeaders(res);

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
    console.log('Endpoint: '.cyan + endPointName.cyan);
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
          console.log('Body: '.bold + req.body);
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
    runEndPoint: runEndPoint
  };
};

module.exports = Service;

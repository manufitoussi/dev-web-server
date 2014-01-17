var ContentTypes = require('./content-types.js');
var qs = require('querystring');
var DELAY = 0;
var DEBUG_SESSION_KEY = 'WSID_DEBUG';

/**
 * Actions class.
 *
 * @param {object}
 *          configuration
 * @returns {Actions}
 */
var Actions = function (config) {
  config = config || {};
  var isDebug = config.isDebug === undefined ? false : config.isDebug;
  var delay = config.delay === undefined ? DELAY : config.delay;
  var sessions = [];
  if (isDebug) {
    sessions = [ DEBUG_SESSION_KEY ];
  }

  var repository = {
  };

  /**
   * Validates the session key.
   */
  var validateSession = function (sessionKey, result, res) {
    var index = sessions.indexOf(sessionKey);
    if (index === -1) {
      console.error('session not found');
      result.error = 3;
      res.writeHead(401, {
        "Content-Type": ContentTypes['.json']
      });
      res.end(JSON.stringify(result), 'utf-8');
      return null;
    }

    return {
      index: index
    };
  };

  var actions = {
    "/connection": function (req, res) {
      setTimeout(function () {
        var login = req.body;
        console.log('login:pasw = ' + login);
        var logins = [ 'guest:.', 'operator:.', 'installer:.', 'admin:.' ];
        var result = {};
        if (logins.indexOf(login) === -1) {
          console.error('login not found');
          result = {
            log: login,
            error: '1'
          };
        } else {
          var sessionKey = 'WSID' + (new Date()).getTime();
          if (isDebug) {
            sessionKey = DEBUG_SESSION_KEY;
          }

          sessions.push(sessionKey);
          console.log('SESSIONS:', sessions.length);
          result = {
            "sessionKey": sessionKey
          };
        }

        res.writeHead(200, {
          "Content-Type": ContentTypes['.json']
        });
        res.end(JSON.stringify(result), 'utf-8');
      }, delay);
    },
    "/disconnection": function (req, res, sessionKey) {
      setTimeout(function () {
        var result = {};
        var session = validateSession(sessionKey, result, res);
        if (session) {
          console.log('session found.');
          console.log('remove it.');
          if (!isDebug) {
            sessions.splice(session.index, 1);
          }

          console.log('SESSIONS:', sessions.length);
        }

        res.writeHead(200, {
          "Content-Type": ContentTypes['.json']
        });
        res.end(JSON.stringify(result), 'utf-8');
      }, delay);
    },
    "/getData": function (req, res, sessionKey) {
      setTimeout(function () {
        var result = {};
        var session = validateSession(sessionKey, result, res);
        if (session) {
          result.requestBody = req.body;
        }

        res.writeHead(200, {
          "Content-Type": ContentTypes['.json']
        });
        res.end(JSON.stringify(result), 'utf-8');
      }, delay);
    },
  };

  return {
    actions: actions,
    repository: repository
  };
};

module.exports = Actions;
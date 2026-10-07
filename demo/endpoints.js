// Endpoints of the test card demo (npm start).
import fs from 'node:fs';

const { version } = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const startedAt = new Date();
let count = 0;

export default {
  // information about the server.
  '/info': (req, res, params, sendSuccess) => {
    sendSuccess(req, res, {
      version,
      node: process.version,
      startedAt: startedAt.toISOString(),
      count: count++,
    });
  },

  // returns what the endpoint received.
  '/echo': (req, res, params, sendSuccess) => {
    sendSuccess(req, res, {
      method: req.method,
      params,
      query: req.query,
      body: req.body ?? null,
      routeParams: req.params,
    });
  },

  // JSONP: /api/jsonp?callback=myCallback gives myCallback({...});
  '/jsonp': (req, res, params, sendSuccess) => {
    sendSuccess(req, res, { jsonp: true }, params.callback);
  },

  // an error sent by the endpoint.
  '/error': (req, res, params, sendSuccess, sendError) => {
    sendError(req, res, 401, 'You are not allowed to see this.', { hint: 'this is an expected error' });
  },

  // an exception thrown by the endpoint: the server answers with a 500 error and keeps running.
  '/boom': () => {
    throw new Error('Boom! (an expected exception)');
  },
};

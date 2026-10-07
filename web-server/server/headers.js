/**
 * adds the CORS headers allowing any origin.
 * @param {ServerResponse} res
 */
export function addCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-Requested-With, Content-Type, Origin, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Origin', '*');
}

/**
 * adds the Cache-Control header.
 * @param {ServerResponse} res
 * @param {string} [value]
 */
export function addCacheControlHeader(res, value = 'no-cache') {
  res.setHeader('Cache-Control', value);
}

/**
 * adds the headers common to all the responses according to the configuration:
 * the CORS headers with withCORS, and a 'no-cache' Cache-Control header without withCache.
 * @param {ServerResponse} res
 * @param {{ withCORS: boolean, withCache: boolean }} config
 */
export function applyCommonHeaders(res, config) {
  if (config.withCORS) {
    addCorsHeaders(res);
  }

  if (!config.withCache) {
    addCacheControlHeader(res, 'no-cache');
  }
}

/**
 * creates the logger of the server.
 *
 * With quiet, the request logs (including the 4xx error responses) are not
 * displayed: only the errors of the server (5xx, endpoints file loading)
 * are displayed.
 * @param {boolean} quiet
 * @returns {{ request: Function, requestError: Function, error: Function }}
 */
export default function createLogger(quiet) {
  return {
    // details of a request.
    request: (...args) => {
      if (!quiet) {
        console.log(...args);
      }
    },

    // an error response: a server error (5xx) is always displayed.
    requestError: (httpCode, ...args) => {
      if (!quiet || httpCode >= 500) {
        console.error(...args);
      }
    },

    // an error of the server.
    error: (...args) => console.error(...args),
  };
}

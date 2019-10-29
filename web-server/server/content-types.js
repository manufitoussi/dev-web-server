const mimes = require('mime-types');

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

module.exports = {
  lookup: ext => mimes.lookup(ext) || DEFAULT_CONTENT_TYPE,

  charset: ext => mimes.charset(ext)
};

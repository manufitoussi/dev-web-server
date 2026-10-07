import mimes from 'mime-types';

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

export default {
  lookup: ext => mimes.lookup(ext) || DEFAULT_CONTENT_TYPE,

  charset: ext => mimes.charset(ext)
};

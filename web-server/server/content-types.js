import mimes from 'mime-types';

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

export default {
  // full content type with its charset for text types (e.g. 'text/html; charset=utf-8').
  lookup: ext => mimes.contentType(ext) || DEFAULT_CONTENT_TYPE,
};

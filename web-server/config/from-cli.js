const path = require('path');

module.exports = function (config, argv) {

  // apply BASEDIR argument if present in the command line.
  var baseDirIndex = argv.indexOf('BASEDIR');
  if (baseDirIndex !== -1 && (baseDirIndex + 1) < argv.length) {
    var baseDir = argv[baseDirIndex + 1];
    config.baseDir = path.resolve(process.cwd(), baseDir);
  }

  // apply PORT argument if present in the command line.
  var portIndex = argv.indexOf('PORT');
  if (portIndex !== -1 && (portIndex + 1) < argv.length) {
    var port = argv[portIndex + 1];
    config.port = port;
  }

  // apply DOMAIN argument if present in the command line.
  var domainIndex = argv.indexOf('DOMAIN');
  if (domainIndex !== -1 && (domainIndex + 1) < argv.length) {
    var domain = argv[domainIndex + 1];
    config.domain = domain;
  }

  // apply DELAY argument if present in the command line.
  var delayIndex = argv.indexOf('DELAY');
  if (delayIndex !== -1 && (delayIndex + 1) < argv.length) {
    var delay = argv[delayIndex + 1];
    config.delay = delay;
  }

  // apply WITHCORS argument if present in the command line.
  if (argv.indexOf('WITHCORS') !== -1) {
    config.withCORS = true;
  }

  // apply ENDPOINTS argument if present in the command line.
  var endPointsFilePathIndex = argv.indexOf('ENDPOINTS');
  if (endPointsFilePathIndex !== -1 &&
    (endPointsFilePathIndex + 1) <
    argv.length) {
    var endPointsFilePath = argv[endPointsFilePathIndex + 1];
    config.endPointsFilePath = path.resolve(process.cwd(), endPointsFilePath);
  }

  return config;
};
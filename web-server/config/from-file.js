
const path = require('path');
const fs = require('fs');
const merge = require('../tools/merge');
const NAME = require('../../package').name;

module.exports = function parceConfigFile(config) {
  const packageJSONPath = path.resolve(process.cwd(), `${NAME}.json`);
  if (fs.existsSync(packageJSONPath)) {
    // parses it
    var defaultConfig = require(packageJSONPath);
    if (defaultConfig) {
      defaultConfig.endPointsFilePath = defaultConfig.hasOwnProperty('endPointsFilePath') ?
        path.resolve(process.cwd(), defaultConfig.endPointsFilePath) :
        defaultConfig.endPointsFilePath;
      defaultConfig.baseDir = defaultConfig.hasOwnProperty('baseDir') ?
        path.resolve(process.cwd(), defaultConfig.baseDir) :
        process.cwd();
      config = merge(config, defaultConfig);
    }
  }

  return config;
};
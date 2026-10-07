import path from 'node:path';
import fs from 'node:fs';
import merge from '../tools/merge.js';

const NAME = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url))).name;

export default function parceConfigFile(config) {
  const packageJSONPath = path.resolve(process.cwd(), `${NAME}.json`);
  if (fs.existsSync(packageJSONPath)) {
    // parses it
    var defaultConfig = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'));
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
}
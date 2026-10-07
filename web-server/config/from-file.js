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
      // the paths are relative to the launching directory (null means no endpoints file).
      if (typeof defaultConfig.endPointsFilePath === 'string') {
        defaultConfig.endPointsFilePath = path.resolve(process.cwd(), defaultConfig.endPointsFilePath);
      }
      defaultConfig.baseDir = typeof defaultConfig.baseDir === 'string' ?
        path.resolve(process.cwd(), defaultConfig.baseDir) :
        process.cwd();
      config = merge(config, defaultConfig);
    }
  }

  return config;
}
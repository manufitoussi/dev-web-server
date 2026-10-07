import path from 'node:path';
import fs from 'node:fs';
import merge from '../tools/merge.js';

const NAME = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url))).name;

/**
 * applies the configuration file (dev-web-server.json) of the launching directory, if any.
 * @param {object} config
 * @returns {object}
 */
export default function parseConfigFile(config) {
  const configFilePath = path.resolve(process.cwd(), `${NAME}.json`);
  if (fs.existsSync(configFilePath)) {
    let fileConfig;
    try {
      fileConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
    } catch (e) {
      throw new Error(`cannot read ${NAME}.json: ${e.message}`);
    }
    if (fileConfig) {
      // the paths are relative to the launching directory (null means no endpoints file).
      if (typeof fileConfig.endPointsFilePath === 'string') {
        fileConfig.endPointsFilePath = path.resolve(process.cwd(), fileConfig.endPointsFilePath);
      }
      fileConfig.baseDir = typeof fileConfig.baseDir === 'string' ?
        path.resolve(process.cwd(), fileConfig.baseDir) :
        process.cwd();
      config = merge(config, fileConfig);
    }
  }

  return config;
}
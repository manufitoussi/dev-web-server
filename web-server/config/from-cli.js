import path from 'node:path';

const resolvePath = value => path.resolve(process.cwd(), value);
const keepValue = value => value;

/**
 * parameters followed by a value: config property -> [parameter name, value parser].
 */
const VALUE_PARAMETERS = {
  baseDir: ['BASEDIR', resolvePath],
  port: ['PORT', keepValue],
  domain: ['DOMAIN', keepValue],
  delay: ['DELAY', keepValue],
  endPointsFilePath: ['ENDPOINTS', resolvePath],
  endPointsRoot: ['ENDPOINTSROOT', keepValue],
};

/**
 * parameters without value: config property -> parameter name.
 */
const FLAG_PARAMETERS = {
  withCORS: 'CORS',
  withCache: 'CACHE',
  isSPA: 'SPA',
};

/**
 * returns the value following a parameter in the command line arguments.
 * @param {string[]} argv
 * @param {string} name
 * @returns {string|undefined} undefined if the parameter is absent.
 */
const getArg = (argv, name) => {
  const index = argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  if (index + 1 >= argv.length) {
    throw new Error(`the ${name} parameter needs a value.`);
  }

  return argv[index + 1];
};

/**
 * applies the command line arguments to the configuration.
 * @param {object} config
 * @param {string[]} argv
 * @returns {object}
 */
export default function configFromCLI(config, argv) {
  for (const [property, [name, parse]] of Object.entries(VALUE_PARAMETERS)) {
    const value = getArg(argv, name);
    if (value !== undefined) {
      config[property] = parse(value);
    }
  }

  for (const [property, name] of Object.entries(FLAG_PARAMETERS)) {
    if (argv.includes(name)) {
      config[property] = true;
    }
  }

  return config;
}

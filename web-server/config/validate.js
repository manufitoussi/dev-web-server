/**
 * converts a value to an integer between min and max.
 * @param {string} name
 * @param {string|number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const toInteger = (name, value, min, max) => {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`invalid ${name} "${value}": it has to be an integer between ${min} and ${max}.`);
  }
  return number;
};

/**
 * validates the configuration and converts its numeric values (e.g. the
 * port given in the command line) to numbers.
 * @param {object} config
 * @returns {object}
 * @throws {Error} if a value is invalid.
 */
export default function validateConfig(config) {
  config.port = toInteger('port', config.port, 0, 65535);
  config.delay = toInteger('delay', config.delay, 0, 2147483647);
  return config;
}

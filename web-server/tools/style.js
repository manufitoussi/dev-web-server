import { styleText } from 'node:util';

/**
 * styles a text for the terminal, e.g. style('red', 'text') or style(['bold', 'red'], 'text').
 * The styles are not applied when the output does not support colors.
 * @param {string|string[]} formats util.inspect.colors names.
 * @param {*} text
 * @returns {string}
 */
export default function style(formats, text) {
  return [].concat(formats).reduceRight((result, format) => styleText(format, result), String(text));
}

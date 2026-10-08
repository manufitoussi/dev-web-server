// Checks that a release tag (e.g. 'v3.1.0') matches the version of package.json.
// Usage: node scripts/check-release-version.js <tag>
import fs from 'node:fs';

const tag = process.argv[2] || '';
const { version } = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));

if (tag.replace(/^v/, '') !== version) {
  console.error(`The release tag "${tag}" does not match the version of package.json (${version}): update the version or the tag.`);
  process.exit(1);
}

console.log(`The release tag "${tag}" matches the version ${version}.`);

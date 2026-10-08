import { describe, it } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../scripts/check-release-version.js', import.meta.url));
const { version } = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));

const check = tag => spawnSync(process.execPath, [SCRIPT, tag], { encoding: 'utf8' });

describe('release version check', () => {
  it('accepts the tag of the package version, with or without "v"', () => {
    for (const tag of [`v${version}`, version]) {
      assert.strictEqual(check(tag).status, 0, tag);
    }
  });

  it('refuses another tag', () => {
    for (const tag of ['v0.0.1', `v${version}-beta.1`, '']) {
      const result = check(tag);
      assert.strictEqual(result.status, 1, tag);
      assert.match(result.stderr, /does not match the version of package.json/, tag);
    }
  });
});

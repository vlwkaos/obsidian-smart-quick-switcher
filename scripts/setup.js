#!/usr/bin/env node
/**
 * Build and link plugin to an Obsidian vault.
 *
 * Usage: node scripts/setup.js <vault-name-or-path>
 *   e.g.: node scripts/setup.js dgv3
 */

const { execSync } = require('child_process');
const path = require('path');

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: npm run setup -- <vault-name>');
  console.error('  e.g.: npm run setup -- dgv3');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');

console.log('Building...');
execSync('node esbuild.config.mjs production', { cwd: root, stdio: 'inherit' });

console.log('Linking...');
execSync(`node scripts/link-to-vault.js ${JSON.stringify(arg)}`, { cwd: root, stdio: 'inherit' });

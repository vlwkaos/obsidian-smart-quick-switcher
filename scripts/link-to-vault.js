#!/usr/bin/env node
/**
 * Link plugin build output to Obsidian vault.
 *
 * Usage: node scripts/link-to-vault.js <vault-name-or-path>
 *   vault-name-or-path: directory name (e.g. "dgv3") searched under ~/, or an absolute path
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const PLUGIN_NAME = 'obsidian-smart-quick-switcher';
const FILES_TO_LINK = ['main.js', 'manifest.json', 'styles.css'];
const SEARCH_ROOTS = [os.homedir(), path.join(os.homedir(), 'Documents'), path.join(os.homedir(), 'Desktop')];

function findVaultByName(name) {
  for (const root of SEARCH_ROOTS) {
    const candidate = path.join(root, name);
    const obsidianDir = path.join(candidate, '.obsidian');
    if (fs.existsSync(obsidianDir) && fs.statSync(obsidianDir).isDirectory()) {
      return candidate;
    }
  }
  return null;
}

function resolveVault(arg) {
  if (path.isAbsolute(arg)) return arg;
  const found = findVaultByName(arg);
  if (!found) {
    console.error(`Vault "${arg}" not found under ${SEARCH_ROOTS.join(', ')}`);
    process.exit(1);
  }
  return found;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createSymlink(src, dest) {
  if (fs.existsSync(dest)) {
    const stat = fs.lstatSync(dest);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(dest);
    } else {
      console.log(`  Skip ${path.basename(dest)} (not a symlink)`);
      return false;
    }
  }

  fs.symlinkSync(src, dest);
  console.log(`  Linked ${path.basename(src)}`);
  return true;
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node scripts/link-to-vault.js <vault-name-or-path>');
    process.exit(1);
  }

  const pluginDir = path.resolve(__dirname, '..');
  const vaultPath = resolveVault(arg);
  const pluginsDir = path.join(vaultPath, '.obsidian', 'plugins', PLUGIN_NAME);
  ensureDir(pluginsDir);

  console.log(`Linking to: ${pluginsDir}`);

  let linked = 0;
  for (const file of FILES_TO_LINK) {
    const src = path.join(pluginDir, file);
    const dest = path.join(pluginsDir, file);

    if (!fs.existsSync(src)) {
      console.log(`  Skip ${file} (not built yet)`);
      continue;
    }

    if (createSymlink(src, dest)) linked++;
  }

  console.log(`Done. ${linked} files linked.`);
}

main();

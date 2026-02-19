#!/usr/bin/env node
/**
 * Link plugin build output to Obsidian vault.
 * Finds vault by searching parent directories for .obsidian folder.
 *
 * Usage: node scripts/link-to-vault.js [vault-path]
 */

const fs = require('fs');
const path = require('path');

const PLUGIN_NAME = 'obsidian-smart-quick-switcher';
const FILES_TO_LINK = ['main.js', 'manifest.json', 'styles.css'];

function findVault(startDir, maxDepth = 5) {
  let dir = startDir;

  for (let i = 0; i < maxDepth; i++) {
    const parent = path.dirname(dir);
    if (parent === dir) break;

    // Check siblings of current directory
    const siblings = fs.readdirSync(parent);
    for (const sibling of siblings) {
      const siblingPath = path.join(parent, sibling);
      const obsidianPath = path.join(siblingPath, '.obsidian');

      if (fs.existsSync(obsidianPath) && fs.statSync(obsidianPath).isDirectory()) {
        console.log(`Found vault: ${siblingPath}`);
        return siblingPath;
      }
    }
    dir = parent;
  }
  return null;
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
  const pluginDir = path.resolve(__dirname, '..');
  let vaultPath = process.argv[2];

  if (!vaultPath) {
    vaultPath = findVault(pluginDir);
    if (!vaultPath) {
      console.error('No Obsidian vault found. Specify path: node scripts/link-to-vault.js /path/to/vault');
      process.exit(1);
    }
  }

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

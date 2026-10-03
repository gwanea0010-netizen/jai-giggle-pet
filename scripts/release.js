#!/usr/bin/env node
// Ships a new pet version.
//
//   npm run release                         -> patch bump (3.1.0 -> 3.1.1)
//   npm run release -- minor --notes "New outfits"
//
// Default (GitHub): bumps the version, commits, tags and pushes. The GitHub
// workflow then builds the installer and publishes the release, and every
// installed pet updates itself from there.
//
// Shared-folder mode (no GitHub):  npm run release -- --folder "\\server\share\giggles-updates"
// builds locally and copies the installer + latest.json into that folder.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const updater = require('../lib/updater.js');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const level = ['patch', 'minor', 'major'].find((l) => args.includes(l)) || 'patch';
const notes = (flag('--notes') || process.env.GIGGLES_RELEASE_NOTES || '').replace(/"/g, "'").slice(0, 200);
const folder = flag('--folder') || process.env.GIGGLES_UPDATE_FOLDER;
const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
const out = (cmd) => execSync(cmd, { cwd: ROOT }).toString().trim();

if (folder) {
  // ---- shared folder release ----
  run(`npm version ${level} --no-git-tag-version`);
  const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  run('npm run dist');
  const manifest = updater.publish(folder, path.join(ROOT, 'dist', 'Giggles-Pet-Setup.exe'), version, notes);
  console.log(`Published ${manifest.file} (v${version}) to ${folder}`);
  process.exit(0);
}

// ---- GitHub release ----
if (out('git status --porcelain')) {
  console.error('You have uncommitted changes. Commit them first (git add -A && git commit -m "...").');
  process.exit(1);
}
const message = notes ? `Release v%s: ${notes}` : 'Release v%s';
run(`npm version ${level} -m "${message}"`);
run('git push --follow-tags');
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const remote = out('git remote get-url origin').replace(/\.git$/, '');
console.log(`\nPublished v${version}. GitHub is building the installer now (about 5 minutes):`);
console.log(`  ${remote}/actions`);
console.log(`Then it appears at ${remote}/releases and every pet updates itself.`);

#!/usr/bin/env node
// Publishes a new pet version to the team's update folder.
//   node scripts/release.js [patch|minor|major] [--notes "What changed"] [--folder "\\server\share\giggles-updates"]
// Without --folder it uses GIGGLES_UPDATE_FOLDER, then the update source / team folder from your pet settings.

const fs = require('fs');
const os = require('os');
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
const notes = flag('--notes') || process.env.GIGGLES_RELEASE_NOTES || '';

function resolveFolder() {
  const explicit = flag('--folder') || process.env.GIGGLES_UPDATE_FOLDER;
  if (explicit) return explicit;
  try {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const s = JSON.parse(fs.readFileSync(path.join(appData, 'Giggles Pet', 'settings.json'), 'utf8'));
    if (s.updateSource && !updater.isUrl(s.updateSource)) return s.updateSource;
    if (s.teamFolder) return path.join(s.teamFolder, 'giggles-updates');
  } catch {
    // no settings yet
  }
  return null;
}

const folder = resolveFolder();
if (!folder) {
  console.error('No update folder. Pick a team folder in the pet (🏆 Team tab) or pass --folder <path>.');
  process.exit(1);
}

// 1. bump version
const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const [ma, mi, pa] = pkg.version.split('.').map(Number);
pkg.version = level === 'major' ? `${ma + 1}.0.0` : level === 'minor' ? `${ma}.${mi + 1}.0` : `${ma}.${mi}.${pa + 1}`;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Version → ${pkg.version}`);

// 2. build installer
execSync('npm run dist', { cwd: ROOT, stdio: 'inherit' });
const setup = path.join(ROOT, 'dist', `Giggles-Pet-Setup-${pkg.version}.exe`);
if (!fs.existsSync(setup)) {
  console.error(`Build did not produce ${setup}`);
  process.exit(1);
}

// 3. publish
const manifest = updater.publish(folder, setup, pkg.version, notes);
console.log(`Published ${manifest.file} to ${folder}`);
console.log('Teammates update automatically within a few hours (or via Settings → Check for updates).');

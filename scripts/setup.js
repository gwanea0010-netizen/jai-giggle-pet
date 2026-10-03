#!/usr/bin/env node
// Makes sure the Electron binary is present. On newer Node versions Electron's own
// postinstall can exit before unzipping, leaving node_modules/electron/dist empty.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const pkgDir = path.join(__dirname, '..', 'node_modules', 'electron');
const exeName = { win32: 'electron.exe', darwin: 'Electron.app/Contents/MacOS/Electron' }[process.platform] || 'electron';
const exePath = path.join(pkgDir, 'dist', exeName);

if (fs.existsSync(exePath)) {
  console.log('Electron binary OK.');
  process.exit(0);
}

console.log('Electron binary missing, downloading…');
try {
  execFileSync(process.execPath, [path.join(pkgDir, 'install.js')], { stdio: 'inherit' });
} catch {
  // fall through to manual extraction
}
if (fs.existsSync(exePath)) process.exit(0);

// Fallback: unzip the cached download ourselves.
const { version } = require(path.join(pkgDir, 'package.json'));
const cacheRoot = process.env.electron_config_cache || {
  win32: path.join(process.env.LOCALAPPDATA || '', 'electron', 'Cache'),
  darwin: path.join(os.homedir(), 'Library', 'Caches', 'electron'),
}[process.platform] || path.join(os.homedir(), '.cache', 'electron');
const zipName = `electron-v${version}-${process.platform}-${process.arch}.zip`;

function findZip(dir) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findZip(p);
      if (found) return found;
    } else if (entry.name === zipName) {
      return p;
    }
  }
  return null;
}

const zip = findZip(cacheRoot);
if (!zip) {
  console.error(`Could not find ${zipName} in ${cacheRoot}. Delete node_modules and run npm install again.`);
  process.exit(1);
}

const dist = path.join(pkgDir, 'dist');
fs.mkdirSync(dist, { recursive: true });
if (process.platform === 'win32') {
  execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${dist}' -Force`], { stdio: 'inherit' });
} else {
  execFileSync('unzip', ['-o', '-q', zip, '-d', dist], { stdio: 'inherit' });
}
const dts = path.join(dist, 'electron.d.ts');
if (fs.existsSync(dts)) fs.renameSync(dts, path.join(pkgDir, 'electron.d.ts'));
fs.writeFileSync(path.join(pkgDir, 'path.txt'), exeName);
console.log(fs.existsSync(exePath) ? 'Electron binary installed.' : 'Electron install failed.');

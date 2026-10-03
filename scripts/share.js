#!/usr/bin/env node
// Builds dist/Giggles-Pet.zip for teammates (no node_modules, no personal settings).
// The zip gets a trimmed package.json (only Electron, no build tooling) so `npm install`
// is small and quiet. If the installer exe has been built, it is included too, so
// Install-Giggles.bat can fall back to it on machines without Node.js.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(DIST, 'Giggles-Pet.zip');
const STAGE = path.join(DIST, '_share');
const FILES = [
  'assets', 'hooks', 'lib', 'renderer', 'system',
  'scripts/install-hooks.js', 'scripts/setup.js', 'scripts/send.js', 'scripts/share.js',
  'main.js', 'preload.js', 'README.md', 'Install-Giggles.bat', 'Start-Giggles.bat',
];

function latestSetup() {
  if (!fs.existsSync(DIST)) return null;
  return fs.readdirSync(DIST)
    .filter((f) => /^Giggles-Pet-Setup.*\.exe$/.test(f))
    .map((f) => path.join(DIST, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function stage() {
  fs.rmSync(STAGE, { recursive: true, force: true });
  fs.mkdirSync(STAGE, { recursive: true });
  for (const f of FILES) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(STAGE, f), { recursive: true });
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const slim = {
    name: pkg.name,
    productName: pkg.productName,
    version: pkg.version,
    description: pkg.description,
    author: pkg.author,
    license: pkg.license,
    private: true,
    main: pkg.main,
    scripts: {
      postinstall: pkg.scripts.postinstall,
      start: pkg.scripts.start,
      'install-hooks': pkg.scripts['install-hooks'],
      'uninstall-hooks': pkg.scripts['uninstall-hooks'],
      'test-done': pkg.scripts['test-done'],
    },
    devDependencies: { electron: pkg.devDependencies.electron },
  };
  fs.writeFileSync(path.join(STAGE, 'package.json'), JSON.stringify(slim, null, 2) + '\n');
  const setup = latestSetup();
  if (setup) fs.copyFileSync(setup, path.join(STAGE, path.basename(setup)));
  return !!setup;
}

function createSharePackage() {
  return new Promise((resolve, reject) => {
    try {
      stage();
    } catch (err) {
      return reject(err);
    }
    if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
    const cmd = `Compress-Archive -Path '${STAGE.replace(/'/g, "''")}\\*' -DestinationPath '${OUT.replace(/'/g, "''")}' -Force`;
    execFile('powershell', ['-NoProfile', '-Command', cmd], { windowsHide: true }, (err) => {
      fs.rmSync(STAGE, { recursive: true, force: true });
      return err ? reject(err) : resolve(OUT);
    });
  });
}

module.exports = { createSharePackage };

if (require.main === module) {
  createSharePackage()
    .then((file) => console.log(`Share package ready: ${file}`))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}

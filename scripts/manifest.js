#!/usr/bin/env node
// Writes dist/latest.json next to the built installer (used by the release workflow).
//   node scripts/manifest.js "release notes"
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const { version } = require(path.join(root, 'package.json'));
const file = 'Giggles-Pet-Setup.exe';
const setup = path.join(root, 'dist', file);

if (!fs.existsSync(setup)) {
  console.error(`Missing ${setup}. Run npm run dist first.`);
  process.exit(1);
}

const manifest = {
  version,
  file,
  sha512: crypto.createHash('sha512').update(fs.readFileSync(setup)).digest('base64'),
  notes: (process.argv[2] || '').replace(/^Release v?[\d.]+:?\s*/i, '').slice(0, 300),
  date: new Date().toISOString(),
};
fs.writeFileSync(path.join(root, 'dist', 'latest.json'), JSON.stringify(manifest, null, 2));
console.log(`latest.json → ${manifest.version}`);

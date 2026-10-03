// Team auto-update without a server.
// A release folder (shared drive / OneDrive / the team folder) or an http(s) URL holds:
//   latest.json  -> { version, file, sha512, notes, date }
//   Giggles-Pet-Setup-<version>.exe
// Installed pets check it, copy/download the installer, verify the hash and run it silently.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const isUrl = (s) => /^https?:\/\//i.test(s);
const join = (source, file) => (isUrl(source) ? source.replace(/\/?$/, '/') + encodeURIComponent(file) : path.join(source, file));

function compare(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

function sha512(file) {
  return crypto.createHash('sha512').update(fs.readFileSync(file)).digest('base64');
}

async function readManifest(source) {
  if (isUrl(source)) {
    const res = await fetch(join(source, 'latest.json'), { cache: 'no-store' });
    if (res.status === 404) throw new Error('no release published yet');
    if (!res.ok) throw new Error(`latest.json: HTTP ${res.status}`);
    return res.json();
  }
  return JSON.parse(fs.readFileSync(path.join(source, 'latest.json'), 'utf8'));
}

async function check(source, currentVersion) {
  const manifest = await readManifest(source);
  if (!manifest.version || !manifest.file) throw new Error('latest.json is missing version/file');
  return { manifest, newer: compare(manifest.version, currentVersion) > 0 };
}

// Copies/downloads the installer to %TEMP% and verifies its hash.
async function fetchInstaller(source, manifest) {
  const dest = path.join(os.tmpdir(), path.basename(manifest.file));
  if (fs.existsSync(dest) && manifest.sha512 && sha512(dest) === manifest.sha512) return dest;
  if (isUrl(source)) {
    const res = await fetch(join(source, manifest.file));
    if (!res.ok) throw new Error(`download: HTTP ${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  } else {
    fs.copyFileSync(path.join(source, manifest.file), dest);
  }
  if (manifest.sha512 && sha512(dest) !== manifest.sha512) {
    fs.rmSync(dest, { force: true });
    throw new Error('installer checksum mismatch');
  }
  return dest;
}

// Runs the installer silently a few seconds after we quit, then it relaunches the pet.
function runInstaller(file, relaunch = true) {
  const args = `/S${relaunch ? ' --force-run' : ''}`;
  spawn('cmd.exe', ['/c', `ping 127.0.0.1 -n 4 >nul & "${file}" ${args}`], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  }).unref();
}

// Used by the release script: copy the installer + write latest.json, keep the last 3 installers.
function publish(folder, setupPath, version, notes = '') {
  fs.mkdirSync(folder, { recursive: true });
  const file = `Giggles-Pet-Setup-${version}.exe`;
  fs.copyFileSync(setupPath, path.join(folder, file));
  const manifest = { version, file, sha512: sha512(setupPath), notes, date: new Date().toISOString() };
  const tmp = path.join(folder, 'latest.json.tmp');
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2));
  fs.renameSync(tmp, path.join(folder, 'latest.json'));

  const ver = (f) => (f.match(/(\d+\.\d+\.\d+)/) || [, '0.0.0'])[1];
  const old = fs.readdirSync(folder)
    .filter((f) => /^Giggles-Pet-Setup-.*\.exe$/.test(f) && f !== file)
    .sort((a, b) => compare(ver(b), ver(a)));
  for (const f of old.slice(2)) fs.rmSync(path.join(folder, f), { force: true });
  return manifest;
}

module.exports = { compare, check, fetchInstaller, runInstaller, publish, isUrl };

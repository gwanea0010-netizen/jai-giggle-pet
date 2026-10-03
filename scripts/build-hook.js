#!/usr/bin/env node
// Compiles build/pet-hook.cs into build/pet-hook.exe with the C# compiler that ships with Windows (.NET Framework 4).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'build', 'pet-hook.cs');
const out = path.join(root, 'build', 'pet-hook.exe');
const windir = process.env.WINDIR || 'C:\\Windows';
const csc = ['Framework64', 'Framework']
  .map((f) => path.join(windir, 'Microsoft.NET', f, 'v4.0.30319', 'csc.exe'))
  .find((p) => fs.existsSync(p));

if (!csc) {
  console.error('csc.exe (.NET Framework 4) not found; cannot build pet-hook.exe');
  process.exit(1);
}
// winexe = no console window flashes when Claude Code runs the hook.
execFileSync(csc, ['/nologo', '/optimize+', '/target:winexe', `/out:${out}`, src], { stdio: 'inherit' });
console.log(`Built ${out}`);

// Team leaderboard through a shared folder (network drive, OneDrive/SharePoint, Google Drive…).
// Each pet writes <folder>/giggles-team/<memberId>.json; everyone reads all files.
// Only names, pet look and task counts are shared.

const fs = require('fs');
const path = require('path');

const SUBDIR = 'giggles-team';
const STALE_MS = 30 * 24 * 60 * 60 * 1000;

const todayStr = () => new Date().toLocaleDateString('en-CA');
const dirOf = (folder) => path.join(folder, SUBDIR);

function publish(folder, member) {
  try {
    const dir = dirOf(folder);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${member.id}.json`);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ ...member, updatedAt: Date.now() }, null, 2));
    fs.renameSync(tmp, file);
    return true;
  } catch {
    return false;
  }
}

// Sorted by today's count, then all-time.
function read(folder) {
  const dir = dirOf(folder);
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const now = Date.now();
  const today = todayStr();
  const members = [];
  for (const f of files) {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (!m.id || now - (m.updatedAt || 0) > STALE_MS) continue;
      members.push({
        id: String(m.id),
        ownerName: String(m.ownerName || 'Anonymous').slice(0, 40),
        petName: String(m.petName || 'Pet').slice(0, 40),
        species: String(m.species || 'cat'),
        equipped: m.equipped && typeof m.equipped === 'object' ? m.equipped : {},
        today: m.date === today ? Number(m.today) || 0 : 0,
        total: Number(m.total) || 0,
        updatedAt: m.updatedAt || 0,
      });
    } catch {
      // half-synced or foreign file
    }
  }
  return members.sort((a, b) => b.today - a.today || b.total - a.total || a.ownerName.localeCompare(b.ownerName));
}

// Pet-to-pet messages through the shared folder: one small file per message in the recipient's inbox.
const KINDS = ['visit', 'return', 'poke'];
const safeId = (id) => String(id).replace(/[^\w-]/g, '').slice(0, 64);

function send(folder, from, to, kind, payload) {
  if (!KINDS.includes(kind)) throw new Error('unknown message kind');
  const dir = path.join(dirOf(folder), 'inbox', safeId(to));
  fs.mkdirSync(dir, { recursive: true });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  fs.writeFileSync(path.join(dir, `${name}.tmp`), JSON.stringify({ from, kind, payload: payload || {} }));
  fs.renameSync(path.join(dir, `${name}.tmp`), path.join(dir, name));
}

function inbox(folder, me) {
  const dir = path.join(dirOf(folder), 'inbox', safeId(me));
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
  const out = [];
  for (const f of files) {
    const p = path.join(dir, f);
    try {
      const m = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (Date.now() - parseInt(f, 10) < 10 * 60 * 1000 && KINDS.includes(m.kind)) out.push(m);
    } catch {
      // half-synced file: try again next time
      continue;
    }
    try { fs.rmSync(p); } catch { /* someone else removed it */ }
  }
  return out;
}

module.exports = { publish, read, dirOf, send, inbox };

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

module.exports = { publish, read, dirOf };

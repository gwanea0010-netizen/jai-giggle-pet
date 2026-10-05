// Team leaderboard on Supabase (see supabase/setup.sql).
// Talks to two Postgres functions through Supabase's REST API using the public anon key;
// every call carries the team code, which the database checks.

const todayStr = () => new Date().toLocaleDateString('en-CA');

function endpoint(cfg, fn) {
  return `${String(cfg.url).trim().replace(/\/+$/, '')}/rest/v1/rpc/${fn}`;
}

async function rpc(cfg, fn, body) {
  if (!cfg || !cfg.url || !cfg.key || !cfg.code) throw new Error('Supabase URL, key and team code are required');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  let res;
  try {
    res = await fetch(endpoint(cfg, fn), {
      method: 'POST',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err) {
    throw new Error(err.name === 'AbortError' ? 'Supabase did not answer (timeout)' : `Can't reach Supabase: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text).message || text; } catch { /* plain text */ }
    if (/invalid team code/i.test(msg)) msg = 'Wrong team code';
    else if (res.status === 401) msg = 'Wrong Supabase key';
    else if (res.status === 404) msg = 'Leaderboard functions not found. Run supabase/setup.sql first';
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return text ? JSON.parse(text) : null;
}

function publish(cfg, member) {
  return rpc(cfg, 'pet_publish', { p_code: cfg.code, p_member: member });
}

// Same shape as lib/team.js read(): sorted by today, then all-time.
async function read(cfg) {
  const rows = (await rpc(cfg, 'pet_board', { p_code: cfg.code })) || [];
  const today = todayStr();
  return rows
    .map((m) => ({
      id: String(m.member_id),
      ownerName: String(m.owner_name || 'Anonymous').slice(0, 40),
      petName: String(m.pet_name || 'Pet').slice(0, 40),
      species: String(m.species || 'cat'),
      equipped: m.equipped && typeof m.equipped === 'object' ? m.equipped : {},
      badges: Array.isArray(m.badges) ? m.badges.slice(0, 60) : [],
      today: String(m.day || '').slice(0, 10) === today ? Number(m.today) || 0 : 0,
      total: Number(m.total) || 0,
      updatedAt: Date.parse(m.updated_at) || 0,
    }))
    .sort((a, b) => b.today - a.today || b.total - a.total || a.ownerName.localeCompare(b.ownerName));
}

// Pet-to-pet messages (visits across screens).
function send(cfg, from, to, kind, payload) {
  return rpc(cfg, 'pet_send', { p_code: cfg.code, p_from: from, p_to: to, p_kind: kind, p_payload: payload || {} });
}

async function inbox(cfg, me) {
  const rows = (await rpc(cfg, 'pet_inbox', { p_code: cfg.code, p_member: me })) || [];
  return rows.map((r) => ({ from: String(r.from_member), kind: r.kind, payload: r.payload || {} }));
}

module.exports = { publish, read, send, inbox };

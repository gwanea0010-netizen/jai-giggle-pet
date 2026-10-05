// Pet-to-pet chat between teammates.
// Message bodies are sealed with AES-256-GCM using a key derived from the team code, so they're
// unreadable in the Supabase table / shared folder; only pets that know the team code can open them.
// The conversation history is kept on this PC only.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_TEXT = 500;
const MAX_HISTORY = 500;
const keyCache = new Map();

function keyFor(secret) {
  const s = String(secret || 'giggles-pet');
  if (!keyCache.has(s)) keyCache.set(s, crypto.scryptSync(s, 'giggles-pet-chat-v1', 32));
  return keyCache.get(s);
}

function seal(secret, body) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', keyFor(secret), iv);
  const data = Buffer.concat([c.update(JSON.stringify(body), 'utf8'), c.final()]);
  return { v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') };
}

function open(secret, p) {
  const d = crypto.createDecipheriv('aes-256-gcm', keyFor(secret), Buffer.from(String(p.iv), 'base64'));
  d.setAuthTag(Buffer.from(String(p.tag), 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(String(p.data), 'base64')), d.final()]).toString('utf8'));
}

const cleanText = (t) => String(t || '').replace(/\s+$/g, '').replace(/^\s+/g, '').slice(0, MAX_TEXT);

class ChatStore {
  constructor(file) {
    this.file = file;
    try {
      this.items = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Array.isArray(this.items)) this.items = [];
    } catch {
      this.items = [];
    }
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.items.slice(-MAX_HISTORY)));
    fs.renameSync(tmp, this.file);
  }

  add(msg) {
    const item = {
      id: crypto.randomUUID(),
      with: String(msg.with),
      withName: String(msg.withName || '').slice(0, 40),
      dir: msg.dir === 'out' ? 'out' : 'in',
      text: cleanText(msg.text),
      at: msg.at || Date.now(),
      read: msg.dir === 'out',
    };
    this.items.push(item);
    if (this.items.length > MAX_HISTORY) this.items = this.items.slice(-MAX_HISTORY);
    this.save();
    return item;
  }

  thread(withId) {
    return this.items.filter((m) => m.with === withId);
  }

  markRead(withId) {
    let changed = false;
    for (const m of this.items) if (m.with === withId && !m.read) { m.read = true; changed = true; }
    if (changed) this.save();
  }

  unread() {
    const counts = {};
    for (const m of this.items) if (!m.read) counts[m.with] = (counts[m.with] || 0) + 1;
    return counts;
  }

  lastAt() {
    const at = {};
    for (const m of this.items) at[m.with] = m.at;
    return at;
  }
}

module.exports = { seal, open, cleanText, ChatStore, MAX_TEXT };

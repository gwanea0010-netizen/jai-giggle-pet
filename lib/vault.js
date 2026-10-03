// Local encrypted vault for passwords and notes.
// File format (JSON): { v, kdf: { name: 'scrypt', N, r, p, salt }, iv, tag, data }
//   key  = scrypt(masterPassword, salt)  (32 bytes)
//   data = AES-256-GCM(JSON.stringify(entries)) — GCM's auth tag also detects a wrong password.
// The master password is never stored; the derived key only lives in memory while unlocked.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KDF = { N: 2 ** 15, r: 8, p: 1 };
const MAX_MEM = 64 * 1024 * 1024;

function deriveKey(password, salt, kdf = KDF) {
  return crypto.scryptSync(String(password).normalize('NFKC'), salt, 32, { N: kdf.N, r: kdf.r, p: kdf.p, maxmem: MAX_MEM });
}

function encrypt(key, entries) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(entries), 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}

function decrypt(key, blob) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(blob.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(blob.tag, 'base64'));
  const json = Buffer.concat([decipher.update(Buffer.from(blob.data, 'base64')), decipher.final()]).toString('utf8');
  return JSON.parse(json);
}

class Vault {
  constructor(file) {
    this.file = file;
    this.key = null;
    this.kdf = null;
    this.entries = null;
    this.failures = 0;
    this.lockedUntil = 0;
  }

  exists() {
    return fs.existsSync(this.file);
  }

  isUnlocked() {
    return !!this.key;
  }

  create(password) {
    if (this.exists()) throw new Error('A vault already exists');
    if (String(password).length < 8) throw new Error('Use at least 8 characters');
    const salt = crypto.randomBytes(16);
    this.kdf = { name: 'scrypt', ...KDF, salt: salt.toString('base64') };
    this.key = deriveKey(password, salt);
    this.entries = [];
    this.write();
  }

  unlock(password) {
    if (Date.now() < this.lockedUntil) {
      throw new Error(`Too many wrong tries. Wait ${Math.ceil((this.lockedUntil - Date.now()) / 1000)}s`);
    }
    const file = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    const key = deriveKey(password, Buffer.from(file.kdf.salt, 'base64'), file.kdf);
    try {
      this.entries = decrypt(key, file);
    } catch {
      this.failures++;
      // back off: 5 wrong tries -> 30s, then doubling
      if (this.failures >= 5) this.lockedUntil = Date.now() + 30000 * 2 ** (this.failures - 5);
      throw new Error('Wrong master password');
    }
    this.failures = 0;
    this.key = key;
    this.kdf = file.kdf;
  }

  lock() {
    if (this.key) this.key.fill(0);
    this.key = null;
    this.entries = null;
  }

  write() {
    if (!this.key) throw new Error('Vault is locked');
    const blob = { v: 1, kdf: this.kdf, ...encrypt(this.key, this.entries) };
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (fs.existsSync(this.file)) fs.copyFileSync(this.file, `${this.file}.bak`);
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(blob));
    fs.renameSync(tmp, this.file);
  }

  // Entries without secrets, for the list view.
  list() {
    this.must();
    return this.entries.map(({ password, notes, ...rest }) => ({ ...rest, hasPassword: !!password, hasNotes: !!notes }));
  }

  get(id) {
    this.must();
    const e = this.entries.find((x) => x.id === id);
    if (!e) throw new Error('Not found');
    return { ...e };
  }

  upsert(entry) {
    this.must();
    const clean = {
      id: entry.id || crypto.randomUUID(),
      type: entry.type === 'note' ? 'note' : 'login',
      title: String(entry.title || '').slice(0, 120) || 'Untitled',
      username: String(entry.username || '').slice(0, 200),
      password: String(entry.password || '').slice(0, 500),
      url: String(entry.url || '').slice(0, 500),
      notes: String(entry.notes || '').slice(0, 20000),
      updatedAt: Date.now(),
    };
    const i = this.entries.findIndex((x) => x.id === clean.id);
    if (i >= 0) this.entries[i] = { ...this.entries[i], ...clean };
    else this.entries.push({ ...clean, createdAt: Date.now() });
    this.write();
    return clean.id;
  }

  remove(id) {
    this.must();
    this.entries = this.entries.filter((x) => x.id !== id);
    this.write();
  }

  changeMaster(oldPassword, newPassword) {
    this.must();
    if (String(newPassword).length < 8) throw new Error('Use at least 8 characters');
    const check = deriveKey(oldPassword, Buffer.from(this.kdf.salt, 'base64'), this.kdf);
    if (!crypto.timingSafeEqual(check, this.key)) throw new Error('Current master password is wrong');
    const salt = crypto.randomBytes(16);
    this.kdf = { name: 'scrypt', ...KDF, salt: salt.toString('base64') };
    this.key.fill(0);
    this.key = deriveKey(newPassword, salt);
    this.write();
  }

  must() {
    if (!this.key) throw new Error('Vault is locked');
  }
}

// Strong random password from a readable alphabet.
function generatePassword(length = 18, { symbols = true } = {}) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', symbols ? '!@#$%^&*-_=+?' : ''].filter(Boolean);
  const all = sets.join('');
  const pick = (chars) => chars[crypto.randomInt(chars.length)];
  const out = sets.map(pick); // at least one of each kind
  while (out.length < length) out.push(pick(all));
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
}

module.exports = { Vault, generatePassword };

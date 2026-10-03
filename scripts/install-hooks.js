#!/usr/bin/env node
// Adds/removes the pet hooks in ~/.claude/settings.json.
// CLI: node scripts/install-hooks.js [--remove]. Also used by the settings window.
// A timestamped backup of settings.json is written before any change.

const fs = require('fs');
const os = require('os');
const path = require('path');

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const HOOK_SCRIPT = path.resolve(__dirname, '..', 'hooks', 'pet-hook.js').replace(/\\/g, '/');
// Dev/zip installs run the Node hook; the packaged app passes its bundled pet-hook.exe instead.
const DEFAULT_COMMAND = `node "${HOOK_SCRIPT}"`;
const MARKER = 'pet-hook';
const EVENTS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'Notification', 'Stop', 'SessionEnd'];

function read() {
  if (!fs.existsSync(SETTINGS_PATH)) return { raw: null, settings: {} };
  const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
  return { raw, settings: raw.trim() ? JSON.parse(raw) : {} };
}

function apply(remove, command = DEFAULT_COMMAND) {
  const { raw, settings } = read();
  let backup = null;
  if (raw !== null) {
    backup = `${SETTINGS_PATH}.pet-backup-${Date.now()}`;
    fs.writeFileSync(backup, raw);
  } else {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  }

  settings.hooks = settings.hooks || {};

  // Strip previous pet entries so this is idempotent.
  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event]
      .map((group) => ({ ...group, hooks: (group.hooks || []).filter((h) => !String(h.command || '').includes(MARKER)) }))
      .filter((group) => group.hooks.length > 0);
    if (settings.hooks[event].length === 0) delete settings.hooks[event];
  }

  if (!remove) {
    for (const event of EVENTS) {
      const group = { hooks: [{ type: 'command', command, timeout: 5 }] };
      if (event === 'PreToolUse') group.matcher = '*';
      settings.hooks[event] = settings.hooks[event] || [];
      settings.hooks[event].push(group);
    }
  }
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;

  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
  return { backup, ...status(command) };
}

function status(command = DEFAULT_COMMAND) {
  try {
    const { settings } = read();
    const hooks = settings.hooks || {};
    const connected = EVENTS.filter((ev) =>
      (hooks[ev] || []).some((g) => (g.hooks || []).some((h) => h.command === command))
    );
    return { installed: connected.length === EVENTS.length, connected, settingsPath: SETTINGS_PATH };
  } catch (err) {
    return { installed: false, connected: [], settingsPath: SETTINGS_PATH, error: err.message };
  }
}

module.exports = {
  install: (command) => apply(false, command),
  remove: (command) => apply(true, command),
  status,
};

if (require.main === module) {
  const remove = process.argv.includes('--remove');
  const result = apply(remove);
  if (result.backup) console.log(`Backup written: ${result.backup}`);
  console.log(remove ? 'Pet hooks removed.' : `Pet hooks installed for: ${EVENTS.join(', ')}`);
  console.log(`Settings: ${SETTINGS_PATH}`);
}

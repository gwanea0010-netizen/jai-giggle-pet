// Giggles Pet — Cyborg ERP dev buddy. Developed by Jai Panwar.
// Main process: transparent pet window, settings window, local event server,
// system monitor (music / mic / foreground app) and persisted settings.

const { app, BrowserWindow, ipcMain, screen, Menu, Notification, nativeImage, dialog, shell, clipboard } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

const SPECIES = require('./renderer/species.js');
const { ACCESSORIES, activeFestival, isUnlocked } = require('./renderer/accessories.js');
const updater = require('./lib/updater.js');
const { Vault, generatePassword } = require('./lib/vault.js');
const hooks = require('./scripts/install-hooks.js');
const { createSharePackage } = require('./scripts/share.js');
const team = require('./lib/team.js');
const teamcloud = require('./lib/teamcloud.js');
const ACH = require('./renderer/achievements.js');
const weather = require('./lib/weather.js');

// The installed app ships a small native hook (no Node.js needed on the machine).
const HOOK_COMMAND = app.isPackaged
  ? `"${path.join(process.resourcesPath, 'pet-hook.exe').replace(/\\/g, '/')}"`
  : undefined;

// The uninstaller calls us with this flag to clean up ~/.claude/settings.json.
if (process.argv.includes('--uninstall-hooks')) {
  try { hooks.remove(HOOK_COMMAND); } catch { /* nothing to clean */ }
  process.exit(0);
}

const PORT = Number(process.env.GIGGLES_PORT) || 47321;
const ICON = nativeImage.createFromPath(path.join(__dirname, 'assets', 'cyborg-erp-logo.jpg'));
const SIZES = [
  { label: 'Tiny', scale: 0.5 },
  { label: 'Small', scale: 0.65 },
  { label: 'Medium', scale: 0.8 },
  { label: 'Large', scale: 1 },
  { label: 'Extra large', scale: 1.25 },
];

// Transparent windows on Windows often stop repainting with GPU compositing.
app.disableHardwareAcceleration();
// Chromium pauses painting for windows it thinks are covered; a tiny always-on-top
// transparent window is often misjudged, which freezes the pet mid-animation.
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win = null;
let settingsWin = null;

// ---------- settings ----------
const DEFAULTS = {
  ownerName: '',
  petName: 'Giggles',
  species: 'cat',
  scale: 1,
  sound: true,
  volume: 0.7,
  notifications: false,
  roam: false,
  media: true,
  tipsEvery: 30,
  startWithWindows: false,
  position: null,
  stats: { date: '', today: 0, total: 0 },
  equipped: { head: '', face: '', neck: '', body: '', prop: '' },
  collected: [],
  teamFolder: '',
  teamMode: '', // '' | 'cloud' (Supabase) | 'folder'
  cloudUrl: '',
  cloudKey: '',
  teamCode: '',
  badges: [],
  memberId: '',
  hooksWanted: true,
  loginItemInit: false,
  updateSource: '',
  autoUpdate: true,
  codeHelper: true,
  vaultAutoLock: 'manual', // 'manual' | 'winlock' | '5' | '15' | '60'
  vaultHints: true, // show saved logins when their site is open in Chrome/Edge
  weatherCity: '', // e.g. "Jaipur"; empty = no weather
  dayNight: true, // moon & stars at night, chai in the morning
  achStats: {}, // counters for achievements (see renderer/achievements.js)
};
const VAULT_LOCK_OPTIONS = ['manual', 'winlock', '5', '15', '60'];
const EDITABLE = ['ownerName', 'petName', 'species', 'scale', 'sound', 'volume', 'notifications', 'roam', 'media', 'tipsEvery', 'startWithWindows', 'teamFolder', 'updateSource', 'autoUpdate', 'codeHelper', 'vaultAutoLock', 'vaultHints',
  'teamMode', 'cloudUrl', 'cloudKey', 'teamCode', 'weatherCity', 'dayNight'];
const PUBLIC_KEYS = ['ownerName', 'petName', 'species', 'equipped', 'teamFolder', 'teamMode', 'teamCode'];
const LONG_TEXT = { teamFolder: 500, updateSource: 500, cloudUrl: 300, cloudKey: 2000, teamCode: 120, weatherCity: 80 };

let settings = { ...DEFAULTS };
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  let raw = null;
  try {
    raw = fs.readFileSync(settingsFile(), 'utf8');
  } catch {
    // first run
  }
  try {
    settings = { ...DEFAULTS, ...(raw ? JSON.parse(raw.replace(/^﻿/, '')) : {}) };
  } catch {
    // Unreadable file: keep a copy instead of silently losing the user's pet.
    try { fs.copyFileSync(settingsFile(), `${settingsFile()}.broken-${Date.now()}`); } catch { /* ignore */ }
    settings = { ...DEFAULTS };
  }
  settings.stats = { ...DEFAULTS.stats, ...settings.stats };
  settings.equipped = { ...DEFAULTS.equipped, ...settings.equipped };
  settings.collected = Array.isArray(settings.collected) ? settings.collected : [];
  settings.badges = Array.isArray(settings.badges) ? settings.badges : [];
  if (!settings.teamMode && settings.teamFolder) settings.teamMode = 'folder'; // pre-3.7 shared-folder teams
  // An update we tried to install is now running: forget the attempt.
  if (settings.updateAttempt && updater.compare(app.getVersion(), settings.updateAttempt.version) >= 0) {
    delete settings.updateAttempt;
  }
  if (!settings.memberId) {
    settings.memberId = require('crypto').randomUUID();
    saveSettings();
  }
}

let saveTimer = null;
function saveSettings(now) {
  clearTimeout(saveTimer);
  const write = () => {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
  };
  if (now) write();
  else saveTimer = setTimeout(write, 300);
}

function sanitize(patch) {
  const out = {};
  for (const key of EDITABLE) {
    if (!(key in patch)) continue;
    let v = patch[key];
    if (typeof DEFAULTS[key] === 'boolean') v = !!v;
    else if (typeof DEFAULTS[key] === 'number') v = Number(v) || 0;
    else v = String(v).trim().slice(0, LONG_TEXT[key] || 40);
    out[key] = v;
  }
  if (patch.equipped && typeof patch.equipped === 'object') {
    const eq = { ...settings.equipped };
    for (const slot of Object.keys(DEFAULTS.equipped)) {
      if (!(slot in patch.equipped)) continue;
      const id = patch.equipped[slot];
      const item = ACCESSORIES.find((a) => a.id === id && a.slot === slot);
      if (!id) eq[slot] = '';
      else if (item && isUnlocked(item, settings.stats.total, settings.collected)) eq[slot] = id;
    }
    out.equipped = eq;
  }
  if ('vaultAutoLock' in out && !VAULT_LOCK_OPTIONS.includes(out.vaultAutoLock)) delete out.vaultAutoLock;
  if ('scale' in out) out.scale = Math.min(1.5, Math.max(0.45, out.scale));
  if ('volume' in out) out.volume = Math.min(1, Math.max(0, out.volume));
  if ('species' in out && !SPECIES.some((s) => s.id === out.species)) delete out.species;
  if ('petName' in out && !out.petName.trim()) out.petName = DEFAULTS.petName;
  return out;
}

function updateSettings(patch) {
  const clean = sanitize(patch);
  const prev = { ...settings };
  settings = { ...settings, ...clean };
  if (settings.scale !== prev.scale) applyScale();
  if (settings.startWithWindows !== prev.startWithWindows) applyLoginItem();
  if (settings.media !== prev.media || settings.codeHelper !== prev.codeHelper) {
    settings.media || settings.codeHelper ? startMonitor() : stopMonitor();
  }
  if (settings.vaultHints !== prev.vaultHints) restartMonitorForUrl();
  if (settings.vaultAutoLock !== prev.vaultAutoLock) touchVault();
  if (settings.weatherCity !== prev.weatherCity) refreshWeather();
  saveSettings();
  broadcast('settings', clean);
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('settings', settings);
  if (PUBLIC_KEYS.some((k) => k in clean)) publishTeam();
}

function broadcast(channel, data) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}

function bumpStats(project = '') {
  const now = new Date();
  const today = now.toLocaleDateString('en-CA');
  if (settings.stats.date !== today) settings.stats = { ...settings.stats, date: today, today: 0 };
  settings.stats.today += 1;
  settings.stats.total += 1;

  // Counters for achievements.
  const a = { ...settings.achStats };
  const yesterday = new Date(now.getTime() - 864e5).toLocaleDateString('en-CA');
  if (a.lastDay !== today) a.streak = a.lastDay === yesterday ? (a.streak || 0) + 1 : 1;
  a.lastDay = today;
  a.bestDay = Math.max(a.bestDay || 0, settings.stats.today);
  const h = now.getHours();
  if (h >= 22 || h < 5) a.night = (a.night || 0) + 1;
  if (h >= 5 && h < 8) a.early = (a.early || 0) + 1;
  if (now.getDay() === 0 || now.getDay() === 6) a.weekend = (a.weekend || 0) + 1;
  if (a.projDay !== today) { a.projDay = today; a.projects = []; }
  if (project && !a.projects.includes(project)) a.projects = [...a.projects, project].slice(-20);
  settings.achStats = a;
  checkAchievements();

  // Wardrobe unlocks: auto-wear the new item.
  const unlocked = ACCESSORIES.find((a) => !a.festival && a.unlock === settings.stats.total);
  if (unlocked) {
    settings.equipped = { ...settings.equipped, [unlocked.slot]: unlocked.id };
    broadcast('settings', { equipped: settings.equipped });
    broadcast('pet-event', { state: 'unlock', detail: `${unlocked.emoji} ${unlocked.name}` });
  }

  saveSettings();
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('settings', settings);
  publishTeam();
  checkRank();
  return settings.stats.today;
}

// ---------- weather (Open-Meteo, city from Settings) ----------
let weatherGeo = null; // { city, lat, lon, place }
let lastWeather = null;

async function refreshWeather() {
  const city = (settings.weatherCity || '').trim();
  if (!city) {
    lastWeather = null;
    broadcast('weather', null);
    return { ok: true, weather: null };
  }
  try {
    if (!weatherGeo || weatherGeo.city !== city.toLowerCase()) {
      weatherGeo = { city: city.toLowerCase(), ...(await weather.geocode(city)) };
    }
    lastWeather = await weather.current(weatherGeo);
    broadcast('weather', lastWeather);
    return { ok: true, weather: lastWeather };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
ipcMain.handle('weather:refresh', () => refreshWeather());
ipcMain.handle('weather:get', () => lastWeather);

// ---------- achievements ----------
function checkAchievements() {
  const ctx = ACH.context(settings.stats, settings.achStats, settings.collected);
  const fresh = ACH.unlocked(ctx).filter((id) => !settings.badges.includes(id));
  if (!fresh.length) return;
  settings.badges = [...settings.badges, ...fresh];
  saveSettings();
  broadcast('settings', { badges: settings.badges });
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('settings', settings);
  const list = fresh.map((id) => ACH.ACHIEVEMENTS.find((x) => x.id === id));
  // Celebrate one at a time, after any "done" party.
  list.forEach((b, i) => setTimeout(() => broadcast('pet-event', { state: 'badge', detail: `${b.emoji} ${b.name}`, sub: b.desc }), 5200 + i * 6000));
  publishTeam();
}

// Fun counters reported by the pet window (slingshot, snacks, pats, code checks).
const FUN_STATS = ['flings', 'snacks', 'pats', 'codeChecks'];
ipcMain.on('stat', (_e, key) => {
  if (!FUN_STATS.includes(key)) return;
  settings.achStats = { ...settings.achStats, [key]: (settings.achStats[key] || 0) + 1 };
  saveSettings();
  checkAchievements();
});

// ---------- festivals ----------
// While a festival is on, the pet collects its outfit for good and wears it.
function checkFestival() {
  const fest = activeFestival();
  if (!fest) return;
  const items = ACCESSORIES.filter((a) => a.festival === fest.id);
  const fresh = items.filter((a) => !settings.collected.includes(a.id));
  if (!fresh.length) return;
  settings.collected = [...settings.collected, ...fresh.map((a) => a.id)];
  const eq = { ...settings.equipped };
  for (const a of items) eq[a.slot] = a.id;
  settings.equipped = eq;
  saveSettings();
  broadcast('settings', { equipped: eq, collected: settings.collected });
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('settings', settings);
  publishTeam();
  checkAchievements();
  const owner = settings.ownerName || 'friend';
  setTimeout(() => broadcast('pet-event', {
    state: 'festival',
    detail: `${fest.greet}, ${owner}! ${fest.emoji}`,
    sub: `🎁 Collected: ${fresh.map((a) => `${a.emoji} ${a.name}`).join(' + ')}`,
  }), 4000);
}

// ---------- auto-update ----------
let pendingUpdate = null; // { version, file, notes }
let updateState = { status: 'idle' };
let lastHookEvent = Date.now();
let installing = false;

// Custom source from Settings, else the GitHub releases of this repo (package.json "updateUrl").
const DEFAULT_UPDATE_URL = require('./package.json').updateUrl || '';
function updateSource() {
  return settings.updateSource || DEFAULT_UPDATE_URL;
}

function setUpdateState(s) {
  updateState = { ...s, current: app.getVersion(), source: updateSource() };
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('update-state', updateState);
  return updateState;
}

async function checkForUpdates() {
  const source = updateSource();
  if (!source) return setUpdateState({ status: 'no-source' });
  setUpdateState({ status: 'checking' });
  try {
    const { manifest, newer } = await updater.check(source, app.getVersion());
    if (!newer) return setUpdateState({ status: 'latest' });
    if (!app.isPackaged) return setUpdateState({ status: 'dev', version: manifest.version });
    if (updateKeepsFailing(manifest.version)) {
      return setUpdateState({ status: 'failed', version: manifest.version, download: manualDownloadUrl() });
    }
    if (!pendingUpdate || pendingUpdate.version !== manifest.version) {
      setUpdateState({ status: 'downloading', version: manifest.version });
      const file = await updater.fetchInstaller(source, manifest);
      pendingUpdate = { version: manifest.version, file, notes: manifest.notes || '' };
      broadcast('pet-event', { state: 'update', detail: manifest.version });
    }
    return setUpdateState({ status: 'ready', version: pendingUpdate.version, notes: pendingUpdate.notes });
  } catch (err) {
    return setUpdateState({ status: 'error', error: err.message });
  }
}

// Remember install attempts so a broken update can't loop (restart → retry → restart…).
function updateKeepsFailing(version) {
  const a = settings.updateAttempt;
  return !!a && a.version === version && a.count >= 2;
}

function recordUpdateAttempt(version) {
  const a = settings.updateAttempt && settings.updateAttempt.version === version ? settings.updateAttempt : { version, count: 0 };
  settings.updateAttempt = { version, count: a.count + 1, at: Date.now() };
  saveSettings(true); // we're about to quit
}

function manualDownloadUrl() {
  const src = updateSource();
  return updater.isUrl(src) ? `${src.replace(/\/?$/, '/')}Giggles-Pet-Setup.exe` : src;
}

function installUpdate() {
  if (!pendingUpdate || installing) return false;
  installing = true;
  recordUpdateAttempt(pendingUpdate.version);
  broadcast('pet-event', { state: 'updating', detail: pendingUpdate.version });
  setTimeout(() => {
    try {
      updater.runInstaller(pendingUpdate.file, true);
    } catch (err) {
      installing = false;
      setUpdateState({ status: 'error', error: `couldn't start the installer: ${err.message}` });
      return;
    }
    app.quit();
  }, 2500);
  return true;
}

// Auto-install once Claude has been quiet for a few minutes.
setInterval(() => {
  if (pendingUpdate && settings.autoUpdate && !installing && !updateKeepsFailing(pendingUpdate.version)
    && Date.now() - lastHookEvent > 3 * 60 * 1000) installUpdate();
}, 30 * 1000);

// ---------- team leaderboard (Supabase cloud or a shared folder) ----------
const TEAM_CLOUD_DEFAULTS = require('./package.json').teamCloud || {};
let lastTeamError = '';

function teamBackend() {
  if (settings.teamMode === 'cloud') {
    const cfg = {
      url: settings.cloudUrl || TEAM_CLOUD_DEFAULTS.url,
      key: settings.cloudKey || TEAM_CLOUD_DEFAULTS.key,
      code: settings.teamCode,
    };
    return cfg.url && cfg.key && cfg.code ? { kind: 'cloud', cfg } : null;
  }
  if (settings.teamMode === 'folder' && settings.teamFolder) return { kind: 'folder', folder: settings.teamFolder };
  return null;
}

function teamMember() {
  return {
    id: settings.memberId,
    ownerName: settings.ownerName || 'Anonymous',
    petName: settings.petName,
    species: settings.species,
    equipped: settings.equipped,
    badges: settings.badges || [],
    date: settings.stats.date,
    today: settings.stats.today,
    total: settings.stats.total,
  };
}

async function publishTeam() {
  const be = teamBackend();
  if (!be) return;
  try {
    if (be.kind === 'cloud') await teamcloud.publish(be.cfg, teamMember());
    else team.publish(be.folder, teamMember());
    lastTeamError = '';
  } catch (err) {
    lastTeamError = err.message;
  }
}

async function readBoard() {
  const be = teamBackend();
  if (!be) return [];
  if (be.kind === 'cloud') return teamcloud.read(be.cfg);
  return team.read(be.folder);
}

let lastRank = null;
// Fun nudges: tell the owner when they take #1 today, or when someone passes them.
async function checkRank() {
  let board;
  try {
    board = (await readBoard()).filter((m) => m.today > 0);
  } catch {
    return;
  }
  const idx = board.findIndex((m) => m.id === settings.memberId);
  if (idx < 0 || board.length < 2) return;
  const rank = idx + 1;
  const owner = settings.ownerName || 'friend';
  if (rank === 1 && lastRank !== 1) {
    broadcast('pet-event', { state: 'rank', detail: `🏆 You're #1 on the team today, ${owner}!` });
  } else if (lastRank !== null && rank > lastRank) {
    const passer = board[idx - 1];
    broadcast('pet-event', { state: 'rank', detail: `😮 ${passer.ownerName} just passed you! (${passer.today} vs ${board[idx].today})` });
  }
  lastRank = rank;
}

function applyLoginItem() {
  app.setLoginItemSettings({
    openAtLogin: settings.startWithWindows,
    path: process.execPath,
    args: app.isPackaged ? [] : [path.resolve(__dirname)],
  });
}

// ---------- pet window ----------
function petSize(scale) {
  return { w: Math.round(Math.max(270, 300 * scale)), h: Math.round(150 + 200 * scale) };
}

function onSomeDisplay(x, y) {
  return screen.getAllDisplays().some(({ workArea: a }) => x >= a.x - 50 && y >= a.y - 50 && x < a.x + a.width && y < a.y + a.height);
}

function createPetWindow() {
  const { w, h } = petSize(settings.scale);
  const { workArea } = screen.getPrimaryDisplay();
  let x = workArea.x + workArea.width - w - 20;
  let y = workArea.y + workArea.height - h;
  if (settings.position && onSomeDisplay(settings.position.x, settings.position.y)) {
    ({ x, y } = settings.position);
  }

  win = new BrowserWindow({
    width: w,
    height: h,
    x,
    y,
    transparent: true,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    icon: ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true);
  // Transparent areas pass clicks through; the renderer turns this off while hovering the pet.
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.env.GIGGLES_DEBUG) {
    win.webContents.on('console-message', (e) => console.log('[pet]', e.message));
  }
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('[pet] renderer gone:', details.reason);
    setTimeout(() => win && !win.isDestroyed() && win.reload(), 500);
  });
}

// Resize around the pet's feet so it doesn't jump around on screen.
function applyScale() {
  if (!win) return;
  const b = win.getBounds();
  const { w, h } = petSize(settings.scale);
  win.setBounds({ x: Math.round(b.x + (b.width - w) / 2), y: b.y + b.height - h, width: w, height: h });
  ensureOnScreen();
  savePosition();
}

// Keep the whole pet inside the work area of the monitor it's on (it may peek a little past
// the sides), so a resolution / scaling / monitor change can't leave it under the taskbar.
function ensureOnScreen() {
  if (!win || win.isDestroyed() || dragTimer || flyTimer || walkTimer) return;
  const b = win.getBounds();
  const wa = screen.getDisplayMatching(b).workArea;
  const { w, h } = petSize(settings.scale);
  const x = Math.round(Math.min(Math.max(b.x, wa.x - w * 0.25), wa.x + wa.width - w * 0.75));
  const y = Math.round(Math.min(Math.max(b.y, wa.y - h * 0.3), wa.y + wa.height - h));
  if (x !== b.x || y !== b.y || b.width !== w || b.height !== h) {
    win.setBounds({ x, y, width: w, height: h });
    savePosition();
  }
}

let screenFixTimer = null;
function scheduleEnsureOnScreen() {
  clearTimeout(screenFixTimer);
  screenFixTimer = setTimeout(ensureOnScreen, 600); // let Windows finish re-laying out displays
}

function savePosition() {
  if (!win) return;
  const [x, y] = win.getPosition();
  settings.position = { x, y };
  saveSettings();
}

function openSettings(tab) {
  tab = typeof tab === 'string' ? tab : '';
  if (settingsWin && !settingsWin.isDestroyed()) {
    if (tab) settingsWin.webContents.send('open-tab', tab);
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 620,
    height: 820,
    minWidth: 480,
    minHeight: 560,
    title: `${settings.petName} · Settings`,
    icon: ICON,
    autoHideMenuBar: true,
    backgroundColor: '#f4f7fc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWin.loadFile(path.join(__dirname, 'renderer', 'settings.html'), { hash: tab });
  settingsWin.on('closed', () => (settingsWin = null));
}

// ---------- notifications ----------
function notify(title, body) {
  if (!settings.notifications || !Notification.isSupported()) return;
  new Notification({ title, body, icon: ICON, silent: true }).show();
}

// ---------- Claude Code hook events ----------
function handleHookEvent(evt) {
  const name = evt.hook_event_name || evt.event || '';
  const project = evt.cwd ? path.basename(evt.cwd) : '';
  const session = evt.session_id || 'default';
  const pet = settings.petName;
  if (evt.session_id) lastHookEvent = Date.now();

  switch (name) {
    case 'SessionStart':
      broadcast('pet-event', { state: 'hello', project, session });
      break;
    case 'UserPromptSubmit':
      broadcast('pet-event', { state: 'working', project, session, detail: 'Thinking…' });
      break;
    case 'PreToolUse':
      broadcast('pet-event', { state: 'working', project, session, detail: describeTool(evt.tool_name) });
      break;
    case 'Stop': {
      const count = bumpStats(project);
      broadcast('pet-event', { state: 'done', project, session, count });
      notify(`${pet} 🎉`, project ? `Claude finished in ${project}!` : 'Claude finished the task!');
      break;
    }
    case 'Notification':
      broadcast('pet-event', { state: 'attention', project, session, detail: evt.message || 'Claude needs you!' });
      notify(`${pet} 👋`, evt.message || 'Claude needs your attention');
      break;
    case 'SessionEnd':
      broadcast('pet-event', { state: 'bye', project, session });
      break;
    case 'settings':
      openSettings();
      break;
    case 'restart':
      restartPet();
      break;
    case 'vault':
      openVault();
      break;
    case 'site-test': // debug builds only: simulate the browser being on a URL
      if (process.env.GIGGLES_DEBUG) matchVaultSite(evt.detail);
      break;
    default:
      // manual / test states (scripts/send.js)
      if (['done', 'working', 'attention', 'hello', 'sleep', 'snack', 'dance', 'joke', 'tip', 'quote', 'codetest', 'music', 'call', 'preview', 'festival'].includes(name)) {
        broadcast('pet-event', { state: name, project, session, detail: evt.detail, sub: evt.sub });
      }
  }
}

function describeTool(tool) {
  if (!tool) return 'Working…';
  const map = {
    Bash: 'Running a command…',
    PowerShell: 'Running a command…',
    Edit: 'Editing code…',
    MultiEdit: 'Editing code…',
    Write: 'Writing a file…',
    Read: 'Reading files…',
    Grep: 'Searching…',
    Glob: 'Looking for files…',
    WebFetch: 'Browsing the web…',
    WebSearch: 'Searching the web…',
    Agent: 'Calling helpers…',
    Task: 'Calling helpers…',
    TodoWrite: 'Making a plan…',
  };
  if (map[tool]) return map[tool];
  if (tool.startsWith('mcp__')) return 'Using a tool…';
  return `Using ${tool}…`;
}

function startServer() {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/ping') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('giggles');
    }
    if (req.method !== 'POST' || req.url !== '/event') {
      res.writeHead(404);
      return res.end();
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        handleHookEvent(JSON.parse(body || '{}'));
        res.writeHead(204);
      } catch {
        res.writeHead(400);
      }
      res.end();
    });
  });
  server.on('error', (err) => console.error('[pet] server error:', err.message));
  server.listen(PORT, '127.0.0.1');
}

// ---------- system monitor (music, mic, foreground app) ----------
let monitor = null;
let monitorRestart = null;

// Code editors / SQL tools where the pet reviews what you copy.
const CODE_APPS = ['ssms', 'devenv', 'azuredatastudio', 'code', 'dbeaver', 'datagrip64', 'rider64'];
let lastClip = null;

function watchClipboard(proc) {
  if (!settings.codeHelper || !CODE_APPS.includes(proc)) return;
  let text = '';
  try {
    text = clipboard.readText();
  } catch {
    return;
  }
  if (lastClip === null) lastClip = text; // ignore whatever was copied before we started watching
  if (!text || text === lastClip) return;
  lastClip = text;
  if (text.length >= 12 && text.length <= 20000) broadcast('code-clip', { text, app: proc });
}

// The browser address bar is only read while the vault is unlocked (to show saved logins).
const urlWanted = () => !!(vault && vault.isUnlocked() && settings.vaultHints);
const needMonitor = () => settings.media || settings.codeHelper || urlWanted();
let monitorWantsUrl = false;

function restartMonitorForUrl() {
  if (monitor && monitorWantsUrl === urlWanted()) return;
  stopMonitor();
  startMonitor();
  if (!urlWanted()) broadcast('vault-match', { items: [] });
}

function startMonitor() {
  if (process.platform !== 'win32' || monitor || !needMonitor()) return;
  lastClip = null;
  // PowerShell can't read inside app.asar, so the script is unpacked next to it.
  const script = path.join(__dirname, 'system', 'monitor.ps1').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
  monitorWantsUrl = urlWanted();
  monitor = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], {
    windowsHide: true,
    env: { ...process.env, GIGGLES_WANT_URL: monitorWantsUrl ? '1' : '0' },
  });
  readline.createInterface({ input: monitor.stdout }).on('line', (line) => {
    let data;
    try {
      data = JSON.parse(line);
    } catch {
      return; // partial line
    }
    const { url, ...rest } = data;
    broadcast('system', rest); // the URL itself never goes to the pet window
    const proc = String(data.fgProc || '').toLowerCase();
    watchClipboard(proc);
    // Clicking the pet's Copy buttons makes the pet the foreground app; keep the bubble.
    if (proc !== OWN_PROCESS) matchVaultSite(url);
  });
  const me = monitor;
  monitor.on('exit', () => {
    if (monitor !== me) return; // an older monitor we replaced on purpose
    monitor = null;
    if (needMonitor() && !app.isQuitting) {
      clearTimeout(monitorRestart);
      monitorRestart = setTimeout(startMonitor, 5000);
    }
  });
}

function stopMonitor() {
  clearTimeout(monitorRestart);
  if (monitor) {
    const m = monitor;
    monitor = null; // set first so the exit handler doesn't auto-restart it
    m.kill();
  }
}

// ---------- saved logins for the open site ----------
function hostOf(u) {
  const s = String(u || '').trim();
  if (!s || /\s/.test(s)) return '';
  try {
    return new URL(/^[a-z][\w+.-]*:\/\//i.test(s) ? s : `http://${s}`).host.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

let lastSiteHost = '';
const OWN_PROCESS = path.parse(process.execPath).name.toLowerCase(); // "electron" or "giggles pet"
function matchVaultSite(url) {
  const host = urlWanted() ? hostOf(url) : '';
  if (host === lastSiteHost) return;
  lastSiteHost = host;
  if (!host) return broadcast('vault-match', { items: [] });
  // same host, or a subdomain of the saved host (saved "cyborgerp.com" matches "workhub.cyborgerp.com")
  const items = getVault().entriesForHost((saved) => host === saved || host.endsWith(`.${saved}`), hostOf);
  broadcast('vault-match', { host, items });
}

// ---------- walking ----------
let walkTimer = null;

function stopWalk() {
  if (!walkTimer) return;
  clearInterval(walkTimer);
  walkTimer = null;
  savePosition();
}

ipcMain.on('walk', (_e, dx) => {
  if (!win) return;
  stopWalk();
  const b = win.getBounds();
  const { workArea } = screen.getDisplayMatching(b);
  const target = Math.round(Math.min(workArea.x + workArea.width - b.width * 0.8, Math.max(workArea.x - b.width * 0.2, b.x + dx)));
  const dir = Math.sign(target - b.x);
  if (!dir) return broadcast('walk-done');
  walkTimer = setInterval(() => {
    const [x, y] = win.getPosition();
    let nx = x + dir * 2;
    const arrived = dir > 0 ? nx >= target : nx <= target;
    if (arrived) nx = target;
    win.setPosition(nx, y);
    if (arrived) {
      stopWalk();
      broadcast('walk-done');
    }
  }, 16);
});
ipcMain.on('walk-stop', stopWalk);

// ---------- slingshot flight (across all monitors) ----------
let flyTimer = null;

// The work area under x (stacked monitors: the one at this height, else the next one down).
function areaAt(areas, x, y) {
  const col = areas.filter((a) => x >= a.x && x < a.x + a.width);
  if (!col.length) {
    // in a gap between monitors: use the horizontally nearest one
    return areas.reduce((best, a) => {
      const d = Math.min(Math.abs(x - a.x), Math.abs(x - (a.x + a.width)));
      return !best || d < best.d ? { a, d } : best;
    }, null).a;
  }
  return col.find((a) => y >= a.y && y < a.y + a.height)
    || col.filter((a) => a.y >= y).sort((p, q) => p.y - q.y)[0]
    || col[col.length - 1];
}

ipcMain.on('fling', (_e, { vx, vy }) => {
  if (!win) return;
  stopWalk();
  clearInterval(flyTimer);
  win.setIgnoreMouseEvents(true, { forward: true });

  const areas = screen.getAllDisplays().map((d) => d.workArea);
  const [w, h] = win.getSize();
  const minX = Math.min(...areas.map((a) => a.x)) - w * 0.2;
  const maxX = Math.max(...areas.map((a) => a.x + a.width)) - w * 0.8;
  const minY = Math.min(...areas.map((a) => a.y)) - h * 0.35;
  const G = 1.1;
  let [x, y] = win.getPosition();
  vx = Math.max(-80, Math.min(80, Number(vx) || 0));
  vy = Math.max(-80, Math.min(80, Number(vy) || 0));
  const startArea = areaAt(areas, x + w / 2, y + h / 2);
  let bounces = 0;
  let frames = 0;

  flyTimer = setInterval(() => {
    frames++;
    vy += G;
    x += vx;
    y += vy;

    if (x < minX) { x = minX; vx = -vx * 0.6; bounces++; broadcast('fly-bounce'); }
    if (x > maxX) { x = maxX; vx = -vx * 0.6; bounces++; broadcast('fly-bounce'); }
    if (y < minY) { y = minY; vy = Math.abs(vy) * 0.4; }

    const area = areaAt(areas, x + w / 2, y + h * 0.5);
    const floor = area.y + area.height - h;
    let grounded = false;
    if (y >= floor) {
      y = floor;
      if (vy > 7) {
        vy = -vy * 0.5;
        bounces++;
        broadcast('fly-bounce');
      } else {
        vy = 0;
        grounded = true;
      }
      vx *= 0.82; // ground friction
    }

    win.setPosition(Math.round(x), Math.round(y));

    if ((grounded && Math.abs(vx) < 0.6) || frames > 900) {
      clearInterval(flyTimer);
      flyTimer = null;
      // Settle exactly on the landing monitor's floor, fully on screen
      // (monitors with different scaling can leave the pet floating otherwise).
      // Crossing monitors with different scaling also distorts the window size, so restore it too.
      const b = win.getBounds();
      const wa = screen.getDisplayMatching(b).workArea;
      const size = petSize(settings.scale);
      const target = {
        x: Math.round(Math.min(Math.max(b.x, wa.x), wa.x + wa.width - size.w)),
        y: Math.round(wa.y + wa.height - size.h),
        width: size.w,
        height: size.h,
      };
      win.setBounds(target);
      win.setBounds(target); // second pass: Windows applies the new monitor's DPI after the first move
      savePosition();
      broadcast('fly-done', { bounces, crossed: area !== startArea && areas.length > 1 });
    }
  }, 16);
});

// ---------- IPC ----------
ipcMain.on('set-ignore-mouse', (_e, ignore) => {
  if (win) win.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.on('move-by', (_e, { dx, dy }) => {
  if (!win) return;
  if (flyTimer) {
    // caught mid-air
    clearInterval(flyTimer);
    flyTimer = null;
    broadcast('fly-done', {});
  }
  const [x, y] = win.getPosition();
  win.setPosition(Math.round(x + dx), Math.round(y + dy));
});
// Drag follows the real cursor position (no accumulated deltas), so the pet
// stays glued under the mouse even on scaled / mixed-DPI monitors.
let dragTimer = null;
ipcMain.on('drag-start', () => {
  if (!win) return;
  stopWalk();
  if (flyTimer) {
    // caught mid-air
    clearInterval(flyTimer);
    flyTimer = null;
    broadcast('fly-done', {});
  }
  const c = screen.getCursorScreenPoint();
  const b = win.getBounds();
  const size = petSize(settings.scale);
  const offset = { dx: c.x - b.x, dy: c.y - b.y };
  clearInterval(dragTimer);
  dragTimer = setInterval(() => {
    const p = screen.getCursorScreenPoint();
    const x = p.x - offset.dx;
    const y = p.y - offset.dy;
    const cur = win.getBounds();
    if (cur.x !== x || cur.y !== y || cur.width !== size.w || cur.height !== size.h) {
      win.setBounds({ x, y, width: size.w, height: size.h });
    }
  }, 8);
});
ipcMain.on('drag-end', () => {
  clearInterval(dragTimer);
  dragTimer = null;
  ensureOnScreen(); // dropped below the taskbar or off the edge? pop back into view
  savePosition();
});

ipcMain.handle('settings:get', () => settings);
ipcMain.handle('settings:set', (_e, patch) => {
  updateSettings(patch || {});
  return settings;
});
ipcMain.handle('hooks:status', () => hooks.status(HOOK_COMMAND));
ipcMain.handle('hooks:install', () => {
  settings.hooksWanted = true;
  saveSettings();
  return hooks.install(HOOK_COMMAND);
});
ipcMain.handle('hooks:remove', () => {
  settings.hooksWanted = false;
  saveSettings();
  return hooks.remove(HOOK_COMMAND);
});

ipcMain.handle('update:state', () => setUpdateState(updateState));
ipcMain.handle('update:check', () => checkForUpdates());
ipcMain.handle('update:install', () => installUpdate());
ipcMain.handle('update:pick', async () => {
  const res = await dialog.showOpenDialog(settingsWin || win, {
    title: 'Folder where new pet versions are published',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (!res.canceled && res.filePaths[0]) updateSettings({ updateSource: res.filePaths[0] });
  return setUpdateState(updateState);
});
// Dev checkout only: bump version, build installer and publish it to the update folder.
ipcMain.handle('update:publish', (_e, { level = 'patch', notes = '' } = {}) => new Promise((resolve, reject) => {
  // A custom folder source publishes there; otherwise tag + push and GitHub builds the release.
  const source = updateSource();
  const folderArgs = source && !updater.isUrl(source) ? ['--folder', source] : [];
  const child = spawn('node', [path.join(__dirname, 'scripts', 'release.js'), level === 'minor' ? 'minor' : 'patch', ...folderArgs, '--notes', String(notes).slice(0, 200)], {
    cwd: __dirname,
    windowsHide: true,
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  child.on('error', reject);
  child.on('exit', (code) => {
    const m = log.match(/Published (.+?)[.:]?\s*$/m);
    if (code === 0 && m) resolve(m[1]);
    else reject(new Error(log.split('\n').filter(Boolean).slice(-3).join(' ') || `exit code ${code}`));
  });
}));
ipcMain.handle('share:create', async () => {
  const file = await createSharePackage();
  shell.showItemInFolder(file);
  return file;
});
ipcMain.handle('app:info', () => ({ packaged: app.isPackaged, version: app.getVersion() }));

// Builds the Windows installer (dev checkout only).
ipcMain.handle('build:installer', () => new Promise((resolve, reject) => {
  const child = spawn('npm', ['run', 'dist'], { cwd: __dirname, shell: true, windowsHide: true });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  child.on('exit', (code) => {
    const distDir = path.join(__dirname, 'dist');
    const setup = fs.existsSync(distDir)
      && fs.readdirSync(distDir).filter((f) => /^Giggles-Pet-Setup.*\.exe$/.test(f)).map((f) => path.join(distDir, f))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    if (code === 0 && setup) {
      shell.showItemInFolder(setup);
      resolve(setup);
    } else {
      reject(new Error(log.split('\n').filter(Boolean).slice(-4).join(' ') || `exit code ${code}`));
    }
  });
}));

ipcMain.handle('team:get', async () => {
  const be = teamBackend();
  let members = [];
  let error = lastTeamError;
  if (be) {
    try {
      members = await readBoard();
      error = '';
    } catch (err) {
      error = err.message;
    }
  }
  return {
    mode: be ? be.kind : '',
    folder: settings.teamFolder,
    cloudUrl: settings.cloudUrl || TEAM_CLOUD_DEFAULTS.url || '',
    hasDefaultCloud: !!(TEAM_CLOUD_DEFAULTS.url && TEAM_CLOUD_DEFAULTS.key),
    me: settings.memberId,
    members,
    error,
  };
});
// Join the Supabase leaderboard: verifies the URL/key/code by publishing our row first.
ipcMain.handle('team:join-cloud', async (_e, { url, key, code } = {}) => {
  const cfg = {
    url: String(url || TEAM_CLOUD_DEFAULTS.url || '').trim(),
    key: String(key || TEAM_CLOUD_DEFAULTS.key || '').trim(),
    code: String(code || '').trim(),
  };
  try {
    await teamcloud.publish(cfg, teamMember());
  } catch (err) {
    return { ok: false, error: err.message };
  }
  updateSettings({ teamMode: 'cloud', cloudUrl: url || '', cloudKey: key || '', teamCode: cfg.code });
  return { ok: true };
});
ipcMain.handle('team:pick', async () => {
  const res = await dialog.showOpenDialog(settingsWin || win, {
    title: 'Choose a folder your whole team can access',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths[0]) return settings.teamFolder;
  updateSettings({ teamMode: 'folder', teamFolder: res.filePaths[0] });
  publishTeam();
  return settings.teamFolder;
});
ipcMain.handle('team:leave', () => {
  updateSettings({ teamMode: '', teamFolder: '', teamCode: '' });
  return '';
});
ipcMain.handle('team:open', () => settings.teamFolder && shell.openPath(team.dirOf(settings.teamFolder)));
ipcMain.on('pet:trigger', (_e, { state, detail }) => broadcast('pet-event', { state, detail, session: 'manual' }));
ipcMain.on('open-settings', openSettings);
ipcMain.on('open-vault', () => openVault());
// Only our own download links / release folder (never arbitrary URLs from a page).
ipcMain.on('open-external', (_e, url) => {
  const allowed = manualDownloadUrl();
  if (url && url === allowed) updater.isUrl(url) ? shell.openExternal(url) : shell.openPath(url);
});

ipcMain.on('context-menu', () => {
  const trigger = (state, detail) => () => broadcast('pet-event', { state, detail, session: 'manual' });
  const menu = Menu.buildFromTemplate([
    { label: `${settings.petName}${settings.ownerName ? ` · ${settings.ownerName}'s pet` : ''}`, enabled: false },
    { type: 'separator' },
    { label: 'Settings ⚙️', click: () => openSettings('pet') },
    { label: 'Wardrobe 👕', click: () => openSettings('wardrobe') },
    { label: 'Team leaderboard 🏆', click: () => openSettings('team') },
    { label: 'Password vault 🔐', click: openVault },
    {
      label: 'Size',
      submenu: SIZES.map((s) => ({
        label: s.label,
        type: 'radio',
        checked: Math.abs(settings.scale - s.scale) < 0.01,
        click: () => updateSettings({ scale: s.scale }),
      })),
    },
    {
      label: 'Change pet',
      submenu: SPECIES.map((s) => ({
        label: s.name,
        type: 'radio',
        checked: settings.species === s.id,
        click: () => updateSettings({ species: s.id }),
      })),
    },
    {
      label: 'Have fun 🎈',
      submenu: [
        { label: 'Feed a snack 🍪', click: trigger('snack') },
        { label: 'Dance party 💃', click: trigger('dance') },
        { label: 'Tell me a joke 😂', click: trigger('joke') },
        { label: 'Give me a tip 💡', click: trigger('tip') },
        { label: 'Motivate me 💪', click: trigger('quote') },
        { label: 'Celebrate 🎉', click: trigger('done') },
        { label: 'Nap time 😴', click: trigger('sleep') },
      ],
    },
    { type: 'separator' },
    { label: 'Sound', type: 'checkbox', checked: settings.sound, click: (i) => updateSettings({ sound: i.checked }) },
    { label: 'Walk around', type: 'checkbox', checked: settings.roam, click: (i) => updateSettings({ roam: i.checked }) },
    { label: 'React to music & calls', type: 'checkbox', checked: settings.media, click: (i) => updateSettings({ media: i.checked }) },
    { type: 'separator' },
    { label: 'Restart pet 🔄', click: restartPet },
    { label: `Quit ${settings.petName}`, click: () => app.quit() },
  ]);
  menu.popup({ window: win });
});

// ---------- vault (encrypted passwords & notes, this PC only) ----------
let vault = null;
let vaultWin = null;
let vaultLockTimer = null;
let clipClearTimer = null;
const VAULT_IDLE_MS = 5 * 60 * 1000;

function getVault() {
  if (!vault) vault = new Vault(process.env.GIGGLES_VAULT_FILE || path.join(app.getPath('userData'), 'vault.json'));
  return vault;
}

// Idle auto-lock only if the user picked one; by default the vault stays open
// until the Lock button or the app/PC restarts (the key only lives in memory).
function touchVault() {
  clearTimeout(vaultLockTimer);
  const minutes = Number(settings.vaultAutoLock);
  if (getVault().isUnlocked() && minutes > 0) vaultLockTimer = setTimeout(lockVault, minutes * 60 * 1000);
}

function vaultChanged() {
  broadcast('vault-state', vaultStatus());
  restartMonitorForUrl();
}

function lockVault() {
  clearTimeout(vaultLockTimer);
  const wasUnlocked = getVault().isUnlocked();
  getVault().lock();
  if (vaultWin && !vaultWin.isDestroyed()) vaultWin.webContents.send('vault-locked');
  if (wasUnlocked && !app.isQuitting) vaultChanged();
}

function vaultStatus() {
  const v = getVault();
  return { exists: v.exists(), unlocked: v.isUnlocked() };
}

function openVault() {
  if (vaultWin && !vaultWin.isDestroyed()) {
    vaultWin.show();
    vaultWin.focus();
    return;
  }
  vaultWin = new BrowserWindow({
    width: 560,
    height: 720,
    minWidth: 420,
    minHeight: 520,
    title: 'Vault',
    icon: ICON,
    autoHideMenuBar: true,
    backgroundColor: '#0f1424',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  vaultWin.loadFile(path.join(__dirname, 'renderer', 'vault.html'));
  vaultWin.on('closed', () => {
    vaultWin = null; // stays unlocked; lock with the Lock button (or per the auto-lock setting)
  });
  broadcast('pet-event', { state: 'vault' });
}

// Wraps a vault action: refreshes the auto-lock timer and turns errors into { error }.
const vaultCall = (fn) => async (_e, ...args) => {
  try {
    const result = await fn(...args);
    touchVault();
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

ipcMain.handle('vault:status', () => vaultStatus());
ipcMain.on('vault:open-unlock', () => openVault());
ipcMain.handle('vault:create', vaultCall((pw) => { getVault().create(pw); vaultChanged(); return vaultStatus(); }));
ipcMain.handle('vault:unlock', vaultCall((pw) => { getVault().unlock(pw); vaultChanged(); return vaultStatus(); }));
ipcMain.handle('vault:lock', () => { lockVault(); return vaultStatus(); });
ipcMain.handle('vault:list', vaultCall(() => getVault().list()));
ipcMain.handle('vault:get', vaultCall((id) => getVault().get(id)));
// After edits, re-check the open site so a newly saved login shows up right away.
ipcMain.handle('vault:save', vaultCall((entry) => { const id = getVault().upsert(entry || {}); lastSiteHost = '\0'; return id; }));
ipcMain.handle('vault:delete', vaultCall((id) => { getVault().remove(id); lastSiteHost = '\0'; }));
ipcMain.handle('vault:change-master', vaultCall((oldPw, newPw) => getVault().changeMaster(oldPw, newPw)));
ipcMain.handle('vault:generate', (_e, len) => generatePassword(Math.min(64, Math.max(8, Number(len) || 18))));
// Copies a field to the clipboard and wipes it after 20s (if it's still there).
ipcMain.handle('vault:copy', vaultCall((id, field) => {
  const e = getVault().get(id);
  const value = String(e[field === 'username' ? 'username' : 'password'] || '');
  clipboard.writeText(value);
  lastClip = value; // the code helper must not review it
  clearTimeout(clipClearTimer);
  clipClearTimer = setTimeout(() => {
    if (clipboard.readText() === value) clipboard.writeText('');
  }, 20000);
  return true;
}));

// Relaunch with the same exe + args (installed app and source checkout alike).
// Release the single-instance lock first so the new process doesn't think we're still running.
function restartPet() {
  app.isQuitting = true;
  stopMonitor();
  saveSettings(true);
  app.releaseSingleInstanceLock();
  app.relaunch();
  app.exit(0);
}

// ---------- app lifecycle ----------
app.on('second-instance', () => broadcast('pet-event', { state: 'hello' }));

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('Giggles Pet');
  // Locking Windows (Win+L) or sleeping locks the vault too.
  const { powerMonitor } = require('electron');
  const lockOnWindowsLock = () => vault && settings.vaultAutoLock !== 'manual' && lockVault();
  powerMonitor.on('lock-screen', lockOnWindowsLock);
  powerMonitor.on('suspend', lockOnWindowsLock);
  loadSettings();
  // Installed app: start with Windows by default (first run), and keep the startup entry
  // pointing at the current exe so the pet comes back after reboots and updates.
  if (app.isPackaged) {
    if (!settings.loginItemInit) {
      settings.startWithWindows = true;
      settings.loginItemInit = true;
      saveSettings();
    }
    applyLoginItem();
  }

  // Installed app: stay connected to Claude Code unless the user disconnected on purpose
  // (also repairs the hooks if an update or another tool removed them).
  if (app.isPackaged && settings.hooksWanted && !hooks.status(HOOK_COMMAND).installed) {
    try {
      hooks.install(HOOK_COMMAND);
    } catch (err) {
      console.error('[pet] hook install failed:', err.message);
    }
  }
  createPetWindow();
  win.once('ready-to-show', ensureOnScreen);
  setTimeout(ensureOnScreen, 1500);
  // Resolution, scaling or monitor changes: bring the pet back into view.
  screen.on('display-metrics-changed', scheduleEnsureOnScreen);
  screen.on('display-added', scheduleEnsureOnScreen);
  screen.on('display-removed', scheduleEnsureOnScreen);
  setInterval(ensureOnScreen, 30 * 1000);
  startServer();
  startMonitor();
  if (!settings.ownerName) setTimeout(() => openSettings('pet'), 1500);
  // Keep our leaderboard entry fresh and notice when teammates pass us.
  publishTeam();
  setInterval(() => {
    publishTeam();
    checkRank();
  }, 2 * 60 * 1000);
  setTimeout(checkFestival, 6000);
  setTimeout(checkAchievements, 9000); // badges for work done before this version
  setTimeout(refreshWeather, 4000);
  setInterval(refreshWeather, 30 * 60 * 1000);
  setInterval(checkFestival, 60 * 60 * 1000);
  setTimeout(checkForUpdates, 20 * 1000);
  setInterval(checkForUpdates, 3 * 60 * 60 * 1000);
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (vault) lockVault();
  // Quitting with an update waiting: install it quietly (no relaunch).
  if (pendingUpdate && settings.autoUpdate && !installing && !updateKeepsFailing(pendingUpdate.version)) {
    installing = true;
    recordUpdateAttempt(pendingUpdate.version);
    try { updater.runInstaller(pendingUpdate.file, false); } catch { /* try again next time */ }
  }
  stopMonitor();
  saveSettings(true);
});

app.on('window-all-closed', () => app.quit());

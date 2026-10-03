// Giggles Pet — Cyborg ERP dev buddy. Developed by Jai Panwar.
// Main process: transparent pet window, settings window, local event server,
// system monitor (music / mic / foreground app) and persisted settings.

const { app, BrowserWindow, ipcMain, screen, Menu, Notification, nativeImage, dialog, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

const SPECIES = require('./renderer/species.js');
const { ACCESSORIES, activeFestival, isUnlocked } = require('./renderer/accessories.js');
const updater = require('./lib/updater.js');
const hooks = require('./scripts/install-hooks.js');
const { createSharePackage } = require('./scripts/share.js');
const team = require('./lib/team.js');

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
  memberId: '',
  hooksWanted: true,
  updateSource: '',
  autoUpdate: true,
};
const EDITABLE = ['ownerName', 'petName', 'species', 'scale', 'sound', 'volume', 'notifications', 'roam', 'media', 'tipsEvery', 'startWithWindows', 'teamFolder', 'updateSource', 'autoUpdate'];
const PUBLIC_KEYS = ['ownerName', 'petName', 'species', 'equipped', 'teamFolder'];

let settings = { ...DEFAULTS };
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch {
    settings = { ...DEFAULTS };
  }
  settings.stats = { ...DEFAULTS.stats, ...settings.stats };
  settings.equipped = { ...DEFAULTS.equipped, ...settings.equipped };
  settings.collected = Array.isArray(settings.collected) ? settings.collected : [];
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
    else v = String(v).trim().slice(0, ['teamFolder', 'updateSource'].includes(key) ? 500 : 40);
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
  if (settings.media !== prev.media) (settings.media ? startMonitor() : stopMonitor());
  saveSettings();
  broadcast('settings', clean);
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('settings', settings);
  if (PUBLIC_KEYS.some((k) => k in clean)) publishTeam();
}

function broadcast(channel, data) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}

function bumpStats() {
  const today = new Date().toLocaleDateString('en-CA');
  if (settings.stats.date !== today) settings.stats = { ...settings.stats, date: today, today: 0 };
  settings.stats.today += 1;
  settings.stats.total += 1;

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

function installUpdate() {
  if (!pendingUpdate || installing) return false;
  installing = true;
  broadcast('pet-event', { state: 'updating', detail: pendingUpdate.version });
  setTimeout(() => {
    updater.runInstaller(pendingUpdate.file, true);
    app.quit();
  }, 2500);
  return true;
}

// Auto-install once Claude has been quiet for a few minutes.
setInterval(() => {
  if (pendingUpdate && settings.autoUpdate && !installing && Date.now() - lastHookEvent > 3 * 60 * 1000) installUpdate();
}, 30 * 1000);

// ---------- team leaderboard (shared folder) ----------
function publishTeam() {
  if (!settings.teamFolder) return;
  team.publish(settings.teamFolder, {
    id: settings.memberId,
    ownerName: settings.ownerName || 'Anonymous',
    petName: settings.petName,
    species: settings.species,
    equipped: settings.equipped,
    date: settings.stats.date,
    today: settings.stats.today,
    total: settings.stats.total,
  });
}

let lastRank = null;
// Fun nudges: tell the owner when they take #1 today, or when someone passes them.
function checkRank() {
  if (!settings.teamFolder) return;
  const board = team.read(settings.teamFolder).filter((m) => m.today > 0);
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
  savePosition();
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
      const count = bumpStats();
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
    default:
      // manual / test states (scripts/send.js)
      if (['done', 'working', 'attention', 'hello', 'sleep', 'snack', 'dance', 'joke', 'tip', 'music', 'call', 'preview', 'festival'].includes(name)) {
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

function startMonitor() {
  if (process.platform !== 'win32' || monitor || !settings.media) return;
  // PowerShell can't read inside app.asar, so the script is unpacked next to it.
  const script = path.join(__dirname, 'system', 'monitor.ps1').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
  monitor = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], { windowsHide: true });
  readline.createInterface({ input: monitor.stdout }).on('line', (line) => {
    try {
      broadcast('system', JSON.parse(line));
    } catch {
      // ignore partial lines
    }
  });
  monitor.on('exit', () => {
    monitor = null;
    if (settings.media && !app.isQuitting) {
      clearTimeout(monitorRestart);
      monitorRestart = setTimeout(startMonitor, 5000);
    }
  });
}

function stopMonitor() {
  clearTimeout(monitorRestart);
  if (monitor) {
    monitor.kill();
    monitor = null;
  }
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

// ---------- IPC ----------
ipcMain.on('set-ignore-mouse', (_e, ignore) => {
  if (win) win.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.on('move-by', (_e, { dx, dy }) => {
  if (!win) return;
  const [x, y] = win.getPosition();
  win.setPosition(Math.round(x + dx), Math.round(y + dy));
});
ipcMain.on('drag-end', savePosition);

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

ipcMain.handle('team:get', () => ({
  folder: settings.teamFolder,
  me: settings.memberId,
  members: settings.teamFolder ? team.read(settings.teamFolder) : [],
}));
ipcMain.handle('team:pick', async () => {
  const res = await dialog.showOpenDialog(settingsWin || win, {
    title: 'Choose a folder your whole team can access',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths[0]) return settings.teamFolder;
  updateSettings({ teamFolder: res.filePaths[0] });
  publishTeam();
  return settings.teamFolder;
});
ipcMain.handle('team:leave', () => {
  updateSettings({ teamFolder: '' });
  return '';
});
ipcMain.handle('team:open', () => settings.teamFolder && shell.openPath(team.dirOf(settings.teamFolder)));
ipcMain.on('pet:trigger', (_e, { state, detail }) => broadcast('pet-event', { state, detail, session: 'manual' }));
ipcMain.on('open-settings', openSettings);

ipcMain.on('context-menu', () => {
  const trigger = (state, detail) => () => broadcast('pet-event', { state, detail, session: 'manual' });
  const menu = Menu.buildFromTemplate([
    { label: `${settings.petName}${settings.ownerName ? ` · ${settings.ownerName}'s pet` : ''}`, enabled: false },
    { type: 'separator' },
    { label: 'Settings ⚙️', click: () => openSettings('pet') },
    { label: 'Wardrobe 👕', click: () => openSettings('wardrobe') },
    { label: 'Team leaderboard 🏆', click: () => openSettings('team') },
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
        { label: 'Celebrate 🎉', click: trigger('done') },
        { label: 'Nap time 😴', click: trigger('sleep') },
      ],
    },
    { type: 'separator' },
    { label: 'Sound', type: 'checkbox', checked: settings.sound, click: (i) => updateSettings({ sound: i.checked }) },
    { label: 'Walk around', type: 'checkbox', checked: settings.roam, click: (i) => updateSettings({ roam: i.checked }) },
    { label: 'React to music & calls', type: 'checkbox', checked: settings.media, click: (i) => updateSettings({ media: i.checked }) },
    { type: 'separator' },
    { label: `Quit ${settings.petName}`, click: () => app.quit() },
  ]);
  menu.popup({ window: win });
});

// ---------- app lifecycle ----------
app.on('second-instance', () => broadcast('pet-event', { state: 'hello' }));

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('Giggles Pet');
  loadSettings();
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
  setInterval(checkFestival, 60 * 60 * 1000);
  setTimeout(checkForUpdates, 20 * 1000);
  setInterval(checkForUpdates, 3 * 60 * 60 * 1000);
});

app.on('before-quit', () => {
  app.isQuitting = true;
  // Quitting with an update waiting: install it quietly (no relaunch).
  if (pendingUpdate && settings.autoUpdate && !installing) {
    installing = true;
    updater.runInstaller(pendingUpdate.file, false);
  }
  stopMonitor();
  saveSettings(true);
});

app.on('window-all-closed', () => app.quit());

const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => ipcRenderer.on(channel, (_e, data) => cb(data));

contextBridge.exposeInMainWorld('pet', {
  // pet window
  onEvent: on('pet-event'),
  onSettings: on('settings'),
  onSystem: on('system'),
  onWalkDone: on('walk-done'),
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
  moveBy: (dx, dy) => ipcRenderer.send('move-by', { dx, dy }),
  dragEnd: () => ipcRenderer.send('drag-end'),
  walk: (dx) => ipcRenderer.send('walk', dx),
  walkStop: () => ipcRenderer.send('walk-stop'),
  fling: (vx, vy) => ipcRenderer.send('fling', { vx, vy }),
  onFlyBounce: on('fly-bounce'),
  onFlyDone: on('fly-done'),
  contextMenu: () => ipcRenderer.send('context-menu'),

  // shared / settings window
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  hooksStatus: () => ipcRenderer.invoke('hooks:status'),
  hooksInstall: () => ipcRenderer.invoke('hooks:install'),
  hooksRemove: () => ipcRenderer.invoke('hooks:remove'),
  createShare: () => ipcRenderer.invoke('share:create'),
  trigger: (state, detail) => ipcRenderer.send('pet:trigger', { state, detail }),
  openSettings: () => ipcRenderer.send('open-settings'),
  onOpenTab: on('open-tab'),
  appInfo: () => ipcRenderer.invoke('app:info'),
  buildInstaller: () => ipcRenderer.invoke('build:installer'),
  teamGet: () => ipcRenderer.invoke('team:get'),
  teamPick: () => ipcRenderer.invoke('team:pick'),
  teamLeave: () => ipcRenderer.invoke('team:leave'),
  teamOpen: () => ipcRenderer.invoke('team:open'),
  onUpdateState: on('update-state'),
  updateState: () => ipcRenderer.invoke('update:state'),
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateInstall: () => ipcRenderer.invoke('update:install'),
  updatePick: () => ipcRenderer.invoke('update:pick'),
  updatePublish: (opts) => ipcRenderer.invoke('update:publish', opts),
});

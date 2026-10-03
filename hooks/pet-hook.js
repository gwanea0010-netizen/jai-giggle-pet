#!/usr/bin/env node
// Claude Code hook -> Giggles bridge.
// Reads the hook JSON from stdin and forwards it to the pet's local server.
// Must stay silent on stdout (UserPromptSubmit/SessionStart stdout becomes Claude context)
// and must never fail the hook.

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const PORT = Number(process.env.GIGGLES_PORT) || 47321;
const APP_DIR = path.resolve(__dirname, '..');
const LAUNCH_ON = new Set(['SessionStart', 'UserPromptSubmit']);

setTimeout(() => process.exit(0), 2500).unref();

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', run);
process.stdin.on('error', () => process.exit(0));

function run() {
  let evt = {};
  try {
    evt = JSON.parse(input.replace(/^﻿/, '').trim() || '{}');
  } catch {
    // ignore malformed input
  }
  if (!evt.hook_event_name && process.argv[2]) evt.hook_event_name = process.argv[2];

  // Only forward the fields the pet uses (keeps prompts/tool inputs local to this script).
  const payload = JSON.stringify({
    hook_event_name: evt.hook_event_name,
    session_id: evt.session_id,
    cwd: evt.cwd,
    tool_name: evt.tool_name,
    message: evt.message,
  });

  post(payload, (ok) => {
    if (!ok && LAUNCH_ON.has(evt.hook_event_name) && process.env.GIGGLES_AUTOLAUNCH !== '0') {
      launchPet();
      // Give the pet a moment to boot, then deliver the event.
      setTimeout(() => post(payload, () => process.exit(0)), 1800);
      return;
    }
    process.exit(0);
  });
}

function post(body, cb) {
  const req = http.request(
    {
      host: '127.0.0.1',
      port: PORT,
      path: '/event',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 600,
    },
    (res) => {
      res.resume();
      res.on('end', () => cb(true));
    }
  );
  req.on('timeout', () => req.destroy());
  req.on('error', () => cb(false));
  req.end(body);
}

function launchPet() {
  try {
    const electronPath = require(path.join(APP_DIR, 'node_modules', 'electron'));
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    const child = spawn(electronPath, [APP_DIR], { detached: true, stdio: 'ignore', env });
    child.unref();
  } catch {
    // electron not installed; nothing to do
  }
}

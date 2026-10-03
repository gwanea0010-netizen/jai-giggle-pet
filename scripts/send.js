#!/usr/bin/env node
// Manually trigger a pet state: node scripts/send.js done|working|attention|hello|sleep
const http = require('http');

const state = process.argv[2] || 'done';
const detail = process.argv.slice(3).join(' ') || undefined;
const body = JSON.stringify({ hook_event_name: state, cwd: process.cwd(), detail, session_id: 'manual' });

const req = http.request(
  { host: '127.0.0.1', port: Number(process.env.GIGGLES_PORT) || 47321, path: '/event', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
  (res) => console.log(`sent "${state}" -> ${res.statusCode}`)
);
req.on('error', () => console.error('Giggles is not running. Start it with: npm start'));
req.end(body);

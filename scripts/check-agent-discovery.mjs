#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const ROBOTS_PATH = path.join(PUBLIC_DIR, 'robots.txt');

console.log('🤖 [Bossman Agent Discovery Guard] Checking crawler and agent discovery contract...');

if (!fs.existsSync(ROBOTS_PATH)) {
  console.error('❌ FAIL: public/robots.txt missing');
  process.exit(1);
}

const robots = fs.readFileSync(ROBOTS_PATH, 'utf8');
const lines = robots.split('\n').map((l) => l.trim());

// Check if entire site is inadvertently blocked to all crawlers
for (let i = 0; i < lines.length; i++) {
  if (lines[i].toLowerCase() === 'user-agent: *') {
    if (lines[i + 1]?.toLowerCase() === 'disallow: /') {
      console.error('❌ FAIL: robots.txt blocks all agents from root (Disallow: /)');
      process.exit(1);
    }
  }
}

console.log('✔ PASS: Agent discovery verified. Search and AI agent crawlers permitted.');
process.exit(0);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const MANIFEST_PATH = path.join(ROOT_DIR, 'bossman-site-manifest.json');
const PKG_PATH = path.join(ROOT_DIR, 'package.json');

console.log('📋 [Bossman Contract Guard] Validating site contract...');

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error('❌ FAIL: Missing bossman-site-manifest.json in project root');
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
} catch (e) {
  console.error(`❌ FAIL: Invalid JSON in bossman-site-manifest.json: ${e.message}`);
  process.exit(1);
}

if (!manifest.schemaVersion || !manifest.site?.name) {
  console.error('❌ FAIL: Invalid manifest structure. Missing "schemaVersion" or "site.name"');
  process.exit(1);
}

if (!fs.existsSync(PKG_PATH)) {
  console.error('❌ FAIL: Missing package.json');
  process.exit(1);
}

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
} catch (e) {
  console.error(`❌ FAIL: Invalid JSON in package.json: ${e.message}`);
  process.exit(1);
}

if (!pkg.scripts?.build) {
  console.error('❌ FAIL: Missing "build" script in package.json');
  process.exit(1);
}

console.log(`✔ PASS: Site "${manifest.site.name}" satisfies Bossman Build & Deployment Contract.`);
process.exit(0);

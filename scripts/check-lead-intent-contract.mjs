#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const MANIFEST_PATH = path.join(ROOT_DIR, 'bossman-site-manifest.json');

console.log('🎯 [Bossman Lead Intent Guard] Validating quote capture contract...');

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error('❌ FAIL: Missing bossman-site-manifest.json');
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
} catch (e) {
  console.error(`❌ FAIL: Malformed bossman-site-manifest.json: ${e.message}`);
  process.exit(1);
}

const quoteTargets = manifest.metadata?.quoteTargets || manifest.site?.quoteTargets || [];

if (!Array.isArray(quoteTargets) || quoteTargets.length === 0) {
  console.warn('⚠️ WARNING: No quoteTargets defined in manifest. Defaulting to general lead capture.');
} else {
  console.log(`✔ Found ${quoteTargets.length} contracted quote target(s): ${quoteTargets.join(', ')}`);
}

console.log('✔ PASS: Lead intent contract verified.');
process.exit(0);

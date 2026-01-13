/**
 * Unified Technical Structure Validator
 *
 * Runs all technical analysis scripts and reports a consolidated status.
 * Used in CI/CD pipelines to enforce quality standards.
 *
 * Usage: node scripts/validate-structure.mjs
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scripts = [
  { name: 'Headings', script: 'analyze-heading-structure.mjs', critical: true },
  { name: 'Internal Links', script: 'analyze-internal-links.mjs', critical: true },
  { name: 'Schema', script: 'check-schema-issues.mjs', critical: false }, // Schema is often partial during dev
  { name: 'Alt Text', script: 'analyze-image-alt-text.mjs', critical: false },
  { name: 'Question Headings', script: 'analyze-question-headings.mjs', critical: false },
  { name: 'Content Uniqueness', script: 'analyze-content-uniqueness.mjs', critical: false },
];

async function runScript(item) {
  return new Promise((resolve) => {
    console.log(`\n🚀 Running ${item.name} Check...`);
    const child = spawn('node', [join(__dirname, item.script)], { stdio: 'inherit' });

    child.on('close', (code) => {
      resolve({ ...item, code });
    });
  });
}

async function main() {
  console.log('🛡️  Starting Technical Structure Validation');
  console.log('=========================================\n');

  let failureCount = 0;

  for (const item of scripts) {
    const result = await runScript(item);
    if (result.code !== 0 && result.critical) {
      console.error(`❌ ${result.name} Check Failed!`);
      failureCount++;
    } else if (result.code !== 0) {
      console.warn(`⚠️  ${result.name} Check returned warnings (Non-critical)`);
    } else {
      console.log(`✅ ${result.name} Check Passed`);
    }
  }

  console.log('\n=========================================');
  if (failureCount > 0) {
    console.error(`❌ Validation Failed with ${failureCount} critical errors.`);
    process.exit(1);
  } else {
    console.log('✅ All Critical Structure Checks Passed!');
    process.exit(0);
  }
}

main();

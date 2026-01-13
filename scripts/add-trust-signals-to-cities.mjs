/**
 * Script to add TrustSignals component to all city pages
 *
 * This script:
 * 1. Adds import for TrustSignals component
 * 2. Adds <TrustSignals /> before CTA section
 *
 * Usage: node scripts/add-trust-signals-to-cities.mjs
 */

/* eslint-env node */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const cityPages = [
  'perth',
  'adelaide',
  'canberra',
  'darwin',
  'hobart',
  'ballarat',
  'bendigo',
  'geelong',
  'gold-coast',
  'newcastle',
  'cairns',
  'townsville',
  'toowoomba',
  'mackay',
  'rockhampton',
  'bunbury',
  'mandurah',
  'rockingham',
  'launceston',
  'logan-city',
  'wollongong',
  'bundaberg',
];

function addTrustSignalsToCityPage(cityName) {
  const filePath = join(projectRoot, 'src', 'pages', `${cityName}.astro`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if already has TrustSignals
  if (content.includes('TrustSignals')) {
    console.log(`✅ ${cityName}.astro already has TrustSignals`);
    return false;
  }

  // Add import
  const importPattern = /(import\s+Layout\s+from\s+['"]\.\.\/layouts\/Layout\.astro['"];)/;
  const importMatch = content.match(importPattern);

  if (importMatch) {
    // Check if FactBox is imported (most city pages have it)
    if (content.includes('import FactBox')) {
      // Add after FactBox import
      content = content.replace(
        /(import\s+FactBox\s+from\s+['"]\.\.\/components\/FactBox\.astro['"];)/,
        "$1\nimport TrustSignals from '../components/TrustSignals.astro';"
      );
    } else {
      // Add after Layout import
      content = content.replace(
        importPattern,
        "$1\nimport TrustSignals from '../components/TrustSignals.astro';"
      );
    }
  } else {
    console.log(`⚠️  Could not find import pattern in ${cityName}.astro`);
    return false;
  }

  // Add component before CTA section
  // Pattern: <FactBox ... /> ... <section class="py-20 bg-gradient-to-r from-brand-red
  const factBoxPattern =
    /(<FactBox[^>]*\/>[\s\S]*?)(\s*<section\s+class="py-20\s+bg-gradient-to-r\s+from-brand-red)/;

  if (factBoxPattern.test(content)) {
    content = content.replace(
      factBoxPattern,
      '$1\n\n  <!-- Security Trust Signals -->\n  <TrustSignals />\n\n$2'
    );
  } else {
    // Try alternative: before closing Layout tag
    const layoutPattern = /(\s*)(<\/Layout>)/;
    if (layoutPattern.test(content) && !content.includes('TrustSignals')) {
      content = content.replace(
        layoutPattern,
        '$1  <!-- Security Trust Signals -->\n$1  <TrustSignals />\n\n$1$2'
      );
    } else {
      console.log(`⚠️  Could not find insertion point in ${cityName}.astro`);
      return false;
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Added TrustSignals to ${cityName}.astro`);
  return true;
}

// Main execution
console.log('🚀 Adding TrustSignals to city pages...\n');

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const city of cityPages) {
  try {
    const result = addTrustSignalsToCityPage(city);
    if (result === true) {
      successCount++;
    } else if (result === false) {
      skipCount++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${city}:`, error.message);
    errorCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   ✅ Added: ${successCount}`);
console.log(`   ⏭️  Skipped: ${skipCount}`);
console.log(`   ❌ Errors: ${errorCount}`);

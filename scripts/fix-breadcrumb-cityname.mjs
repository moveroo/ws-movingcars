/**
 * Fix cityName variable in breadcrumbs - replace with actual city name
 *
 * Usage: node scripts/fix-breadcrumb-cityname.mjs [--dry-run]
 */

/* global process, console */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const pagesDir = join(projectRoot, 'src', 'pages');

const isDryRun = process.argv.includes('--dry-run');

const CITY_NAMES = {
  adelaide: 'Adelaide',
  ballarat: 'Ballarat',
  bendigo: 'Bendigo',
  brisbane: 'Brisbane',
  bunbury: 'Bunbury',
  bundaberg: 'Bundaberg',
  cairns: 'Cairns',
  canberra: 'Canberra',
  darwin: 'Darwin',
  geelong: 'Geelong',
  'gold-coast': 'Gold Coast',
  hobart: 'Hobart',
  launceston: 'Launceston',
  'logan-city': 'Logan City',
  mackay: 'Mackay',
  mandurah: 'Mandurah',
  melbourne: 'Melbourne',
  newcastle: 'Newcastle',
  perth: 'Perth',
  rockhampton: 'Rockhampton',
  rockingham: 'Rockingham',
  sydney: 'Sydney',
  toowoomba: 'Toowoomba',
  townsville: 'Townsville',
  wollongong: 'Wollongong',
};

function findCityFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.astro')) {
      const filename = basename(entry.name, '.astro');
      if (CITY_NAMES[filename]) {
        files.push(join(dir, entry.name));
      }
    }
  }
  return files;
}

function fixCityName(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  const filename = basename(filePath, '.astro');
  const cityName = CITY_NAMES[filename];

  // Replace {cityName} with actual city name
  content = content.replace(/\{cityName\}/g, cityName);

  if (content !== originalContent) {
    if (!isDryRun) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    return { fixed: true };
  }

  return { fixed: false, reason: 'No {cityName} found' };
}

async function main() {
  console.log('🔍 Finding city pages...\n');
  const cityFiles = findCityFiles(pagesDir);
  console.log(`Found ${cityFiles.length} city pages\n`);
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE\n');
  }

  const results = { fixed: [], skipped: [] };

  for (const filePath of cityFiles) {
    const relativePath = filePath.replace(projectRoot + '/', '');
    console.log(`Processing: ${relativePath}`);

    try {
      const result = fixCityName(filePath);
      if (result.fixed) {
        results.fixed.push(relativePath);
        console.log(`  ✅ ${isDryRun ? 'Would fix' : 'Fixed'}`);
      } else {
        results.skipped.push({ file: relativePath, reason: result.reason });
        console.log(`  ⏭️  ${result.reason}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n✅ Fixed: ${results.fixed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }
}

main().catch(console.error);

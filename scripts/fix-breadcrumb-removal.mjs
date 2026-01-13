/**
 * Fix breadcrumb removal - remove old breadcrumb component before hero
 *
 * Usage: node scripts/fix-breadcrumb-removal.mjs [--dry-run]
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

// City names mapping
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

function fixBreadcrumb(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Remove old breadcrumb component before hero (more flexible matching)
  const patterns = [
    /<!-- Breadcrumb Navigation -->\s*<div class="container mx-auto px-4 py-4">\s*<Breadcrumbs items={breadcrumbItems} \/>\s*<\/div>\s*\n/,
    /<!-- Breadcrumb Navigation -->[\s\S]{0,200}?<Breadcrumbs items={breadcrumbItems} \/>[\s\S]{0,200}?<\/div>\s*\n/,
  ];

  for (const pattern of patterns) {
    content = content.replace(pattern, '');
  }

  // Remove Breadcrumbs import if not used
  if (!content.includes('<Breadcrumbs')) {
    content = content.replace(
      /import Breadcrumbs from '\.\.\/components\/Breadcrumbs\.astro';\n?/g,
      ''
    );
  }

  // Remove breadcrumbItems if not used (but keep if used in schema)
  if (!content.includes('breadcrumbItems') && content.includes('const breadcrumbItems')) {
    // Remove the breadcrumbItems definition
    content = content.replace(
      /\/\/ Breadcrumb navigation\s*const breadcrumbItems = \[[\s\S]*?\];\s*\n?/g,
      ''
    );
  }

  if (content !== originalContent) {
    if (!isDryRun) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    return { fixed: true };
  }

  return { fixed: false, reason: 'No changes needed' };
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
      const result = fixBreadcrumb(filePath);
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

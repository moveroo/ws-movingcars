/**
 * Add BreadcrumbList schema to city pages
 *
 * Usage: node scripts/add-breadcrumb-schema.mjs [--dry-run]
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

function addSchema(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Check if schema already exists
  if (content.includes('BreadcrumbList') && content.includes('itemListElement')) {
    return { fixed: false, reason: 'Schema already exists' };
  }

  // Check if breadcrumbItems exists
  if (!content.includes('breadcrumbItems')) {
    return { fixed: false, reason: 'breadcrumbItems not found' };
  }

  // Find Layout opening tag
  const layoutMatch = content.match(/<Layout[^>]*>\s*\n/);
  if (!layoutMatch) {
    return { fixed: false, reason: 'Layout tag not found' };
  }

  const layoutEnd = layoutMatch.index + layoutMatch[0].length;
  const afterLayout = content.substring(layoutEnd);

  // Check if schema is already there
  if (afterLayout.includes('BreadcrumbList Schema')) {
    return { fixed: false, reason: 'Schema already present' };
  }

  // Add schema right after Layout opening
  const schema = `  <!-- BreadcrumbList Schema -->
  <script
    type="application/ld+json"
    set:html={JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    })}
  />
`;

  content = content.substring(0, layoutEnd) + schema + content.substring(layoutEnd);

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
      const result = addSchema(filePath);
      if (result.fixed) {
        results.fixed.push(relativePath);
        console.log(`  ✅ ${isDryRun ? 'Would add' : 'Added'} schema`);
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

/**
 * Update breadcrumb style on city pages to match route pages
 *
 * Changes:
 * - Move breadcrumbs from before hero to after hero
 * - Change from gray Breadcrumbs component to red background inline breadcrumbs
 * - Use › separators instead of SVG icons
 * - Match route page style: bg-[#800005] with white text
 *
 * Usage: node scripts/update-breadcrumb-style.mjs [--dry-run]
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

// Find all city .astro files
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

// Update breadcrumb style in a file
function updateBreadcrumbStyle(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  const filename = basename(filePath, '.astro');

  // Check if breadcrumbs exist
  if (!content.includes('breadcrumbItems') && !content.includes('Breadcrumbs')) {
    return { fixed: false, reason: 'No breadcrumbs found' };
  }

  // Remove old breadcrumb component (before hero)
  // Find the breadcrumb section before hero - match more flexibly
  const breadcrumbBeforeHeroRegex =
    /<!-- Breadcrumb Navigation -->\s*<div class="container mx-auto px-4 py-4">\s*<Breadcrumbs items={breadcrumbItems} \/>\s*<\/div>\s*\n?/;
  content = content.replace(breadcrumbBeforeHeroRegex, '');

  // Also try to match if there are extra whitespace/newlines
  const breadcrumbBeforeHeroRegex2 =
    /<!-- Breadcrumb Navigation -->[\s\S]*?<Breadcrumbs items={breadcrumbItems} \/>[\s\S]*?<\/div>\s*\n?/;
  content = content.replace(breadcrumbBeforeHeroRegex2, '');

  // Find hero section end (look for closing </section> after hero)
  // Hero sections typically have: bg-gradient-to-br from-brand-dark to-gray-900
  const heroSectionRegex =
    /<section class="bg-gradient-to-br from-brand-dark to-gray-900[^>]*>[\s\S]*?<\/section>/;
  const heroMatch = content.match(heroSectionRegex);

  if (!heroMatch) {
    return { fixed: false, reason: 'Could not find hero section' };
  }

  const heroEndIndex = heroMatch.index + heroMatch[0].length;
  const afterHero = content.substring(heroEndIndex);

  // Check if breadcrumb already exists after hero
  if (afterHero.includes('<!-- Breadcrumb -->') || afterHero.includes('bg-[#800005]')) {
    return { fixed: false, reason: 'Breadcrumb already in correct style/position' };
  }

  // Generate breadcrumb HTML (matching route page style)
  const cityName = CITY_NAMES[filename];
  const breadcrumbHtml = `
  <!-- Breadcrumb -->
  <nav class="py-4 bg-[#800005]" role="navigation">
    <div class="container mx-auto px-4">
      <div class="flex items-center gap-2 text-sm text-white/80 flex-wrap">
        <a href="/" class="hover:text-white">Home</a>
        <span>›</span>
        <a href="/service-areas/" class="hover:text-white">Service Areas</a>
        <span>›</span>
        <span class="text-white">${cityName}</span>
      </div>
    </div>
  </nav>
`;

  // Insert breadcrumb after hero section
  content = content.substring(0, heroEndIndex) + breadcrumbHtml + content.substring(heroEndIndex);

  // Remove Breadcrumbs import if no longer used
  if (!content.includes('<Breadcrumbs')) {
    content = content.replace(
      /import Breadcrumbs from '\.\.\/components\/Breadcrumbs\.astro';\n?/g,
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

// Main execution
async function main() {
  console.log('🔍 Finding city pages...\n');
  const cityFiles = findCityFiles(pagesDir);

  console.log(`Found ${cityFiles.length} city pages\n`);
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  const results = {
    fixed: [],
    skipped: [],
    errors: [],
  };

  for (const filePath of cityFiles) {
    const relativePath = filePath.replace(projectRoot + '/', '');
    console.log(`Processing: ${relativePath}`);

    try {
      const result = updateBreadcrumbStyle(filePath);
      if (result.fixed) {
        results.fixed.push({ file: relativePath });
        console.log(`  ✅ ${isDryRun ? 'Would update' : 'Updated'} breadcrumb style`);
      } else {
        results.skipped.push({ file: relativePath, reason: result.reason });
        console.log(`  ⏭️  ${result.reason}`);
      }
    } catch (error) {
      results.errors.push({ file: relativePath, error: error.message });
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Updated: ${results.fixed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);

  if (results.fixed.length > 0) {
    console.log('\n✅ Pages updated:');
    results.fixed.forEach(({ file }) => {
      console.log(`   ${file}`);
    });
  }

  if (results.skipped.length > 0) {
    console.log('\n⏭️  Skipped pages:');
    const skipReasons = {};
    results.skipped.forEach(({ file, reason }) => {
      if (!skipReasons[reason]) skipReasons[reason] = [];
      skipReasons[reason].push(file);
    });
    Object.entries(skipReasons).forEach(([reason, files]) => {
      console.log(`   ${reason}: ${files.length} pages`);
    });
  }

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }

  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }
}

main().catch(console.error);

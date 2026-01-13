/**
 * Fix accessibility issues on all pages:
 * 1. Fix heading hierarchy (h3 before h2)
 * 2. Fix color contrast issues
 *
 * Usage: node scripts/fix-accessibility-issues.mjs [--dry-run]
 */

/* global process, console */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const pagesDir = join(projectRoot, 'src', 'pages');

const isDryRun = process.argv.includes('--dry-run');

// Files to skip (404, robots, etc.)
const SKIP_FILES = ['404.astro', 'robots.txt.ts'];

function findAllAstroFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.astro')) {
      if (!SKIP_FILES.includes(entry.name)) {
        files.push(join(dir, entry.name));
      }
    }
  }
  return files;
}

function fixAccessibilityIssues(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Fix 1: Heading hierarchy - Change h3 in quarantine/state notice sections to h2
  // Pattern: <h3 class="font-bold text-yellow-800">Western Australia Quarantine Restrictions</h3>
  // or <h3 class="font-bold text-yellow-800 mb-2">⚠️ South Australia</h3>
  const h3BeforeH2Regex = /<h3 class="font-bold text-yellow-800[^"]*">([^<]+)<\/h3>/;
  if (h3BeforeH2Regex.test(content)) {
    content = content.replace(
      /<h3 class="font-bold text-yellow-800([^"]*)">([^<]+)<\/h3>/,
      '<h2 class="font-bold text-yellow-900 text-lg mb-2">$2</h2>'
    );
  }

  // Fix 2: Color contrast improvements
  // text-gray-400 on dark background -> text-gray-200
  if (content.includes('text-gray-400') && content.includes('bg-gradient-to-br from-brand-dark')) {
    // Only replace in hero section context
    content = content.replace(
      /(<div class="flex flex-wrap justify-center gap-6 mt-10 text-sm )text-gray-400/g,
      '$1text-gray-200'
    );
  }

  // text-green-400 -> text-green-300 (better contrast)
  if (content.includes('text-green-400')) {
    content = content.replace(/text-green-400/g, 'text-green-300');
  }

  // text-white/80 in breadcrumbs -> text-white
  if (content.includes('text-white/80') && content.includes('bg-[#800005]')) {
    content = content.replace(
      /(<div class="flex items-center gap-2 text-sm )text-white\/80/g,
      '$1text-white'
    );
    // Also fix hover states
    content = content.replace(/(class="hover:)text-white(")/g, '$1text-gray-200$2');
  }

  // text-gray-400 on white background -> text-gray-500 (source citations)
  if (content.includes('text-gray-400 text-center mt-4')) {
    content = content.replace(/text-gray-400 text-center mt-4/g, 'text-gray-500 text-center mt-4');
  }

  // text-gray-500 in route details -> text-gray-600
  if (content.includes('text-gray-500') && content.includes('transit')) {
    content = content.replace(
      /(<div class="mt-3 flex gap-4 text-sm )text-gray-500/g,
      '$1text-gray-600'
    );
  }

  // text-white/80 in CTA sections -> text-white/90
  if (content.includes('text-white/80 mb-8')) {
    content = content.replace(/text-white\/80 mb-8/g, 'text-white/90 mb-8');
  }

  // text-yellow-800 -> text-yellow-900, text-yellow-700 -> text-yellow-800 (better contrast on yellow bg)
  if (content.includes('text-yellow-800') && content.includes('bg-yellow-50')) {
    content = content.replace(/text-yellow-800/g, 'text-yellow-900');
  }
  if (content.includes('text-yellow-700') && content.includes('bg-yellow-50')) {
    content = content.replace(/text-yellow-700/g, 'text-yellow-800');
  }

  if (content !== originalContent) {
    if (!isDryRun) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    return { fixed: true };
  }

  return { fixed: false };
}

async function main() {
  console.log('🔍 Finding all pages to fix accessibility issues...\n');
  const allFiles = findAllAstroFiles(pagesDir);
  console.log(`Found ${allFiles.length} pages\n`);
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE\n');
  }

  const results = { fixed: [], skipped: [] };

  for (const filePath of allFiles) {
    const relativePath = filePath.replace(projectRoot + '/', '');
    console.log(`Processing: ${relativePath}`);

    try {
      const result = fixAccessibilityIssues(filePath);
      if (result.fixed) {
        results.fixed.push(relativePath);
        console.log(`  ✅ ${isDryRun ? 'Would fix' : 'Fixed'} accessibility issues`);
      } else {
        results.skipped.push(relativePath);
        console.log(`  ⏭️  No issues found or already fixed`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n✅ Fixed: ${results.fixed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);

  if (results.fixed.length > 0) {
    console.log('\n✅ Pages with accessibility fixes:');
    results.fixed.forEach((file) => {
      console.log(`   ${file}`);
    });
  }

  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }
}

main().catch(console.error);

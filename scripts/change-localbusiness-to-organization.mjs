/**
 * Change LocalBusiness schema to Organization on all pages
 * Since Moving Again covers all of Australia, not just local areas
 *
 * Usage: node scripts/change-localbusiness-to-organization.mjs [--dry-run]
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

// Files to skip
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

function changeLocalBusinessToOrganization(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let fixed = false;

  // Check if file uses Organization schemaType (already changed) but still has address/priceRange
  const hasOrganization = content.includes('schemaType="Organization"');
  const hasAddress = content.includes('address:') && content.includes('PostalAddress');
  const hasPriceRange = content.includes('priceRange:');

  if (!hasOrganization && !content.includes('LocalBusiness')) {
    return { fixed: false, reason: 'No LocalBusiness or Organization found' };
  }

  // Change schemaType="LocalBusiness" to schemaType="Organization" if not already changed
  if (content.includes('schemaType="LocalBusiness"')) {
    content = content.replace(/schemaType="LocalBusiness"/g, 'schemaType="Organization"');
    fixed = true;
  }

  // Update schemaData - remove address and priceRange fields (multiline pattern)
  // Pattern: schemaData={{ name: '...', address: {...}, areaServed: '...', priceRange: '...' }}
  if (hasAddress || hasPriceRange) {
    // Match schemaData with multiline support
    const schemaDataRegex = /schemaData=\{\{([\s\S]*?)\}\}/;
    const match = content.match(schemaDataRegex);

    if (match) {
      let schemaDataContent = match[1];

      // Remove address field (multiline, local-specific)
      schemaDataContent = schemaDataContent.replace(/address:\s*\{[\s\S]*?\},?\s*/g, '');

      // Remove priceRange field
      schemaDataContent = schemaDataContent.replace(/priceRange:\s*['"$]+,\s*/g, '');
      schemaDataContent = schemaDataContent.replace(/priceRange:\s*['"$]+/g, '');

      // Clean up extra commas and whitespace
      schemaDataContent = schemaDataContent.replace(/,\s*,/g, ',');
      schemaDataContent = schemaDataContent.replace(/,\s*\n\s*\}/g, '\n  }');
      schemaDataContent = schemaDataContent.replace(/\{\s*,\s*\n/g, '{\n');
      schemaDataContent = schemaDataContent.replace(/\n\s*,\s*\n\s*\}/g, '\n  }');

      // Keep areaServed and name - both are valid for Organization

      content = content.replace(schemaDataRegex, `schemaData={{${schemaDataContent}}}`);
      fixed = true;
    }
  }

  if (fixed && content !== originalContent) {
    if (!isDryRun) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    return { fixed: true };
  }

  return { fixed: false, reason: 'No changes needed' };
}

async function main() {
  console.log('🔍 Finding pages with LocalBusiness schema...\n');
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
      const result = changeLocalBusinessToOrganization(filePath);
      if (result.fixed) {
        results.fixed.push(relativePath);
        console.log(`  ✅ ${isDryRun ? 'Would change' : 'Changed'} LocalBusiness to Organization`);
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

  if (results.fixed.length > 0) {
    console.log('\n✅ Pages changed from LocalBusiness to Organization:');
    results.fixed.forEach((file) => {
      console.log(`   ${file}`);
    });
  }

  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }
}

main().catch(console.error);

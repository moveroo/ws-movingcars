/**
 * Automatically add telephone field to LocalBusiness schemaData
 *
 * Fixes all city pages that are missing telephone in their LocalBusiness schema
 *
 * Usage: node scripts/fix-schema-telephone.mjs [--dry-run]
 */

/* global */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const pagesDir = join(projectRoot, 'src', 'pages');

const TELEPHONE = '+61 7 2143 2557';
const isDryRun = process.argv.includes('--dry-run');

// Find all .astro files in pages directory
function findAstroFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findAstroFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.astro')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Fix telephone in a file
function fixTelephone(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Check if it has LocalBusiness schema
  const hasLocalBusiness =
    content.includes('schemaType="LocalBusiness"') ||
    content.includes("schemaType='LocalBusiness'");

  if (!hasLocalBusiness) {
    return { fixed: false, reason: 'Not a LocalBusiness page' };
  }

  // Check if telephone already exists
  if (
    content.includes('telephone') &&
    (content.includes('+61 7 2143 2557') || content.includes('telephone:'))
  ) {
    return { fixed: false, reason: 'Telephone already present' };
  }

  // Find schemaData block
  const schemaDataRegex = /schemaData\s*=\s*\{([^}]+)\}/s;
  const match = content.match(schemaDataRegex);

  if (!match) {
    return { fixed: false, reason: 'Could not find schemaData block' };
  }

  const schemaDataContent = match[1];
  const fullMatch = match[0];

  // Check if telephone is already there (might be in a different format)
  if (schemaDataContent.includes('telephone')) {
    return { fixed: false, reason: 'Telephone field exists in different format' };
  }

  // Add telephone after name field (or at the start if no name)
  let newSchemaData;
  if (schemaDataContent.includes('name:')) {
    // Insert after name field
    const nameMatch = schemaDataContent.match(/name:\s*['"]([^'"]+)['"]/);
    if (nameMatch) {
      const nameEnd = nameMatch.index + nameMatch[0].length;
      newSchemaData =
        schemaDataContent.substring(0, nameEnd) +
        ",\n    telephone: '" +
        TELEPHONE +
        "'," +
        schemaDataContent.substring(nameEnd);
    } else {
      // Fallback: add at the start
      newSchemaData = `telephone: '${TELEPHONE}',\n    ${schemaDataContent.trim()}`;
    }
  } else {
    // Add at the start
    newSchemaData = `telephone: '${TELEPHONE}',\n    ${schemaDataContent.trim()}`;
  }

  const newFullMatch = fullMatch.replace(schemaDataContent, newSchemaData);
  const newContent = content.replace(fullMatch, newFullMatch);

  if (!isDryRun) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  return {
    fixed: true,
    reason: isDryRun ? 'Would add telephone' : 'Added telephone',
    preview: newSchemaData.substring(0, 100) + '...',
  };
}

// Main
function main() {
  console.log('\n🔧 Fixing Missing Telephone in LocalBusiness Schema\n');
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }
  console.log('='.repeat(70));

  const files = findAstroFiles(pagesDir);
  console.log(`\n📄 Analyzing ${files.length} pages...\n`);

  const results = files.map((file) => ({
    file: file.replace(projectRoot + '/', ''),
    ...fixTelephone(file),
  }));

  const fixed = results.filter((r) => r.fixed);
  const skipped = results.filter((r) => !r.fixed);

  if (fixed.length > 0) {
    console.log('\n✅ FIXED:\n');
    fixed.forEach((result) => {
      console.log(`  ✓ ${result.file}`);
      console.log(`    ${result.reason}`);
    });
  }

  if (skipped.length > 0) {
    console.log('\n⏭️  SKIPPED:\n');
    skipped.forEach((result) => {
      console.log(`  - ${result.file}`);
      console.log(`    ${result.reason}`);
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 SUMMARY:`);
  console.log(`  Fixed: ${fixed.length}`);
  console.log(`  Skipped: ${skipped.length}`);
  console.log(`  Total: ${results.length}`);

  if (isDryRun && fixed.length > 0) {
    console.log('\n💡 Run without --dry-run to apply fixes\n');
  } else if (fixed.length > 0) {
    console.log('\n✅ All fixes applied!\n');
  }
}

main();

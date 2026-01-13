#!/usr/bin/env node

/**
 * Add Content Freshness Dates to All Pages
 *
 * Adds getContentDate import and modifiedDate prop to all pages
 * that don't already have it.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const pagesDir = join(projectRoot, 'src', 'pages');

// Pages to skip (already have dates or special cases)
const skipPages = [
  'index.astro',
  'backloading.astro',
  '[...slug].astro', // Dynamic route - handled separately
  '404.astro',
];

// Get all .astro files
const files = readdirSync(pagesDir).filter(
  (file) => file.endsWith('.astro') && !skipPages.includes(file)
);

let updated = 0;
let skipped = 0;

for (const file of files) {
  const filePath = join(pagesDir, file);
  let content = readFileSync(filePath, 'utf-8');

  // Skip if already has modifiedDate
  if (content.includes('modifiedDate')) {
    skipped++;
    continue;
  }

  // Skip if doesn't have Layout import
  if (!content.includes('import Layout from')) {
    skipped++;
    continue;
  }

  let modified = false;

  // Add imports if not present
  if (!content.includes('getContentDate')) {
    // Find the last import line
    const importLines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      } else if (lastImportIndex >= 0 && importLines[i].trim() === '---') {
        break;
      }
    }

    if (lastImportIndex >= 0) {
      // Add imports after last import
      const newImports = `import { getContentDate } from '../utils/fileDates';
import { fileURLToPath } from 'url';

// Get content modification date
const currentFile = fileURLToPath(import.meta.url);
const pageDate = getContentDate(currentFile);`;

      importLines.splice(lastImportIndex + 1, 0, '', newImports);
      content = importLines.join('\n');
      modified = true;
    }
  }

  // Add modifiedDate to Layout component
  if (!content.includes('modifiedDate={')) {
    // Find Layout tag
    const layoutMatch = content.match(/<Layout\s+([^>]*)>/);
    if (layoutMatch) {
      const layoutProps = layoutMatch[1];
      // Add modifiedDate before closing >
      const newLayoutTag = `<Layout
  ${layoutProps}
  modifiedDate={pageDate}>`;
      content = content.replace(/<Layout\s+[^>]*>/, newLayoutTag);
      modified = true;
    }
  }

  if (modified) {
    writeFileSync(filePath, content, 'utf-8');
    updated++;
    console.log(`✅ Updated: ${file}`);
  } else {
    skipped++;
    console.log(`⏭️  Skipped: ${file} (already has dates or no Layout)`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Updated: ${updated} pages`);
console.log(`   Skipped: ${skipped} pages`);
console.log(`   Total: ${files.length} pages`);

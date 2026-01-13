/**
 * Add ARIA attributes to improve accessibility
 * Adds aria-label to buttons, links, and interactive elements
 */

/* global */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const pagesDir = join(projectRoot, 'src', 'pages');

// Find all .astro files recursively
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

// Add ARIA attributes to file
function addAriaAttributes(filePath, dryRun = false) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;
  let fixed = false;

  // Add aria-label to buttons without labels
  // Pattern: <button> or <button class=...> without aria-label
  const buttonRegex = /<button(?![^>]*aria-label)([^>]*)>/g;
  newContent = newContent.replace(buttonRegex, (match, attrs) => {
    // Skip if button has text content that's visible
    // For now, just add role="button" if missing
    if (!attrs.includes('role=')) {
      fixed = true;
      return `<button${attrs} role="button">`;
    }
    return match;
  });

  // Add aria-label to links that are just icons or images
  // Pattern: <a href=...><img> or <a href=...> with no visible text
  const iconLinkRegex = /<a\s+([^>]*href=["'][^"']+["'][^>]*)>\s*<img([^>]*)>/g;
  newContent = newContent.replace(iconLinkRegex, (match, linkAttrs, imgAttrs) => {
    if (!linkAttrs.includes('aria-label')) {
      // Extract alt from img if available
      const altMatch = imgAttrs.match(/alt=["']([^"']+)["']/);
      if (altMatch) {
        fixed = true;
        return `<a ${linkAttrs} aria-label="${altMatch[1]}"><img${imgAttrs}>`;
      }
    }
    return match;
  });

  // Add role="navigation" to nav elements
  const navRegex = /<nav(?![^>]*role=)([^>]*)>/g;
  newContent = newContent.replace(navRegex, (match, attrs) => {
    fixed = true;
    return `<nav${attrs} role="navigation">`;
  });

  // Add role="main" to main content areas
  const mainRegex = /<main(?![^>]*role=)([^>]*)>/g;
  newContent = newContent.replace(mainRegex, (match, attrs) => {
    fixed = true;
    return `<main${attrs} role="main">`;
  });

  // Add role="complementary" to aside elements
  const asideRegex = /<aside(?![^>]*role=)([^>]*)>/g;
  newContent = newContent.replace(asideRegex, (match, attrs) => {
    fixed = true;
    return `<aside${attrs} role="complementary">`;
  });

  if (fixed && !dryRun) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  return { fixed };
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const files = findAstroFiles(pagesDir);
  const results = {
    fixed: [],
    skipped: [],
    errors: [],
  };

  console.log('\n🔧 Adding ARIA Attributes\n');
  console.log('='.repeat(60));
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  for (const file of files) {
    const relativePath = file.replace(projectRoot + '/', '');

    try {
      const { fixed } = addAriaAttributes(file, dryRun);

      if (fixed) {
        results.fixed.push(relativePath);
        console.log(`  ✓ ${relativePath}`);
      } else {
        results.skipped.push(relativePath);
      }
    } catch (error) {
      results.errors.push({ file: relativePath, error: error.message });
      console.log(`  ✗ ${relativePath} - Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Fixed: ${results.fixed.length} files`);
  console.log(`  ⏭️  Skipped: ${results.skipped.length} files`);
  console.log(`  ❌ Errors: ${results.errors.length} files`);

  if (dryRun && results.fixed.length > 0) {
    console.log(`\n💡 Run without --dry-run to apply fixes to ${results.fixed.length} files`);
  }

  console.log();
}

main();

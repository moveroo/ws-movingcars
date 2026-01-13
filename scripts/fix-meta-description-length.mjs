/**
 * Fix meta description lengths across all pages
 * Truncates descriptions that are too long (> 160 chars)
 * Expands descriptions that are too short (< 120 chars)
 */

/* global */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const pagesDir = join(projectRoot, 'src', 'pages');

const DESC_MIN_LENGTH = 120;
const DESC_MAX_LENGTH = 160;
const DESC_IDEAL_LENGTH = 155; // Target for optimization

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

// Truncate description intelligently at word boundary
function truncateDescription(description, maxLength) {
  if (description.length <= maxLength) {
    return description;
  }

  // Try to truncate at word boundary
  const truncated = description.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength - 30) {
    // Good word boundary found
    return truncated.substring(0, lastSpace) + '...';
  }

  // No good word boundary, truncate at character
  return truncated + '...';
}

// Expand short description
function expandDescription(description, pageName) {
  if (description.length >= DESC_MIN_LENGTH) {
    return description;
  }

  // Try to expand intelligently based on page type
  if (pageName.includes('contact')) {
    return "Get in touch with Moving Again for interstate moving quotes, questions, or support. We're here to help with your move across Australia.";
  }

  if (pageName.includes('terms')) {
    return 'Terms and conditions for booking removalist services with Moving Again. Please read and understand our terms prior to booking your interstate move.';
  }

  // Generic expansion
  const base = description.trim();
  const suffix = " Get your free quote today from Australia's trusted interstate removalists.";

  if (base.length + suffix.length <= DESC_MAX_LENGTH) {
    return base + suffix;
  }

  // Too long even with suffix, just use base
  return base;
}

// Fix description in file
function fixDescription(filePath, dryRun = false) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Find description prop in Layout component
  const layoutRegex = /(<Layout[^>]*description=["'])([^"']+)(["'])/g;
  let fixed = false;
  let newContent = content;

  newContent = newContent.replace(layoutRegex, (match, prefix, description, suffix) => {
    const originalDesc = description;
    let newDesc = description;

    // Handle template strings (skip if contains ${})
    if (description.includes('${')) {
      return match; // Skip template strings
    }

    // Fix too long
    if (description.length > DESC_MAX_LENGTH) {
      newDesc = truncateDescription(description, DESC_IDEAL_LENGTH);
      fixed = true;
    }
    // Fix too short
    else if (description.length < DESC_MIN_LENGTH) {
      newDesc = expandDescription(description, filePath);
      fixed = true;
    }

    if (newDesc !== originalDesc) {
      return `${prefix}${newDesc}${suffix}`;
    }

    return match;
  });

  if (fixed && !dryRun) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  return { fixed, originalContent, newContent };
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const files = findAstroFiles(pagesDir);
  const results = {
    fixed: [],
    skipped: [],
    errors: [],
  };

  console.log('\n🔧 Fixing Meta Description Lengths\n');
  console.log('='.repeat(60));
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  for (const file of files) {
    const relativePath = file.replace(projectRoot + '/', '');

    try {
      const { fixed } = fixDescription(file, dryRun);

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

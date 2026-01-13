#!/usr/bin/env node

/**
 * Verify Content Freshness Implementation
 *
 * Checks all pages for:
 * - article:modified_time meta tag presence
 * - Date format validity (ISO 8601)
 * - Whether dates are Git commit dates vs build time
 * - Schema.org dateModified presence (where applicable)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');
const srcDir = join(projectRoot, 'src');

// Check if dist exists (need to build first)
if (!statSync(distDir).isDirectory()) {
  console.error('❌ dist/ directory not found. Please run "npm run build" first.');
  process.exit(1);
}

const results = {
  totalPages: 0,
  pagesWithMetaTag: 0,
  pagesWithValidDate: 0,
  pagesWithGitDate: 0,
  pagesWithBuildTime: 0,
  pagesWithSchemaDate: 0,
  pagesMissingMetaTag: [],
  pagesWithInvalidDate: [],
  pagesWithBuildTimeOnly: [],
};

/**
 * Get Git commit date for a file
 */
function getGitDate(filePath) {
  try {
    const gitDate = execSync(`git log -1 --format=%cI -- "${filePath}"`, {
      encoding: 'utf-8',
      cwd: projectRoot,
      stdio: 'pipe',
    })
      .toString()
      .trim();
    return gitDate || null;
  } catch {
    return null;
  }
}

/**
 * Check if date is ISO 8601 format (supports both Z and timezone offsets)
 */
function isValidISODate(dateString) {
  try {
    const date = new Date(dateString);
    // ISO 8601 can have Z (UTC) or timezone offset (+HH:MM or -HH:MM)
    const hasTime = dateString.includes('T');
    const hasTimezone = dateString.includes('Z') || /[+-]\d{2}:\d{2}$/.test(dateString);
    return !isNaN(date.getTime()) && hasTime && hasTimezone;
  } catch {
    return false;
  }
}

/**
 * Check if date is likely build time (very recent, within last hour)
 */
function isBuildTime(dateString) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);
    // If date is within last 2 hours, likely build time
    return diffHours < 2;
  } catch {
    return false;
  }
}

/**
 * Find source file for a dist HTML file
 */
function findSourceFile(distPath) {
  // Remove dist/ prefix and .html extension
  let relativePath = distPath
    .replace(/^dist\//, '')
    .replace(/\/index\.html$/, '')
    .replace(/\.html$/, '');

  // Handle root
  if (relativePath === '' || relativePath === 'index') {
    return join(srcDir, 'pages', 'index.astro');
  }

  // Handle route pages (dynamic)
  if (!relativePath.includes('/')) {
    // Could be a city page or service page
    const cityPage = join(srcDir, 'pages', `${relativePath}.astro`);
    try {
      if (statSync(cityPage).isFile()) {
        return cityPage;
      }
    } catch {}

    // Could be a route page (content collection)
    // Route pages are in src/content/routes/
    const routeFile = join(srcDir, 'content', 'routes', `${relativePath}.md`);
    try {
      if (statSync(routeFile).isFile()) {
        return routeFile;
      }
    } catch {}
  }

  // Try as direct page
  const pageFile = join(srcDir, 'pages', `${relativePath}.astro`);
  try {
    if (statSync(pageFile).isFile()) {
      return pageFile;
    }
  } catch {}

  return null;
}

/**
 * Analyze a single HTML file
 */
function analyzePage(htmlPath) {
  const htmlContent = readFileSync(htmlPath, 'utf-8');
  const relativePath = htmlPath.replace(projectRoot + '/', '');

  results.totalPages++;

  // Check for article:modified_time meta tag
  const metaTagMatch = htmlContent.match(
    /<meta\s+property=["']article:modified_time["']\s+content=["']([^"']+)["']/i
  );

  if (!metaTagMatch) {
    results.pagesMissingMetaTag.push(relativePath);
    return;
  }

  results.pagesWithMetaTag++;
  const dateValue = metaTagMatch[1];

  // Validate date format
  if (!isValidISODate(dateValue)) {
    results.pagesWithInvalidDate.push({ path: relativePath, date: dateValue });
    return;
  }

  results.pagesWithValidDate++;

  // Check if it's build time
  if (isBuildTime(dateValue)) {
    results.pagesWithBuildTimeOnly.push(relativePath);
    results.pagesWithBuildTime++;
  } else {
    // Try to verify it's a Git date
    const sourceFile = findSourceFile(relativePath);
    if (sourceFile) {
      const gitDate = getGitDate(sourceFile);
      if (gitDate) {
        // Check if dates match (within 1 hour tolerance for timezone differences)
        const htmlDate = new Date(dateValue);
        const gitDateObj = new Date(gitDate);
        const diffMs = Math.abs(htmlDate - gitDateObj);
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 1) {
          results.pagesWithGitDate++;
        }
      }
    }
  }

  // Check for Schema.org dateModified
  const schemaMatch = htmlContent.match(/"dateModified"\s*:\s*["']([^"']+)["']/i);
  if (schemaMatch) {
    results.pagesWithSchemaDate++;
  }
}

/**
 * Recursively find all HTML files in dist
 */
function findHTMLFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      findHTMLFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Main execution
console.log('🔍 Verifying Content Freshness Implementation...\n');

const htmlFiles = findHTMLFiles(distDir);
console.log(`Found ${htmlFiles.length} HTML files to analyze...\n`);

htmlFiles.forEach((file) => {
  analyzePage(file);
});

// Report results
console.log('📊 Results:\n');
console.log(`Total Pages: ${results.totalPages}`);
console.log(
  `Pages with Meta Tag: ${results.pagesWithMetaTag} (${((results.pagesWithMetaTag / results.totalPages) * 100).toFixed(1)}%)`
);
console.log(
  `Pages with Valid Date: ${results.pagesWithValidDate} (${((results.pagesWithValidDate / results.totalPages) * 100).toFixed(1)}%)`
);
console.log(
  `Pages with Git Date: ${results.pagesWithGitDate} (${((results.pagesWithGitDate / results.totalPages) * 100).toFixed(1)}%)`
);
console.log(
  `Pages with Schema dateModified: ${results.pagesWithSchemaDate} (${((results.pagesWithSchemaDate / results.totalPages) * 100).toFixed(1)}%)`
);
console.log(
  `Pages with Build Time Only: ${results.pagesWithBuildTime} (${((results.pagesWithBuildTime / results.totalPages) * 100).toFixed(1)}%)`
);

if (results.pagesMissingMetaTag.length > 0) {
  console.log(`\n❌ Pages Missing Meta Tag (${results.pagesMissingMetaTag.length}):`);
  results.pagesMissingMetaTag.slice(0, 10).forEach((path) => {
    console.log(`   - ${path}`);
  });
  if (results.pagesMissingMetaTag.length > 10) {
    console.log(`   ... and ${results.pagesMissingMetaTag.length - 10} more`);
  }
}

if (results.pagesWithInvalidDate.length > 0) {
  console.log(`\n⚠️  Pages with Invalid Date Format (${results.pagesWithInvalidDate.length}):`);
  results.pagesWithInvalidDate.slice(0, 5).forEach(({ path, date }) => {
    console.log(`   - ${path}: ${date}`);
  });
}

if (results.pagesWithBuildTimeOnly.length > 0) {
  console.log(
    `\n⚠️  Pages Using Build Time (may need Git dates) (${results.pagesWithBuildTimeOnly.length}):`
  );
  results.pagesWithBuildTimeOnly.slice(0, 10).forEach((path) => {
    console.log(`   - ${path}`);
  });
  if (results.pagesWithBuildTimeOnly.length > 10) {
    console.log(`   ... and ${results.pagesWithBuildTimeOnly.length - 10} more`);
  }
}

// Final assessment
console.log('\n📋 Assessment:');
if (results.pagesMissingMetaTag.length === 0 && results.pagesWithInvalidDate.length === 0) {
  console.log('✅ All pages have valid article:modified_time meta tags');

  if (results.pagesWithBuildTime > results.pagesWithGitDate) {
    console.log('⚠️  Many pages are using build time instead of Git commit dates');
    console.log('   This is expected for pages that were just created or modified');
  } else {
    console.log('✅ Most pages are using Git commit dates (good!)');
  }

  if (results.pagesWithSchemaDate > 0) {
    console.log(`✅ ${results.pagesWithSchemaDate} pages also have Schema.org dateModified`);
  }

  console.log('\n💡 If crawler still reports "No content date detected":');
  console.log('   - This is likely a FALSE POSITIVE');
  console.log('   - Meta tags are correctly implemented');
  console.log('   - Crawler may need time to re-crawl');
  console.log('   - Or crawler may have detection limitations');
} else {
  console.log('❌ Some pages are missing meta tags or have invalid dates');
  console.log('   Fix these issues before considering it a false positive');
}

console.log('\n');

/**
 * Analyze meta description lengths across all pages
 * Identifies descriptions that are too short or too long
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

// Extract description from file
function extractDescription(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Look for description prop in Layout component
  const layoutMatch = content.match(/<Layout[^>]*description=["']([^"']+)["']/);
  if (layoutMatch) {
    return layoutMatch[1];
  }

  // Look for description in SEO component
  const seoMatch = content.match(/description\s*=\s*["']([^"']+)["']/);
  if (seoMatch) {
    return seoMatch[1];
  }

  return null;
}

// Get page URL from file path
function getPageUrl(filePath) {
  const relativePath = filePath.replace(pagesDir + '/', '');
  const baseName = relativePath.replace('.astro', '').replace('index', '');

  if (baseName === '' || baseName === '/') {
    return 'https://movingagain.com.au/';
  }

  return `https://movingagain.com.au/${baseName}/`;
}

function main() {
  const files = findAstroFiles(pagesDir);
  const results = {
    tooShort: [], // < 120 chars
    tooLong: [], // > 160 chars
    ideal: [], // 120-160 chars
    missing: [],
  };

  for (const file of files) {
    const url = getPageUrl(file);
    const description = extractDescription(file);

    if (!description) {
      results.missing.push({ file: file.replace(projectRoot + '/', ''), url });
      continue;
    }

    // Handle template strings (they might have variables)
    const descLength = description.length;

    if (descLength < 120) {
      results.tooShort.push({
        file: file.replace(projectRoot + '/', ''),
        url,
        description,
        length: descLength,
      });
    } else if (descLength > 160) {
      results.tooLong.push({
        file: file.replace(projectRoot + '/', ''),
        url,
        description,
        length: descLength,
      });
    } else {
      results.ideal.push({
        file: file.replace(projectRoot + '/', ''),
        url,
        description,
        length: descLength,
      });
    }
  }

  // Report
  console.log('\n📊 Meta Description Length Analysis\n');
  console.log('='.repeat(60));

  console.log(`\n✅ Ideal Length (120-160 chars): ${results.ideal.length} pages`);
  console.log(`🟡 Too Short (< 120 chars): ${results.tooShort.length} pages`);
  console.log(`🔴 Too Long (> 160 chars): ${results.tooLong.length} pages`);
  console.log(`❌ Missing: ${results.missing.length} pages`);

  if (results.tooLong.length > 0) {
    console.log('\n🔴 Pages with Descriptions Too Long (> 160 chars):\n');
    results.tooLong.forEach((page) => {
      console.log(`  ${page.url}`);
      console.log(`    Length: ${page.length} chars`);
      console.log(`    Description: ${page.description.substring(0, 80)}...`);
      console.log(`    File: ${page.file}\n`);
    });
  }

  if (results.tooShort.length > 0) {
    console.log('\n🟡 Pages with Descriptions Too Short (< 120 chars):\n');
    results.tooShort.forEach((page) => {
      console.log(`  ${page.url}`);
      console.log(`    Length: ${page.length} chars`);
      console.log(`    Description: ${page.description}`);
      console.log(`    File: ${page.file}\n`);
    });
  }

  if (results.missing.length > 0) {
    console.log('\n❌ Pages Missing Descriptions:\n');
    results.missing.forEach((page) => {
      console.log(`  ${page.url}`);
      console.log(`    File: ${page.file}\n`);
    });
  }

  // Save report
  const report = {
    summary: {
      total: files.length,
      ideal: results.ideal.length,
      tooShort: results.tooShort.length,
      tooLong: results.tooLong.length,
      missing: results.missing.length,
    },
    tooLong: results.tooLong,
    tooShort: results.tooShort,
    missing: results.missing,
  };

  fs.writeFileSync(
    join(projectRoot, 'meta-description-analysis.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n💾 Full report saved to: meta-description-analysis.json\n');
}

main();

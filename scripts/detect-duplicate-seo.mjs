/**
 * Duplicate SEO Detection Script
 *
 * Scans all pages to find duplicate titles and descriptions.
 * Helps identify potential duplicate content issues.
 *
 * Usage: node scripts/detect-duplicate-seo.mjs
 */

/* eslint-env node */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Helper: Read file content
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// Helper: Find all Astro page files
function findPageFiles() {
  const pagesDir = join(projectRoot, 'src', 'pages');
  const files = fs.readdirSync(pagesDir, { recursive: true });
  return files.filter((file) => file.endsWith('.astro')).map((file) => join(pagesDir, file));
}

// Helper: Extract title and description from Astro file
function extractSEO(content, filePath) {
  const fileName = filePath.replace(join(projectRoot, 'src', 'pages') + '/', '');
  const seo = {
    file: fileName,
    title: null,
    description: null,
  };

  // Extract title from Layout component
  // Pattern: <Layout title="..." or title={`...`} or title={...}
  const titlePatterns = [
    /title\s*=\s*["']([^"']+)["']/,
    /title\s*=\s*\{`([^`]+)`\}/,
    /title\s*=\s*\{([^}]+)\}/,
  ];

  for (const pattern of titlePatterns) {
    const match = content.match(pattern);
    if (match) {
      seo.title = match[1] || match[2] || match[3];
      // Clean up template literals
      seo.title = seo.title.replace(/\$\{.*?\}/g, '[VAR]').trim();
      break;
    }
  }

  // Extract description from Layout component
  // Pattern: description="..." or description={`...`} or description={...}
  const descPatterns = [
    /description\s*=\s*["']([^"']+)["']/,
    /description\s*=\s*\{`([^`]+)`\}/,
    /description\s*=\s*\{([^}]+)\}/,
  ];

  for (const pattern of descPatterns) {
    const match = content.match(pattern);
    if (match) {
      seo.description = match[1] || match[2] || match[3];
      // Clean up template literals
      seo.description = seo.description.replace(/\$\{.*?\}/g, '[VAR]').trim();
      break;
    }
  }

  return seo;
}

// Main execution
async function main() {
  console.log('\n🔍 Detecting Duplicate Titles and Descriptions\n');
  console.log('======================================================================\n');

  const pageFiles = findPageFiles();
  console.log(`📋 Found ${pageFiles.length} page files\n`);

  const allSEO = [];
  for (let i = 0; i < pageFiles.length; i++) {
    process.stdout.write(`⏳ Processing ${i + 1}/${pageFiles.length}...\r`);
    const content = readFile(pageFiles[i]);
    if (content) {
      const seo = extractSEO(content, pageFiles[i]);
      if (seo.title || seo.description) {
        allSEO.push(seo);
      }
    }
  }
  process.stdout.write(`✅ Processed ${pageFiles.length} pages\n\n`);

  // Find duplicates
  const titleMap = new Map();
  const descMap = new Map();

  allSEO.forEach((seo) => {
    if (seo.title) {
      const normalizedTitle = seo.title.toLowerCase().trim();
      if (!titleMap.has(normalizedTitle)) {
        titleMap.set(normalizedTitle, []);
      }
      titleMap.get(normalizedTitle).push(seo.file);
    }

    if (seo.description) {
      const normalizedDesc = seo.description.toLowerCase().trim();
      if (!descMap.has(normalizedDesc)) {
        descMap.set(normalizedDesc, []);
      }
      descMap.get(normalizedDesc).push(seo.file);
    }
  });

  // Filter to only duplicates (2+ pages with same title/description)
  const duplicateTitles = Array.from(titleMap.entries()).filter(([, files]) => files.length > 1);
  const duplicateDescriptions = Array.from(descMap.entries()).filter(
    ([, files]) => files.length > 1
  );

  // Output results
  console.log('======================================================================');
  console.log('📊 DUPLICATE DETECTION RESULTS');
  console.log('======================================================================\n');

  console.log(`Total Pages Analyzed: ${allSEO.length}`);
  console.log(`Pages with Titles: ${allSEO.filter((s) => s.title).length}`);
  console.log(`Pages with Descriptions: ${allSEO.filter((s) => s.description).length}\n`);

  if (duplicateTitles.length > 0) {
    console.log('======================================================================');
    console.log('🔴 DUPLICATE TITLES');
    console.log('======================================================================\n');

    duplicateTitles.forEach(([title, files]) => {
      console.log(`Title: "${title}"`);
      console.log(`   Found in ${files.length} pages:`);
      files.forEach((file) => console.log(`   • ${file}`));
      console.log('');
    });
  } else {
    console.log('✅ No duplicate titles found!\n');
  }

  if (duplicateDescriptions.length > 0) {
    console.log('======================================================================');
    console.log('🔴 DUPLICATE DESCRIPTIONS');
    console.log('======================================================================\n');

    duplicateDescriptions.forEach(([desc, files]) => {
      const descPreview = desc.length > 80 ? desc.substring(0, 80) + '...' : desc;
      console.log(`Description: "${descPreview}"`);
      console.log(`   Found in ${files.length} pages:`);
      files.forEach((file) => console.log(`   • ${file}`));
      console.log('');
    });
  } else {
    console.log('✅ No duplicate descriptions found!\n');
  }

  // Save detailed report
  const outputPath = join(projectRoot, 'analysis-duplicate-seo.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        analyzedAt: new Date().toISOString(),
        summary: {
          totalPages: allSEO.length,
          pagesWithTitles: allSEO.filter((s) => s.title).length,
          pagesWithDescriptions: allSEO.filter((s) => s.description).length,
          duplicateTitles: duplicateTitles.length,
          duplicateDescriptions: duplicateDescriptions.length,
        },
        duplicateTitles: duplicateTitles.map(([title, files]) => ({
          title,
          files,
          count: files.length,
        })),
        duplicateDescriptions: duplicateDescriptions.map(([desc, files]) => ({
          description: desc,
          files,
          count: files.length,
        })),
        allSEO: allSEO,
      },
      null,
      2
    )
  );

  console.log(`📁 Detailed report saved: ${outputPath}\n`);

  // Summary
  if (duplicateTitles.length === 0 && duplicateDescriptions.length === 0) {
    console.log('🎉 Excellent! No duplicate SEO content found.\n');
  } else {
    console.log(
      `⚠️  Found ${duplicateTitles.length} duplicate title(s) and ${duplicateDescriptions.length} duplicate description(s).\n`
    );
    console.log('💡 Recommendation: Make titles and descriptions unique for each page.\n');
  }
}

main();

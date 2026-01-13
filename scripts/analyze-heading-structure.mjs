/**
 * Heading Structure Analyzer
 *
 * Ensures:
 * 1. Exactly one H1 per page
 * 2. Logical heading hierarchy (no skipping levels, e.g., H2 -> H4)
 *
 * Usage: node scripts/analyze-heading-structure.mjs
 */

import fs from 'fs';
import { join } from 'path';
import {
  findPageFiles,
  readFile,
  parseAstroFile,
  getRelativePagePath,
  projectRoot,
} from './utils.mjs';

function analyzeHeadings(filePath) {
  const content = readFile(filePath);
  if (!content) return null;

  const fileName = getRelativePagePath(filePath);
  const dom = parseAstroFile(content);
  const doc = dom.window.document;
  const issues = [];

  // 1. One H1 check
  const h1s = doc.querySelectorAll('h1');
  if (h1s.length === 0) {
    issues.push({
      type: 'missing-h1',
      message: 'Page is missing an H1 heading',
    });
  } else if (h1s.length > 1) {
    issues.push({
      type: 'multiple-h1',
      message: `Page has ${h1s.length} H1 headings (should have exactly 1)`,
    });
  }

  // 2. Hierarchy Check
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let currentLevel = 0; // effectively H0

  headings.forEach((h) => {
    const level = parseInt(h.tagName.substring(1));
    const text = h.textContent.trim().substring(0, 50);

    // Skip H1 check here as it is done above, but track it for hierarchy
    if (currentLevel !== 0 && level > currentLevel + 1) {
      // Skipped a level (e.g. H2 -> H4)
      issues.push({
        type: 'skipped-level',
        message: `Skipped heading level: H${currentLevel} -> H${level} ("${text}...")`,
      });
    }

    // Update current level
    currentLevel = level;
  });

  return {
    file: fileName,
    issues,
    headingCount: headings.length,
  };
}

// Main execution
async function main() {
  console.log('\n🔍 Analyzing Heading Structure (JSDOM-Enhanced)\n');
  console.log(
    '======================================================================\n'
  );

  const files = findPageFiles();
  const results = [];

  for (const file of files) {
    const res = analyzeHeadings(file);
    if (res) results.push(res);
  }

  const pagesWithIssues = results.filter((r) => r.issues.length > 0);

  console.log(`Analyzed ${files.length} pages.`);
  console.log(`Found ${pagesWithIssues.length} pages with structure issues.\n`);

  if (pagesWithIssues.length > 0) {
    pagesWithIssues.forEach((p) => {
      console.log(`📄 ${p.file}`);
      p.issues.forEach((i) => console.log(`   ❌ ${i.message}`));
      console.log('');
    });
    // Exit with error code for CI/CD
    process.exit(1);
  } else {
    console.log('✅ No heading structure issues found.');
  }

  // Save report
  const outputPath = join(projectRoot, 'analysis-heading-structure.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        analyzedAt: new Date().toISOString(),
        issues: pagesWithIssues,
      },
      null,
      2
    )
  );

  console.log(`📁 Detailed report saved: ${outputPath}\n`);
}

main();

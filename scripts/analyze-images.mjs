/**
 * Image Analysis Script
 *
 * Analyzes all images in the codebase to identify:
 * - Missing srcset attributes
 * - Missing alt attributes
 * - Missing width/height
 * - Missing loading attributes
 * - SVG vs raster images
 *
 * Usage: node scripts/analyze-images.mjs
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Find all .astro files
function findAstroFiles(directory) {
  const files = [];

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach((entry) => {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.astro')) {
        files.push(fullPath);
      }
    });
  }

  scanDir(directory);
  return files;
}

// Analyze images in a file
function analyzeImages(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];

  // Find all <img> tags
  const imgRegex = /<img([^>]+)>/gi;
  const matches = [...content.matchAll(imgRegex)];

  matches.forEach((match) => {
    const imgTag = match[0];
    const attributes = match[1];
    const lineNumber = content.substring(0, match.index).split('\n').length;

    const imageIssues = {
      file: filePath.replace(projectRoot + '/', ''),
      line: lineNumber,
      tag: imgTag,
      issues: [],
    };

    // Check for src
    const srcMatch = attributes.match(/src\s*=\s*["']([^"']+)["']/);
    if (!srcMatch) {
      imageIssues.issues.push({ type: 'missing-src', severity: 'critical' });
    } else {
      const src = srcMatch[1];
      const isSvg = src.toLowerCase().endsWith('.svg');

      // Check for alt
      if (!attributes.includes('alt=')) {
        imageIssues.issues.push({ type: 'missing-alt', severity: 'high' });
      }

      // Check for width/height
      if (!attributes.match(/width\s*=/)) {
        imageIssues.issues.push({ type: 'missing-width', severity: 'medium' });
      }
      if (!attributes.match(/height\s*=/)) {
        imageIssues.issues.push({ type: 'missing-height', severity: 'medium' });
      }

      // Check for loading attribute
      if (!attributes.match(/loading\s*=/)) {
        imageIssues.issues.push({ type: 'missing-loading', severity: 'low' });
      }

      // Check for decoding attribute
      if (!attributes.match(/decoding\s*=/)) {
        imageIssues.issues.push({ type: 'missing-decoding', severity: 'low' });
      }

      // For raster images, check for srcset
      if (!isSvg && !attributes.match(/srcset\s*=/)) {
        imageIssues.issues.push({
          type: 'missing-srcset',
          severity: 'high',
          note: 'Raster images should have srcset for responsive loading',
        });
      }

      imageIssues.src = src;
      imageIssues.isSvg = isSvg;
    }

    if (imageIssues.issues.length > 0) {
      issues.push(imageIssues);
    }
  });

  return issues;
}

// Main analysis
function main() {
  console.log('\n🔍 Analyzing Images in Codebase\n');
  console.log('='.repeat(70));

  const srcDir = join(projectRoot, 'src');
  const files = findAstroFiles(srcDir);

  console.log(`\n📁 Found ${files.length} .astro files\n`);

  const allIssues = [];
  let totalImages = 0;

  files.forEach((file) => {
    const issues = analyzeImages(file);
    if (issues.length > 0) {
      allIssues.push(...issues);
      totalImages += issues.length;
    }
  });

  // Group issues by type
  const issuesByType = {
    'missing-srcset': [],
    'missing-alt': [],
    'missing-width': [],
    'missing-height': [],
    'missing-loading': [],
    'missing-decoding': [],
  };

  allIssues.forEach((imageIssue) => {
    imageIssue.issues.forEach((issue) => {
      if (issuesByType[issue.type]) {
        issuesByType[issue.type].push(imageIssue);
      }
    });
  });

  // Display results
  console.log('📊 ANALYSIS RESULTS\n');
  console.log(`Total images found: ${totalImages}`);
  console.log(`Images with issues: ${allIssues.length}\n`);

  // Missing srcset (for raster images)
  const rasterMissingSrcset = issuesByType['missing-srcset'].filter((i) => !i.isSvg);
  if (rasterMissingSrcset.length > 0) {
    console.log(`🔴 Missing srcset (raster images): ${rasterMissingSrcset.length}`);
    rasterMissingSrcset.slice(0, 5).forEach((issue) => {
      console.log(`   - ${issue.file}:${issue.line} (${issue.src})`);
    });
    if (rasterMissingSrcset.length > 5) {
      console.log(`   ... and ${rasterMissingSrcset.length - 5} more`);
    }
    console.log('');
  }

  // Missing alt
  if (issuesByType['missing-alt'].length > 0) {
    console.log(`🔴 Missing alt attribute: ${issuesByType['missing-alt'].length}`);
    issuesByType['missing-alt'].slice(0, 5).forEach((issue) => {
      console.log(`   - ${issue.file}:${issue.line}`);
    });
    if (issuesByType['missing-alt'].length > 5) {
      console.log(`   ... and ${issuesByType['missing-alt'].length - 5} more`);
    }
    console.log('');
  }

  // Missing width/height
  if (issuesByType['missing-width'].length > 0 || issuesByType['missing-height'].length > 0) {
    console.log(
      `🟡 Missing width/height: ${issuesByType['missing-width'].length + issuesByType['missing-height'].length}`
    );
    console.log('');
  }

  // Missing loading/decoding
  if (issuesByType['missing-loading'].length > 0) {
    console.log(`🟡 Missing loading attribute: ${issuesByType['missing-loading'].length}`);
  }
  if (issuesByType['missing-decoding'].length > 0) {
    console.log(`🟡 Missing decoding attribute: ${issuesByType['missing-decoding'].length}`);
  }

  // Recommendations
  console.log('\n\n💡 RECOMMENDATIONS\n');
  console.log('='.repeat(70));

  if (rasterMissingSrcset.length > 0) {
    console.log('\n1. Add srcset to raster images:');
    console.log('   - Use OptimizedImage component for new images');
    console.log('   - Or add srcset manually: srcset="/img-320w.webp 320w, /img-640w.webp 640w"');
  }

  if (issuesByType['missing-alt'].length > 0) {
    console.log('\n2. Add alt attributes:');
    console.log('   - All images need descriptive alt text');
    console.log('   - Use alt="" only for decorative images (with aria-hidden="true")');
  }

  if (issuesByType['missing-loading'].length > 0) {
    console.log('\n3. Add loading attributes:');
    console.log('   - Use loading="eager" for above-the-fold images (like logos)');
    console.log('   - Use loading="lazy" for below-the-fold images');
  }

  // Save report
  const report = {
    analyzedAt: new Date().toISOString(),
    totalFiles: files.length,
    totalImages: totalImages,
    imagesWithIssues: allIssues.length,
    issuesByType: {
      missingSrcset: rasterMissingSrcset.length,
      missingAlt: issuesByType['missing-alt'].length,
      missingWidth: issuesByType['missing-width'].length,
      missingHeight: issuesByType['missing-height'].length,
      missingLoading: issuesByType['missing-loading'].length,
      missingDecoding: issuesByType['missing-decoding'].length,
    },
    detailedIssues: allIssues,
  };

  const reportPath = join(projectRoot, 'analysis-images.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n\n📁 Detailed report saved: ${reportPath}\n`);
}

main();

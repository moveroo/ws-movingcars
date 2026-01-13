/**
 * Site-Wide Issue Analyzer (Code-Based)
 *
 * Analyzes the codebase to identify SEO issues that affect all/most pages
 * by examining how titles, meta descriptions, and other elements are generated.
 *
 * Usage: node scripts/analyze-sitewide-issues.mjs
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuration
const SITE_NAME = 'Moving Again';
const SITE_NAME_SUFFIX_LENGTH = ` | ${SITE_NAME}`.length; // 18 characters

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
  const pages = [];

  function scanDirectory(dir, basePath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach((entry) => {
      const fullPath = join(dir, entry.name);
      const relativePath = join(basePath, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath, relativePath);
      } else if (entry.name.endsWith('.astro')) {
        pages.push({
          path: fullPath,
          relativePath: relativePath.replace(/\\/g, '/'),
          name: entry.name,
        });
      }
    });
  }

  scanDirectory(pagesDir);
  return pages;
}

// Analyze SEO component
function analyzeSEOComponent() {
  const seoPath = join(projectRoot, 'src', 'components', 'SEO.astro');
  const content = readFile(seoPath);

  if (!content) {
    return { error: 'SEO.astro not found' };
  }

  const issues = [];

  // Check title generation
  const titleMatch = content.match(/const pageTitle = (.+?);/s);
  if (titleMatch) {
    const titleLogic = titleMatch[1];
    if (titleLogic.includes(`| ${SITE_NAME}`)) {
      issues.push({
        type: 'title-suffix',
        severity: 'high',
        issue: `Title format includes " | ${SITE_NAME}" suffix (${SITE_NAME_SUFFIX_LENGTH} chars)`,
        location: 'src/components/SEO.astro',
        line: findLineNumber(content, 'const pageTitle'),
        problem:
          'If page title is 50-60 chars, adding suffix makes it 68-78 chars (too long). Google truncates at ~60 chars.',
        fix: 'Truncate title before adding suffix, or make suffix conditional based on length',
      });
    }
  }

  // Check meta description
  const descMatch = content.match(/description = (.+?);/s);
  if (descMatch) {
    const descLogic = descMatch[1];
    if (descLogic.includes('PUBLIC_SITE_DESCRIPTION') || descLogic.includes("''")) {
      issues.push({
        type: 'meta-description-default',
        severity: 'medium',
        issue: 'Meta description has empty default fallback',
        location: 'src/components/SEO.astro',
        line: findLineNumber(content, 'description ='),
        problem: 'Pages without explicit description will have empty/very short meta description',
        fix: 'Add better default or require description prop',
      });
    }
  }

  // Check content freshness
  const freshnessMatch = content.match(/article:modified_time/);
  if (freshnessMatch) {
    const freshnessLine = content
      .split('\n')
      .findIndex((line) => line.includes('article:modified_time'));
    const usesBuildTime = content.includes('new Date().toISOString()');
    if (usesBuildTime) {
      issues.push({
        type: 'content-freshness-build-time',
        severity: 'low',
        issue: 'Content freshness uses build time, not actual page modification date',
        location: 'src/components/SEO.astro',
        line: freshnessLine + 1,
        problem: 'May not be detected as "fresh" content by crawlers',
        fix: 'Use actual page modification dates if available, or Git commit dates',
      });
    }
  } else {
    issues.push({
      type: 'content-freshness-missing',
      severity: 'medium',
      issue: 'Content freshness meta tag not found',
      location: 'src/components/SEO.astro',
      problem: 'All pages missing content freshness signal',
      fix: 'Add article:modified_time meta tag',
    });
  }

  return { issues, content };
}

// Find line number in content
function findLineNumber(content, searchText) {
  const lines = content.split('\n');
  const index = lines.findIndex((line) => line.includes(searchText));
  return index >= 0 ? index + 1 : null;
}

// Analyze individual pages
function analyzePage(page) {
  const content = readFile(page.path);
  if (!content) return null;

  const issues = [];
  const analysis = {
    file: page.relativePath,
    hasTitle: false,
    hasDescription: false,
    titleLength: null,
    descriptionLength: null,
    issues: [],
  };

  // Check for Layout component with title/description props
  // Pattern: <Layout title="..." description="...">
  const layoutMatch = content.match(/<Layout\s+([^>]+)>/);

  if (layoutMatch) {
    const layoutProps = layoutMatch[1];

    // Check title prop (can be string literal or template literal)
    const titleMatch =
      layoutProps.match(/title\s*=\s*["']([^"']+)["']/) ||
      layoutProps.match(/title\s*=\s*\{`([^`]+)`\}/) ||
      layoutProps.match(/title\s*=\s*\{([^}]+)\}/);

    if (titleMatch) {
      analysis.hasTitle = true;
      // For template literals/variables, we can't determine length, but we know it exists
      const title = titleMatch[1];
      if (!title.includes('{') && !title.includes('$')) {
        // It's a string literal, we can measure it
        analysis.titleLength = title.length;
        const totalLength = title.length + SITE_NAME_SUFFIX_LENGTH;

        if (totalLength > 60) {
          issues.push({
            type: 'title-too-long',
            severity: 'medium',
            issue: `Title will be ${totalLength} chars (ideal: 50-60)`,
            title: title,
            totalLength: totalLength,
          });
        } else if (totalLength < 50) {
          issues.push({
            type: 'title-too-short',
            severity: 'low',
            issue: `Title will be ${totalLength} chars (ideal: 50-60)`,
            title: title,
            totalLength: totalLength,
          });
        }
      } else {
        // Dynamic title - can't measure but exists
        analysis.titleLength = 'dynamic';
      }
    } else {
      issues.push({
        type: 'title-missing',
        severity: 'high',
        issue: 'No title prop in Layout component',
      });
    }

    // Check description prop
    const descMatch =
      layoutProps.match(/description\s*=\s*["']([^"']+)["']/) ||
      layoutProps.match(/description\s*=\s*\{`([^`]+)`\}/) ||
      layoutProps.match(/description\s*=\s*\{([^}]+)\}/);

    if (descMatch) {
      analysis.hasDescription = true;
      const desc = descMatch[1];
      if (!desc.includes('{') && !desc.includes('$')) {
        // String literal
        const cleanDesc = desc.trim();
        analysis.descriptionLength = cleanDesc.length;

        if (cleanDesc.length < 120) {
          issues.push({
            type: 'description-too-short',
            severity: 'medium',
            issue: `Description is ${cleanDesc.length} chars (ideal: 150-160)`,
            description: cleanDesc.substring(0, 50) + '...',
          });
        } else if (cleanDesc.length > 170) {
          issues.push({
            type: 'description-too-long',
            severity: 'medium',
            issue: `Description is ${cleanDesc.length} chars (ideal: 150-160)`,
            description: cleanDesc.substring(0, 50) + '...',
          });
        }
      } else {
        // Dynamic description
        analysis.descriptionLength = 'dynamic';
      }
    } else {
      issues.push({
        type: 'description-missing',
        severity: 'medium',
        issue: 'No description prop in Layout component',
      });
    }
  } else {
    // No Layout component found
    issues.push({
      type: 'layout-missing',
      severity: 'high',
      issue: 'No Layout component found',
    });
  }

  analysis.issues = issues;
  return analysis;
}

// Main analysis function
function analyzeCodebase() {
  console.log('\n🔍 Analyzing Codebase for Site-Wide SEO Issues\n');
  console.log('='.repeat(70));

  // 1. Analyze SEO component
  console.log('\n📋 Step 1: Analyzing SEO Component...\n');
  const seoAnalysis = analyzeSEOComponent();

  if (seoAnalysis.error) {
    console.error(`❌ ${seoAnalysis.error}`);
    return;
  }

  console.log(`✅ Analyzed: src/components/SEO.astro`);
  console.log(`   Found ${seoAnalysis.issues.length} potential site-wide issues\n`);

  // 2. Find and analyze all pages
  console.log('📋 Step 2: Analyzing Page Files...\n');
  const pages = findPageFiles();
  console.log(`✅ Found ${pages.length} page files\n`);

  const pageAnalyses = [];
  let processed = 0;

  pages.forEach((page) => {
    process.stdout.write(`\r⏳ Processing ${processed + 1}/${pages.length}...`);
    const analysis = analyzePage(page);
    if (analysis) {
      pageAnalyses.push(analysis);
    }
    processed++;
  });

  console.log(`\n\n✅ Processed ${processed} pages\n`);

  // 3. Aggregate findings
  console.log('📊 Step 3: Aggregating Findings...\n');

  const titleIssues = {
    tooLong: [],
    tooShort: [],
    missing: [],
  };

  const descriptionIssues = {
    tooShort: [],
    tooLong: [],
    missing: [],
  };

  pageAnalyses.forEach((analysis) => {
    analysis.issues.forEach((issue) => {
      if (issue.type === 'title-too-long') titleIssues.tooLong.push(analysis);
      if (issue.type === 'title-too-short') titleIssues.tooShort.push(analysis);
      if (issue.type === 'title-missing') titleIssues.missing.push(analysis);
      if (issue.type === 'description-too-short') descriptionIssues.tooShort.push(analysis);
      if (issue.type === 'description-too-long') descriptionIssues.tooLong.push(analysis);
      if (issue.type === 'description-missing') descriptionIssues.missing.push(analysis);
    });
  });

  // 4. Display results
  console.log('='.repeat(70));
  console.log('📊 ANALYSIS RESULTS');
  console.log('='.repeat(70));

  // SEO Component Issues
  console.log('\n🔴 Site-Wide Issues (from SEO Component):\n');

  if (seoAnalysis.issues.length === 0) {
    console.log('   ✅ No site-wide issues detected in SEO component\n');
  } else {
    seoAnalysis.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.issue}`);
      console.log(`   Type: ${issue.type}`);
      console.log(`   Severity: ${issue.severity.toUpperCase()}`);
      console.log(`   Location: ${issue.location}${issue.line ? ` (line ${issue.line})` : ''}`);
      console.log(`   Problem: ${issue.problem}`);
      console.log(`   Fix: ${issue.fix}`);
      console.log('');
    });
  }

  // Title Issues
  const totalTitleIssues =
    titleIssues.tooLong.length + titleIssues.tooShort.length + titleIssues.missing.length;
  const titleIssuePercentage = Math.round((totalTitleIssues / pages.length) * 100);

  console.log(
    `\n📝 Title Tag Issues (${totalTitleIssues}/${pages.length} pages, ${titleIssuePercentage}%):\n`
  );

  if (titleIssues.tooLong.length > 0) {
    console.log(`   🔴 Too Long (${titleIssues.tooLong.length} pages):`);
    console.log(`      Titles will exceed 60 chars after adding " | ${SITE_NAME}" suffix`);
    console.log(
      `      Sample: ${titleIssues.tooLong
        .slice(0, 3)
        .map((p) => p.file)
        .join(', ')}`
    );
    if (titleIssues.tooLong.length > 3) {
      console.log(`      ... and ${titleIssues.tooLong.length - 3} more`);
    }
    console.log('');
  }

  if (titleIssues.tooShort.length > 0) {
    console.log(`   🟡 Too Short (${titleIssues.tooShort.length} pages):`);
    console.log(`      Titles will be under 50 chars after adding suffix`);
    console.log(
      `      Sample: ${titleIssues.tooShort
        .slice(0, 3)
        .map((p) => p.file)
        .join(', ')}`
    );
    if (titleIssues.tooShort.length > 3) {
      console.log(`      ... and ${titleIssues.tooShort.length - 3} more`);
    }
    console.log('');
  }

  if (titleIssues.missing.length > 0) {
    console.log(`   🔴 Missing (${titleIssues.missing.length} pages):`);
    console.log(`      Pages without title prop`);
    console.log(
      `      Sample: ${titleIssues.missing
        .slice(0, 5)
        .map((p) => p.file)
        .join(', ')}`
    );
    if (titleIssues.missing.length > 5) {
      console.log(`      ... and ${titleIssues.missing.length - 5} more`);
    }
    console.log('');
  }

  // Description Issues
  const totalDescIssues =
    descriptionIssues.tooShort.length +
    descriptionIssues.tooLong.length +
    descriptionIssues.missing.length;
  const descIssuePercentage = Math.round((totalDescIssues / pages.length) * 100);

  console.log(
    `\n📄 Meta Description Issues (${totalDescIssues}/${pages.length} pages, ${descIssuePercentage}%):\n`
  );

  if (descriptionIssues.tooShort.length > 0) {
    console.log(`   🟡 Too Short (${descriptionIssues.tooShort.length} pages):`);
    console.log(`      Descriptions under 120 chars (ideal: 150-160)`);
    console.log(
      `      Sample: ${descriptionIssues.tooShort
        .slice(0, 3)
        .map((p) => p.file)
        .join(', ')}`
    );
    if (descriptionIssues.tooShort.length > 3) {
      console.log(`      ... and ${descriptionIssues.tooShort.length - 3} more`);
    }
    console.log('');
  }

  if (descriptionIssues.tooLong.length > 0) {
    console.log(`   🟡 Too Long (${descriptionIssues.tooLong.length} pages):`);
    console.log(`      Descriptions over 170 chars (ideal: 150-160)`);
    console.log(
      `      Sample: ${descriptionIssues.tooLong
        .slice(0, 3)
        .map((p) => p.file)
        .join(', ')}`
    );
    if (descriptionIssues.tooLong.length > 3) {
      console.log(`      ... and ${descriptionIssues.tooLong.length - 3} more`);
    }
    console.log('');
  }

  if (descriptionIssues.missing.length > 0) {
    console.log(`   🔴 Missing (${descriptionIssues.missing.length} pages):`);
    console.log(`      Pages without description prop`);
    console.log(
      `      Sample: ${descriptionIssues.missing
        .slice(0, 5)
        .map((p) => p.file)
        .join(', ')}`
    );
    if (descriptionIssues.missing.length > 5) {
      console.log(`      ... and ${descriptionIssues.missing.length - 5} more`);
    }
    console.log('');
  }

  // Generate summary
  console.log('='.repeat(70));
  console.log('💡 FIX RECOMMENDATIONS');
  console.log('='.repeat(70));

  const recommendations = [];

  // Title suffix issue
  if (seoAnalysis.issues.some((i) => i.type === 'title-suffix') || titleIssues.tooLong.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'Title Tag Length - Suffix makes titles too long',
      affectedPages: titleIssues.tooLong.length,
      fixLocation: 'src/components/SEO.astro',
      fix: `Modify title generation to truncate before adding suffix:
      
      const maxTitleLength = 60;
      const suffix = \` | \${siteName}\`;
      const maxTitleWithoutSuffix = maxTitleLength - suffix.length;
      const truncatedTitle = title.length > maxTitleWithoutSuffix 
        ? title.substring(0, maxTitleWithoutSuffix - 3) + '...'
        : title;
      const pageTitle = truncatedTitle + suffix;`,
    });
  }

  // Meta description issues
  if (descriptionIssues.missing.length > 0 || descriptionIssues.tooShort.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: 'Meta Description - Missing or too short',
      affectedPages: descriptionIssues.missing.length + descriptionIssues.tooShort.length,
      fixLocation: 'src/components/SEO.astro + individual pages',
      fix: `1. Add validation/warning for missing descriptions
      2. Add better default descriptions
      3. Consider auto-generating from page content`,
    });
  }

  if (descriptionIssues.tooLong.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: 'Meta Description - Too long',
      affectedPages: descriptionIssues.tooLong.length,
      fixLocation: 'src/components/SEO.astro',
      fix: `Auto-truncate descriptions to 160 chars:
      
      const truncatedDesc = description.length > 160
        ? description.substring(0, 157) + '...'
        : description;`,
    });
  }

  recommendations.forEach((rec, index) => {
    console.log(`\n${index + 1}. ${rec.issue}`);
    console.log(`   Priority: ${rec.priority}`);
    console.log(`   Affected: ${rec.affectedPages} pages`);
    console.log(`   Location: ${rec.fixLocation}`);
    console.log(
      `   Fix:\n${rec.fix
        .split('\n')
        .map((l) => `      ${l}`)
        .join('\n')}`
    );
  });

  // Save report
  const report = {
    analyzedAt: new Date().toISOString(),
    totalPages: pages.length,
    seoComponentIssues: seoAnalysis.issues,
    titleIssues: {
      tooLong: titleIssues.tooLong.length,
      tooShort: titleIssues.tooShort.length,
      missing: titleIssues.missing.length,
      total: totalTitleIssues,
      percentage: titleIssuePercentage,
    },
    descriptionIssues: {
      tooShort: descriptionIssues.tooShort.length,
      tooLong: descriptionIssues.tooLong.length,
      missing: descriptionIssues.missing.length,
      total: totalDescIssues,
      percentage: descIssuePercentage,
    },
    recommendations,
    detailedPages: pageAnalyses.filter((p) => p.issues.length > 0),
  };

  const reportPath = join(projectRoot, 'analysis-sitewide-code.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n\n📁 Detailed report saved: ${reportPath}\n`);

  return report;
}

// Run analysis
analyzeCodebase();

/**
 * Check all pages for schema issues
 *
 * Checks for:
 * - Missing telephone in LocalBusiness schema
 * - Missing FAQPage schema where FAQs exist
 * - Missing BreadcrumbList schema
 * - Missing aggregateRating where applicable
 *
 * Usage: node scripts/check-schema-issues.mjs
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

// Helper: Extract schema JSON-LD info using JSDOM
function analyzeSchema(filePath) {
  const content = readFile(filePath);
  if (!content) return null;

  const fileName = getRelativePagePath(filePath);
  const issues = [];
  const dom = parseAstroFile(content);
  const doc = dom.window.document;

  // 1. Find all JSON-LD scripts
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  let schemas = [];

  // Note: static analysis of dynamic JSON-LD in Astro often appears as raw text in the script tag
  // often template literals. We try to parse valid JSON, or regex match known fields if JSON parse fails.

  scripts.forEach((script) => {
    try {
      const json = JSON.parse(script.textContent);
      if (Array.isArray(json)) schemas.push(...json);
      else schemas.push(json);
    } catch (e) {
      // If it's a template literal or has variables, JSON.parse fails.
      // We'll treat the raw text as a "schema blob" to check for keys.
      schemas.push({ _raw: script.textContent });
    }
  });

  // Also check for "schema-org" integration props if used (usually via component props)
  // But usually schema is output as JSON-LD.

  const allSchemaText = schemas
    .map((s) => (s._raw ? s._raw : JSON.stringify(s)))
    .join(' ');

  // CHECK: LocalBusiness
  const hasLocalBusiness = allSchemaText.includes('LocalBusiness');
  if (hasLocalBusiness) {
    if (!allSchemaText.includes('telephone')) {
      issues.push({
        type: 'missing-telephone',
        severity: 'high',
        message: 'LocalBusiness schema missing telephone field',
      });
    }
  }

  // CHECK: FAQ Content matching
  const detailsTags = doc.querySelectorAll('details');
  const faqCount = Array.from(detailsTags).filter(
    (d) =>
      d.textContent.toLowerCase().includes('faq') || d.querySelector('summary')
  ).length;

  if (faqCount > 0) {
    const hasFAQSchema = allSchemaText.includes('FAQPage');
    if (!hasFAQSchema) {
      issues.push({
        type: 'missing-faq-schema',
        severity: 'medium',
        message: `Found ${faqCount} FAQ-like items (<details>) but no FAQPage schema`,
        faqCount,
      });
    }
  }

  // CHECK: BreadcrumbList
  const hasBreadcrumbSchema = allSchemaText.includes('BreadcrumbList');
  const isHomepage = fileName === 'index.astro';
  const isDynamicRoute = fileName.includes('[') || fileName.includes(']');

  if (!isHomepage && !isDynamicRoute && !hasBreadcrumbSchema) {
    issues.push({
      type: 'missing-breadcrumb',
      severity: 'low',
      message: 'Page could benefit from BreadcrumbList schema',
    });
  }

  // CHECK: AggregateRating
  if (
    hasLocalBusiness &&
    !allSchemaText.includes('aggregateRating') &&
    !allSchemaText.includes('AggregateRating')
  ) {
    issues.push({
      type: 'missing-rating',
      severity: 'low',
      message:
        'LocalBusiness could include aggregateRating for star snippets (optional)',
    });
  }

  return {
    file: fileName,
    hasLocalBusiness,
    issues,
  };
}

// Main analysis
async function main() {
  console.log('\n🔍 Checking All Pages for Schema Issues (JSDOM-Enhanced)\n');
  console.log('='.repeat(70));

  const files = findPageFiles();
  console.log(`\n📄 Found ${files.length} pages to analyze\n`);

  const results = [];
  for (const file of files) {
    const res = analyzeSchema(file);
    if (res) results.push(res);
  }

  // Group issues by type
  const issuesByType = {
    'missing-telephone': [],
    'missing-faq-schema': [],
    'missing-breadcrumb': [],
    'missing-rating': [],
  };

  results.forEach((result) => {
    result.issues.forEach((issue) => {
      if (issuesByType[issue.type]) {
        issuesByType[issue.type].push({
          file: result.file,
          ...issue,
        });
      }
    });
  });

  // Report results
  let totalIssues = 0;

  // High priority: Missing telephone
  if (issuesByType['missing-telephone'].length > 0) {
    console.log(
      '\n🔴 HIGH PRIORITY: Missing Telephone in LocalBusiness Schema'
    );
    console.log('─'.repeat(70));
    issuesByType['missing-telephone'].forEach((issue) => {
      console.log(`  ❌ ${issue.file}`);
      console.log(`     ${issue.message}`);
    });
    totalIssues += issuesByType['missing-telephone'].length;
  }

  // Medium priority: Missing FAQ schema
  if (issuesByType['missing-faq-schema'].length > 0) {
    console.log('\n🟡 MEDIUM PRIORITY: Missing FAQPage Schema');
    console.log('─'.repeat(70));
    issuesByType['missing-faq-schema'].slice(0, 10).forEach((issue) => {
      console.log(`  ⚠️  ${issue.file} (${issue.message})`);
    });
    totalIssues += issuesByType['missing-faq-schema'].length;
  }

  // Low priority: Missing breadcrumbs
  if (issuesByType['missing-breadcrumb'].length > 0) {
    console.log('\n🔵 LOW PRIORITY: Missing BreadcrumbList Schema');
    console.log('─'.repeat(70));
    const toShow = issuesByType['missing-breadcrumb'].slice(0, 5);
    toShow.forEach((issue) => console.log(`  💡 ${issue.file}`));
    if (issuesByType['missing-breadcrumb'].length > 5) {
      console.log(
        `  ... and ${issuesByType['missing-breadcrumb'].length - 5} more pages`
      );
    }
    totalIssues += issuesByType['missing-breadcrumb'].length;
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY\n');
  console.log(`Total Pages Analyzed: ${files.length}`);
  console.log(
    `Pages with Issues: ${results.filter((r) => r.issues.length > 0).length}`
  );
  console.log(`\nIssue Breakdown:`);
  console.log(
    `  🔴 Missing Telephone: ${issuesByType['missing-telephone'].length}`
  );
  console.log(
    `  🟡 Missing FAQ Schema: ${issuesByType['missing-faq-schema'].length}`
  );
  console.log(
    `  🔵 Missing Breadcrumbs: ${issuesByType['missing-breadcrumb'].length}`
  );

  if (totalIssues === 0) {
    console.log('\n✅ No critical schema issues found!');
  } else {
    console.log(`\n⚠️  Total Issues Found: ${totalIssues}`);
  }

  // Save report
  const reportPath = join(projectRoot, 'schema-issues-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        analyzedAt: new Date().toISOString(),
        totalPages: files.length,
        issuesByType,
        allResults: results,
      },
      null,
      2
    )
  );

  console.log(`\n💾 Detailed report saved to: schema-issues-report.json\n`);
}

main();

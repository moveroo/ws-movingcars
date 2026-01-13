/**
 * Check results for a specific scan/audit ID
 * Usage: node scripts/check-scan-results.mjs 437
 */

/* global */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const API_BASE = 'https://technical.again.com.au/api';
const TOKEN = process.env.SEO_AUDITOR_TOKEN;

if (!TOKEN) {
  console.error('❌ SEO_AUDITOR_TOKEN not found in .env file');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// Helper: Make API request
async function apiRequest(endpoint, options = {}) {
  // Add cache-busting parameter to force fresh data
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${API_BASE}${endpoint}${separator}_t=${Date.now()}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  } else {
    const text = await response.text();
    throw new Error(`API returned non-JSON response: ${text.substring(0, 200)}`);
  }
}

// Display page audit results
function displayPageResults(results, scanId) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 PAGE AUDIT RESULTS');
  console.log('='.repeat(60));

  if (results.url || results.target_url) {
    console.log(`\n🔗 URL: ${results.url || results.target_url}`);
  }

  console.log(`\n🎯 Overall Score: ${results.overall_score || 'N/A'}/100`);

  if (results.status) {
    console.log(`📋 Status: ${results.status}`);
  }

  if (results.summary) {
    console.log(`\n📝 Summary:\n${results.summary}\n`);
  }

  if (results.action_items && results.action_items.length > 0) {
    console.log('\n📋 Action Items:\n');

    results.action_items.forEach((category) => {
      const categoryName = category.category || category.name || 'Uncategorized';
      const categoryScore =
        category.category_score !== undefined ? ` (${category.category_score}/100)` : '';
      console.log(`\n${categoryName}${categoryScore}:`);

      if (category.issues && Array.isArray(category.issues)) {
        category.issues.forEach((issue) => {
          const icon = issue.status === 'fail' ? '🔴' : '🟡';
          const checkName = issue.check_name || issue.title || issue.name || 'Issue';
          console.log(`  ${icon} ${checkName}`);
          if (issue.issue_detected) {
            console.log(`     📋 ${issue.issue_detected}`);
          }
          if (issue.description) {
            console.log(`     ${issue.description}`);
          }
          if (issue.remediation) {
            console.log(`     💡 Fix: ${issue.remediation}`);
          }
        });
      }
    });
  }

  // Save full JSON for inspection
  if (scanId) {
    const jsonPath = join(__dirname, '..', `scan-${scanId}-full.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Full results saved to: scan-${scanId}-full.json`);
  }

  if (results.category_scores) {
    console.log('\n📊 Category Scores:');
    Object.entries(results.category_scores).forEach(([category, score]) => {
      console.log(`  ${category}: ${score}/100`);
    });
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// Display crawl results
function displayCrawlResults(crawl) {
  console.log('='.repeat(60));
  console.log('📊 CRAWL RESULTS');
  console.log('='.repeat(60));

  console.log(
    `\n🎯 Health Score: ${crawl.score !== null && crawl.score !== undefined ? `${crawl.score}/100` : 'N/A'}`
  );
  console.log(`📄 Pages Processed: ${crawl.progress?.processed || 0}`);
  console.log(`📊 Total Pages Found: ${crawl.progress?.total || 0}`);
  console.log(`❌ Failed Pages: ${crawl.progress?.failed || 0}`);

  if (crawl.timestamps) {
    console.log(`🕐 Started: ${crawl.timestamps.created_at}`);
    console.log(`🕐 Completed: ${crawl.timestamps.completed_at}`);
  }

  if (crawl.issues && crawl.issues.length > 0) {
    console.log(`\n⚠️  Issues Found: ${crawl.issues_count || crawl.issues.length} types\n`);

    crawl.issues.forEach((issue) => {
      const issueType = issue.type || 'Unknown Issue';
      const issueName = issueType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

      console.log(`\n${issueName}:`);
      console.log(`  Count: ${issue.count || 'N/A'}`);
      console.log(`  Message: ${issue.message || 'No description'}`);

      if (issue.data && issue.data.length > 0) {
        console.log(`  Affected URLs (showing first 10):`);
        issue.data.slice(0, 10).forEach((url) => {
          console.log(`    - ${url}`);
        });
        if (issue.data.length > 10) {
          console.log(`    ... and ${issue.data.length - 10} more`);
        }
      }
    });
  } else {
    console.log('\n✅ No issues found!');
  }

  if (crawl.audits && crawl.audits.length > 0) {
    console.log('\n📄 Page Scores (sorted by lowest first):\n');

    const sortedAudits = [...crawl.audits].sort((a, b) => (a.score || 0) - (b.score || 0));

    sortedAudits.forEach((audit) => {
      const score = audit.score !== undefined ? `${audit.score}/100` : 'N/A';
      const url = audit.url || audit.target_url || 'Unknown URL';
      console.log(`  ${score.padEnd(6)} - ${url}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

// Main
const scanId = process.argv[2];

if (!scanId) {
  console.error('❌ Please provide a scan ID: node scripts/check-scan-results.mjs 437');
  process.exit(1);
}

(async () => {
  try {
    // Try as page audit first
    console.log(`\n🔍 Checking page audit ID: ${scanId}...\n`);
    try {
      const auditResults = await apiRequest(`/audit/${scanId}`);
      if (auditResults.status === 'completed' || auditResults.overall_score !== undefined) {
        displayPageResults(auditResults, scanId);
        return;
      }
    } catch {
      // Not a page audit, try as crawl
      console.log(`⚠️  Not a page audit, trying as crawl...\n`);
    }

    // Try as crawl
    const response = await apiRequest(`/crawls/${scanId}`);
    const crawl = response.data || response;
    displayCrawlResults(crawl);
  } catch (error) {
    console.error(`\n❌ Error fetching results: ${error.message}`);
    console.error(`\n💡 Make sure the scan ID is correct and the scan has completed.`);
    process.exit(1);
  }
})();

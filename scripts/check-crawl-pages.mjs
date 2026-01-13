/**
 * SEO Technical Crawler - Detailed Page Analysis
 *
 * Fetches detailed information for each page in a crawl
 * Run with: node scripts/check-crawl-pages.mjs [crawlId]
 */

import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
async function apiRequest(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Get crawl status
async function getCrawlStatus(crawlId) {
  const response = await apiRequest(`/crawls/${crawlId}`);
  // Handle API response wrapped in 'data' object
  return response.data || response;
}

// Get audit details
async function getAuditDetails(auditId) {
  return apiRequest(`/audit/${auditId}`);
}

// Sanitize filename
function sanitizeFilename(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/gi, '-')
    .toLowerCase();
}

// Main function
async function main() {
  const crawlId = process.argv[2];

  if (!crawlId) {
    console.error('❌ Please provide a crawl ID');
    console.error('Usage: node scripts/check-crawl-pages.mjs [crawlId]');
    process.exit(1);
  }

  console.log(`\n🔍 Fetching crawl details for ID: ${crawlId}\n`);

  try {
    // Get crawl summary
    const crawl = await getCrawlStatus(crawlId);

    if (crawl.status !== 'completed') {
      console.error(`❌ Crawl status: ${crawl.status}`);
      console.error('Please wait for crawl to complete');
      process.exit(1);
    }

    console.log(`✅ Crawl completed`);
    console.log(`📄 Pages to process: ${crawl.audits?.length || 0}\n`);

    // Create output directory
    const outputDir = `crawl-${crawlId}-details`;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const summary = [];

    // Process each page
    if (crawl.audits && crawl.audits.length > 0) {
      for (let i = 0; i < crawl.audits.length; i++) {
        const audit = crawl.audits[i];
        const auditId = audit.audit_id || audit.id;

        process.stdout.write(`\r⏳ Processing ${i + 1}/${crawl.audits.length}: ${audit.url}`);

        try {
          // Get full audit details
          const details = await getAuditDetails(auditId);

          // Extract key information
          const pageInfo = {
            url: audit.url,
            auditId: auditId,
            score: details.overall_score || audit.score,
            failCount:
              details.action_items?.reduce(
                (sum, cat) => sum + cat.issues.filter((i) => i.status === 'fail').length,
                0
              ) || 0,
            warningCount:
              details.action_items?.reduce(
                (sum, cat) => sum + cat.issues.filter((i) => i.status === 'warning').length,
                0
              ) || 0,
            categoryScores: details.category_scores || {},
          };

          summary.push(pageInfo);

          // Save individual page JSON
          const filename = sanitizeFilename(audit.url) + '.json';
          const filepath = join(outputDir, filename);
          fs.writeFileSync(filepath, JSON.stringify(details, null, 2));
        } catch (error) {
          console.error(`\n❌ Error processing ${audit.url}: ${error.message}`);
        }
      }
    }

    // Save summary
    const summaryPath = join(outputDir, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`\n\n✅ Complete!`);
    console.log(`📁 Output directory: ${outputDir}/`);
    console.log(`📄 Summary saved: ${outputDir}/summary.json`);
    console.log(`📄 Individual pages: ${crawl.audits?.length || 0} JSON files\n`);

    // Display summary stats
    console.log('📊 Summary Statistics:\n');

    const avgScore = summary.reduce((sum, p) => sum + (p.score || 0), 0) / summary.length;
    const minScore = Math.min(...summary.map((p) => p.score || 0));
    const maxScore = Math.max(...summary.map((p) => p.score || 0));

    console.log(`  Average Score: ${avgScore.toFixed(1)}/100`);
    console.log(`  Lowest Score: ${minScore}/100`);
    console.log(`  Highest Score: ${maxScore}/100`);
    console.log(`  Total Fails: ${summary.reduce((sum, p) => sum + p.failCount, 0)}`);
    console.log(`  Total Warnings: ${summary.reduce((sum, p) => sum + p.warningCount, 0)}\n`);

    // Show lowest scoring pages
    const sorted = [...summary].sort((a, b) => (a.score || 0) - (b.score || 0));
    console.log('🔴 Lowest Scoring Pages:\n');
    sorted.slice(0, 5).forEach((page) => {
      console.log(`  ${page.score}/100 - ${page.url}`);
      if (page.failCount > 0) {
        console.log(`    Fails: ${page.failCount}, Warnings: ${page.warningCount}`);
      }
    });
    console.log('');
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();

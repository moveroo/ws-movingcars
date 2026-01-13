/**
 * Add FAQPage schema to city pages that have FAQs
 *
 * Extracts FAQs from <details> elements and adds FAQPage schema
 *
 * Usage: node scripts/add-faq-schema-to-cities.mjs [--dry-run]
 */

/* global process, console */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const pagesDir = join(projectRoot, 'src', 'pages');

const isDryRun = process.argv.includes('--dry-run');

const CITY_NAMES = {
  adelaide: 'Adelaide',
  ballarat: 'Ballarat',
  bendigo: 'Bendigo',
  brisbane: 'Brisbane',
  bunbury: 'Bunbury',
  bundaberg: 'Bundaberg',
  cairns: 'Cairns',
  canberra: 'Canberra',
  darwin: 'Darwin',
  geelong: 'Geelong',
  'gold-coast': 'Gold Coast',
  hobart: 'Hobart',
  launceston: 'Launceston',
  'logan-city': 'Logan City',
  mackay: 'Mackay',
  mandurah: 'Mandurah',
  melbourne: 'Melbourne',
  newcastle: 'Newcastle',
  perth: 'Perth',
  rockhampton: 'Rockhampton',
  rockingham: 'Rockingham',
  sydney: 'Sydney',
  toowoomba: 'Toowoomba',
  townsville: 'Townsville',
  wollongong: 'Wollongong',
};

function findCityFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.astro')) {
      const filename = basename(entry.name, '.astro');
      if (CITY_NAMES[filename]) {
        files.push(join(dir, entry.name));
      }
    }
  }
  return files;
}

// Extract FAQs from HTML content
function extractFAQs(content) {
  const faqs = [];
  // Match <details> elements - handle multiline content
  // Pattern: <details> ... <summary>question</summary> ... <div>answer</div> ... </details>
  const detailsRegex = /<details[^>]*class="bg-gray-50[^"]*"[^>]*>([\s\S]*?)<\/details>/g;
  let match;

  while ((match = detailsRegex.exec(content)) !== null) {
    const detailsContent = match[1];

    // Extract question from <summary>
    const summaryMatch = detailsContent.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
    if (!summaryMatch) continue;

    let question = summaryMatch[1];
    // Remove the <span> with ▼ if present
    question = question.replace(/<span[^>]*>.*?<\/span>/g, '').trim();
    // Clean up whitespace
    question = question.replace(/\s+/g, ' ').trim();

    // Extract answer from <div class="px-6 pb-6 text-gray-600">
    const answerDivMatch = detailsContent.match(
      /<div[^>]*class="px-6 pb-6 text-gray-600"[^>]*>([\s\S]*?)<\/div>/
    );
    if (!answerDivMatch) continue;

    let answer = answerDivMatch[1];
    // Remove any nested HTML tags
    answer = answer.replace(/<[^>]+>/g, '');
    // Clean up whitespace
    answer = answer.replace(/\s+/g, ' ').trim();

    if (question && answer && question.length > 5 && answer.length > 10) {
      faqs.push({ question, answer });
    }
  }

  return faqs;
}

function addFaqSchema(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Check if FAQs exist
  if (
    !content.includes('Frequently Asked Questions') &&
    !content.includes('<details class="bg-gray-50')
  ) {
    return { fixed: false, reason: 'No FAQs found' };
  }

  // Check if FAQPage schema already exists
  if (content.includes('FAQPage') && content.includes('mainEntity')) {
    return { fixed: false, reason: 'FAQPage schema already exists' };
  }

  // Extract FAQs
  const faqs = extractFAQs(content);
  if (faqs.length === 0) {
    return { fixed: false, reason: 'Could not extract FAQs from HTML' };
  }

  // Create FAQ data structure in frontmatter
  const faqData = `// FAQs for FAQPage schema
const faqs = [
${faqs
  .map(
    (faq) => `  {
    question: ${JSON.stringify(faq.question)},
    answer: ${JSON.stringify(faq.answer)},
  }`
  )
  .join(',\n')},
];`;

  // Find end of frontmatter
  const frontmatterEnd = content.indexOf('---\n', 4);
  if (frontmatterEnd === -1) {
    return { fixed: false, reason: 'Could not find frontmatter end' };
  }

  // Check if faqs already defined
  if (content.includes('const faqs = [')) {
    // Update existing faqs array
    const faqsRegex = /const faqs = \[[\s\S]*?\];/;
    if (faqsRegex.test(content)) {
      content = content.replace(faqsRegex, faqData);
    }
  } else {
    // Add faqs array before closing ---
    const beforeDash = content.substring(0, frontmatterEnd).trimEnd();
    content = beforeDash + '\n\n' + faqData + '\n---' + content.substring(frontmatterEnd + 3);
  }

  // Add FAQPage schema script (after BreadcrumbList schema if it exists, otherwise after Layout opening)
  const breadcrumbSchemaRegex = /<!-- BreadcrumbList Schema -->[\s\S]*?<\/script>/;
  const layoutMatch = content.match(/<Layout[^>]*>\s*\n/);

  if (!layoutMatch) {
    return { fixed: false, reason: 'Could not find Layout component' };
  }

  const layoutEnd = layoutMatch.index + layoutMatch[0].length;
  const afterLayout = content.substring(layoutEnd);

  // Check if FAQPage schema already added
  if (afterLayout.includes('FAQPage Schema') || afterLayout.includes('FAQPage')) {
    return { fixed: false, reason: 'FAQPage schema already present' };
  }

  // Find where to insert (after BreadcrumbList schema if exists, otherwise after Layout)
  let insertIndex = layoutEnd;
  const breadcrumbMatch = afterLayout.match(breadcrumbSchemaRegex);
  if (breadcrumbMatch) {
    insertIndex = layoutEnd + breadcrumbMatch.index + breadcrumbMatch[0].length;
  }

  const faqSchema = `
  <!-- FAQPage Schema -->
  <script
    type="application/ld+json"
    set:html={JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    })}
  />
`;

  content = content.substring(0, insertIndex) + faqSchema + content.substring(insertIndex);

  if (content !== originalContent) {
    if (!isDryRun) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    return { fixed: true, faqCount: faqs.length };
  }

  return { fixed: false, reason: 'No changes needed' };
}

async function main() {
  console.log('🔍 Finding city pages with FAQs...\n');
  const cityFiles = findCityFiles(pagesDir);
  console.log(`Found ${cityFiles.length} city pages\n`);
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE\n');
  }

  const results = { fixed: [], skipped: [] };

  for (const filePath of cityFiles) {
    const relativePath = filePath.replace(projectRoot + '/', '');
    console.log(`Processing: ${relativePath}`);

    try {
      const result = addFaqSchema(filePath);
      if (result.fixed) {
        results.fixed.push({ file: relativePath, faqCount: result.faqCount });
        console.log(
          `  ✅ ${isDryRun ? 'Would add' : 'Added'} FAQPage schema (${result.faqCount} FAQs)`
        );
      } else {
        results.skipped.push({ file: relativePath, reason: result.reason });
        console.log(`  ⏭️  ${result.reason}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n✅ Fixed: ${results.fixed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);

  if (results.fixed.length > 0) {
    console.log('\n✅ Pages with FAQPage schema added:');
    results.fixed.forEach(({ file, faqCount }) => {
      console.log(`   ${file} (${faqCount} FAQs)`);
    });
  }

  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }
}

main().catch(console.error);

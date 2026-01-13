/**
 * Automatically add BreadcrumbList schema to all pages
 *
 * Generates appropriate breadcrumbs based on page type:
 * - City pages: Home → Service Areas → City
 * - Service pages: Home → Service Name
 * - Other pages: Home → Page Name
 *
 * Usage: node scripts/add-breadcrumbs-to-pages.mjs [--dry-run]
 */

/* global */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const pagesDir = join(projectRoot, 'src', 'pages');
const SITE_URL = 'https://movingagain.com.au';

const isDryRun = process.argv.includes('--dry-run');

// City names mapping (for proper capitalization)
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

// Service page names
const SERVICE_PAGES = {
  backloading: 'Backloading',
  'car-transport': 'Car Transport',
  'moving-interstate': 'Moving Interstate',
  'service-areas': 'Service Areas',
};

// Find all .astro files in pages directory
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

// Generate breadcrumb items based on page
function generateBreadcrumbs(filePath) {
  const fileName = basename(filePath, '.astro');

  // Skip dynamic routes and homepage
  if (fileName === 'index' || fileName.startsWith('[')) {
    return null;
  }

  // Check if already has breadcrumbs
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('BreadcrumbList') || content.includes('breadcrumbItems')) {
    return { skip: true, reason: 'Already has breadcrumbs' };
  }

  const breadcrumbs = [{ name: 'Home', url: `${SITE_URL}/` }];

  // City pages
  if (CITY_NAMES[fileName]) {
    breadcrumbs.push(
      { name: 'Service Areas', url: `${SITE_URL}/service-areas/` },
      { name: CITY_NAMES[fileName], url: `${SITE_URL}/${fileName}/` }
    );
  }
  // Service pages
  else if (SERVICE_PAGES[fileName]) {
    breadcrumbs.push({ name: SERVICE_PAGES[fileName], url: `${SITE_URL}/${fileName}/` });
  }
  // Other pages
  else {
    // Convert kebab-case to Title Case
    const pageName = fileName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    breadcrumbs.push({ name: pageName, url: `${SITE_URL}/${fileName}/` });
  }

  return breadcrumbs;
}

// Add breadcrumbs to a file
function addBreadcrumbs(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  const breadcrumbs = generateBreadcrumbs(filePath);
  if (!breadcrumbs) {
    return { fixed: false, reason: 'Skipped (homepage or dynamic route)' };
  }
  if (breadcrumbs.skip) {
    return { fixed: false, reason: breadcrumbs.reason };
  }

  // Find where to insert breadcrumbs (in frontmatter before closing ---)
  const layoutMatch = content.match(/<Layout[^>]*>/);
  if (!layoutMatch) {
    return { fixed: false, reason: 'Could not find Layout component' };
  }

  // Check if there's already a breadcrumb script
  if (content.includes('BreadcrumbList') || content.includes('breadcrumbItems')) {
    return { fixed: false, reason: 'Breadcrumbs already present' };
  }

  // Generate breadcrumb data (insert in frontmatter before closing ---)
  const breadcrumbData = `// Breadcrumb data for schema
const breadcrumbItems = [
${breadcrumbs.map((item) => `  { name: '${item.name}', url: '${item.url}' }`).join(',\n')},
];`;

  // Generate breadcrumb schema (insert after Layout opening tag)
  const breadcrumbSchema = `
  <!-- BreadcrumbList Schema -->
  <script
    type="application/ld+json"
    set:html={JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    })}
    slot="head"
  />
`;

  // Find the end of the frontmatter (---)
  const frontmatterEnd = content.indexOf('---\n', 4); // Skip first ---
  if (frontmatterEnd === -1) {
    return { fixed: false, reason: 'Could not find frontmatter end' };
  }

  // Insert breadcrumb data in frontmatter (before closing ---)
  const frontmatterContent = content.substring(0, frontmatterEnd);
  const afterFrontmatter = content.substring(frontmatterEnd);

  // Find last non-empty line in frontmatter
  const frontmatterLines = frontmatterContent.split('\n');
  let insertIndex = frontmatterLines.length;

  for (let i = frontmatterLines.length - 1; i >= 0; i--) {
    if (frontmatterLines[i].trim()) {
      insertIndex = i + 1;
      break;
    }
  }

  const newFrontmatter = [
    ...frontmatterLines.slice(0, insertIndex),
    breadcrumbData,
    ...frontmatterLines.slice(insertIndex),
  ].join('\n');

  // Insert breadcrumb schema after Layout opening tag
  const layoutTag = layoutMatch[0];
  const newContent =
    newFrontmatter +
    afterFrontmatter.substring(0, layoutTag.length) +
    breadcrumbSchema +
    afterFrontmatter.substring(layoutTag.length);

  if (!isDryRun) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  return { fixed: true, reason: isDryRun ? 'Would add breadcrumbs' : 'Added breadcrumbs' };
}

// Main
function main() {
  console.log('\n🔧 Adding BreadcrumbList Schema to All Pages\n');
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }
  console.log('='.repeat(70));

  const files = findAstroFiles(pagesDir);
  console.log(`\n📄 Analyzing ${files.length} pages...\n`);

  const results = files.map((file) => ({
    file: file.replace(projectRoot + '/', ''),
    ...addBreadcrumbs(file),
  }));

  const fixed = results.filter((r) => r.fixed);
  const skipped = results.filter((r) => !r.fixed);

  if (fixed.length > 0) {
    console.log('\n✅ FIXED:\n');
    fixed.forEach((result) => {
      console.log(`  ✓ ${result.file}`);
      console.log(`    ${result.reason}`);
    });
  }

  if (skipped.length > 0) {
    console.log('\n⏭️  SKIPPED:\n');
    // Group skipped by reason
    const byReason = {};
    skipped.forEach((result) => {
      if (!byReason[result.reason]) {
        byReason[result.reason] = [];
      }
      byReason[result.reason].push(result.file);
    });

    Object.entries(byReason).forEach(([reason, files]) => {
      console.log(`  ${reason}: ${files.length} pages`);
      if (files.length <= 5) {
        files.forEach((file) => console.log(`    - ${file}`));
      } else {
        files.slice(0, 3).forEach((file) => console.log(`    - ${file}`));
        console.log(`    ... and ${files.length - 3} more`);
      }
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 SUMMARY:`);
  console.log(`  Fixed: ${fixed.length}`);
  console.log(`  Skipped: ${skipped.length}`);
  console.log(`  Total: ${results.length}`);

  if (isDryRun && fixed.length > 0) {
    console.log('\n💡 Run without --dry-run to apply fixes\n');
  } else if (fixed.length > 0) {
    console.log('\n✅ All fixes applied!\n');
  }
}

main();

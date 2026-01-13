/**
 * Systematically add breadcrumbs to all pages (except homepage and 404)
 *
 * Breadcrumb structure:
 * - City pages: Home → Service Areas → City Name
 * - Service pages: Home → Service Name
 * - Service Areas: Home → Service Areas
 * - Other pages: Home → Page Name
 *
 * Usage: node scripts/add-breadcrumbs-systematic.mjs [--dry-run]
 */

/* global process, console */

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

// Other page names
const OTHER_PAGE_NAMES = {
  contact: 'Contact Us',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  'terms-of-use': 'Terms of Use',
  reviews: 'Reviews',
  questions: 'Questions',
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

// Generate breadcrumb items based on page type
function generateBreadcrumbs(filePath) {
  const filename = basename(filePath, '.astro');

  // Skip homepage and 404
  if (filename === 'index' || filename === '404') {
    return null;
  }

  // Skip dynamic route (already has breadcrumbs)
  if (filename === '[...slug]') {
    return null;
  }

  const breadcrumbs = [{ name: 'Home', url: `${SITE_URL}/` }];

  // City pages
  if (CITY_NAMES[filename]) {
    breadcrumbs.push(
      { name: 'Service Areas', url: `${SITE_URL}/service-areas/` },
      { name: CITY_NAMES[filename], url: `${SITE_URL}/${filename}/` }
    );
  }
  // Service pages
  else if (SERVICE_PAGES[filename]) {
    if (filename === 'service-areas') {
      breadcrumbs.push({ name: 'Service Areas', url: `${SITE_URL}/service-areas/` });
    } else {
      breadcrumbs.push({ name: SERVICE_PAGES[filename], url: `${SITE_URL}/${filename}/` });
    }
  }
  // Other pages
  else {
    const pageName =
      OTHER_PAGE_NAMES[filename] ||
      filename
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    breadcrumbs.push({ name: pageName, url: `${SITE_URL}/${filename}/` });
  }

  return breadcrumbs;
}

// Add breadcrumbs to a file
function addBreadcrumbs(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  const breadcrumbs = generateBreadcrumbs(filePath);
  if (!breadcrumbs) {
    return { fixed: false, reason: 'Skipped (homepage, 404, or dynamic route)' };
  }

  // Check if breadcrumbs already exist
  if (
    content.includes('BreadcrumbList') ||
    content.includes('Breadcrumbs') ||
    content.includes('breadcrumbItems')
  ) {
    return { fixed: false, reason: 'Breadcrumbs already present' };
  }

  // Generate breadcrumb items array
  const breadcrumbItems = breadcrumbs
    .map((item) => `  { name: '${item.name}', url: '${item.url}' }`)
    .join(',\n');

  // Find Layout component (to determine where frontmatter ends)
  const layoutMatch = content.match(/<Layout[^>]*>/);
  if (!layoutMatch) {
    return { fixed: false, reason: 'Could not find Layout component' };
  }

  // Find the end of frontmatter (last --- before Layout)
  // Look for the closing --- that's before the Layout tag
  const layoutIndex = layoutMatch.index;
  const contentBeforeLayout = content.substring(0, layoutIndex);

  // Find the last --- in the content before Layout
  let frontmatterEnd = -1;
  let searchIndex = 4; // Skip the opening ---
  let found = false;
  while (!found) {
    const nextDash = contentBeforeLayout.indexOf('---', searchIndex);
    if (nextDash === -1) {
      found = true;
    } else {
      // Check if this is followed by newline or end of string
      const afterDash = contentBeforeLayout.substring(nextDash + 3, nextDash + 4);
      if (afterDash === '\n' || afterDash === '') {
        frontmatterEnd = nextDash + 3;
      }
      searchIndex = nextDash + 1;
    }
  }

  if (frontmatterEnd === -1) {
    return { fixed: false, reason: 'Could not find frontmatter end' };
  }

  // Check if Breadcrumbs component is imported
  let newContent = content;

  // Add Breadcrumbs import if not present
  if (!content.includes("import Breadcrumbs from '../components/Breadcrumbs.astro'")) {
    const lastImport = content.lastIndexOf('import ', frontmatterEnd);
    if (lastImport !== -1) {
      const importEnd = content.indexOf('\n', lastImport);
      newContent =
        content.substring(0, importEnd + 1) +
        "import Breadcrumbs from '../components/Breadcrumbs.astro';\n" +
        content.substring(importEnd + 1);
      // Update frontmatterEnd if we added content
      frontmatterEnd += "import Breadcrumbs from '../components/Breadcrumbs.astro';\n".length;
    } else {
      // No imports, add after opening ---
      const openingDash = content.indexOf('---');
      if (openingDash !== -1) {
        const afterOpening = content.indexOf('\n', openingDash) + 1;
        newContent =
          content.substring(0, afterOpening) +
          "import Breadcrumbs from '../components/Breadcrumbs.astro';\n" +
          content.substring(afterOpening);
        frontmatterEnd += "import Breadcrumbs from '../components/Breadcrumbs.astro';\n".length;
      }
    }
  }

  // Add breadcrumb items in frontmatter (right before closing ---)
  const frontmatterContent = newContent.substring(0, frontmatterEnd);
  const afterFrontmatter = newContent.substring(frontmatterEnd);

  // Check if breadcrumbItems already in frontmatter
  if (!frontmatterContent.includes('breadcrumbItems')) {
    // Insert breadcrumb items right before the closing ---
    // The frontmatterContent includes everything up to and including the closing ---
    // We need to insert before the ---
    const lastDashIndex = frontmatterContent.lastIndexOf('---');
    if (lastDashIndex === -1) {
      return { fixed: false, reason: 'Could not find closing --- in frontmatter' };
    }

    // Get content before the closing ---
    const beforeClosingDash = frontmatterContent.substring(0, lastDashIndex).trimEnd();
    const afterClosingDash = frontmatterContent.substring(lastDashIndex);

    // Insert breadcrumb items before closing ---
    newContent =
      beforeClosingDash +
      '\n\n// Breadcrumb navigation\n' +
      'const breadcrumbItems = [\n' +
      breadcrumbItems +
      '\n' +
      '];\n' +
      afterClosingDash +
      afterFrontmatter;
  }

  // Add Breadcrumbs component in body (after Layout opening tag)
  // The Breadcrumbs component includes both visual and schema
  const layoutMatch2 = newContent.match(/<Layout[^>]*>\s*\n/);
  if (layoutMatch2) {
    const layoutIndex = layoutMatch2.index;
    const layoutTagEnd = layoutIndex + layoutMatch2[0].length;
    const afterLayoutTag = newContent.substring(layoutTagEnd);

    // Check if Breadcrumbs component is already present
    if (!afterLayoutTag.includes('<Breadcrumbs') && !afterLayoutTag.includes('Breadcrumb')) {
      // Insert right after Layout opening tag
      const breadcrumbComponent = `  <!-- Breadcrumb Navigation -->
  <div class="container mx-auto px-4 py-4">
    <Breadcrumbs items={breadcrumbItems} />
  </div>

`;

      newContent =
        newContent.substring(0, layoutTagEnd) +
        breadcrumbComponent +
        newContent.substring(layoutTagEnd);
    }
  }

  if (!isDryRun) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  return { fixed: true, breadcrumbs };
}

// Main execution
async function main() {
  console.log('🔍 Finding all .astro pages...\n');
  const astroFiles = findAstroFiles(pagesDir);

  console.log(`Found ${astroFiles.length} pages\n`);
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  const results = {
    fixed: [],
    skipped: [],
    errors: [],
  };

  for (const filePath of astroFiles) {
    const relativePath = filePath.replace(projectRoot + '/', '');
    console.log(`Processing: ${relativePath}`);

    try {
      const result = addBreadcrumbs(filePath);
      if (result.fixed) {
        results.fixed.push({ file: relativePath, breadcrumbs: result.breadcrumbs });
        console.log(`  ✅ ${isDryRun ? 'Would add' : 'Added'} breadcrumbs`);
        console.log(`     Path: ${result.breadcrumbs.map((b) => b.name).join(' → ')}`);
      } else {
        results.skipped.push({ file: relativePath, reason: result.reason });
        console.log(`  ⏭️  ${result.reason}`);
      }
    } catch (error) {
      results.errors.push({ file: relativePath, error: error.message });
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Fixed: ${results.fixed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);

  if (results.fixed.length > 0) {
    console.log('\n✅ Pages with breadcrumbs added:');
    results.fixed.forEach(({ file, breadcrumbs }) => {
      console.log(`   ${file}`);
      console.log(`      ${breadcrumbs.map((b) => b.name).join(' → ')}`);
    });
  }

  if (results.skipped.length > 0) {
    console.log('\n⏭️  Skipped pages:');
    const skipReasons = {};
    results.skipped.forEach(({ file, reason }) => {
      if (!skipReasons[reason]) skipReasons[reason] = [];
      skipReasons[reason].push(file);
    });
    Object.entries(skipReasons).forEach(([reason, files]) => {
      console.log(`   ${reason}: ${files.length} pages`);
      if (files.length <= 5) {
        files.forEach((f) => console.log(`      - ${f}`));
      }
    });
  }

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }

  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }
}

main().catch(console.error);

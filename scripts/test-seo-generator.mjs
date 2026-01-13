/**
 * Test SEO Generator on Route Page
 *
 * Tests the SEO title and description generator on a specific route
 * to see how the generated content looks.
 *
 * Usage: node scripts/test-seo-generator.mjs [route-slug]
 * Example: node scripts/test-seo-generator.mjs sydney-melbourne
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Import the generator (we'll need to compile TS or use a different approach)
// For now, let's create a JS version inline

const SITE_NAME = 'Moving Again';
const SITE_NAME_SUFFIX = ` | ${SITE_NAME}`;
const SITE_NAME_SUFFIX_LENGTH = 18;

const TITLE_MAX_LENGTH = 60;
const TITLE_MIN_LENGTH = 50;
const TITLE_WITHOUT_SUFFIX_MAX = 42;

const DESC_TARGET_LENGTH = 155;
const DESC_MIN_LENGTH = 120;
const DESC_MAX_LENGTH = 160;

function generateSEOTitle(baseTitle, options = {}) {
  const { includeSuffix = true, keywords = [] } = options;

  let cleanTitle = baseTitle.replace(/\s*\|\s*Moving Again\s*$/, '').trim();

  if (cleanTitle.includes(' | ')) {
    const parts = cleanTitle.split(' | ');
    cleanTitle = parts[0];
    if (parts[1] && cleanTitle.length + parts[1].length + 3 < TITLE_WITHOUT_SUFFIX_MAX) {
      cleanTitle = `${cleanTitle} | ${parts[1]}`;
    }
  }

  if (keywords.length > 0 && cleanTitle.length < TITLE_WITHOUT_SUFFIX_MAX - 10) {
    const keyword = keywords[0];
    if (!cleanTitle.toLowerCase().includes(keyword.toLowerCase())) {
      const withKeyword = `${cleanTitle} ${keyword}`;
      if (withKeyword.length <= TITLE_WITHOUT_SUFFIX_MAX) {
        cleanTitle = withKeyword;
      }
    }
  }

  if (cleanTitle.length > TITLE_WITHOUT_SUFFIX_MAX) {
    cleanTitle = cleanTitle.substring(0, TITLE_WITHOUT_SUFFIX_MAX - 3) + '...';
  }

  // Ensure minimum length
  // Note: We don't add location/state abbreviations here to avoid confusion
  // (e.g., "Sydney to Melbourne NSW" would be wrong - Melbourne is in VIC)
  if (cleanTitle.length < TITLE_MIN_LENGTH - SITE_NAME_SUFFIX_LENGTH) {
    // Only add location if it's explicitly provided and makes sense
    // For route pages, we skip this to avoid state confusion
  }

  if (includeSuffix) {
    const finalTitle = cleanTitle + SITE_NAME_SUFFIX;
    if (finalTitle.length > TITLE_MAX_LENGTH) {
      const maxBase = TITLE_MAX_LENGTH - SITE_NAME_SUFFIX_LENGTH - 3;
      return cleanTitle.substring(0, maxBase) + '...' + SITE_NAME_SUFFIX;
    }
    return finalTitle;
  }

  return cleanTitle;
}

function generateSEODescription(content, options = {}) {
  const { includeCTA = true } = options;
  const parts = [];

  if (content.route && content.origin && content.destination) {
    parts.push(`Moving from ${content.origin} to ${content.destination}?`);
  } else if (content.service) {
    parts.push(`${content.service} services`);
  }

  if (content.savings) {
    parts.push(`Save ${content.savings} with backloading`);
  } else if (content.benefits && content.benefits.length > 0) {
    parts.push(content.benefits[0]);
  }

  const features = [];
  if (content.transitTime) {
    features.push(`${content.transitTime} transit`);
  }
  if (content.keyFeatures) {
    const priorityFeatures = content.keyFeatures.filter(
      (f) => f.includes('insurance') || f.includes('door')
    );
    features.push(
      ...(priorityFeatures.length > 0
        ? priorityFeatures.slice(0, 1)
        : content.keyFeatures.slice(0, 1))
    );
  }

  if (features.length > 0) {
    parts.push(features.join(', '));
  }

  if (content.route) {
    parts.push('Professional interstate removals');
  }

  if (includeCTA) {
    parts.push('Get your free quote today');
  }

  let description = parts
    .join('. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\?\s*\./g, '?');

  if (description.length > DESC_MAX_LENGTH) {
    if (includeCTA) {
      description = description.replace(/\s*Get your free quote today\.?\s*/i, '');
    }
    if (description.length > DESC_MAX_LENGTH) {
      const truncated = description.substring(0, DESC_MAX_LENGTH - 3);
      const lastSpace = truncated.lastIndexOf(' ');
      const lastPeriod = truncated.lastIndexOf('.');
      const cutPoint = lastPeriod > lastSpace - 10 ? lastPeriod + 1 : lastSpace;
      description = truncated.substring(0, cutPoint).trim() + '...';
    }
  } else if (description.length < DESC_TARGET_LENGTH) {
    const remaining = DESC_TARGET_LENGTH - description.length;

    if (remaining > 20 && !description.includes('insurance')) {
      description += '. Transit insurance included';
    }
    if (remaining > 40 && !description.includes('professional')) {
      description += '. Professional handling';
    }
    if (remaining > 15 && description.length < DESC_TARGET_LENGTH) {
      description += '. Free quotes';
    }
  }

  if (description.length > DESC_MAX_LENGTH) {
    const truncated = description.substring(0, DESC_MAX_LENGTH - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    description = truncated.substring(0, lastSpace).trim() + '...';
  }

  if (description.length < DESC_MIN_LENGTH) {
    if (content.route) {
      description += '. Professional interstate removals service';
    } else {
      description += '. Get your free quote today';
    }
  }

  return description.trim();
}

function generateRouteSEO(route) {
  // For route pages, don't add state abbreviations - the route itself is clear
  const baseTitle = route.title || `Backloading ${route.origin} to ${route.destination}`;
  const title = generateSEOTitle(baseTitle, {
    includeSuffix: true,
    keywords: [], // Don't add extra keywords for routes - keep it simple
    location: undefined, // Don't add state abbreviations to route titles
  });

  const description = generateSEODescription(
    {
      route: `${route.origin} to ${route.destination}`,
      origin: route.origin,
      destination: route.destination,
      service: 'Interstate backloading',
      savings: 'up to 60%',
      transitTime: route.transitDays || '3-7 business days',
      keyFeatures: ['transit insurance included', 'door-to-door service', 'professional handling'],
    },
    {
      tone: 'professional',
      includeCTA: true,
    }
  );

  return {
    title,
    description,
    titleLength: title.length,
    descriptionLength: description.length,
  };
}

// Main function
function testRoute(routeSlug) {
  const routePath = join(projectRoot, 'src', 'content', 'routes', `${routeSlug}.md`);

  if (!fs.existsSync(routePath)) {
    console.error(`❌ Route file not found: ${routePath}`);
    console.error(`\nAvailable routes in src/content/routes/`);
    process.exit(1);
  }

  const content = fs.readFileSync(routePath, 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    console.error('❌ Could not parse frontmatter');
    process.exit(1);
  }

  const frontmatter = frontmatterMatch[1];
  const route = {};

  // Parse frontmatter
  frontmatter.split('\n').forEach((line) => {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      route[key] = value.replace(/^["']|["']$/g, '');
    }
  });

  console.log('\n🔍 Testing SEO Generator\n');
  console.log('='.repeat(70));
  console.log(`Route: ${route.origin} → ${route.destination}`);
  console.log('='.repeat(70));

  // Current values
  const currentTitle = route.title || '';
  const currentDescription = route.metaDescription || '';

  console.log('\n📝 CURRENT VALUES:\n');
  console.log(`Title: ${currentTitle}`);
  console.log(
    `Length: ${currentTitle.length} chars (with suffix: ${currentTitle.length + 18} chars)`
  );
  console.log(`\nDescription: ${currentDescription}`);
  console.log(`Length: ${currentDescription.length} chars`);

  // Generate optimized
  const optimized = generateRouteSEO({
    origin: route.origin,
    destination: route.destination,
    originState: route.originState,
    destinationState: route.destinationState,
    transitDays: route.transitDays,
    title: route.title,
  });

  console.log('\n\n✨ GENERATED VALUES:\n');
  console.log(`Title: ${optimized.title}`);
  console.log(`Length: ${optimized.titleLength} chars ✅`);
  console.log(`\nDescription: ${optimized.description}`);
  console.log(`Length: ${optimized.descriptionLength} chars ✅`);

  // Comparison
  console.log('\n\n📊 COMPARISON:\n');
  console.log('Title:');
  console.log(`  Current:  ${currentTitle.padEnd(60)} (${currentTitle.length + 18} chars)`);
  console.log(`  Generated: ${optimized.title.padEnd(60)} (${optimized.titleLength} chars)`);
  console.log(
    `  Status: ${optimized.titleLength <= 60 && optimized.titleLength >= 45 ? '✅ Optimal' : '⚠️  Needs adjustment'}`
  );

  console.log('\nDescription:');
  console.log(
    `  Current:  ${currentDescription.substring(0, 60)}... (${currentDescription.length} chars)`
  );
  console.log(
    `  Generated: ${optimized.description.substring(0, 60)}... (${optimized.descriptionLength} chars)`
  );
  console.log(
    `  Status: ${optimized.descriptionLength >= 120 && optimized.descriptionLength <= 160 ? '✅ Optimal' : '⚠️  Needs adjustment'}`
  );

  // Preview in search results
  console.log('\n\n🔍 SEARCH RESULT PREVIEW:\n');
  console.log('─'.repeat(70));
  console.log(`${optimized.title}`);
  console.log(`https://movingagain.com.au/${routeSlug}/`);
  console.log(`${optimized.description}`);
  console.log('─'.repeat(70));

  console.log('\n');
}

// Get route slug from args
const routeSlug = process.argv[2] || 'sydney-melbourne';

testRoute(routeSlug);

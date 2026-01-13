/**
 * Internal Link Analyzer
 *
 * Statically analyzes all internal links (<a> tags) to ensure they point to existing pages.
 * - Maps src/pages to URL routes
 * - Checks href attributes starting with "/"
 * - Ignores external links and anchors
 *
 * Usage: node scripts/analyze-internal-links.mjs
 */

import { join } from 'path';
import fs from 'fs';
import {
  findPageFiles,
  readFile,
  parseAstroFile,
  getRelativePagePath,
  getAllRoutes,
  projectRoot,
} from './utils.mjs';

function analyzeLinks(filePath, validRoutes) {
  const content = readFile(filePath);
  if (!content) return null;

  const fileName = getRelativePagePath(filePath);
  const dom = parseAstroFile(content);
  const doc = dom.window.document;
  const issues = [];

  const links = doc.querySelectorAll('a');

  links.forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;

    // Only check internal absolute paths (starting with /)
    // Ignore:
    // - External links (http...)
    // - Anchors (#...)
    // - Mailto/tel
    // - Relative links check is harder statically (needs current dir context),
    //   but standard Astro usage often favors root-relative (/...).
    //   We will skip relative paths (no leading slash) for safety to avoid false positives.

    if (href.startsWith('/') && !href.startsWith('//')) {
      let target = href;

      // Remove query strings and hashes
      target = target.split('?')[0].split('#')[0];

      // Remove trailing slash for normalization (unless root)
      if (target.endsWith('/') && target !== '/') {
        target = target.slice(0, -1);
      }

      // Check if valid
      // Note: Dynamic routes check is tricky.
      // If we have a route like /blog/[slug], we match /blog/my-post against it.

      const exactMatch = validRoutes.has(target);

      if (!exactMatch) {
        // Try dynamic match
        const dynamicMatch = checkDynamicMatch(target, validRoutes);

        if (!dynamicMatch) {
          issues.push({
            type: 'broken-link',
            message: `Broken link to "${href}" (resolved: "${target}")`,
            element: a.outerHTML.substring(0, 50) + '...',
          });
        }
      }
    }
  });

  return {
    file: fileName,
    issues,
    linkCount: links.length,
  };
}

function checkDynamicMatch(target, validRoutes) {
  // Convert routes to regex patterns
  // e.g. /blog/[slug] -> /blog/[^/]+
  // e.g. /shop/[...all] -> /shop/.*

  for (const route of validRoutes) {
    if (!route.includes('[') && !route.includes(']')) continue;

    // Create regex from route pattern
    // Escape check: is this robust? minimally yes.
    let pattern = route
      .replace(/\[\.\.\.[^\]]+\]/g, '.*') // [...slug] matches anything
      .replace(/\[[^\]]+\]/g, '[^/]+'); // [slug] matches segment

    // Escape regex chars except the ones we just added
    // Actually simpler: split by slash and compare segments

    if (matchSegments(target, route)) return true;
  }
  return false;
}

function matchSegments(target, routePattern) {
  const tSegments = target.split('/').filter(Boolean);
  const rSegments = routePattern.split('/').filter(Boolean);

  // Check for catch-all
  if (routePattern.includes('[...')) {
    // e.g. /shop/[...all] (2 segments) matches /shop/a/b/c (4 segments)
    // Base segments must match
    const baseSegments = rSegments.filter((s) => !s.startsWith('[...'));
    for (let i = 0; i < baseSegments.length; i++) {
      if (baseSegments[i] !== tSegments[i]) return false;
    }
    return true;
  }

  if (tSegments.length !== rSegments.length) return false;

  for (let i = 0; i < rSegments.length; i++) {
    const r = rSegments[i];
    const t = tSegments[i];

    if (r.startsWith('[') && r.endsWith(']')) {
      // Dynamic segment matches anything
      continue;
    }

    if (r !== t) return false;
  }

  return true;
}

// Main execution
async function main() {
  console.log('\n🔍 Analyzing Internal Links (Static Check)\n');
  console.log('======================================================================\n');

  const validRoutes = getAllRoutes();
  console.log(`🗺️  Mapped ${validRoutes.size} valid routes from src/pages`);

  const files = findPageFiles();
  const results = [];

  for (const file of files) {
    const res = analyzeLinks(file, validRoutes);
    if (res) results.push(res);
  }

  const pagesWithIssues = results.filter((r) => r.issues.length > 0);

  if (pagesWithIssues.length > 0) {
    console.log(`\n❌ Found ${pagesWithIssues.length} pages with broken internal links:\n`);
    pagesWithIssues.forEach((p) => {
      console.log(`📄 ${p.file}`);
      p.issues.forEach((i) => console.log(`   ⛔ ${i.message}`));
      console.log('');
    });
    process.exit(1);
  } else {
    console.log('\n✅ No broken internal links found in scanned pages.');
  }

  // Save report
  const outputPath = join(projectRoot, 'analysis-internal-links.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        analyzedAt: new Date().toISOString(),
        routes: Array.from(validRoutes),
        issues: pagesWithIssues,
      },
      null,
      2
    )
  );

  console.log(`📁 Detailed report saved: ${outputPath}\n`);
}

main();

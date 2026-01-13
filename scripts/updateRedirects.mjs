/**
 * Script to update vercel.json redirects for new URL format
 *
 * Changes:
 * 1. Updates route redirects from city-to-city format to city-city format
 * 2. Adds redirects from old -to- URLs to new URLs
 */

import fs from 'fs';
import path from 'path';

const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
const newRedirectsPath = path.join(process.cwd(), 'route-redirects.json');

// Read current vercel.json
const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
const newRouteRedirects = JSON.parse(fs.readFileSync(newRedirectsPath, 'utf8'));

// Get non-route redirects (keep these as-is)
const generalRedirects = vercelJson.redirects.filter((r) => {
  // Keep redirects that are NOT route-to-route redirects
  const isRouteRedirect =
    r.source.match(/^\/[a-z-]+-to-[a-z-]+\/$/) && r.destination.match(/^\/[a-z-]+-to-[a-z-]+\/$/);
  return !isRouteRedirect;
});

console.log(`Found ${generalRedirects.length} general redirects to keep`);
console.log(`Found ${newRouteRedirects.length} new route redirects`);

// Create redirects from old -to- format to new format
const oldToNewRedirects = [];
newRouteRedirects.forEach((redirect) => {
  // For each new redirect like /melbourne-sydney/ -> /sydney-melbourne/
  // Also add /melbourne-to-sydney/ -> /sydney-melbourne/
  // And /sydney-to-melbourne/ -> /sydney-melbourne/ (the canonical)

  const destSlug = redirect.destination.replace(/\//g, '');
  const parts = destSlug.split('-');

  // If destination is sydney-melbourne, add sydney-to-melbourne -> sydney-melbourne
  const withTo = `/${parts.slice(0, -1).join('-')}-to-${parts.slice(-1)[0]}/`;

  oldToNewRedirects.push({
    source: withTo,
    destination: redirect.destination,
    permanent: true,
  });

  // Also handle the reverse -to- format
  const sourceSlug = redirect.source.replace(/\//g, '');
  const sourceParts = sourceSlug.split('-');
  const sourceWithTo = `/${sourceParts.slice(0, -1).join('-')}-to-${sourceParts.slice(-1)[0]}/`;

  oldToNewRedirects.push({
    source: sourceWithTo,
    destination: redirect.destination,
    permanent: true,
  });
});

// Combine all redirects
const allRedirects = [...generalRedirects, ...newRouteRedirects, ...oldToNewRedirects];

// Remove duplicates
const seen = new Set();
const uniqueRedirects = allRedirects.filter((r) => {
  const key = r.source + r.destination;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log(`Total unique redirects: ${uniqueRedirects.length}`);

// Update vercel.json
vercelJson.redirects = uniqueRedirects;

// Write back
fs.writeFileSync(vercelJsonPath, JSON.stringify(vercelJson, null, 2) + '\n', 'utf8');

console.log('✅ Updated vercel.json with new redirects');

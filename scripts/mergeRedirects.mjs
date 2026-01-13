/**
 * Merge route redirects into vercel.json
 */

import fs from 'fs';

// Read existing vercel.json
const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

// Read route redirects
const routeRedirects = JSON.parse(fs.readFileSync('route-redirects.json', 'utf8'));

// Merge redirects (existing first, then routes)
vercelConfig.redirects = [...vercelConfig.redirects, ...routeRedirects];

// Write back
fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2), 'utf8');

console.log(`✅ Merged ${routeRedirects.length} route redirects into vercel.json`);
console.log(`   Total redirects: ${vercelConfig.redirects.length}`);

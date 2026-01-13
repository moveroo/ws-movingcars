/**
 * Route Generator Script for Moving Again
 *
 * Generates MDX files for all 253 unique route pages.
 * Run with: node scripts/generateRoutes.mjs
 */

import fs from 'fs';
import path from 'path';

// All 23 cities from WordPress sitemap
const CITIES = [
  { name: 'Sydney', state: 'NSW', population: 5312163 },
  { name: 'Melbourne', state: 'VIC', population: 5078193 },
  { name: 'Brisbane', state: 'QLD', population: 2514184 },
  { name: 'Perth', state: 'WA', population: 2085973 },
  { name: 'Adelaide', state: 'SA', population: 1376601 },
  { name: 'Gold Coast', state: 'QLD', population: 679127 },
  { name: 'Newcastle', state: 'NSW', population: 322278 },
  { name: 'Canberra', state: 'ACT', population: 453558 },
  { name: 'Wollongong', state: 'NSW', population: 302739 },
  { name: 'Hobart', state: 'TAS', population: 238834 },
  { name: 'Geelong', state: 'VIC', population: 192393 },
  { name: 'Townsville', state: 'QLD', population: 180820 },
  { name: 'Cairns', state: 'QLD', population: 153075 },
  { name: 'Darwin', state: 'NT', population: 147255 },
  { name: 'Toowoomba', state: 'QLD', population: 114024 },
  { name: 'Ballarat', state: 'VIC', population: 109505 },
  { name: 'Bendigo', state: 'VIC', population: 99122 },
  { name: 'Launceston', state: 'TAS', population: 87328 },
  { name: 'Mackay', state: 'QLD', population: 80148 },
  { name: 'Bundaberg', state: 'QLD', population: 70826 },
  { name: 'Rockhampton', state: 'QLD', population: 65195 },
  { name: 'Mandurah', state: 'WA', population: 97641 },
  { name: 'Rockingham', state: 'WA', population: 130000 },
  { name: 'Bunbury', state: 'WA', population: 75106 },
  { name: 'Logan City', state: 'QLD', population: 326615 },
];

// Distance estimates between major cities (km)
const DISTANCES = {
  'sydney-melbourne': 880,
  'sydney-brisbane': 920,
  'sydney-perth': 3930,
  'sydney-adelaide': 1380,
  'sydney-canberra': 290,
  'sydney-hobart': 1180,
  'sydney-darwin': 3930,
  'sydney-gold-coast': 840,
  'sydney-newcastle': 160,
  'sydney-wollongong': 80,
  'melbourne-brisbane': 1670,
  'melbourne-perth': 3410,
  'melbourne-adelaide': 730,
  'melbourne-hobart': 630,
  'melbourne-sydney': 880,
  'melbourne-canberra': 660,
  'melbourne-geelong': 75,
  'melbourne-ballarat': 115,
  'melbourne-bendigo': 150,
  'brisbane-perth': 4310,
  'brisbane-adelaide': 1930,
  'brisbane-darwin': 3420,
  'brisbane-gold-coast': 80,
  'brisbane-townsville': 1350,
  'brisbane-cairns': 1700,
  'brisbane-toowoomba': 130,
  'brisbane-mackay': 970,
  'perth-adelaide': 2700,
  'perth-darwin': 4030,
  'perth-mandurah': 75,
  'perth-rockingham': 50,
  'perth-bunbury': 175,
  'adelaide-darwin': 3030,
  'hobart-launceston': 200,
};

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
}

function getDistance(origin, destination) {
  const key1 = `${slugify(origin)}-${slugify(destination)}`;
  const key2 = `${slugify(destination)}-${slugify(origin)}`;
  return DISTANCES[key1] || DISTANCES[key2] || null;
}

function getTransitTime(distanceKm) {
  if (!distanceKm) return '5-10 business days';
  if (distanceKm < 300) return '2-4 business days';
  if (distanceKm < 600) return '3-5 business days';
  if (distanceKm < 1200) return '4-7 business days';
  if (distanceKm < 2000) return '6-9 business days';
  if (distanceKm < 3000) return '8-12 business days';
  return '10-14 business days';
}

function generateMDXContent(origin, destination) {
  const originCity = CITIES.find((c) => c.name === origin);
  const destCity = CITIES.find((c) => c.name === destination);

  // URL format: city1-city2 (no 'to' - matches old WordPress URLs)
  const slug = `${slugify(origin)}-${slugify(destination)}`;
  const reverseSlug = `${slugify(destination)}-${slugify(origin)}`;
  const distance = getDistance(origin, destination);
  const transitTime = getTransitTime(distance);
  const now = new Date().toISOString();

  const frontmatter = `---
slug: /${slug}/
slugFs: ${slug}
title: Backloading ${origin} to ${destination} | Interstate Removals
metaDescription: Affordable backloading from ${origin} to ${destination}. Save up to 60% on your interstate move with Moving Again. Professional service, transit insurance included.
origin: ${origin}
destination: ${destination}
originState: ${originCity.state}
destinationState: ${destCity.state}
${distance ? `distanceKm: ${distance}` : '# distanceKm: estimated'}
transitDays: "${transitTime}"
canonicalUrl: https://movingagain.com.au/${slug}/
relatedSlugs:
  - ${reverseSlug}
lastUpdated: '${now}'
---`;

  const content = `
## ${origin} to ${destination} Backloading

Moving from ${origin} to ${destination}? Our backloading service offers an affordable way to transport your furniture and belongings interstate without paying for an entire truck.

### What is Backloading?

Backloading means sharing truck space with other customers heading in the same direction. Our trucks regularly travel between ${origin} and ${destination}, and we fill remaining space at reduced rates. You get the same professional handling, wrapping, and transit insurance – just at a lower price.

### Why Choose Moving Again?

- **Save 30-60%** compared to dedicated truck hire
- **Professional handling** – your items are wrapped and secured
- **Transit insurance** included on all moves
- **Flexible pickup** – we work with your schedule
- **Track record** – 15+ years in the industry

### Service Options

**Standard Backloading**
Our most affordable option. You're flexible with pickup (48-hour window), and we match you with trucks heading from ${origin} to ${destination}.

**Express Service**
Need tighter timelines? Ask about our express options for priority pickup and faster transit.

### What Can We Move?

We handle all standard household items including:
- Beds, mattresses, and bedroom furniture
- Sofas, lounge suites, and living room items
- Dining tables, chairs, and cabinets
- Fridges, washing machines, and appliances
- Boxes, cartons, and personal effects

For specialty items like pianos, pool tables, or antiques, mention these when getting your quote.

### How to Get Started

1. **Get an instant quote** – Enter your inventory in our online system
2. **Confirm your booking** – Choose your preferred pickup window
3. **Prepare your items** – We'll provide a preparation checklist
4. **We collect and deliver** – Professional handling door-to-door

Ready to save on your ${origin} to ${destination} move? Get your free quote today.
`;

  return frontmatter + '\n' + content;
}

// Generate all unique route pairs (larger city first = canonical)
function generateAllRoutes() {
  const routes = [];
  const redirects = [];

  // Sort cities by population (largest first)
  const sortedCities = [...CITIES].sort((a, b) => b.population - a.population);

  for (let i = 0; i < sortedCities.length; i++) {
    for (let j = i + 1; j < sortedCities.length; j++) {
      const origin = sortedCities[i];
      const dest = sortedCities[j];

      // Canonical direction: larger city → smaller city
      // URL format: city1-city2 (no 'to' - matches old WordPress URLs)
      routes.push({
        origin: origin.name,
        destination: dest.name,
        slug: `${slugify(origin.name)}-${slugify(dest.name)}`,
      });

      // Reverse direction gets redirected
      const reverseSlug = `${slugify(dest.name)}-${slugify(origin.name)}`;
      redirects.push({
        source: `/${reverseSlug}/`,
        destination: `/${slugify(origin.name)}-${slugify(dest.name)}/`,
        permanent: true,
      });
    }
  }

  return { routes, redirects };
}

// Main execution
const routesDir = path.join(process.cwd(), 'src/content/routes');

// Ensure directory exists
if (!fs.existsSync(routesDir)) {
  fs.mkdirSync(routesDir, { recursive: true });
}

const { routes, redirects } = generateAllRoutes();

console.log(`\n🚛 Generating ${routes.length} route pages...`);

// Generate MDX files
routes.forEach((route, index) => {
  const filePath = path.join(routesDir, `${route.slug}.mdx`);
  const content = generateMDXContent(route.origin, route.destination);

  fs.writeFileSync(filePath, content, 'utf8');

  if ((index + 1) % 50 === 0) {
    console.log(`  ✓ Generated ${index + 1}/${routes.length} routes`);
  }
});

console.log(`\n✅ Generated ${routes.length} route pages in src/content/routes/`);

// Output redirects for vercel.json
console.log(`\n📝 ${redirects.length} redirects to add to vercel.json:`);
console.log(JSON.stringify(redirects.slice(0, 5), null, 2));
console.log('... and more\n');

// Save redirects to a file for easy copying
const redirectsPath = path.join(process.cwd(), 'route-redirects.json');
fs.writeFileSync(redirectsPath, JSON.stringify(redirects, null, 2), 'utf8');
console.log(`📄 Full redirects list saved to: route-redirects.json`);

console.log(`\n🎉 Done! Run 'npm run dev' to test the routes.`);

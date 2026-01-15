import fs from 'fs';
import path from 'path';

const PAGES = [
  // Core
  'reviews',
  'contact-moving-cars',
  'quote',
  'thank-you-for-booking',

  // Services
  'backload-car-transport',
  'caravan-transport-quote',
  'classic-and-vintage-car-transport-services',
  'enclosed-quote',
  'enclosed-car-transport',
  'transporting-cars-with-items-inside-standard',
  'transporting-cars-with-items-inside',
  'transport-luxury-prestige-cars',
  'interstate-car-transport-by-rail',
  'transporting-cars-auction',
  'boat-transport',
  'trailer-transport-quote',
  'transport-non-drivable-cars',

  // Hubs
  'move-car-adelaide-south-australia',
  'move-car-brisbane-queensland',
  'move-car-perth-western-australia',
  'moving-a-car-sydney-new-south-wales',
  'move-car-to-melbourne',
  'tasmania',
  'car-carriers-canberra',
  'car-carriers-darwin-northern-territory',

  // Info
  'how-do-i-get-a-quote-for-drivable-vehicle',
  'call-meet-areas',
  'national-car-carrying-depots-australia-wide',
  'advice-to-follow-when-transporting-a-car-interstate',
  'much-car-transport-cost',
  'delays-in-transit',
  'transit-warranty',
  'general-questions',
  'most-frequent-questions-on-car-transport',
  'estimated-transit-times-for-car-transport',
  'privacy-policy',
  'moving-cars-terms-and-conditions',
];

const PAGES_DIR = path.join(process.cwd(), 'src/pages');

PAGES.forEach((page) => {
  const filePath = path.join(PAGES_DIR, `${page}.astro`);
  if (fs.existsSync(filePath)) {
    console.log(`Skipping existing page: ${page}.astro`);
    return;
  }

  const title = page
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const content = `---
import Layout from '../layouts/Layout.astro';

const title = "${title}";
const description = "Professional car transport services for ${title}. Get an instant quote for interstate vehicle shipping.";
---

<Layout title={title} description={description}>
  <main class="container mx-auto px-4 py-16">
    <h1 class="text-4xl font-bold mb-8">{title}</h1>
    <div class="prose prose-lg max-w-none">
      <p>Content for ${title} is being migrated.</p>
      
      <div class="bg-amber-50 p-8 rounded-xl border border-amber-200 mt-12">
        <h2 class="text-2xl font-bold mb-4 text-slate-900 mt-0">Ready for a Quote?</h2>
        <p class="mb-6">Get an instant, no-obligation quote for your car transport needs.</p>
        <a href="/quote/" class="inline-block bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 px-8 rounded-lg transition-colors">
          Get Instant Quote
        </a>
      </div>
    </div>
  </main>
</Layout>
`;

  fs.writeFileSync(filePath, content);
  console.log(`Created page: ${page}.astro`);
});

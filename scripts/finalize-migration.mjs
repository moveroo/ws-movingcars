/**
 * Final Migration Script
 * Generates final vercel.json and testimonial placeholders.
 */

import fs from 'fs';
import path from 'path';

const PROGRAMMATIC_LIST =
  '/Users/jasonhill/Projects/non-laravel-projects/Tools And Bits 2026/website-page-analyzer/output/programmatic-pages-2026-01-13T04-53-54-395Z.txt';
const HIGH_VALUE_LIST =
  '/Users/jasonhill/Projects/non-laravel-projects/Tools And Bits 2026/website-page-analyzer/output/high-value-pages-2026-01-13T04-53-54-395Z.txt';

const HUB_MAP = {
  // NSW -> Sydney Hub
  sydney: '/moving-a-car-sydney-new-south-wales/',
  newcastle: '/moving-a-car-sydney-new-south-wales/',
  wollongong: '/moving-a-car-sydney-new-south-wales/',
  'central-coast': '/moving-a-car-sydney-new-south-wales/',
  albury: '/moving-a-car-sydney-new-south-wales/',
  armidale: '/moving-a-car-sydney-new-south-wales/',
  bathurst: '/moving-a-car-sydney-new-south-wales/',
  'broken-hill': '/moving-a-car-sydney-new-south-wales/',
  cessnock: '/moving-a-car-sydney-new-south-wales/',
  'coffs-harbour': '/moving-a-car-sydney-new-south-wales/',
  dubbo: '/moving-a-car-sydney-new-south-wales/',
  gosford: '/moving-a-car-sydney-new-south-wales/',
  goulburn: '/moving-a-car-sydney-new-south-wales/',
  grafton: '/moving-a-car-sydney-new-south-wales/',
  griffith: '/moving-a-car-sydney-new-south-wales/',
  lismore: '/moving-a-car-sydney-new-south-wales/',
  maitland: '/moving-a-car-sydney-new-south-wales/',
  mittagong: '/moving-a-car-sydney-new-south-wales/',
  'nelson-bay': '/moving-a-car-sydney-new-south-wales/',
  nowra: '/moving-a-car-sydney-new-south-wales/',
  orange: '/moving-a-car-sydney-new-south-wales/',
  'port-macquarie': '/moving-a-car-sydney-new-south-wales/',
  queanbeyan: '/moving-a-car-sydney-new-south-wales/',
  tamworth: '/moving-a-car-sydney-new-south-wales/',
  'tweed-heads': '/moving-a-car-sydney-new-south-wales/',
  'wagga-wagga': '/moving-a-car-sydney-new-south-wales/',

  // VIC -> Melbourne Hub
  melbourne: '/move-car-to-melbourne/',
  geelong: '/move-car-to-melbourne/',
  ballarat: '/move-car-to-melbourne/',
  bendigo: '/move-car-to-melbourne/',
  benalla: '/move-car-to-melbourne/',
  melton: '/move-car-to-melbourne/',
  mildura: '/move-car-to-melbourne/',
  shepparton: '/move-car-to-melbourne/',
  'swan-hill': '/move-car-to-melbourne/',
  traralgon: '/move-car-to-melbourne/',
  wangaratta: '/move-car-to-melbourne/',
  warragul: '/move-car-to-melbourne/',
  warrnambool: '/move-car-to-melbourne/',
  wodonga: '/move-car-to-melbourne/',

  // QLD -> Brisbane Hub
  brisbane: '/move-car-brisbane-queensland/',
  'gold-coast': '/move-car-brisbane-queensland/',
  'sunshine-coast': '/move-car-brisbane-queensland/',
  townsville: '/move-car-brisbane-queensland/',
  cairns: '/move-car-brisbane-queensland/',
  toowoomba: '/move-car-brisbane-queensland/',
  mackay: '/move-car-brisbane-queensland/',
  rockhampton: '/move-car-brisbane-queensland/',
  bundaberg: '/move-car-brisbane-queensland/',
  bowen: '/move-car-brisbane-queensland/',
  'charters-towers': '/move-car-brisbane-queensland/',
  gladstone: '/move-car-brisbane-queensland/',
  gympie: '/move-car-brisbane-queensland/',
  'hervey-bay': '/move-car-brisbane-queensland/',
  logan: '/move-car-brisbane-queensland/',
  maryborough: '/move-car-brisbane-queensland/',
  'mount-isa': '/move-car-brisbane-queensland/',
  nambour: '/move-car-brisbane-queensland/',

  // WA -> Perth Hub
  perth: '/move-car-perth-western-australia/',
  mandurah: '/move-car-perth-western-australia/',
  bunbury: '/move-car-perth-western-australia/',
  albany: '/move-car-perth-western-australia/',
  broome: '/move-car-perth-western-australia/',
  busselton: '/move-car-perth-western-australia/',
  carnarvon: '/move-car-perth-western-australia/',
  derby: '/move-car-perth-western-australia/',
  fremantle: '/move-car-perth-western-australia/',
  geraldton: '/move-car-perth-western-australia/',
  kalgoorlie: '/move-car-perth-western-australia/',
  karratha: '/move-car-perth-western-australia/',
  kununurra: '/move-car-perth-western-australia/',
  'port-hedland': '/move-car-perth-western-australia/',
  rockingham: '/move-car-perth-western-australia/',

  // SA -> Adelaide Hub
  adelaide: '/move-car-adelaide-south-australia/',
  'mount-gambier': '/move-car-adelaide-south-australia/',
  'murray-bridge': '/move-car-adelaide-south-australia/',
  'port-augusta': '/move-car-adelaide-south-australia/',
  'port-lincoln': '/move-car-adelaide-south-australia/',
  'port-pirie': '/move-car-adelaide-south-australia/',
  'victor-harbor': '/move-car-adelaide-south-australia/',
  whyalla: '/move-car-adelaide-south-australia/',

  // NT -> Darwin Hub
  darwin: '/car-carriers-darwin-northern-territory/',
  'alice-springs': '/car-carriers-darwin-northern-territory/',
  katherine: '/car-carriers-darwin-northern-territory/',
  'tennant-creek': '/car-carriers-darwin-northern-territory/',

  // TAS -> Tasmania Hub
  tasmania: '/tasmania/',
  hobart: '/tasmania/',
  launceston: '/tasmania/',
  burnie: '/tasmania/',
  devonport: '/tasmania/',
  glenorchy: '/tasmania/',

  // ACT
  canberra: '/car-carriers-canberra/',
};

const REDIRECTS = [];
const TESTIMONIALS = [];

const reviewKeywords = [
  'prestige-car-',
  'cherished-classic-',
  'flawless-',
  'precious-cargo-',
  'first-rate-',
  'carefree-car-',
  'dream-drive-',
  'five-star-',
  'simple-stress-free-',
  'effortless-',
  'first-class-',
];

function processList(filePath, isProgrammatic) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('http'));

  lines.forEach((url) => {
    const urlObj = new URL(url);
    let slug = urlObj.pathname.replace(/^\/|\/$/g, '');
    if (!slug) return;

    let target = '/';
    const isReview =
      reviewKeywords.some((kw) => slug.startsWith(kw)) ||
      slug.includes('-reviews-by-customer');

    if (isReview) {
      target = '/reviews/';
      TESTIMONIALS.push(slug);
    } else if (isProgrammatic) {
      const matchers = Object.keys(HUB_MAP).sort((a, b) => b.length - a.length);
      for (const key of matchers) {
        if (slug.startsWith(key + '-')) {
          target = HUB_MAP[key];
          break;
        }
      }
    } else {
      // For High Value list, we might want to keep some exactly as is
      // but for now we follow the "ignore routes" rule.
      // If it's a specific route slug like 'classic-car-melb-to-mackay', it was already caught by reviewKeywords
    }

    REDIRECTS.push({
      source: '/' + slug + '/',
      destination: target,
      permanent: true,
    });
  });
}

// 1. Process lists
processList(PROGRAMMATIC_LIST, true);
processList(HIGH_VALUE_LIST, false);

// 2. Add specific High Value testimonial redirects (manual additions if missed)
const manualTestimonials = [
  'five-star-door-to-door-vehicle-transportation',
  'simple-stress-free-car-shipping-solution',
  'effortless-business-fleet-transfers',
];
manualTestimonials.forEach((slug) => {
  if (!REDIRECTS.some((r) => r.source === `/${slug}/`)) {
    REDIRECTS.push({
      source: `/${slug}/`,
      destination: '/reviews/',
      permanent: true,
    });
    TESTIMONIALS.push(slug);
  }
});

// 3. Generate vercel.json
const vercelConfig = {
  cleanUrls: true,
  framework: 'astro',
  redirects: REDIRECTS,
};
fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));

// 4. Generate Testimonial MDs
const testimonialsDir = path.join(process.cwd(), 'src/content/testimonials');
if (!fs.existsSync(testimonialsDir))
  fs.mkdirSync(testimonialsDir, { recursive: true });

[...new Set(TESTIMONIALS)].forEach((slug) => {
  const mdContent = `---
slug: ${slug}
title: "Review: ${slug.split('-').join(' ')}"
date: "${new Date().toISOString().split('T')[0]}"
---

Placeholder content for testimonial: **${slug}**.
Please replace this with the actual content from the legacy site.
`;
  fs.writeFileSync(path.join(testimonialsDir, `${slug}.md`), mdContent);
});

console.log(`Generated ${REDIRECTS.length} redirects in vercel.json`);
console.log(
  `Generated ${[...new Set(TESTIMONIALS)].length} testimonial placeholders.`
);

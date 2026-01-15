/**
 * Vercel Edge Middleware for handling 4000+ redirects
 * This bypasses the 2048 redirect limit in vercel.json
 */
/* global URL */

import { NextResponse } from 'next/server';

// The HUB_MAP from our finalization script
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

// Review keyword prefixes
const REVIEW_KEYWORDS = [
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

// Sort matchers by length (longest first) for accurate matching
const SORTED_MATCHERS = Object.keys(HUB_MAP).sort(
  (a, b) => b.length - a.length
);

/**
 * Determine redirect target for a given slug
 */
function getRedirectTarget(slug) {
  // Check if it's a review/testimonial
  const isReview =
    REVIEW_KEYWORDS.some((kw) => slug.startsWith(kw)) ||
    slug.includes('-reviews-by-customer');

  if (isReview) {
    return '/reviews/';
  }

  // Check for hub mapping based on origin city
  for (const key of SORTED_MATCHERS) {
    if (slug.startsWith(key + '-')) {
      return HUB_MAP[key];
    }
  }

  // Fallback to homepage
  return '/';
}

export const config = {
  // Only run middleware on paths that look like route slugs
  // This avoids running on static assets, API routes, etc.
  matcher: [
    // Match route-like paths (city-to-city patterns)
    '/((?!_next|api|_vercel|favicon|robots|sitemap|[^/]+\\.[^/]+$).*)',
  ],
};

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip if it's an existing page (has .astro equivalent or is root)
  // These are the known static pages we created
  const knownPages = [
    '/',
    '/reviews',
    '/contact-moving-cars',
    '/quote',
    '/thank-you-for-booking',
    '/backload-car-transport',
    '/caravan-transport-quote',
    '/classic-and-vintage-car-transport-services',
    '/enclosed-quote',
    '/enclosed-car-transport',
    '/transporting-cars-with-items-inside-standard',
    '/transporting-cars-with-items-inside',
    '/transport-luxury-prestige-cars',
    '/interstate-car-transport-by-rail',
    '/transporting-cars-auction',
    '/boat-transport',
    '/trailer-transport-quote',
    '/transport-non-drivable-cars',
    '/move-car-adelaide-south-australia',
    '/move-car-brisbane-queensland',
    '/move-car-perth-western-australia',
    '/moving-a-car-sydney-new-south-wales',
    '/move-car-to-melbourne',
    '/tasmania',
    '/car-carriers-canberra',
    '/car-carriers-darwin-northern-territory',
    '/how-do-i-get-a-quote-for-drivable-vehicle',
    '/call-meet-areas',
    '/national-car-carrying-depots-australia-wide',
    '/advice-to-follow-when-transporting-a-car-interstate',
    '/much-car-transport-cost',
    '/delays-in-transit',
    '/transit-warranty',
    '/general-questions',
    '/most-frequent-questions-on-car-transport',
    '/estimated-transit-times-for-car-transport',
    '/privacy-policy',
    '/moving-cars-terms-and-conditions',
  ];

  // Normalize path (remove trailing slash for comparison)
  const normalizedPath = pathname.replace(/\/$/, '') || '/';

  // Skip middleware for known pages
  if (knownPages.includes(normalizedPath)) {
    return NextResponse.next();
  }

  // Get the slug from the path
  const slug = pathname.replace(/^\/|\/$/g, '');

  // Skip empty slugs or paths with file extensions
  if (!slug || slug.includes('.')) {
    return NextResponse.next();
  }

  // Determine redirect target
  const target = getRedirectTarget(slug);

  // Perform 301 redirect
  return NextResponse.redirect(new URL(target, request.url), 301);
}

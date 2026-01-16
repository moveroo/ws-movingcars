/**
 * Vercel Edge Middleware for handling 4000+ redirects
 * Uses standard Web APIs to avoid Next.js dependencies.
 */
/* global URL, Response */

// The HUB_MAP mapping origin city slugs to Hub URLs
// [2026-01-16] CONSOLIDATION: All regional hubs now point to the central /car-transport/ page
const TARGET_HUB = '/car-transport/';

const HUB_MAP = {
  // NSW -> Car Transport Hub
  sydney: TARGET_HUB,
  newcastle: TARGET_HUB,
  wollongong: TARGET_HUB,
  'central-coast': TARGET_HUB,
  albury: TARGET_HUB,
  armidale: TARGET_HUB,
  bathurst: TARGET_HUB,
  'broken-hill': TARGET_HUB,
  cessnock: TARGET_HUB,
  'coffs-harbour': TARGET_HUB,
  dubbo: TARGET_HUB,
  gosford: TARGET_HUB,
  goulburn: TARGET_HUB,
  grafton: TARGET_HUB,
  griffith: TARGET_HUB,
  lismore: TARGET_HUB,
  maitland: TARGET_HUB,
  mittagong: TARGET_HUB,
  'nelson-bay': TARGET_HUB,
  nowra: TARGET_HUB,
  orange: TARGET_HUB,
  'port-macquarie': TARGET_HUB,
  queanbeyan: TARGET_HUB,
  tamworth: TARGET_HUB,
  'tweed-heads': TARGET_HUB,
  'wagga-wagga': TARGET_HUB,

  // VIC -> Car Transport Hub
  melbourne: TARGET_HUB,
  geelong: TARGET_HUB,
  ballarat: TARGET_HUB,
  bendigo: TARGET_HUB,
  benalla: TARGET_HUB,
  melton: TARGET_HUB,
  mildura: TARGET_HUB,
  shepparton: TARGET_HUB,
  'swan-hill': TARGET_HUB,
  traralgon: TARGET_HUB,
  wangaratta: TARGET_HUB,
  warragul: TARGET_HUB,
  warrnambool: TARGET_HUB,
  wodonga: TARGET_HUB,

  // QLD -> Car Transport Hub
  brisbane: TARGET_HUB,
  'gold-coast': TARGET_HUB,
  'sunshine-coast': TARGET_HUB,
  townsville: TARGET_HUB,
  cairns: TARGET_HUB,
  toowoomba: TARGET_HUB,
  mackay: TARGET_HUB,
  rockhampton: TARGET_HUB,
  bundaberg: TARGET_HUB,
  bowen: TARGET_HUB,
  'charters-towers': TARGET_HUB,
  gladstone: TARGET_HUB,
  gympie: TARGET_HUB,
  'hervey-bay': TARGET_HUB,
  logan: TARGET_HUB,
  maryborough: TARGET_HUB,
  'mount-isa': TARGET_HUB,
  nambour: TARGET_HUB,

  // WA -> Car Transport Hub
  perth: TARGET_HUB,
  mandurah: TARGET_HUB,
  bunbury: TARGET_HUB,
  albany: TARGET_HUB,
  broome: TARGET_HUB,
  busselton: TARGET_HUB,
  carnarvon: TARGET_HUB,
  derby: TARGET_HUB,
  fremantle: TARGET_HUB,
  geraldton: TARGET_HUB,
  kalgoorlie: TARGET_HUB,
  karratha: TARGET_HUB,
  kununurra: TARGET_HUB,
  'port-hedland': TARGET_HUB,
  rockingham: TARGET_HUB,

  // SA -> Car Transport Hub
  adelaide: TARGET_HUB,
  'mount-gambier': TARGET_HUB,
  'murray-bridge': TARGET_HUB,
  'port-augusta': TARGET_HUB,
  'port-lincoln': TARGET_HUB,
  'port-pirie': TARGET_HUB,
  'victor-harbor': TARGET_HUB,
  whyalla: TARGET_HUB,

  // NT -> Car Transport Hub
  darwin: TARGET_HUB,
  'alice-springs': TARGET_HUB,
  katherine: TARGET_HUB,
  'tennant-creek': TARGET_HUB,

  // TAS -> Car Transport Hub
  tasmania: TARGET_HUB,
  hobart: TARGET_HUB,
  launceston: TARGET_HUB,
  burnie: TARGET_HUB,
  devonport: TARGET_HUB,
  glenorchy: TARGET_HUB,

  // ACT -> Car Transport Hub
  canberra: TARGET_HUB,
};

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

const SORTED_MATCHERS = Object.keys(HUB_MAP).sort(
  (a, b) => b.length - a.length
);

function getRedirectTarget(slug) {
  const isReview =
    REVIEW_KEYWORDS.some((kw) => slug.startsWith(kw)) ||
    slug.includes('-reviews-by-customer');
  if (isReview) return '/reviews/';

  for (const key of SORTED_MATCHERS) {
    if (slug.startsWith(key + '-')) {
      return HUB_MAP[key];
    }
  }
  return '/';
}

export const config = {
  matcher: ['/((?!_next|api|_vercel|favicon|robots|sitemap|[^/]+\\.[^/]+$).*)'],
};

export async function onRequest({ request }, next) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const normalizedPath = pathname.replace(/\/$/, '') || '/';

  // [2026-01-16] CRITICAL FIX: Explicit early redirect for Cheap Rates
  // Catches both /backload-car-transport and /backload-car-transport/
  const cheapRatesPillar = '/cheap-car-transport-rates/';
  const legacyCheapPages = [
    '/backload-car-transport',
    '/cheap-car-transport',
    '/much-car-transport-cost',
  ];

  if (legacyCheapPages.includes(normalizedPath)) {
    return Response.redirect(new URL(cheapRatesPillar, request.url), 301);
  }

  const knownPages = [
    '/',
    '/car-transport', // New Hub
    '/cheap-car-transport-rates', // New Pillar
    '/specialised-vehicle-transport', // New Pillar (Specialised)
    '/reviews',
    '/terms',
    '/contact',
    '/thank-you-for-booking',
    '/transport-boat-caravan-trailer', // Consolidated Boat/Caravan
    '/classic-and-vintage-car-transport-services',
    '/enclosed-quote',
    '/enclosed-car-transport',
    '/transporting-cars-with-items-inside',
    '/transport-luxury-prestige-cars',
    '/transporting-cars-auction',
    '/transport-non-drivable-cars',
    // Removed Legacy Hubs (they will be caught by redirect logic below)
    '/how-do-i-get-a-quote-for-drivable-vehicle',
    '/call-meet-areas',
    '/national-car-carrying-depots-australia-wide',
    '/advice-to-follow-when-transporting-a-car-interstate',
    '/delays-in-transit',
    '/transit-warranty',
    '/estimated-transit-times-for-car-transport',
    '/privacy-policy',
    '/faq',
  ];

  if (knownPages.includes(normalizedPath)) {
    if (pathname.endsWith('/') || pathname === '/') {
      return next();
    }
    return Response.redirect(new URL(pathname + '/', request.url), 301);
  }

  const slug = pathname.replace(/^\/|\/$/g, '');
  if (!slug || slug.includes('.')) {
    return next(); // Pass through
  }

  // --- Redirects ---

  if (normalizedPath === '/quote') {
    return Response.redirect(
      new URL('https://ratecheck.movingcars.com.au/quote/v2/', request.url),
      301
    );
  }

  // Consolidate Boat/Caravan/Trailer -> /transport-boat-caravan-trailer/
  const boatRedirects = [
    '/boat-transport',
    '/caravan-transport-quote',
    '/trailer-transport-quote',
  ];

  if (boatRedirects.includes(normalizedPath)) {
    return Response.redirect(
      new URL('/transport-boat-caravan-trailer/', request.url),
      301
    );
  }

  // Redirect 'Standard' Goods page to the main policy page
  if (normalizedPath === '/transporting-cars-with-items-inside-standard') {
    return Response.redirect(
      new URL('/transporting-cars-with-items-inside/', request.url),
      301
    );
  }

  // Legacy Regional Hubs -> Redirect to /car-transport/
  const legacyHubs = [
    '/move-car-adelaide-south-australia',
    '/move-car-brisbane-queensland',
    '/move-car-perth-western-australia',
    '/moving-a-car-sydney-new-south-wales',
    '/move-car-to-melbourne',
    '/tasmania',
    '/car-carriers-canberra',
    '/car-carriers-darwin-northern-territory',
  ];

  if (legacyHubs.includes(normalizedPath)) {
    return Response.redirect(new URL('/car-transport/', request.url), 301);
  }

  // Specific alias for Contact
  if (normalizedPath === '/contact') {
    return next();
  }

  if (normalizedPath === '/contact-moving-cars') {
    return Response.redirect(new URL('/contact/', request.url), 301);
  }

  // Specific alias for Reviews
  if (normalizedPath === '/moving-cars-reviews-by-customer') {
    return Response.redirect(new URL('/reviews/', request.url), 301);
  }

  // Specific alias for Privacy
  if (normalizedPath === '/privacy') {
    return Response.redirect(new URL('/privacy-policy/', request.url), 301);
  }

  // Specific alias for Terms
  if (normalizedPath === '/terms') {
    return next();
  }

  if (normalizedPath === '/moving-cars-terms-and-conditions') {
    return Response.redirect(new URL('/terms/', request.url), 301);
  }

  // Deprecated Rail Transport Page
  if (normalizedPath === '/interstate-car-transport-by-rail') {
    return Response.redirect(new URL('/', request.url), 301);
  }

  // FAQ Redirects
  const faqRedirects = [
    '/general-questions',
    '/most-frequent-questions-on-car-transport',
    '/how-do-i-get-a-quote-for-drivable-vehicle',
  ];

  if (faqRedirects.includes(normalizedPath)) {
    return Response.redirect(new URL('/faq/', request.url), 301);
  }

  // Trailing slash enforcement guard
  if (!pathname.endsWith('/') && !slug.includes('.')) {
    return Response.redirect(new URL(pathname + '/', request.url), 301);
  }

  const target = getRedirectTarget(slug);
  const redirectUrl = new URL(target, request.url);

  return Response.redirect(redirectUrl, 301);
}

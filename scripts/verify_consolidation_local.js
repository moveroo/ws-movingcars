import http from 'http';

const BASE_URL = 'http://localhost:8005';
const EXPECTED_Target = '/car-transport/';

const TEST_CASES = [
  // 0. Middleware Activation Check
  { path: '/middleware-test', expected: 200 },

  // 1. Regional Programmatic Routes (Middleware Logic - Testing Slashed)
  { path: '/sydney-transport-services/', expected: EXPECTED_Target },
  { path: '/melbourne-car-shipping/', expected: EXPECTED_Target },
  { path: '/brisbane-vehicle-move/', expected: EXPECTED_Target },

  // 1b. Regional Programmatic Routes (Middleware Logic - Testing Unslashed - expecting redirect to slash or target)
  { path: '/sydney-transport-services', expected: EXPECTED_Target },

  // 2. Legacy Hub URLs (Explicit Redirects)
  { path: '/move-car-to-melbourne/', expected: EXPECTED_Target },
  { path: '/moving-a-car-sydney-new-south-wales/', expected: EXPECTED_Target },
  { path: '/move-car-brisbane-queensland/', expected: EXPECTED_Target },
  { path: '/move-car-perth-western-australia/', expected: EXPECTED_Target },
  { path: '/move-car-adelaide-south-australia/', expected: EXPECTED_Target },
  { path: '/tasmania/', expected: EXPECTED_Target },
  { path: '/car-carriers-canberra/', expected: EXPECTED_Target },
  {
    path: '/car-carriers-darwin-northern-territory/',
    expected: EXPECTED_Target,
  },

  // 3. Control Case (Should NOT redirect to Hub)
  { path: '/contact/', expected: 200 }, // Should stay on contact
  { path: '/reviews/', expected: 200 }, // Should stay on reviews
];

async function checkRedirect(testCase) {
  return new Promise((resolve) => {
    http
      .get(`${BASE_URL}${testCase.path}`, (res) => {
        // In dev mode, Astro might return 302 or just render the page if it's not edge middleware
        // But typically we look for location header if it's a redirect
        // OR if it's a client side router in dev?
        // Actually middleware in dev mode runs on request.

        const status = res.statusCode;
        const location = res.headers.location;

        let result = {
          path: testCase.path,
          status,
          location,
          pass: false,
          msg: '',
        };

        if (typeof testCase.expected === 'number') {
          // Checking for 200 OK (No redirect)
          if (status === testCase.expected) {
            result.pass = true;
            result.msg = `✅ ${testCase.path} -> ${status} (Correct)`;
          } else {
            result.pass = false;
            result.msg = `❌ ${testCase.path} -> Expected ${testCase.expected}, got ${status} (Location: ${location})`;
          }
        } else {
          // Checking for Redirect
          // Astro Dev Server sometimes uses 302 for redirects, or 301
          if (
            (status === 301 ||
              status === 302 ||
              status === 307 ||
              status === 308) &&
            location === testCase.expected
          ) {
            result.pass = true;
            result.msg = `✅ ${testCase.path} -> ${location} (${status})`;
          } else {
            // Maybe it redirected but missing trailing slash or something?
            if (
              (status === 301 || status === 302) &&
              location &&
              location.includes(testCase.expected)
            ) {
              result.pass = true; // Loose match for verification
              result.msg = `⚠️ ${testCase.path} -> ${location} (Close match)`;
            } else {
              result.pass = false;
              result.msg = `❌ ${testCase.path} -> Expected ${testCase.expected}, got ${status} (Location: ${location})`;
            }
          }
        }
        resolve(result);
      })
      .on('error', (e) => {
        resolve({
          path: testCase.path,
          pass: false,
          msg: `❌ Error: ${e.message}`,
        });
      });
  });
}

async function run() {
  console.log(`Starting Verification against ${BASE_URL}...`);
  console.log('-------------------------------------------');

  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_CASES) {
    const res = await checkRedirect(testCase);
    console.log(res.msg);
    if (res.pass) passed++;
    else failed++;
  }

  console.log('-------------------------------------------');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
}

run();

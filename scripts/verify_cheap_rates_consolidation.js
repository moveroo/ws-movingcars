import http from 'http';

const BASE_URL = 'http://localhost:8005';
const EXPECTED_TARGET = '/cheap-car-transport-rates/';

const TEST_CASES = [
  // 1. Consolidated Legacy Pages
  { path: '/backload-car-transport', expected: EXPECTED_TARGET },
  { path: '/much-car-transport-cost', expected: EXPECTED_TARGET },
  { path: '/cheap-car-transport', expected: EXPECTED_TARGET },

  // 1b. Trailing Slashes
  { path: '/backload-car-transport/', expected: EXPECTED_TARGET },

  // 2. The New Pillar Page (200 OK)
  { path: '/cheap-car-transport-rates/', expected: 200 },

  // 3. Control (Unrelated)
  { path: '/contact/', expected: 200 },
];

async function checkRedirect(testCase) {
  return new Promise((resolve) => {
    http
      .get(`${BASE_URL}${testCase.path}`, (res) => {
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
          if (status === testCase.expected) {
            result.pass = true;
            result.msg = `✅ ${testCase.path} -> ${status} (Correct)`;
          } else {
            result.pass = false;
            result.msg = `❌ ${testCase.path} -> Expected ${testCase.expected}, got ${status} (Location: ${location})`;
          }
        } else {
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
            if (
              (status === 301 || status === 302) &&
              location &&
              location.includes(testCase.expected)
            ) {
              result.pass = true;
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
  console.log(`Starting Cheap Rates Verification against ${BASE_URL}...`);
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

import http from 'http';

const BASE_URL = 'http://localhost:8005';

const CHECKS = [
  { path: '/transporting-cars-with-items-inside/', expected: 200 },
  {
    path: '/transporting-cars-with-items-inside-standard/',
    expected: 301,
    target: '/transporting-cars-with-items-inside/',
  },
];

async function checkPage(check) {
  return new Promise((resolve) => {
    http
      .get(`${BASE_URL}${check.path}`, (res) => {
        if (res.statusCode === check.expected) {
          if (res.statusCode === 301) {
            // Check location header
            const location = res.headers.location;
            if (location && location.includes(check.target)) {
              resolve({
                pass: true,
                msg: `✅ ${check.path} -> redirected to ${check.target}`,
              });
            } else {
              resolve({
                pass: false,
                msg: `❌ ${check.path} -> redirected to WRONG location: ${location}`,
              });
            }
          } else {
            resolve({
              pass: true,
              msg: `✅ ${check.path} is accessible (200)`,
            });
          }
        } else {
          resolve({
            pass: false,
            msg: `❌ ${check.path} returned ${res.statusCode}, expected ${check.expected}`,
          });
        }
      })
      .on('error', (e) => {
        resolve({
          pass: false,
          msg: `❌ Error checking ${check.path}: ${e.message}`,
        });
      });
  });
}

async function run() {
  console.log(`Verifying Personal Effects Policy Consolidation...`);
  let passed = 0;

  for (const check of CHECKS) {
    const res = await checkPage(check);
    console.log(res.msg);
    if (res.pass) passed++;
  }

  if (passed === CHECKS.length) {
    console.log(`All checks passed.`);
  } else {
    console.log(`Failed verification.`);
    process.exit(1);
  }
}

run();

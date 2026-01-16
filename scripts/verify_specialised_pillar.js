import http from 'http';

const BASE_URL = 'http://localhost:8005';

const PAGES = [
  '/specialised-vehicle-transport/',
  '/enclosed-car-transport/',
  '/transport-non-drivable-cars/',
  '/classic-and-vintage-car-transport-services/',
  '/transport-luxury-prestige-cars/',
  '/transport-boat-caravan-trailer/',
];

async function checkPage(path) {
  return new Promise((resolve) => {
    http
      .get(`${BASE_URL}${path}`, (res) => {
        if (res.statusCode === 200) {
          resolve({ path, pass: true, msg: `✅ ${path} is accessible (200)` });
        } else {
          resolve({
            path,
            pass: false,
            msg: `❌ ${path} returned ${res.statusCode}`,
          });
        }
      })
      .on('error', (e) => {
        resolve({
          path,
          pass: false,
          msg: `❌ Error checking ${path}: ${e.message}`,
        });
      });
  });
}

async function run() {
  console.log(`Verifying Specialised Transport Pillar...`);
  let passed = 0;

  for (const path of PAGES) {
    const res = await checkPage(path);
    console.log(res.msg);
    if (res.pass) passed++;
  }

  if (passed === PAGES.length) {
    console.log(`All ${passed} pages verified successfully.`);
  } else {
    console.log(`Failed verification. Only ${passed}/${PAGES.length} passed.`);
    process.exit(1);
  }
}

run();

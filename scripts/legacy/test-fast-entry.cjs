const { chromium } = require('playwright');

const USERS = [
  { email: 'admin@mxperformance.com.br', role: 'admin', path: '/painel' },
  { email: 'dono@mxperformance.com.br', role: 'dono', path: '/lojas' },
  { email: 'gerente@mxperformance.com.br', role: 'gerente', path: '/loja' },
  { email: 'vendedor@mxperformance.com.br', role: 'vendedor', path: '/home' }
];
const PASSWORD = process.env.MX_E2E_PASSWORD;
if (!PASSWORD) throw new Error('MX_E2E_PASSWORD is required');
const BASE_URL = 'https://mxperformance.vercel.app';

async function fastEntryTest(user) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`\n⚡ Measuring Fast Entry for ${user.role.toUpperCase()}...`);
  
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', PASSWORD);
  
  const start = Date.now();
  await page.click('button[type="submit"]');
  
  // Wait for the target URL
  await page.waitForURL(url => url.pathname.includes(user.path), { timeout: 15000 });
  const redirectTime = Date.now() - start;
  
  // Wait for Data (not skeletons)
  // Most pages have a "text-text-primary" or "font-black" for real data/titles
  await page.waitForSelector('.text-text-primary.font-black, h1.font-black', { timeout: 10000 }).catch(() => {});
  const dataTime = Date.now() - start;

  console.log(`   - Redirect to ${user.path}: ${redirectTime}ms`);
  console.log(`   - Total to Data Visible: ${dataTime}ms`);

  await browser.close();
  return { role: user.role, redirectTime, dataTime };
}

async function run() {
  const results = [];
  for (const user of USERS) {
    results.push(await fastEntryTest(user));
  }
  console.log('\n' + '='.repeat(40));
  console.log('ENTRY PERFORMANCE SUMMARY');
  console.log('='.repeat(40));
  console.table(results);
}

run().catch(console.error);

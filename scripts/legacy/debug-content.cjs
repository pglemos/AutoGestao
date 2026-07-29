const { chromium } = require('playwright');

const password = process.env.MX_E2E_PASSWORD;
if (!password) throw new Error('MX_E2E_PASSWORD is required');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://mxperformance.vercel.app/login');
  await page.fill('input[type="email"]', 'admin@mxperformance.com.br');
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/painel');
  await page.waitForLoadState('networkidle');

  const content = await page.content();
  console.log('--- Page Content Heuristics ---');
  console.log('Includes "Erro":', content.includes('Erro'));
  console.log('Includes "error":', content.includes('error'));
  console.log('Includes "Not Found":', content.includes('Not Found'));
  
  // Find where "error" is
  const matches = content.match(/.{0,20}error.{0,20}/gi);
  console.log('Matches for "error":', matches);

  await browser.close();
})();

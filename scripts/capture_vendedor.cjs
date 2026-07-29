const { chromium } = require('playwright');
const path = require('path');

const artifactDir = '/Users/pedroguilherme/.gemini/antigravity-cli/brain/ed35f70b-b06d-4198-86db-d24aa5c9d747';

const pagesToCapture = [
  { name: 'inicio', path: '/home' },
  { name: 'fechamento_diario', path: '/terminal-mx' },
  { name: 'rotina_dia', path: '/central-execucao' },
  { name: 'mentor_comercial', path: '/carteira-clientes' },
  { name: 'minha_meta', path: '/meu-funil' },
  { name: 'ranking', path: '/ranking' },
  { name: 'universidade_mx', path: '/treinamentos' },
  { name: 'desenvolvimento', path: '/feedbacks' },
  { name: 'meu_perfil', path: '/perfil' },
  { name: 'remuneracao', path: '/minha-remuneracao' }
];

async function run() {
  console.log('Starting Playwright screenshot capture for vendedor@mxgestaopreditiva.com.br...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1366, height: 768 });

  try {
    // Login
    console.log('Logging in...');
    await page.goto('http://localhost:3100/login');
    await page.fill('input[type="email"]', 'vendedor@mxgestaopreditiva.com.br');
    const password = process.env.MX_E2E_PASSWORD;
    if (!password) throw new Error('MX_E2E_PASSWORD is required');
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/home', { timeout: 15000 });
    console.log('Login successful! Redirected to /home.');

    // Capturing pages
    for (const p of pagesToCapture) {
      console.log(`Navigating to ${p.path} (${p.name})...`);
      await page.goto(`http://localhost:3100${p.path}`);
      await page.waitForTimeout(2500); // Allow extra time for charts and data fetching

      const filePath = path.join(artifactDir, `screenshot_vendedor_${p.name}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Saved screenshot to ${filePath}`);
    }

  } catch (error) {
    console.error('Error during capture:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
    console.log('Finished capturing screenshots.');
  }
}

run().catch(console.error);

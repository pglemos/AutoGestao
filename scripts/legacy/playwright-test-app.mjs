import { chromium } from 'playwright';

const password = process.env.MX_E2E_PASSWORD;
if (!password) throw new Error('MX_E2E_PASSWORD is required');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    console.log('Navigating to login');
    await page.goto('http://127.0.0.1:3000/login');
    
    await page.fill('input[type="email"]', 'admin@mxperformance.com.br');
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(5000);
    
    // Check if we are at /painel or /
    console.log('Current URL:', page.url());
    
    // Try to click something in the dashboard
    // Looking for a button or link
    const buttons = await page.locator('button').all();
    console.log('Buttons found:', buttons.length);
    
    await browser.close();
})();

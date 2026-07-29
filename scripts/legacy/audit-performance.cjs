const { chromium } = require('playwright');

const USERS = [
  { 
    email: 'admin@mxperformance.com.br', 
    role: 'admin',
    routes: ['/painel', '/lojas', '/equipe', '/metas', '/relatorio-matinal', '/devolutivas', '/treinamentos', '/produtos', '/notificacoes', '/configuracoes/operacional', '/configuracoes/reprocessamento', '/configuracoes']
  },
  { 
    email: 'dono@mxperformance.com.br', 
    role: 'dono',
    routes: ['/lojas', '/loja', '/metas', '/funil', '/relatorio-matinal', '/devolutivas']
  },
  { 
    email: 'gerente@mxperformance.com.br', 
    role: 'gerente',
    routes: ['/loja', '/equipe', '/rotina', '/classificacao', '/devolutivas', '/pdi', '/treinamentos']
  },
  { 
    email: 'vendedor@mxperformance.com.br', 
    role: 'vendedor',
    routes: ['/home', '/lancamento-diario', '/historico', '/classificacao', '/devolutivas', '/pdi', '/treinamentos']
  }
];
const PASSWORD = process.env.MX_E2E_PASSWORD;
if (!PASSWORD) throw new Error('MX_E2E_PASSWORD is required');
const BASE_URL = 'https://mxperformance.vercel.app';

async function auditUser(user) {
  console.log(`\n🚀 Starting Audit for ${user.role.toUpperCase()} (${user.email})...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    loginTime: 0,
    pages: [],
    errors: []
  };

  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.errors.push(`[${user.role}] Console: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    results.errors.push(`[${user.role}] PageError: ${error.message}`);
  });

  try {
    // 1. Login
    console.log(`  Logging in...`);
    const startLogin = Date.now();
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL(url => url.pathname !== '/login', { timeout: 15000 });
    
    // Wait for initial data load (no skeletons)
    await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 10000 }).catch(() => {});
    
    results.loginTime = Date.now() - startLogin;
    console.log(`  ✅ Login Success in ${results.loginTime}ms`);

    // 2. Navigate Routes
    for (const route of user.routes) {
      console.log(`  Testing ${route}...`);
      const startNav = Date.now();
      
      // Use internal navigation if possible, or just page.goto
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
      
      // Wait for skeletons to disappear
      await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 5000 }).catch(() => {});
      
      const duration = Date.now() - startNav;
      const content = await page.content();
      
      // Heuristics for errors - only check for visible text, not hidden styles
      const hasError = content.includes('Erro ao') || content.includes('Não foi possível') || content.includes('Página não encontrada') || content.includes('Ops!');
      const isEmpty = content.includes('Vácuo de') || content.includes('Nenhum registro');
      
      results.pages.push({
        path: route,
        loadTime: duration,
        status: hasError ? '❌ ERROR' : (isEmpty ? '⚠️ EMPTY' : '✅ OK')
      });
      
      console.log(`    ${hasError ? '❌' : (isEmpty ? '⚠️' : '✅')} Loaded in ${duration}ms`);
    }

  } catch (err) {
    console.error(`  ❌ Critical failure: ${err.message}`);
    results.errors.push(`Critical: ${err.message}`);
  } finally {
    await browser.close();
  }

  return results;
}

async function runFullAudit() {
  const finalReport = {};
  for (const user of USERS) {
    finalReport[user.role] = await auditUser(user);
  }

  console.log('\n' + '='.repeat(80));
  console.log('FINAL PERFORMANCE & FUNCTIONAL REPORT');
  console.log('='.repeat(80));
  
  for (const [role, data] of Object.entries(finalReport)) {
    console.log(`\n👤 ROLE: ${role.toUpperCase()}`);
    console.log(`   Avg Login Time: ${data.loginTime}ms`);
    console.table(data.pages);
    if (data.errors.length > 0) {
      console.log(`   ERRORS FOUND:`);
      [...new Set(data.errors)].forEach(e => console.log(`     - ${e}`));
    } else {
      console.log(`   ✅ No functional errors found.`);
    }
  }
}

runFullAudit().catch(console.error);

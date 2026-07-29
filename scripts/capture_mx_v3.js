import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3003';
const OUTPUT_DIR = '/Users/pedroguilherme/Pictures/PRINT REVISÃO MX';
const MAX_RETRIES = 2;
const SLICE_HEIGHT = 800;
const OVERLAP = 100;

// Configuração dos breakpoints exigidos
const BREAKPOINTS = [
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'Notebook', width: 1280, height: 720 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 390, height: 844 }
];

const MX_E2E_PASSWORD = process.env.MX_E2E_PASSWORD;
if (!MX_E2E_PASSWORD) throw new Error('MX_E2E_PASSWORD is required');

const PROFILES = [
  { id: 'VENDEDOR', email: 'vendedor@mxgestaopreditiva.com.br', pass: MX_E2E_PASSWORD },
  { id: 'GERENTE', email: 'gerente@mxgestaopreditiva.com.br', pass: MX_E2E_PASSWORD },
  { id: 'DONO', email: 'dono@mxgestaopreditiva.com.br', pass: MX_E2E_PASSWORD },
  { id: 'ADMIN', email: 'synvollt@gmail.com', pass: MX_E2E_PASSWORD }
];

// O capturador escreve no manifesto provisório. Nunca decide se está VALIDADO.
const MANIFEST_PATH = path.join(OUTPUT_DIR, '05_RELATORIOS', 'MANIFESTO_V3_PRIMARIO.csv');

function initDirs() {
  const dirs = [
    '05_RELATORIOS',
    '01_MODULO_VENDEDOR',
    '02_MODULO_GERENTE',
    '03_MODULO_DONO',
    '04_MODULO_ADMIN_MX',
    '06_PERMISSOES_EVIDENCIAS'
  ];
  dirs.forEach(d => {
    const p = path.join(OUTPUT_DIR, d);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });

  if (!fs.existsSync(MANIFEST_PATH)) {
    fs.writeFileSync(MANIFEST_PATH, 'Id,Perfil,Breakpoint,Rota,Estado,Arquivo,Hash,StatusScript,Mensagem\n');
  }
}

function appendManifest(row) {
  fs.appendFileSync(MANIFEST_PATH, `${row.id},${row.perfil},${row.breakpoint},${row.rota},${row.estado},${row.arquivo},${row.hash},${row.statusScript},${row.mensagem}\n`);
}

function log(msg) {
  const t = new Date().toISOString().substring(11, 19);
  console.log(`[${t}] ${msg}`);
}

async function login(page, cred) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('#login-email').fill(cred.email);
  await page.locator('#login-password').fill(cred.pass);
  await page.locator('button[type="submit"]').click();
  
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    if (!page.url().includes('/login')) return true;
  }
  return false;
}

const FORBIDDEN_SCROLL_SELECTORS = 'nav, aside, [role="navigation"], .sidebar, .menu';

async function getScrollInfo(page) {
  return page.evaluate((forbidden) => {
    let container = document.querySelector('main#main-content');
    if (!container) container = document.querySelector('main.overflow-y-auto');
    
    if (!container) {
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        if (el.scrollHeight <= el.clientHeight || el.clientHeight <= 0) return false;
        const style = window.getComputedStyle(el);
        if (style.overflowY === 'visible' || style.display === 'none' || style.visibility === 'hidden') return false;
        if (el.getAttribute('aria-hidden') === 'true') return false;
        if (el.closest(forbidden)) return false;
        // Não rolar modais a menos que seja especificamente o alvo (simplificado para o main content)
        if (el.closest('[role="dialog"]') && style.opacity === '0') return false; 
        
        // Excluir containers muito estreitos (< 40% da tela)
        if (el.clientWidth < window.innerWidth * 0.4) return false;
        
        return true;
      }).sort((a, b) => b.scrollHeight - a.scrollHeight);
      
      if (elements.length > 0) container = elements[0];
    }
    
    if (container) {
      container.setAttribute('data-capture-scroll-target', 'true');
      return { 
        found: true,
        selector: container.tagName + (container.id ? '#'+container.id : ''),
        scrollHeight: container.scrollHeight, 
        clientHeight: container.clientHeight,
        scrollTop: container.scrollTop
      };
    }
    return { found: false, scrollHeight: 0, clientHeight: 0, scrollTop: 0 };
  }, FORBIDDEN_SCROLL_SELECTORS);
}

async function scrollContainerTo(page, pos) {
  await page.evaluate((pos) => {
    const container = document.querySelector('[data-capture-scroll-target="true"]');
    if (container) container.scrollTop = pos;
  }, pos);
  await page.waitForTimeout(400); // Wait for repaint
}

// Configuração de telas por perfil
const PAGES = {
  'VENDEDOR': [
    {
      route: '/home',
      name: '01_DASHBOARD',
      states: [
        { id: 'VENDEDOR_INICIO_PADRAO', name: 'PADRAO' },
        { 
          id: 'VENDEDOR_SIDEBAR_RECOLHIDA', 
          name: 'SIDEBAR_RECOLHIDA', 
          action: { type: 'click', selector: 'button[aria-label*="ecolher"]' },
          assertions: [{ type: 'not_visible', selector: 'text="Início"' }] 
        },
        {
          id: 'VENDEDOR_INICIO_NOTIFICACOES',
          name: 'NOTIFICACOES_ABERTAS',
          action: { type: 'click', selector: 'button[aria-label*="otifica"]' },
          assertions: [{ type: 'visible', selector: 'text="Notificações"' }]
        }
      ]
    },
    {
      route: '/vendedor/terminal-mx',
      name: '02_FECHAMENTO',
      states: [
        { id: 'VENDEDOR_TERMINAL_PADRAO', name: 'PADRAO' },
        {
          id: 'VENDEDOR_TERMINAL_MODAL_REGULARIZAR',
          name: 'MODAL_REGULARIZAR',
          action: { type: 'click', selector: 'button:has-text("Regularizar")' },
          assertions: [{ type: 'visible', selector: '[role="dialog"]' }, { type: 'text', selector: '[role="dialog"] h2', expected: 'Regularizar' }]
        }
      ]
    },
    { route: '/carteira-clientes', name: '03_CARTEIRA', states: [{ id: 'VENDEDOR_CARTEIRA_PADRAO', name: 'PADRAO' }] },
    { route: '/meu-funil', name: '04_FUNIL', states: [{ id: 'VENDEDOR_FUNIL_PADRAO', name: 'PADRAO' }] }
  ],
  'GERENTE': [
    { route: '/home', name: '01_DASHBOARD', states: [{ id: 'GERENTE_DASHBOARD_PADRAO', name: 'PADRAO' }] },
    { route: '/lojas/mx-consultoria?tab=equipe', name: '02_EQUIPE', states: [{ id: 'GERENTE_EQUIPE_PADRAO', name: 'PADRAO' }] },
    { route: '/funil-vendas', name: '03_FUNIL_LOJA', states: [{ id: 'GERENTE_FUNIL_PADRAO', name: 'PADRAO' }] }
  ],
  'DONO': [
    { route: '/lojas', name: '01_SELECAO', states: [{ id: 'DONO_SELECAO_PADRAO', name: 'PADRAO' }] },
    { route: '/lojas/mx-consultoria?ownerSection=planejamento', name: '02_DASHBOARD_PLANEJAMENTO', states: [{ id: 'DONO_PLAN_PADRAO', name: 'PADRAO' }] },
    { route: '/lojas/mx-consultoria?ownerSection=resultados', name: '02_DASHBOARD_RESULTADOS', states: [{ id: 'DONO_RES_PADRAO', name: 'PADRAO' }] }
  ],
  'ADMIN': [
    { route: '/painel', name: '01_OVERVIEW', states: [{ id: 'ADMIN_OVERVIEW_PADRAO', name: 'PADRAO' }] },
    { route: '/lojas', name: '02_LOJAS', states: [{ id: 'ADMIN_LOJAS_PADRAO', name: 'PADRAO' }] },
    { route: '/simulacao', name: '03_SIMULACAO', states: [{ id: 'ADMIN_SIMULACAO_PADRAO', name: 'PADRAO' }] }
  ]
};

async function checkAssertions(page, state) {
  if (!state.assertions) return { passed: true, reason: 'No assertions required' };
  
  for (const assertion of state.assertions) {
    try {
      if (assertion.type === 'visible') {
        const isVisible = await page.locator(assertion.selector).isVisible();
        if (!isVisible) return { passed: false, reason: `Assertion failed: ${assertion.selector} not visible` };
      } else if (assertion.type === 'not_visible') {
        const isVisible = await page.locator(assertion.selector).isVisible();
        if (isVisible) return { passed: false, reason: `Assertion failed: ${assertion.selector} should not be visible` };
      } else if (assertion.type === 'text') {
        const text = await page.locator(assertion.selector).first().innerText();
        if (!text.includes(assertion.expected)) return { passed: false, reason: `Assertion failed: Expected text "${assertion.expected}" not found in ${assertion.selector}` };
      }
    } catch (e) {
      return { passed: false, reason: `Assertion error: ${e.message}` };
    }
  }
  return { passed: true };
}

async function executeCapturePhase() {
  initDirs();
  const browser = await chromium.launch({ headless: true });
  
  for (const bp of BREAKPOINTS) {
    log(`\n============================================`);
    log(`Iniciando Breakpoint: ${bp.name} (${bp.width}x${bp.height})`);
    
    for (const profile of PROFILES) {
      log(`\nPerfil: ${profile.id}`);
      const context = await browser.newContext({ viewport: { width: bp.width, height: bp.height } });
      const page = await context.newPage();
      
      const loggedIn = await login(page, profile);
      if (!loggedIn) {
        log(`[ERRO] Login falhou para ${profile.id}`);
        await context.close();
        continue;
      }
      
      const pagesToTest = PAGES[profile.id];
      const folderMod = `0${PROFILES.indexOf(profile)+1}_MODULO_${profile.id.replace('ADMIN', 'ADMIN_MX')}`;
      
      for (const pInfo of pagesToTest) {
        log(`Acessando rota: ${pInfo.route}`);
        await page.goto(`${BASE_URL}${pInfo.route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000); // wait for skeleton to disappear
        
        const pageFolder = path.join(OUTPUT_DIR, folderMod, pInfo.name);
        if (!fs.existsSync(pageFolder)) fs.mkdirSync(pageFolder, { recursive: true });
        
        for (const state of pInfo.states) {
          log(`  Capturando estado: ${state.name} (${state.id})`);
          let status = 'CAPTURADO';
          let msg = '';
          
          if (state.action) {
            try {
              if (state.action.type === 'click') {
                const btn = page.locator(state.action.selector).first();
                if (await btn.isVisible()) {
                  await btn.click();
                  await page.waitForTimeout(1000); // Wait for animation
                  
                  const assertRes = await checkAssertions(page, state);
                  if (!assertRes.passed) {
                    status = 'FALHA_INTERACAO';
                    msg = assertRes.reason;
                  }
                } else {
                  status = 'FALHA_INTERACAO';
                  msg = `Action selector ${state.action.selector} not visible`;
                }
              }
            } catch (e) {
              status = 'FALHA_INTERACAO';
              msg = `Error during interaction: ${e.message}`;
            }
          }
          
          // Screenshot logic
          const baseName = `${bp.name}_${profile.id}_${pInfo.name}_${state.name}`;
          
          const sInfo = await getScrollInfo(page);
          if (sInfo.found && sInfo.scrollHeight > sInfo.clientHeight + 20) {
            let pos = 0;
            let slice = 1;
            while (pos < sInfo.scrollHeight) {
              await scrollContainerTo(page, pos);
              const sliceName = `${baseName}_P${String(slice).padStart(2, '0')}.png`;
              const filePath = path.join(pageFolder, sliceName);
              await page.screenshot({ path: filePath, clip: { x: 0, y: 0, width: bp.width, height: bp.height } });
              
              appendManifest({
                id: state.id, perfil: profile.id, breakpoint: bp.name, rota: pInfo.route, 
                estado: state.name, arquivo: sliceName, hash: 'PENDING_VALIDATION', statusScript: status, mensagem: msg
              });
              
              pos += SLICE_HEIGHT;
              slice++;
              if (slice > 10) break; // safety limit
            }
          } else {
            const fileName = `${baseName}.png`;
            const filePath = path.join(pageFolder, fileName);
            await page.screenshot({ path: filePath, clip: { x: 0, y: 0, width: bp.width, height: bp.height } });
            appendManifest({
              id: state.id, perfil: profile.id, breakpoint: bp.name, rota: pInfo.route, 
              estado: state.name, arquivo: fileName, hash: 'PENDING_VALIDATION', statusScript: status, mensagem: msg
            });
          }
          
          // Revert state if needed (reload page)
          if (state.action) {
             await page.goto(`${BASE_URL}${pInfo.route}`, { waitUntil: 'domcontentloaded' });
             await page.waitForTimeout(1500);
          }
        }
      }
      
      await context.close();
    }
  }
  
  await browser.close();
  log('Captura V3 primária concluída. Rodar validador agora.');
}

executeCapturePhase().catch(console.error);

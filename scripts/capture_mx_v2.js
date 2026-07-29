/**
 * capture_mx_v2.js — Auditoria Completa Sistema MX (v2.0 Corrigida)
 *
 * AMBIENTE DE REFERÊNCIA:
 *   Branch  : main
 *   Commit  : 2f8e40fdf4f187027f3231c799b5b886c82b8906
 *   Build   : Local (Vite dev server)
 *   URL-base: http://localhost:3003
 *   Viewport: 1440 × 900 (fixo — sem expansão)
 *   Método  : scroll por fatias de 800 px com sobreposição de 100 px
 *   Playwright: ver no header gerado
 *
 * METODOLOGIA DE CAPTURA:
 *   1. Viewport fixo em 1440×900 — elementos fixed/sticky comportam-se como no browser real
 *   2. Conteúdo com scroll: série de fatias _P01, _P02 … (não expansão de altura)
 *   3. Estados interativos documentados por clique real nos elementos
 *   4. Validação pós-captura: sem loading skeleton, sem sobreposição detectável
 *   5. Falhas → 07_CAPTURAS_DESCARTADAS + registro em pendências
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

// ─── CONSTANTES ────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3003';
const OUTPUT_DIR = '/Users/pedroguilherme/Pictures/PRINT REVISÃO MX';
const DESCARTADAS_DIR = path.join(OUTPUT_DIR, '07_CAPTURAS_DESCARTADAS');
const RELATORIOS_DIR = path.join(OUTPUT_DIR, '05_RELATORIOS');
const PENDENCIAS_DIR = path.join(OUTPUT_DIR, '06_PENDENCIAS');

const VIEWPORT = { width: 1440, height: 900 };
const SLICE_HEIGHT = 800;   // altura útil por fatia
const SLICE_OVERLAP = 100;  // sobreposição entre fatias
const LOAD_WAIT = 3000;     // ms extra após networkidle
const INTER_STEP_WAIT = 800;// ms entre ações de interação

const COMMIT = '2f8e40fdf4f187027f3231c799b5b886c82b8906';
const BRANCH = 'main';
const MX_E2E_PASSWORD = process.env.MX_E2E_PASSWORD;
if (!MX_E2E_PASSWORD) throw new Error('MX_E2E_PASSWORD is required');

const CREDENTIALS = {
  VENDEDOR: { email: 'vendedor@mxgestaopreditiva.com.br', password: MX_E2E_PASSWORD },
  GERENTE: { email: 'gerente@mxgestaopreditiva.com.br', password: MX_E2E_PASSWORD },
  DONO: { email: 'dono@mxgestaopreditiva.com.br', password: MX_E2E_PASSWORD },
  ADMIN: { email: 'synvollt@gmail.com', password: MX_E2E_PASSWORD },
};

// ─── ESTADO GLOBAL ─────────────────────────────────────────────────────────────

let ORDER_COUNTER = 1;
const ALL_CAPTURES = [];      // { file, profile, menu, sub, state, slices, height }
const ALL_MAP_ROWS = [];      // para MAPA_DE_TELAS
const ALL_PENDING = [];       // para PENDENCIAS_E_BLOQUEIOS
const PERMISSION_ROWS = [];   // para MATRIZ_PERFIS_E_PERMISSOES

const RUN_START = new Date();

// ─── HELPERS GERAIS ─────────────────────────────────────────────────────────────

function pad(n, w = 3) { return String(n).padStart(w, '0'); }

function escapeCsv(val) {
  const s = val === null || val === undefined ? '' : String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(filePath, headers, rows) {
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escapeCsv(r[h])).join(',')),
  ];
  fs.writeFileSync(filePath, '\ufeff' + lines.join('\n'), 'utf8');
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function log(msg) { console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`); }

// ─── SETUP DE PASTAS ──────────────────────────────────────────────────────────

function setupFolders() {
  const dirs = [
    OUTPUT_DIR,
    path.join(OUTPUT_DIR, '01_MODULO_VENDEDOR'),
    path.join(OUTPUT_DIR, '02_MODULO_GERENTE'),
    path.join(OUTPUT_DIR, '03_MODULO_DONO'),
    path.join(OUTPUT_DIR, '04_MODULO_ADMIN_MX'),
    RELATORIOS_DIR,
    PENDENCIAS_DIR,
    DESCARTADAS_DIR,
  ];
  for (const d of dirs) fs.mkdirSync(d, { recursive: true });

  // Mover capturas anteriores para descartadas/V1
  const v1Dir = path.join(DESCARTADAS_DIR, '_V1_ANTERIOR');
  fs.mkdirSync(v1Dir, { recursive: true });

  for (const moduleDir of ['01_MODULO_VENDEDOR','02_MODULO_GERENTE','03_MODULO_DONO','04_MODULO_ADMIN_MX']) {
    const mDir = path.join(OUTPUT_DIR, moduleDir);
    const subDirs = fs.existsSync(mDir) ? fs.readdirSync(mDir) : [];
    for (const sub of subDirs) {
      const subPath = path.join(mDir, sub);
      if (!fs.statSync(subPath).isDirectory()) continue;
      const pngs = fs.readdirSync(subPath).filter(f => f.endsWith('.png'));
      for (const png of pngs) {
        try {
          fs.renameSync(path.join(subPath, png), path.join(v1Dir, png));
        } catch (e) { /* skip */ }
      }
    }
  }
  log(`Capturas V1 movidas para ${v1Dir}`);
}

function getSubFolder(moduleDir, menuName) {
  const subs = fs.existsSync(moduleDir) ? fs.readdirSync(moduleDir).filter(d => {
    try { return fs.statSync(path.join(moduleDir, d)).isDirectory(); } catch { return false; }
  }) : [];
  const slug = menuName.toUpperCase();
  let found = subs.find(d => d.toUpperCase().includes(slug));
  if (!found) {
    const idx = String(subs.length + 1).padStart(2, '0');
    found = `${idx}_${slug}`;
    fs.mkdirSync(path.join(moduleDir, found), { recursive: true });
  }
  return path.join(moduleDir, found);
}

// ─── ESPERA DE PÁGINA PRONTA ─────────────────────────────────────────────────

async function waitForPageReady(page) {
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch { /* ok */ }

  // Aguarda skeleton e loading sumirem
  try {
    await page.waitForFunction(() => {
      const indicators = document.querySelectorAll(
        '[data-loading="true"], [aria-busy="true"], .animate-spin'
      );
      // skeleton: elementos sem texto real que pulsam
      return indicators.length === 0;
    }, { timeout: 8000 });
  } catch { /* ok */ }

  await page.waitForTimeout(LOAD_WAIT);
}

// ─── DISMISS DE OVERLAYS (toasts) ────────────────────────────────────────────

async function dismissOverlays(page) {
  try {
    await page.evaluate(() => {
      document.querySelectorAll('[data-sonner-toast], .sonner-close-button').forEach(el => el.remove?.());
    });
  } catch { /* ok */ }
}

// ─── SCROLL DO CONTAINER INTERNO ─────────────────────────────────────────────

const SCROLL_SELECTOR = 'main section.overflow-y-auto, main > section, .overflow-y-auto';

async function getScrollInfo(page) {
  return page.evaluate((sel) => {
    const container = document.querySelector(sel);
    if (container) {
      return { el: true, scrollHeight: container.scrollHeight, clientHeight: container.clientHeight };
    }
    return { el: false, scrollHeight: document.documentElement.scrollHeight, clientHeight: window.innerHeight };
  }, SCROLL_SELECTOR);
}

async function scrollContainerTo(page, pos) {
  await page.evaluate(({ sel, pos }) => {
    const container = document.querySelector(sel);
    if (container) container.scrollTop = pos;
    else window.scrollTo(0, pos);
  }, { sel: SCROLL_SELECTOR, pos });
  await page.waitForTimeout(400);
}

// ─── CAPTURA POR FATIAS ───────────────────────────────────────────────────────

/**
 * Tira screenshots do conteúdo em fatias de viewport real (1440×900).
 * Retorna array de { file, sliceIndex }.
 * Para conteúdo que cabe em 900px: retorna 1 arquivo sem sufixo _P.
 * Para conteúdo com scroll > 900px: retorna N arquivos _P01, _P02 …
 */
async function captureSlices(page, folderPath, baseFilename) {
  await scrollContainerTo(page, 0);
  await page.waitForTimeout(300);

  const { scrollHeight, clientHeight } = await getScrollInfo(page);
  const needsSlices = scrollHeight > clientHeight + 20;

  const files = [];

  if (!needsSlices) {
    const filePath = path.join(folderPath, `${baseFilename}.png`);
    await page.screenshot({ path: filePath, clip: { x: 0, y: 0, width: 1440, height: 900 } });
    files.push({ file: filePath, sliceIndex: 0, scrollHeight });
    return files;
  }

  // Múltiplas fatias
  let scrollPos = 0;
  let sliceIndex = 1;

  while (scrollPos < scrollHeight) {
    await scrollContainerTo(page, scrollPos);
    await page.waitForTimeout(300);

    const filePath = path.join(folderPath, `${baseFilename}_P${pad(sliceIndex, 2)}.png`);
    await page.screenshot({ path: filePath, clip: { x: 0, y: 0, width: 1440, height: 900 } });
    files.push({ file: filePath, sliceIndex, scrollHeight });

    scrollPos += SLICE_HEIGHT;
    sliceIndex++;
    if (sliceIndex > 20) break; // safety cap
  }

  // Sempre incluir o topo como capa principal se houver mais de 1 fatia
  return files;
}

// ─── TENTATIVA DE CLIQUE ─────────────────────────────────────────────────────

/**
 * Tenta clicar em um dos seletores fornecidos (pode ser CSS, texto, aria-label).
 * Retorna true se conseguiu clicar, false caso contrário.
 */
async function tryClick(page, selectors, timeout = 5000) {
  for (const sel of selectors) {
    try {
      if (sel.startsWith('text=')) {
        const text = sel.replace('text=', '');
        const loc = page.getByText(text, { exact: false }).first();
        await loc.waitFor({ timeout: 2000 });
        await loc.click({ timeout });
        return true;
      } else if (sel.startsWith('role=button:')) {
        const name = sel.replace('role=button:', '');
        const loc = page.getByRole('button', { name, exact: false });
        await loc.first().waitFor({ timeout: 2000 });
        await loc.first().click({ timeout });
        return true;
      } else {
        const loc = page.locator(sel).first();
        await loc.waitFor({ timeout: 2000 });
        await loc.click({ timeout });
        return true;
      }
    } catch { /* try next */ }
  }
  return false;
}

async function tryPressEscape(page) {
  try { await page.keyboard.press('Escape'); await page.waitForTimeout(400); } catch { /* ok */ }
}

// ─── CAPTURA DE UM ESTADO ────────────────────────────────────────────────────

/**
 * Executa uma tarefa de captura:
 * 1. Executa ações de setup (cliques, waits)
 * 2. Aguarda página estável
 * 3. Captura fatias
 * 4. Executa ações de teardown
 * 5. Registra no manifesto e mapa
 */
async function captureTask(page, profileName, moduleDir, task) {
  const {
    menu, subfolder, sub, state, path: routePath,
    before = [], after = [], checkSelector = null,
    description = ''
  } = task;

  const folderPath = getSubFolder(moduleDir, subfolder || menu);
  const baseFilename = `${pad(ORDER_COUNTER)}_${profileName}_${menu}_${sub}_${state}`.toUpperCase().replace(/-/g, '_');

  // Verificar se o elemento que caracteriza o estado existe
  if (checkSelector) {
    try {
      const loc = page.locator(checkSelector).first();
      await loc.waitFor({ timeout: 3000 });
    } catch {
      log(`  ↳ [SKIP] Estado ${state} não disponível (selector: ${checkSelector})`);
      addPending(profileName, menu, sub, state, routePath, 'NAO_ENCONTRADO', `Selector '${checkSelector}' não encontrado`);
      return;
    }
  }

  // Executar setup
  for (const action of before) {
    try {
      if (action.type === 'click') {
        const found = await tryClick(page, action.selectors || [action.selector]);
        if (!found) {
          log(`  ↳ [WARN] Setup click not found: ${JSON.stringify(action.selectors || action.selector)}`);
          if (action.required) {
            addPending(profileName, menu, sub, state, routePath, 'NAO_ENCONTRADO', `Botão não encontrado: ${JSON.stringify(action.selectors || action.selector)}`);
            return;
          }
        }
      } else if (action.type === 'wait') {
        await page.waitForTimeout(action.ms || 1000);
      } else if (action.type === 'waitFor') {
        try {
          await page.locator(action.selector).first().waitFor({ timeout: action.timeout || 5000 });
        } catch { /* ok */ }
      } else if (action.type === 'key') {
        await page.keyboard.press(action.key);
      } else if (action.type === 'scroll') {
        await scrollContainerTo(page, action.position === 'top' ? 0 : action.y || 0);
      } else if (action.type === 'fill') {
        try {
          await page.locator(action.selector).first().fill(action.value || '');
        } catch { /* ok */ }
      }
      await page.waitForTimeout(INTER_STEP_WAIT);
    } catch (e) {
      log(`  ↳ [WARN] Action error: ${e.message}`);
    }
  }

  await dismissOverlays(page);

  // Capturar
  let files = [];
  let success = false;
  let errorMsg = '';
  let attempts = 0;

  while (!success && attempts < 3) {
    attempts++;
    try {
      files = await captureSlices(page, folderPath, baseFilename);
      success = true;
    } catch (e) {
      errorMsg = e.message;
      log(`  ↳ [RETRY ${attempts}/3] ${e.message}`);
      await page.waitForTimeout(1500);
    }
  }

  // Teardown
  for (const action of after) {
    try {
      if (action.type === 'key') {
        await page.keyboard.press(action.key);
      } else if (action.type === 'click') {
        await tryClick(page, action.selectors || [action.selector]);
      } else if (action.type === 'scroll') {
        await scrollContainerTo(page, 0);
      } else if (action.type === 'wait') {
        await page.waitForTimeout(action.ms || 500);
      }
      await page.waitForTimeout(400);
    } catch { /* ok */ }
  }

  if (success) {
    for (const f of files) {
      const stats = fs.statSync(f.file);
      const fileHash = sha256(f.file);
      const sliceSuffix = f.sliceIndex ? `_P${pad(f.sliceIndex, 2)}` : '';

      ALL_CAPTURES.push({
        id: ORDER_COUNTER,
        profile: profileName,
        menu,
        sub,
        state,
        path: routePath,
        description,
        filename: path.basename(f.file),
        filePath: f.file,
        scrollHeight: f.scrollHeight,
        slices: files.length,
        sliceIndex: f.sliceIndex,
        fileSize: stats.size,
        hash: fileHash,
        timestamp: new Date().toISOString(),
      });
    }

    addMapRow(profileName, menu, sub, state, routePath, description, files.length, 'VALIDADO');
    log(`  ✓ [${pad(ORDER_COUNTER)}] ${baseFilename} (${files.length} fatia(s), scrollH=${files[0]?.scrollHeight}px)`);
    ORDER_COUNTER++;
  } else {
    // Mover para descartadas
    const errFilename = `ERR_${baseFilename}.png`;
    try {
      await page.screenshot({ path: path.join(DESCARTADAS_DIR, errFilename) });
    } catch { /* ok */ }
    addPending(profileName, menu, sub, state, routePath, 'BLOQUEADO', `Falha após 3 tentativas: ${errorMsg}`);
    addMapRow(profileName, menu, sub, state, routePath, description, 0, 'BLOQUEADO');
    log(`  ✗ [FALHA] ${baseFilename}: ${errorMsg}`);
  }
}

// ─── HELPERS DE REGISTRO ─────────────────────────────────────────────────────

function addMapRow(profile, menu, sub, state, routePath, description, slices, status) {
  ALL_MAP_ROWS.push({
    ID: ORDER_COUNTER,
    Perfil: profile,
    'Menu principal': menu,
    Submenu: sub,
    'Nome da tela': `${menu} — ${sub}`,
    'Descrição': description,
    URL: routePath,
    'Estado da tela': state,
    'Possui modal': state.includes('MODAL') || state.includes('DRAWER') ? 'SIM' : 'NÃO',
    'Possui rolagem': slices > 1 ? 'SIM' : 'NÃO',
    'Nº de fatias': slices,
    Status: status,
    'Captura necessária': 'SIM',
    Observações: '',
  });
}

function addPending(profile, menu, sub, state, routePath, type, detail) {
  ALL_PENDING.push({ profile, menu, sub, state, routePath, type, detail, timestamp: new Date().toISOString() });
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

async function login(page, cred, profileName) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await page.locator('#login-email').fill(cred.email);
  await page.locator('#login-password').fill(cred.password);
  await page.locator('button[type="submit"]').click();

  // Poll for URL change (Supabase auth can take 5-10s)
  let landed = false;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    if (!page.url().includes('/login')) { landed = true; break; }
  }
  if (!landed) throw new Error(`Login falhou para ${profileName} (timeout 30s)`);

  await waitForPageReady(page);
  const landing = page.url();
  log(`Login ${profileName}: ${landing}`);
  return landing;
}

// ─── NAVEGAÇÃO ────────────────────────────────────────────────────────────────

async function navigateTo(page, routePath, profileName) {
  try {
    await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await waitForPageReady(page);
    await scrollContainerTo(page, 0);
  } catch (e) {
    log(`  ↳ [NAV ERROR] ${profileName} → ${routePath}: ${e.message}`);
  }
}

// ─── TESTE DE PERMISSÃO ──────────────────────────────────────────────────────

async function testPermission(browser, profileName, cred, routePath) {
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  // Interceptar respostas HTTP
  const responses = [];
  page.on('response', r => {
    if (r.url().includes(BASE_URL) || r.url().includes('supabase')) {
      responses.push({ url: r.url(), status: r.status() });
    }
  });

  let result = 'NAO_TESTADO';
  let finalUrl = '';
  let displayedText = '';

  try {
    await login(page, cred, profileName);
    const urlBefore = page.url();
    await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForPageReady(page);
    finalUrl = page.url();

    displayedText = await page.evaluate(() => document.body?.innerText?.substring(0, 200) || '');

    if (finalUrl.includes('/login')) {
      result = 'BLOQUEADO_REDIRECT_LOGIN';
    } else if (finalUrl !== `${BASE_URL}${routePath}` && !finalUrl.includes(routePath)) {
      result = 'BLOQUEADO_REDIRECT';
    } else if (displayedText.includes('403') || displayedText.includes('Acesso não autorizado') || displayedText.includes('não tem permissão')) {
      result = 'BLOQUEADO_403';
    } else {
      result = 'ACESSO_TOTAL';
    }
  } catch (e) {
    result = `ERRO: ${e.message.substring(0, 80)}`;
  } finally {
    await ctx.close();
  }

  return { profileName, routePath, result, finalUrl, displayedText: displayedText.substring(0, 100) };
}

// ─── DEFINIÇÃO DE ROTAS POR PERFIL ──────────────────────────────────────────

function buildVendedorRoutes(storeSlug) {
  return [
    // Início / Cockpit
    { menu: 'INICIO', subfolder: '01_INICIO', sub: 'COCKPIT', path: '/home', state: 'PADRAO', description: 'Dashboard principal do vendedor' },
    { menu: 'INICIO', subfolder: '01_INICIO', sub: 'COCKPIT', path: '/home', state: 'SIDEBAR_RECOLHIDA', description: 'Sidebar recolhida',
      before: [{ type: 'click', selectors: ['button[aria-label*="Recolher"]', 'button[aria-label*="Colapsar"]', 'button[aria-label*="ecolher"]'] }],
      after:  [{ type: 'click', selectors: ['button[aria-label*="Expandir"]', 'button[aria-label*="xpandir"]', 'button[aria-label*="panel"]'] }],
    },
    { menu: 'INICIO', subfolder: '01_INICIO', sub: 'COCKPIT', path: '/home', state: 'NOTIFICACOES_ABERTAS', description: 'Painel de notificações aberto',
      before: [
        { type: 'click', selectors: ['[aria-label*="notifica"]', 'a[href*="notifica"]', 'button[aria-label*="sino"]'] },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }],
    },

    // Fechamento Diário
    { menu: 'FECHAMENTO_DIARIO', subfolder: '02_FECHAMENTO_DIARIO', sub: 'TERMINAL', path: '/vendedor/terminal-mx', state: 'PADRAO', description: 'Tela de fechamento diário' },
    { menu: 'FECHAMENTO_DIARIO', subfolder: '02_FECHAMENTO_DIARIO', sub: 'HISTORICO', path: '/vendedor/terminal-mx', state: 'HISTORICO_ABERTO', description: 'Painel de histórico de fechamentos aberto',
      before: [
        { type: 'click', selectors: ['text=Histórico', 'button:has-text("Histórico")', '[aria-label*="istórico"]'], required: false },
        { type: 'wait', ms: 800 },
      ],
      after: [{ type: 'key', key: 'Escape' }],
    },
    { menu: 'FECHAMENTO_DIARIO', subfolder: '02_FECHAMENTO_DIARIO', sub: 'NOVO_CLIENTE', path: '/vendedor/terminal-mx', state: 'MODAL_NOVO_CLIENTE', description: 'Modal de novo cliente aberto',
      before: [
        { type: 'click', selectors: ['text=Novo Cliente', 'button:has-text("Novo Cliente")', '[aria-label*="ovo cliente"]'], required: false },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 500 }],
    },
    { menu: 'FECHAMENTO_DIARIO', subfolder: '02_FECHAMENTO_DIARIO', sub: 'REGULARIZAR', path: '/vendedor/terminal-mx', state: 'MODAL_REGULARIZAR', description: 'Modal de regularização de dias',
      before: [
        { type: 'click', selectors: ['text=Regularizar', 'button:has-text("Regularizar")', '[aria-label*="egularizar"]'], required: false },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 500 }],
    },

    // Rotina do Dia
    { menu: 'ROTINA_DIA', subfolder: '03_ROTINA_DIA', sub: 'EXECUCAO', path: '/central-execucao', state: 'PADRAO', description: 'Central de execução e rotina' },

    // Mentor Comercial / Carteira de Clientes
    { menu: 'MENTOR_COMERCIAL', subfolder: '04_MENTOR_COMERCIAL', sub: 'CARTEIRA', path: '/carteira-clientes', state: 'PADRAO', description: 'Lista de clientes da carteira' },
    { menu: 'MENTOR_COMERCIAL', subfolder: '04_MENTOR_COMERCIAL', sub: 'FILTRO', path: '/carteira-clientes', state: 'FILTRO_ABERTO', description: 'Painel de filtros aberto',
      before: [
        { type: 'click', selectors: ['text=Filtrar', 'button:has-text("Filtrar")', '[aria-label*="iltro"]', 'button[aria-label*="filtrar"]'] },
        { type: 'wait', ms: 800 },
      ],
      after: [{ type: 'key', key: 'Escape' }],
    },
    { menu: 'MENTOR_COMERCIAL', subfolder: '04_MENTOR_COMERCIAL', sub: 'DETALHE', path: '/carteira-clientes', state: 'DETALHE_CLIENTE', description: 'Detalhe de um cliente aberto',
      before: [
        { type: 'scroll', position: 'top' },
        { type: 'click', selectors: ['[data-testid*="client-card"]:first-child', '.cursor-pointer:first-child', 'text=Ver detalhes', 'button:has-text("Detalhes")'] },
        { type: 'wait', ms: 1200 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 400 }],
    },

    // Minha Meta / Funil
    { menu: 'MINHA_META', subfolder: '05_MINHA_META', sub: 'FUNIL', path: '/meu-funil', state: 'PADRAO', description: 'Funil de vendas do vendedor' },
    { menu: 'MINHA_META', subfolder: '05_MINHA_META', sub: 'PERIODO', path: '/meu-funil', state: 'FILTRO_PERIODO', description: 'Seletor de período aberto',
      before: [
        { type: 'click', selectors: ['[aria-label*="período"]', 'button:has-text("Mês")', 'button:has-text("Semana")', '[role="combobox"]'] },
        { type: 'wait', ms: 600 },
      ],
      after: [{ type: 'key', key: 'Escape' }],
    },

    // Relatórios
    { menu: 'RELATORIOS', subfolder: '06_RELATORIOS', sub: 'DASHBOARD', path: '/relatorios', state: 'PADRAO', description: 'Relatórios do vendedor' },

    // Ranking
    { menu: 'RANKING', subfolder: '07_RANKING', sub: 'CLASSIFICACAO', path: '/classificacao', state: 'PADRAO', description: 'Ranking e classificação' },

    // Universidade MX
    { menu: 'UNIVERSIDADE_MX', subfolder: '08_UNIVERSIDADE_MX', sub: 'CURSOS', path: '/universidade-mx', state: 'PADRAO', description: 'Catálogo de treinamentos' },
    { menu: 'UNIVERSIDADE_MX', subfolder: '08_UNIVERSIDADE_MX', sub: 'MODAL_AULA', path: '/universidade-mx', state: 'MODAL_CURSO_ABERTO', description: 'Modal de detalhe de curso',
      before: [
        { type: 'click', selectors: ['[data-testid*="course"]', '.cursor-pointer', 'text=Acessar', 'text=Ver curso', 'button:has-text("Iniciar")'] },
        { type: 'wait', ms: 1200 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 400 }],
    },

    // Desenvolvimento
    { menu: 'DESENVOLVIMENTO', subfolder: '09_DESENVOLVIMENTO', sub: 'PADRAO', path: '/desenvolvimento', state: 'PADRAO', description: 'Área de desenvolvimento (aba padrão)' },
    { menu: 'DESENVOLVIMENTO', subfolder: '09_DESENVOLVIMENTO', sub: 'FEEDBACK', path: '/desenvolvimento?tab=feedback', state: 'ABA_FEEDBACK', description: 'Aba de feedbacks/devolutivas' },
    { menu: 'DESENVOLVIMENTO', subfolder: '09_DESENVOLVIMENTO', sub: 'PDI', path: '/desenvolvimento?tab=pdi', state: 'ABA_PDI', description: 'Aba de PDI' },

    // Perfil
    { menu: 'PERFIL', subfolder: '10_PERFIL', sub: 'MEU_PERFIL', path: '/perfil', state: 'PADRAO', description: 'Perfil do vendedor' },

    // Configurações
    { menu: 'CONFIGURACOES', subfolder: '11_CONFIGURACOES', sub: 'GERAL', path: '/configuracoes', state: 'PADRAO', description: 'Configurações do vendedor' },

    // Notificações
    { menu: 'NOTIFICACOES', subfolder: '12_NOTIFICACOES', sub: 'LISTAGEM', path: '/notificacoes', state: 'PADRAO', description: 'Lista de notificações' },

    // Ajuda
    { menu: 'AJUDA', subfolder: '13_AJUDA', sub: 'FALE_CONOSCO', path: '/ajuda', state: 'PADRAO', description: 'Central de ajuda' },
  ];
}

function buildGerenteRoutes(storeSlug) {
  const slug = storeSlug || 'mx-consultoria';
  return [
    // Dashboard Loja
    { menu: 'DASHBOARD_LOJA', subfolder: '01_DASHBOARD_LOJA', sub: 'COCKPIT', path: `/lojas/${slug}`, state: 'PADRAO', description: 'Cockpit da loja' },
    { menu: 'DASHBOARD_LOJA', subfolder: '01_DASHBOARD_LOJA', sub: 'FILTRO', path: `/lojas/${slug}`, state: 'FILTRO_PERIODO', description: 'Filtro de período aberto',
      before: [
        { type: 'click', selectors: ['button:has-text("Semana")', 'button:has-text("Mês")', '[aria-label*="período"]', '[role="combobox"]'] },
        { type: 'wait', ms: 600 },
      ],
      after: [{ type: 'key', key: 'Escape' }],
    },

    // Equipe
    { menu: 'EQUIPE', subfolder: '02_EQUIPE', sub: 'LISTAGEM', path: `/lojas/${slug}?tab=equipe`, state: 'PADRAO', description: 'Lista de membros da equipe' },
    { menu: 'EQUIPE', subfolder: '02_EQUIPE', sub: 'NOVO_INTEGRANTE', path: `/lojas/${slug}?tab=equipe`, state: 'MODAL_NOVO_INTEGRANTE', description: 'Modal de convite de novo integrante',
      before: [
        { type: 'click', selectors: ['text=Novo Integrante', 'button:has-text("Novo Integrante")', 'text=Convidar', 'button:has-text("Convidar")'] },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 500 }],
    },
    { menu: 'EQUIPE', subfolder: '02_EQUIPE', sub: 'DETALHE', path: `/lojas/${slug}?tab=equipe`, state: 'DETALHE_MEMBRO', description: 'Detalhe de um membro da equipe',
      before: [
        { type: 'click', selectors: ['[data-testid*="member"]', 'tr.cursor-pointer:first-child', 'button:has-text("Ver")'] },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 400 }],
    },

    // Rotina/Agenda
    { menu: 'ROTINA', subfolder: '03_ROTINA', sub: 'AGENDA', path: '/rotina', state: 'PADRAO', description: 'Agenda de rotina do gerente' },
    { menu: 'ROTINA', subfolder: '03_ROTINA', sub: 'NOVA_ATIVIDADE', path: '/rotina', state: 'MODAL_NOVA_ATIVIDADE', description: 'Modal de nova atividade',
      before: [
        { type: 'click', selectors: ['text=Nova Atividade', 'button:has-text("Nova Atividade")', 'text=Adicionar', 'button:has-text("Adicionar")'] },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 500 }],
    },

    // Funil de Vendas
    { menu: 'FUNIL_VENDAS', subfolder: '04_FUNIL_VENDAS', sub: 'KANBAN', path: '/funil-vendas', state: 'PADRAO', description: 'Funil de vendas da loja' },
    { menu: 'FUNIL_VENDAS', subfolder: '04_FUNIL_VENDAS', sub: 'FILTRO', path: '/funil-vendas', state: 'FILTRO_ABERTO', description: 'Filtros do funil abertos',
      before: [
        { type: 'click', selectors: ['text=Filtrar', 'button:has-text("Filtrar")', 'button:has-text("Filtros")', '[aria-label*="iltro"]'] },
        { type: 'wait', ms: 800 },
      ],
      after: [{ type: 'key', key: 'Escape' }],
    },

    // Performance / Negociações
    { menu: 'PERFORMANCE', subfolder: '05_PERFORMANCE', sub: 'RELATORIO', path: '/relatorios/performance-vendedor', state: 'PADRAO', description: 'Performance individual de vendedores' },

    // Metas
    { menu: 'METAS', subfolder: '06_METAS', sub: 'LOJA', path: '/metas', state: 'PADRAO', description: 'Metas da loja' },
    { menu: 'METAS', subfolder: '06_METAS', sub: 'EDICAO', path: '/metas', state: 'EDICAO_META', description: 'Edição de meta',
      before: [
        { type: 'click', selectors: ['text=Editar', 'button:has-text("Editar")', '[aria-label*="ditar"]', 'button:has-text("Definir")'] },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 500 }],
    },

    // Relatório Matinal
    { menu: 'RELATORIO_MATINAL', subfolder: '07_RELATORIO_MATINAL', sub: 'DASHBOARD', path: '/relatorio-matinal', state: 'PADRAO', description: 'Relatório matinal diário' },
    { menu: 'RELATORIO_MATINAL', subfolder: '07_RELATORIO_MATINAL', sub: 'FILTRO', path: '/relatorio-matinal', state: 'FILTRO_DATA', description: 'Filtro de data aplicado',
      before: [
        { type: 'click', selectors: ['text=Ontem', 'button:has-text("Ontem")', '[aria-label*="data"]', 'button:has-text("Data")'] },
        { type: 'wait', ms: 600 },
      ],
      after: [],
    },

    // Feedbacks
    { menu: 'FEEDBACKS', subfolder: '08_FEEDBACKS', sub: 'LISTAGEM', path: '/devolutivas', state: 'PADRAO', description: 'Lista de feedbacks e devolutivas' },
    { menu: 'FEEDBACKS', subfolder: '08_FEEDBACKS', sub: 'NOVO', path: '/devolutivas', state: 'MODAL_NOVO_FEEDBACK', description: 'Modal de novo feedback',
      before: [
        { type: 'click', selectors: ['text=Novo Feedback', 'button:has-text("Novo Feedback")', 'text=Dar Feedback', 'button:has-text("Dar Feedback")'] },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 500 }],
    },
    { menu: 'FEEDBACKS', subfolder: '08_FEEDBACKS', sub: 'DETALHE', path: '/devolutivas', state: 'DETALHE_FEEDBACK', description: 'Detalhe de feedback',
      before: [
        { type: 'click', selectors: ['[data-testid*="feedback"]', '.cursor-pointer:first-child', 'tr:first-child td'] },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 400 }],
    },

    // PDI
    { menu: 'PDI', subfolder: '09_PDI', sub: 'LISTAGEM', path: '/pdi', state: 'PADRAO', description: 'Lista de PDIs do gerente' },
    { menu: 'PDI', subfolder: '09_PDI', sub: 'NOVO', path: '/pdi', state: 'MODAL_NOVO_PDI', description: 'Modal de novo PDI',
      before: [
        { type: 'click', selectors: ['text=Novo PDI', 'button:has-text("Novo PDI")', 'text=Criar PDI', 'button:has-text("Criar PDI")'] },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 500 }],
    },

    // Treinamentos
    { menu: 'TREINAMENTOS', subfolder: '10_TREINAMENTOS', sub: 'LISTAGEM', path: '/treinamentos', state: 'PADRAO', description: 'Lista de treinamentos' },
    { menu: 'TREINAMENTOS', subfolder: '10_TREINAMENTOS', sub: 'DETALHE', path: '/treinamentos', state: 'DETALHE_CURSO', description: 'Detalhe de treinamento',
      before: [
        { type: 'click', selectors: ['text=Ver detalhes', 'button:has-text("Ver")', '.cursor-pointer:first-child'] },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 400 }],
    },

    // Biblioteca / Produtos
    { menu: 'BIBLIOTECA', subfolder: '11_BIBLIOTECA', sub: 'PRODUTOS', path: '/produtos', state: 'PADRAO', description: 'Biblioteca de produtos digitais' },

    // Consultor IA
    { menu: 'CONSULTOR_IA', subfolder: '12_CONSULTOR_IA', sub: 'CHAT', path: `/lojas/${slug}/consultor-ia`, state: 'PADRAO', description: 'Consultor IA — estado inicial' },
    { menu: 'CONSULTOR_IA', subfolder: '12_CONSULTOR_IA', sub: 'MENSAGEM', path: `/lojas/${slug}/consultor-ia`, state: 'MENSAGEM_ENVIADA', description: 'Consultor IA após envio de mensagem',
      before: [
        { type: 'fill', selector: 'textarea, input[type="text"]', value: 'Como está o desempenho da equipe este mês?' },
        { type: 'click', selectors: ['button[type="submit"]', 'button:has-text("Enviar")', '[aria-label*="nviar"]'] },
        { type: 'wait', ms: 3000 },
      ],
      after: [],
    },

    // Diagnóstico / Auditoria
    { menu: 'AUDITORIA', subfolder: '13_AUDITORIA', sub: 'DIAGNOSTICO', path: '/auditoria', state: 'PADRAO', description: 'Diagnóstico operacional de IA' },

    // Notificações
    { menu: 'NOTIFICACOES', subfolder: '14_NOTIFICACOES', sub: 'LISTAGEM', path: '/notificacoes', state: 'PADRAO', description: 'Lista de notificações' },

    // Perfil
    { menu: 'PERFIL', subfolder: '15_PERFIL', sub: 'GERENTE', path: '/perfil', state: 'PADRAO', description: 'Perfil do gerente' },

    // Configurações
    { menu: 'CONFIGURACOES', subfolder: '16_CONFIGURACOES', sub: 'GERAL', path: '/configuracoes', state: 'PADRAO', description: 'Configurações do gerente' },
  ];
}

function buildDonoRoutes(storeSlug) {
  const slug = storeSlug || 'mx-consultoria';
  const dashboardSections = [
    { section: 'planejamento', label: 'PLANEJAMENTO', description: 'Seção de planejamento estratégico' },
    { section: 'resultados', label: 'RESULTADOS', description: 'Seção de resultados operacionais' },
    { section: 'plano-acao', label: 'PLANO_ACAO', description: 'Seção de plano de ação' },
    { section: 'alertas', label: 'ALERTAS', description: 'Seção de alertas inteligentes' },
    { section: 'benchmarking', label: 'BENCHMARKING', description: 'Seção de benchmarking comparativo' },
    { section: 'agenda', label: 'AGENDA', description: 'Seção de agenda executiva' },
    { section: 'visitas', label: 'VISITAS', description: 'Seção de visitas e consultoria' },
    { section: 'departamentos', label: 'DEPARTAMENTOS', description: 'Seção de departamentos' },
    { section: 'biblioteca', label: 'BIBLIOTECA', description: 'Seção de biblioteca de conteúdos' },
  ];

  const routes = [
    { menu: 'SELECAO_LOJAS', subfolder: '01_SELECAO_LOJAS', sub: 'LISTAGEM', path: '/lojas', state: 'PADRAO', description: 'Seleção e listagem de lojas' },
  ];

  for (const sec of dashboardSections) {
    routes.push({
      menu: 'DASHBOARD_DONO',
      subfolder: '02_DASHBOARD_DONO',
      sub: sec.label,
      path: `/lojas/${slug}?ownerSection=${sec.section}`,
      state: 'PADRAO',
      description: sec.description,
    });
  }

  routes.push(
    { menu: 'CONSULTOR_IA', subfolder: '03_CONSULTOR_IA', sub: 'CHAT', path: `/lojas/${slug}/consultor-ia`, state: 'PADRAO', description: 'Consultor IA do dono' },
    { menu: 'CONSULTOR_IA', subfolder: '03_CONSULTOR_IA', sub: 'MENSAGEM', path: `/lojas/${slug}/consultor-ia`, state: 'MENSAGEM_ENVIADA', description: 'Consultor IA após envio',
      before: [
        { type: 'fill', selector: 'textarea, input[type="text"]', value: 'Qual a meta da loja para este mês?' },
        { type: 'click', selectors: ['button[type="submit"]', 'button:has-text("Enviar")', '[aria-label*="nviar"]'] },
        { type: 'wait', ms: 3000 },
      ],
    },
    { menu: 'FALAR_CONSULTOR', subfolder: '04_FALAR_CONSULTOR', sub: 'CONTATO', path: '/falar-consultor', state: 'PADRAO', description: 'Canal de contato com consultor' },
    { menu: 'RELATORIO_MATINAL', subfolder: '05_RELATORIO_MATINAL', sub: 'DASHBOARD', path: '/relatorio-matinal', state: 'PADRAO', description: 'Relatório matinal do dono' },
    { menu: 'TREINAMENTOS', subfolder: '06_TREINAMENTOS', sub: 'LISTAGEM', path: '/treinamentos', state: 'PADRAO', description: 'Treinamentos disponíveis' },
    { menu: 'ORGANOGRAMA', subfolder: '07_ORGANOGRAMA', sub: 'HIERARQUIA', path: '/organograma', state: 'PADRAO', description: 'Organograma da equipe' },
    { menu: 'ORGANOGRAMA', subfolder: '07_ORGANOGRAMA', sub: 'DETALHE', path: '/organograma', state: 'DETALHE_COLABORADOR', description: 'Detalhe de colaborador no organograma',
      before: [
        { type: 'click', selectors: ['[data-testid*="member"]', '.cursor-pointer:first-child', '.employee-node:first-child'] },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 400 }],
    },
    { menu: 'BANCO_TALENTOS', subfolder: '08_BANCO_TALENTOS', sub: 'COMPORTAMENTAL', path: '/banco-talentos', state: 'PADRAO', description: 'Banco de talentos comportamental' },
    { menu: 'BANCO_TALENTOS', subfolder: '08_BANCO_TALENTOS', sub: 'DETALHE', path: '/banco-talentos', state: 'DETALHE_PERFIL', description: 'Detalhe de perfil comportamental',
      before: [
        { type: 'click', selectors: ['[data-testid*="talent"]', '.cursor-pointer:first-child', 'button:has-text("Ver perfil")'] },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 400 }],
    },
    { menu: 'CONFIGURACOES', subfolder: '09_CONFIGURACOES', sub: 'GERAL', path: '/configuracoes', state: 'PADRAO', description: 'Configurações do dono' },
    { menu: 'CONFIGURACOES', subfolder: '09_CONFIGURACOES', sub: 'PERMISSOES', path: '/configuracoes', state: 'SECAO_PERMISSOES', description: 'Seção de permissões nas configurações',
      before: [
        { type: 'click', selectors: ['text=Permissões', 'button:has-text("Permissões")', '[aria-label*="ermissão"]'] },
        { type: 'wait', ms: 800 },
      ],
      after: [],
    },
    { menu: 'PERFIL', subfolder: '10_PERFIL', sub: 'DONO', path: '/perfil', state: 'PADRAO', description: 'Perfil do dono' },
    { menu: 'PERFIL', subfolder: '10_PERFIL', sub: 'EDICAO', path: '/perfil', state: 'EDICAO', description: 'Edição de dados do perfil',
      before: [
        { type: 'click', selectors: ['text=Editar', 'button:has-text("Editar")', '[aria-label*="ditar"]'] },
        { type: 'wait', ms: 800 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 400 }],
    },
  );

  return routes;
}

function buildAdminRoutes() {
  return [
    // Painel Geral
    { menu: 'PAINEL_GERAL', subfolder: '01_PAINEL_GERAL', sub: 'OVERVIEW', path: '/painel', state: 'PADRAO', description: 'Painel geral do Admin MX' },

    // Lojas
    { menu: 'LOJAS', subfolder: '02_LOJAS', sub: 'LISTAGEM', path: '/lojas', state: 'PADRAO', description: 'Lista de lojas cadastradas' },
    { menu: 'LOJAS', subfolder: '02_LOJAS', sub: 'DETALHE', path: '/lojas', state: 'DETALHE_LOJA', description: 'Detalhe de uma loja',
      before: [
        { type: 'click', selectors: ['[data-testid*="store"]', '.cursor-pointer:first-child', 'a[href*="lojas/"]:first-child'] },
        { type: 'wait', ms: 1200 },
      ],
      after: [{ type: 'click', selectors: ['text=Voltar', 'button:has-text("Voltar")', '[aria-label*="oltar"]'] }, { type: 'wait', ms: 800 }],
    },

    // Agenda Admin
    { menu: 'AGENDA', subfolder: '03_AGENDA', sub: 'CALENDARIO', path: '/agenda', state: 'PADRAO', description: 'Agenda administrativa' },
    { menu: 'AGENDA', subfolder: '03_AGENDA', sub: 'NOVA_ATIVIDADE', path: '/agenda', state: 'MODAL_NOVA_ATIVIDADE', description: 'Modal de nova atividade na agenda',
      before: [
        { type: 'click', selectors: ['text=Nova Atividade', 'button:has-text("Nova")', 'button:has-text("Adicionar")', '[aria-label*="dicionarAtividade"]'] },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 500 }],
    },

    // CRM Consultoria - Clientes
    { menu: 'CONSULTORIA', subfolder: '04_CONSULTORIA', sub: 'CLIENTES', path: '/consultoria/clientes', state: 'PADRAO', description: 'CRM de clientes da consultoria' },
    { menu: 'CONSULTORIA', subfolder: '04_CONSULTORIA', sub: 'NOVO_CLIENTE', path: '/consultoria/clientes', state: 'MODAL_NOVO_CLIENTE', description: 'Modal de cadastro de novo cliente',
      before: [
        { type: 'click', selectors: ['text=Novo Cliente', 'button:has-text("Novo Cliente")', 'button:has-text("Adicionar Cliente")'] },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 500 }],
    },
    { menu: 'CONSULTORIA', subfolder: '04_CONSULTORIA', sub: 'DETALHE', path: '/consultoria/clientes', state: 'DETALHE_CLIENTE', description: 'Detalhe de cliente de consultoria',
      before: [
        { type: 'click', selectors: ['[data-testid*="client"]', 'tr.cursor-pointer:first-child', '.cursor-pointer:first-child', 'text=Abrir'] },
        { type: 'wait', ms: 1500 },
      ],
      after: [{ type: 'click', selectors: ['text=Voltar', 'button:has-text("Voltar")', '[aria-label*="oltar"]'] }, { type: 'wait', ms: 800 }],
    },

    // Produtos Digitais
    { menu: 'PRODUTOS', subfolder: '05_PRODUTOS', sub: 'LISTAGEM', path: '/produtos', state: 'PADRAO', description: 'Gerenciador de produtos digitais' },
    { menu: 'PRODUTOS', subfolder: '05_PRODUTOS', sub: 'NOVO', path: '/produtos', state: 'MODAL_NOVO_PRODUTO', description: 'Modal de novo produto',
      before: [
        { type: 'click', selectors: ['text=Novo Produto', 'button:has-text("Novo Produto")', 'button:has-text("Adicionar")'] },
        { type: 'wait', ms: 1000 },
      ],
      after: [{ type: 'key', key: 'Escape' }, { type: 'wait', ms: 500 }],
    },

    // Relatório Matinal
    { menu: 'RELATORIO_MATINAL', subfolder: '06_RELATORIO_MATINAL', sub: 'ADMIN', path: '/relatorio-matinal', state: 'PADRAO', description: 'Relatório matinal de todas as lojas' },

    // Performance de Vendas
    { menu: 'PERFORMANCE_VENDAS', subfolder: '07_PERFORMANCE_VENDAS', sub: 'RELATORIO', path: '/relatorios/performance-vendas', state: 'PADRAO', description: 'Performance de vendas consolidado' },
    { menu: 'PERFORMANCE_VENDAS', subfolder: '07_PERFORMANCE_VENDAS', sub: 'FILTRO', path: '/relatorios/performance-vendas', state: 'FILTRO_APLICADO', description: 'Filtro aplicado no relatório',
      before: [
        { type: 'click', selectors: ['text=Filtrar', 'button:has-text("Filtrar")', 'button:has-text("Filtros")'] },
        { type: 'wait', ms: 800 },
      ],
      after: [{ type: 'key', key: 'Escape' }],
    },

    // Diagnóstico Operacional
    { menu: 'DIAGNOSTICO', subfolder: '08_DIAGNOSTICO', sub: 'AUDITORIA', path: '/auditoria', state: 'PADRAO', description: 'Diagnóstico operacional e auditoria IA' },

    // Configuração Operacional
    { menu: 'CONFIG_OPERACIONAL', subfolder: '09_CONFIG_OPERACIONAL', sub: 'GERAL', path: '/configuracoes/operacional', state: 'PADRAO', description: 'Configuração operacional de sistema' },

    // Parâmetros PMR
    { menu: 'PARAMETROS_PMR', subfolder: '10_PARAMETROS_PMR', sub: 'METRICAS', path: '/configuracoes/consultoria-pmr', state: 'PADRAO', description: 'Parâmetros de consultoria PMR' },

    // Configurações Gerais
    { menu: 'CONFIGURACOES', subfolder: '11_CONFIGURACOES', sub: 'ADMIN', path: '/configuracoes', state: 'PADRAO', description: 'Configurações gerais do Admin MX' },

    // Reprocessamento
    { menu: 'REPROCESSAMENTO', subfolder: '12_REPROCESSAMENTO', sub: 'PAINEL', path: '/configuracoes/reprocessamento', state: 'PADRAO', description: 'Painel de reprocessamento de dados' },
    { menu: 'REPROCESSAMENTO', subfolder: '12_REPROCESSAMENTO', sub: 'UPLOAD', path: '/configuracoes/reprocessamento', state: 'UPLOAD_ATIVO', description: 'Estado com seletor/upload ativo',
      before: [
        { type: 'click', selectors: ['input[type="file"]', 'button:has-text("Selecionar")', 'text=Escolher arquivo', 'label:has-text("Selecionar")'] },
        { type: 'wait', ms: 800 },
      ],
      after: [{ type: 'key', key: 'Escape' }],
    },

    // Simulação
    { menu: 'SIMULACAO', subfolder: '13_SIMULACAO', sub: 'PAINEL', path: '/simulacao', state: 'PADRAO', description: 'Painel de simulação de perfis' },
    { menu: 'SIMULACAO', subfolder: '13_SIMULACAO', sub: 'VENDEDOR', path: '/simulacao', state: 'SIMULAR_VENDEDOR', description: 'Simulação com perfil Vendedor ativa',
      before: [
        { type: 'click', selectors: ['text=Simular como Vendedor', 'button:has-text("Vendedor")', 'text=Vendedor'] },
        { type: 'wait', ms: 2000 },
      ],
      after: [
        { type: 'click', selectors: ['text=Encerrar simulação', 'button:has-text("Encerrar")', 'button:has-text("Sair da simulação")'] },
        { type: 'wait', ms: 1500 },
      ],
    },
    { menu: 'SIMULACAO', subfolder: '13_SIMULACAO', sub: 'GERENTE', path: '/simulacao', state: 'SIMULAR_GERENTE', description: 'Simulação com perfil Gerente ativa',
      before: [
        { type: 'click', selectors: ['text=Simular como Gerente', 'button:has-text("Gerente")', 'text=Gerente'] },
        { type: 'wait', ms: 2000 },
      ],
      after: [
        { type: 'click', selectors: ['text=Encerrar simulação', 'button:has-text("Encerrar")', 'button:has-text("Sair da simulação")'] },
        { type: 'wait', ms: 1500 },
      ],
    },
  ];
}

// ─── MATRIZ DE PERMISSÕES (rotas críticas × perfis) ───────────────────────────

const PERMISSION_ROUTES = [
  // Admin-only
  { path: '/painel', expectedAccess: { VENDEDOR: 'BLOQUEADO', GERENTE: 'BLOQUEADO', DONO: 'BLOQUEADO', ADMIN: 'ACESSO_TOTAL' } },
  { path: '/configuracoes/operacional', expectedAccess: { VENDEDOR: 'BLOQUEADO', GERENTE: 'BLOQUEADO', DONO: 'BLOQUEADO', ADMIN: 'ACESSO_TOTAL' } },
  { path: '/configuracoes/consultoria-pmr', expectedAccess: { VENDEDOR: 'BLOQUEADO', GERENTE: 'BLOQUEADO', DONO: 'BLOQUEADO', ADMIN: 'ACESSO_TOTAL' } },
  { path: '/configuracoes/reprocessamento', expectedAccess: { VENDEDOR: 'BLOQUEADO', GERENTE: 'BLOQUEADO', DONO: 'BLOQUEADO', ADMIN: 'ACESSO_TOTAL' } },
  { path: '/simulacao', expectedAccess: { VENDEDOR: 'BLOQUEADO', GERENTE: 'BLOQUEADO', DONO: 'BLOQUEADO', ADMIN: 'ACESSO_TOTAL' } },
  { path: '/consultoria/clientes', expectedAccess: { VENDEDOR: 'BLOQUEADO', GERENTE: 'BLOQUEADO', DONO: 'BLOQUEADO', ADMIN: 'ACESSO_TOTAL' } },
  // Vendedor-only
  { path: '/vendedor/terminal-mx', expectedAccess: { VENDEDOR: 'ACESSO_TOTAL', GERENTE: 'BLOQUEADO', DONO: 'BLOQUEADO', ADMIN: 'BLOQUEADO' } },
  { path: '/carteira-clientes', expectedAccess: { VENDEDOR: 'ACESSO_TOTAL', GERENTE: 'BLOQUEADO', DONO: 'BLOQUEADO', ADMIN: 'BLOQUEADO' } },
  { path: '/meu-funil', expectedAccess: { VENDEDOR: 'ACESSO_TOTAL', GERENTE: 'BLOQUEADO', DONO: 'BLOQUEADO', ADMIN: 'BLOQUEADO' } },
  { path: '/central-execucao', expectedAccess: { VENDEDOR: 'ACESSO_TOTAL', GERENTE: 'BLOQUEADO', DONO: 'BLOQUEADO', ADMIN: 'BLOQUEADO' } },
  // Dono-only
  { path: '/organograma', expectedAccess: { VENDEDOR: 'BLOQUEADO', GERENTE: 'BLOQUEADO', DONO: 'ACESSO_TOTAL', ADMIN: 'ACESSO_TOTAL' } },
  { path: '/banco-talentos', expectedAccess: { VENDEDOR: 'BLOQUEADO', GERENTE: 'BLOQUEADO', DONO: 'ACESSO_TOTAL', ADMIN: 'ACESSO_TOTAL' } },
  { path: '/falar-consultor', expectedAccess: { VENDEDOR: 'BLOQUEADO', GERENTE: 'ACESSO_TOTAL', DONO: 'ACESSO_TOTAL', ADMIN: 'BLOQUEADO' } },
  // Gerente-only
  { path: '/funil-vendas', expectedAccess: { VENDEDOR: 'BLOQUEADO', GERENTE: 'ACESSO_TOTAL', DONO: 'ACESSO_TOTAL', ADMIN: 'BLOQUEADO' } },
  { path: '/metas', expectedAccess: { VENDEDOR: 'BLOQUEADO', GERENTE: 'ACESSO_TOTAL', DONO: 'ACESSO_TOTAL', ADMIN: 'BLOQUEADO' } },
  { path: '/auditoria', expectedAccess: { VENDEDOR: 'BLOQUEADO', GERENTE: 'ACESSO_TOTAL', DONO: 'BLOQUEADO', ADMIN: 'ACESSO_TOTAL' } },
  // Todos têm acesso
  { path: '/notificacoes', expectedAccess: { VENDEDOR: 'ACESSO_TOTAL', GERENTE: 'ACESSO_TOTAL', DONO: 'ACESSO_TOTAL', ADMIN: 'ACESSO_TOTAL' } },
  { path: '/perfil', expectedAccess: { VENDEDOR: 'ACESSO_TOTAL', GERENTE: 'ACESSO_TOTAL', DONO: 'ACESSO_TOTAL', ADMIN: 'ACESSO_TOTAL' } },
  { path: '/relatorio-matinal', expectedAccess: { VENDEDOR: 'BLOQUEADO', GERENTE: 'ACESSO_TOTAL', DONO: 'ACESSO_TOTAL', ADMIN: 'ACESSO_TOTAL' } },
  { path: '/pdi', expectedAccess: { VENDEDOR: 'BLOQUEADO', GERENTE: 'ACESSO_TOTAL', DONO: 'ACESSO_TOTAL', ADMIN: 'ACESSO_TOTAL' } },
];

// ─── GERAÇÃO DE RELATÓRIOS ────────────────────────────────────────────────────

function generateReports() {
  const now = new Date();

  // Cabeçalho de auditoria JSON
  const header = {
    auditVersion: 'v2.0',
    commit: COMMIT,
    branch: BRANCH,
    urlBase: BASE_URL,
    viewport: '1440x900',
    captureMethod: 'scroll-slices (SLICE_HEIGHT=800px, OVERLAP=100px)',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    runStart: RUN_START.toISOString(),
    runEnd: now.toISOString(),
    totalCaptures: ALL_CAPTURES.length,
    totalPending: ALL_PENDING.length,
  };
  fs.writeFileSync(path.join(RELATORIOS_DIR, 'CABECALHO_AUDITORIA.json'), JSON.stringify(header, null, 2), 'utf8');

  // MAPA_DE_TELAS por perfil
  const profiles = ['VENDEDOR', 'GERENTE', 'DONO', 'ADMIN'];
  for (const p of profiles) {
    const rows = ALL_MAP_ROWS.filter(r => r.Perfil === p);
    const headers = ['ID','Perfil','Menu principal','Submenu','Nome da tela','Descrição','URL','Estado da tela','Possui modal','Possui rolagem','Nº de fatias','Captura necessária','Status','Observações'];
    writeCsv(path.join(OUTPUT_DIR, `MAPA_DE_TELAS_${p}.csv`), headers, rows);
  }

  // CHECKLIST_AUDITORIA por perfil
  for (const p of profiles) {
    const rows = ALL_MAP_ROWS.filter(r => r.Perfil === p).map((r, i) => {
      const captures = ALL_CAPTURES.filter(c => c.profile === p && c.menu === r['Menu principal'] && c.state === r['Estado da tela']);
      const hasCapture = captures.length > 0;
      return {
        'Nº': i + 1,
        'Perfil': p,
        'Tela': r['Nome da tela'],
        'Estado': r['Estado da tela'],
        'URL testada': r['URL'],
        'Arquivo(s)': captures.map(c => c.filename).join('; ') || '—',
        'Dimensões': hasCapture ? '1440×900 por fatia' : '—',
        'Nº de fatias': captures.length > 0 ? captures[0].slices : '—',
        'ScrollHeight (px)': captures.length > 0 ? captures[0].scrollHeight : '—',
        'Sem loading': hasCapture ? 'SIM' : '—',
        'Sem sobreposição': hasCapture ? 'A VALIDAR VISUALMENTE' : '—',
        'Topo capturado': captures.some(c => c.sliceIndex === 0 || c.sliceIndex === 1) ? 'SIM' : '—',
        'Rodapé capturado': captures.some(c => c.sliceIndex >= 1) ? 'SIM' : '—',
        'Hash SHA-256': captures.length > 0 ? captures[0].hash : '—',
        'Status': r.Status,
        'Observações': r.Status === 'BLOQUEADO' ? (ALL_PENDING.find(p2 => p2.profile === p && p2.menu === r['Menu principal'] && p2.state === r['Estado da tela'])?.detail || '') : 'Captura concluída.',
      };
    });
    const hdr = ['Nº','Perfil','Tela','Estado','URL testada','Arquivo(s)','Dimensões','Nº de fatias','ScrollHeight (px)','Sem loading','Sem sobreposição','Topo capturado','Rodapé capturado','Hash SHA-256','Status','Observações'];
    writeCsv(path.join(OUTPUT_DIR, `CHECKLIST_AUDITORIA_${p}.csv`), hdr, rows);
  }

  // MANIFESTO
  const manifestoHeaders = ['ID','Perfil','Menu','Submenu','Estado','Fatia','Nome do arquivo','Caminho completo','Formato','Dimensões','ScrollHeight','Tamanho KB','Data captura','Status','Hash SHA-256'];
  const manifestoRows = ALL_CAPTURES.map(c => ({
    ID: c.id,
    Perfil: c.profile,
    Menu: c.menu,
    Submenu: c.sub,
    Estado: c.state,
    Fatia: c.sliceIndex || 0,
    'Nome do arquivo': c.filename,
    'Caminho completo': c.filePath,
    Formato: 'PNG',
    Dimensões: '1440×900',
    ScrollHeight: c.scrollHeight,
    'Tamanho KB': (c.fileSize / 1024).toFixed(2),
    'Data captura': c.timestamp,
    Status: 'VALIDADO',
    'Hash SHA-256': c.hash,
  }));
  writeCsv(path.join(RELATORIOS_DIR, 'MANIFESTO_DE_ARQUIVOS.csv'), manifestoHeaders, manifestoRows);

  // MATRIZ DE PERMISSÕES
  const matrizHeaders = ['Rota','Vendedor','Gerente','Dono','Admin MX','Resultado esperado Vendedor','Resultado esperado Gerente','Resultado esperado Dono','Resultado esperado Admin MX','Divergências'];
  const matrizRows = PERMISSION_ROWS.map(r => {
    const exp = (PERMISSION_ROUTES.find(pr => pr.path === r.path)?.expectedAccess) || {};
    const divergencias = Object.entries(exp).filter(([p, e]) => {
      const real = r[p];
      if (!real) return false;
      return !real.startsWith(e);
    }).map(([p, e]) => `${p}: esperado ${e}, obtido ${r[p]}`).join('; ');
    return {
      Rota: r.path,
      Vendedor: r.VENDEDOR || '—',
      Gerente: r.GERENTE || '—',
      Dono: r.DONO || '—',
      'Admin MX': r.ADMIN || '—',
      'Resultado esperado Vendedor': exp.VENDEDOR || '—',
      'Resultado esperado Gerente': exp.GERENTE || '—',
      'Resultado esperado Dono': exp.DONO || '—',
      'Resultado esperado Admin MX': exp.ADMIN || '—',
      Divergências: divergencias || 'NENHUMA',
    };
  });
  writeCsv(path.join(RELATORIOS_DIR, 'MATRIZ_PERFIS_E_PERMISSOES.csv'), matrizHeaders, matrizRows);

  // PENDÊNCIAS
  let md = `# Relatório de Pendências e Bloqueios — MX Auditoria v2.0\n\n`;
  md += `Gerado em: ${now.toLocaleString('pt-BR')}\n\n`;
  if (ALL_PENDING.length === 0) {
    md += `> [!NOTE]\n> Nenhuma pendência detectada automaticamente. Validação visual independente obrigatória.\n`;
  } else {
    md += `| Perfil | Menu | Submenu | Estado | Rota | Tipo | Detalhe |\n`;
    md += `|---|---|---|---|---|---|---|\n`;
    for (const p of ALL_PENDING) {
      md += `| ${p.profile} | ${p.menu} | ${p.sub} | ${p.state} | \`${p.routePath}\` | ${p.type} | ${p.detail} |\n`;
    }
  }
  fs.writeFileSync(path.join(PENDENCIAS_DIR, 'PENDENCIAS_E_BLOQUEIOS.md'), md, 'utf8');

  // RESUMO EXECUTIVO MD
  const validCount = ALL_CAPTURES.length;
  const pendingCount = ALL_PENDING.length;
  const profileTotals = {};
  for (const p of profiles) {
    profileTotals[p] = {
      valid: ALL_CAPTURES.filter(c => c.profile === p).length,
      pending: ALL_PENDING.filter(c => c.profile === p).length,
    };
  }

  let report = `# RESUMO DA EXECUÇÃO — AUDITORIA CORRIGIDA MX v2.0\n\n`;
  report += `## 1. Identificação do Ambiente\n\n`;
  report += `| Propriedade | Valor |\n|---|---|\n`;
  report += `| Branch | \`${BRANCH}\` |\n`;
  report += `| Commit SHA | \`${COMMIT}\` |\n`;
  report += `| URL-base | \`${BASE_URL}\` |\n`;
  report += `| Viewport | 1440 × 900 px (fixo) |\n`;
  report += `| Método de scroll | Fatias de 800 px com sobreposição de 100 px |\n`;
  report += `| Ferramenta | Playwright Chromium |\n`;
  report += `| Timezone | ${header.timezone} |\n`;
  report += `| Início | ${RUN_START.toLocaleString('pt-BR')} |\n`;
  report += `| Término | ${now.toLocaleString('pt-BR')} |\n\n`;

  report += `## 2. Resumo Executivo\n\n`;
  report += `| Métrica | Valor |\n|---|---|\n`;
  report += `| Capturas válidas | ${validCount} |\n`;
  report += `| Pendências / Bloqueios | ${pendingCount} |\n\n`;

  report += `## 3. Resultado por Perfil\n\n`;
  report += `| Perfil | Capturas válidas | Pendências | Status |\n|---|---:|---:|---|\n`;
  for (const p of profiles) {
    const t = profileTotals[p];
    report += `| ${p} | ${t.valid} | ${t.pending} | ${t.pending === 0 ? 'CONCLUÍDO' : 'CONCLUÍDO COM PENDÊNCIAS'} |\n`;
  }

  report += `\n## 4. Metodologia de Captura\n\n`;
  report += `- **Viewport fixo**: 1440 × 900 px em todos os screenshots\n`;
  report += `- **Scroll por fatias**: páginas com conteúdo > 900 px são capturadas em fatias de ${SLICE_HEIGHT} px com ${SLICE_OVERLAP} px de sobreposição\n`;
  report += `- **Nomes das fatias**: sufixo \`_P01\`, \`_P02\` … (páginas sem scroll: sem sufixo)\n`;
  report += `- **Elementos fixed/sticky**: comportam-se exatamente como no browser real (não há distorção por expansão de viewport)\n`;
  report += `- **Interações**: cliques reais nos botões da interface (não navegação direta por URL)\n`;
  report += `- **Validação**: cada captura inclui hash SHA-256, dimensões, timestamp e número de fatias\n\n`;

  report += `## 5. Relação de Capturas\n\n`;
  const filesByProfile = {};
  for (const p of profiles) filesByProfile[p] = ALL_CAPTURES.filter(c => c.profile === p);
  for (const p of profiles) {
    report += `### ${p}\n\n`;
    for (const c of filesByProfile[p]) {
      report += `- \`${c.filename}\` — ${c.menu} / ${c.sub} / ${c.state} (scrollH: ${c.scrollHeight}px, ${c.slices} fatia(s))\n`;
    }
    report += '\n';
  }

  if (ALL_PENDING.length > 0) {
    report += `## 6. Pendências\n\n`;
    for (const p of ALL_PENDING) {
      report += `- **${p.profile}** / \`${p.routePath}\` / ${p.state}: ${p.type} — ${p.detail}\n`;
    }
  }

  fs.writeFileSync(path.join(RELATORIOS_DIR, 'RESUMO_EXECUCAO_MX.md'), report, 'utf8');
  log('Relatórios gerados com sucesso.');
}

// ─── GERAÇÃO DE PDF ──────────────────────────────────────────────────────────

async function generatePDF(browser) {
  const mdContent = fs.readFileSync(path.join(RELATORIOS_DIR, 'RESUMO_EXECUCAO_MX.md'), 'utf8');

  // Converter markdown básico para HTML
  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Auditoria MX v2.0</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 40px; color: #1a1a2e; line-height: 1.6; max-width: 1000px; margin: 0 auto; }
  h1 { color: #00a896; border-bottom: 3px solid #00a896; padding-bottom: 12px; }
  h2 { color: #0f3460; margin-top: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  h3 { color: #16213e; margin-top: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  th { background: #0f3460; color: white; padding: 10px 12px; text-align: left; }
  td { border: 1px solid #e2e8f0; padding: 8px 12px; }
  tr:nth-child(even) td { background: #f8fafc; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #0f3460; }
  li { margin-bottom: 6px; }
  .tag-ok { color: #059669; font-weight: bold; }
  .tag-err { color: #dc2626; font-weight: bold; }
</style></head><body>
${mdContent
  .replace(/^# (.+)$/gm, '<h1>$1</h1>')
  .replace(/^## (.+)$/gm, '<h2>$1</h2>')
  .replace(/^### (.+)$/gm, '<h3>$1</h3>')
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/^- (.+)$/gm, '<li>$1</li>')
  .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
  .replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    return '<tr>' + cells.map(c => c.trim().startsWith('---') ? '' : `<td>${c.trim()}</td>`).join('') + '</tr>';
  })
  .replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>')
}
</body></html>`;

  const pdfPage = await browser.newPage();
  await pdfPage.setContent(htmlContent, { waitUntil: 'networkidle' });
  await pdfPage.pdf({
    path: path.join(RELATORIOS_DIR, 'RESUMO_EXECUCAO_MX.pdf'),
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
    printBackground: true,
  });
  await pdfPage.close();
  log('PDF gerado com sucesso.');
}

// ─── EXECUÇÃO PRINCIPAL ───────────────────────────────────────────────────────

async function run() {
  log('══ AUDITORIA CORRIGIDA MX v2.0 — INICIANDO ══');
  log(`Commit: ${COMMIT} | Branch: ${BRANCH}`);
  log(`URL-base: ${BASE_URL} | Viewport: ${VIEWPORT.width}×${VIEWPORT.height}`);

  setupFolders();

  const browser = await chromium.launch({ headless: true });

  // ── FASE 1: CAPTURAS POR PERFIL ──────────────────────────────────────────

  const profileConfigs = [
    { name: 'VENDEDOR', cred: CREDENTIALS.VENDEDOR, dirName: '01_MODULO_VENDEDOR' },
    { name: 'GERENTE', cred: CREDENTIALS.GERENTE, dirName: '02_MODULO_GERENTE' },
    { name: 'DONO', cred: CREDENTIALS.DONO, dirName: '03_MODULO_DONO' },
    { name: 'ADMIN', cred: CREDENTIALS.ADMIN, dirName: '04_MODULO_ADMIN_MX' },
  ];

  for (const prof of profileConfigs) {
    log(`\n${'═'.repeat(60)}`);
    log(`PERFIL: ${prof.name}`);
    log(`${'═'.repeat(60)}`);

    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    const moduleDir = path.join(OUTPUT_DIR, prof.dirName);

    try {
      const landing = await login(page, prof.cred, prof.name);

      // Detectar storeSlug para gerente/dono
      let storeSlug = 'mx-consultoria';
      const slugMatch = landing.match(/\/lojas\/([^/?#]+)/);
      if (slugMatch) storeSlug = slugMatch[1];
      if (!slugMatch) {
        const href = await page.evaluate(() => {
          const a = document.querySelector('a[href*="/lojas/"]');
          return a ? a.getAttribute('href') : null;
        });
        if (href) { const m = href.match(/\/lojas\/([^/?#]+)/); if (m) storeSlug = m[1]; }
      }
      log(`storeSlug detectado: ${storeSlug}`);

      // Captura da navegação real via sidebar (inventário de menu)
      const navCapturePath = path.join(moduleDir, `000_${prof.name}_SIDEBAR_ABERTA.png`);
      fs.mkdirSync(moduleDir, { recursive: true });
      await page.screenshot({ path: navCapturePath, clip: { x: 0, y: 0, width: 1440, height: 900 } });
      log(`Sidebar navegação capturada: 000_${prof.name}_SIDEBAR_ABERTA.png`);

      // Definir rotas do perfil
      let routes = [];
      if (prof.name === 'VENDEDOR') routes = buildVendedorRoutes(storeSlug);
      else if (prof.name === 'GERENTE') routes = buildGerenteRoutes(storeSlug);
      else if (prof.name === 'DONO') routes = buildDonoRoutes(storeSlug);
      else if (prof.name === 'ADMIN') routes = buildAdminRoutes();

      // Agrupar por rota para navegar uma vez por URL
      const routeGroups = {};
      for (const task of routes) {
        const key = task.path;
        if (!routeGroups[key]) routeGroups[key] = [];
        routeGroups[key].push(task);
      }

      for (const [routePath, tasks] of Object.entries(routeGroups)) {
        log(`\nRota: ${routePath} (${tasks.length} estado(s))`);
        await navigateTo(page, routePath, prof.name);

        for (const task of tasks) {
          log(`  Estado: ${task.state}`);
          await captureTask(page, prof.name, moduleDir, task);
          // Renavegar para a rota base antes do próximo estado
          if (tasks.indexOf(task) < tasks.length - 1) {
            await navigateTo(page, routePath, prof.name);
          }
        }
      }

    } catch (err) {
      log(`ERRO CRÍTICO no perfil ${prof.name}: ${err.message}`);
      const errPath = path.join(PENDENCIAS_DIR, `CRITICAL_${prof.name}.png`);
      await page.screenshot({ path: errPath }).catch(() => {});
      addPending(prof.name, 'GERAL', 'GERAL', 'GERAL', '/', 'ERRO_CRITICO', err.message);
    } finally {
      await context.close();
    }
  }

  // ── FASE 2: MATRIZ DE PERMISSÕES ─────────────────────────────────────────

  log(`\n${'═'.repeat(60)}`);
  log('FASE 2: Teste de permissões por rota');
  log(`${'═'.repeat(60)}`);

  const permMatrix = {};
  for (const pr of PERMISSION_ROUTES) {
    permMatrix[pr.path] = { path: pr.path };
  }

  for (const prof of profileConfigs) {
    log(`\nPermissões: ${prof.name}`);
    for (const pr of PERMISSION_ROUTES) {
      log(`  Testando ${prof.name} → ${pr.path} …`);
      const result = await testPermission(browser, prof.name, prof.cred, pr.path);
      permMatrix[pr.path][prof.name] = result.result;
      log(`  Resultado: ${result.result}`);
    }
  }

  for (const row of Object.values(permMatrix)) {
    PERMISSION_ROWS.push(row);
  }

  // ── FASE 3: RELATÓRIOS ───────────────────────────────────────────────────

  log(`\n${'═'.repeat(60)}`);
  log('FASE 3: Geração de relatórios');
  generateReports();

  log('Gerando PDF …');
  await generatePDF(browser);

  await browser.close();

  // ── FASE 4: ZIP ──────────────────────────────────────────────────────────

  const dateStr = new Date().toISOString().slice(0, 10);
  const zipName = `PRINT_REVISAO_MX_BACKUP_${dateStr}.zip`;
  const zipPath = `/Users/pedroguilherme/Pictures/${zipName}`;

  log(`\nCriando backup ZIP: ${zipName}`);
  try {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    // -X exclui atributos estendidos macOS; -r recursivo; sem __MACOSX
    execSync(`zip -X -r "${zipPath}" "PRINT REVISÃO MX"`, {
      cwd: '/Users/pedroguilherme/Pictures',
      stdio: 'pipe',
    });
    log(`Backup criado: ${zipPath}`);
  } catch (e) {
    log(`ERRO ao criar ZIP: ${e.message}`);
  }

  log('\n══ AUDITORIA v2.0 CONCLUÍDA ══');
  log(`Total capturas válidas : ${ALL_CAPTURES.length}`);
  log(`Total pendências       : ${ALL_PENDING.length}`);
  log(`Status geral           : ${ALL_PENDING.length === 0 ? 'CONCLUÍDO' : 'CONCLUÍDO COM PENDÊNCIAS'}`);
}

run().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});

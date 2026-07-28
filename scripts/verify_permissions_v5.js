/**
 * verify_permissions_v5.js — Auditoria V5 Definitiva
 *
 * Versão: 5.0.0
 *
 * Testa o acesso de cada perfil a cada rota:
 * - Autentica o usuário
 * - Navega para a rota
 * - Registra URL final, título, presença de elemento de bloqueio
 * - Captura screenshot da tela resultante
 * - Grava MATRIZ_PERMISSOES_V5.csv + evidências em 06_PERMISSOES_EVIDENCIAS/
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:3003';
const OUTPUT_DIR = '/Users/pedroguilherme/Pictures/PRINT REVISÃO MX';
const PERM_DIR = path.join(OUTPUT_DIR, '06_PERMISSOES_EVIDENCIAS');
const REPORTS_DIR = path.join(OUTPUT_DIR, '05_RELATORIOS');
const SCRIPT_VERSION = '5.0.0';
const VIEWPORT = { width: 1440, height: 900 };

const PROFILES = Object.fromEntries(['VENDEDOR', 'GERENTE', 'DONO', 'ADMIN'].map((role) => [role, {
  email: process.env[`MX_${role}_EMAIL`],
  pass: process.env[`MX_${role}_PASSWORD`],
}]));

function requireProfiles() {
  const missing = Object.entries(PROFILES).flatMap(([role, profile]) => [
    !profile.email && `MX_${role}_EMAIL`,
    !profile.pass && `MX_${role}_PASSWORD`,
  ]).filter(Boolean);
  if (missing.length > 0) throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
}

// Rotas e o que cada perfil deveria ter (PERMITIDO / BLOQUEADO / REDIRECIONADO)
const PERM_MATRIX = [
  // Rota                                  VENDEDOR      GERENTE       DONO          ADMIN
  { route: '/home',                        v:'PERMITIDO', g:'PERMITIDO', d:'REDIR',    a:'REDIR' },
  { route: '/vendedor/terminal-mx',        v:'PERMITIDO', g:'BLOQUEADO', d:'BLOQUEADO',a:'BLOQUEADO' },
  { route: '/carteira-clientes',           v:'PERMITIDO', g:'BLOQUEADO', d:'BLOQUEADO',a:'BLOQUEADO' },
  { route: '/meu-funil',                   v:'PERMITIDO', g:'BLOQUEADO', d:'BLOQUEADO',a:'BLOQUEADO' },
  { route: '/central-execucao',            v:'PERMITIDO', g:'BLOQUEADO', d:'BLOQUEADO',a:'BLOQUEADO' },
  { route: '/relatorios',                  v:'PERMITIDO', g:'BLOQUEADO', d:'BLOQUEADO',a:'BLOQUEADO' },
  { route: '/desenvolvimento',             v:'PERMITIDO', g:'BLOQUEADO', d:'BLOQUEADO',a:'BLOQUEADO' },
  { route: '/universidade-mx',             v:'PERMITIDO', g:'REDIR',     d:'REDIR',    a:'REDIR' },
  { route: '/ranking',                     v:'PERMITIDO', g:'PERMITIDO', d:'PERMITIDO',a:'PERMITIDO' },
  { route: '/notificacoes',                v:'PERMITIDO', g:'PERMITIDO', d:'PERMITIDO',a:'PERMITIDO' },
  { route: '/perfil',                      v:'PERMITIDO', g:'PERMITIDO', d:'PERMITIDO',a:'PERMITIDO' },
  { route: '/configuracoes',               v:'PERMITIDO', g:'PERMITIDO', d:'PERMITIDO',a:'PERMITIDO' },
  { route: '/ajuda',                       v:'PERMITIDO', g:'BLOQUEADO', d:'BLOQUEADO',a:'BLOQUEADO' },
  { route: '/funil-vendas',                v:'BLOQUEADO', g:'PERMITIDO', d:'PERMITIDO',a:'BLOQUEADO' },
  { route: '/metas',                       v:'BLOQUEADO', g:'PERMITIDO', d:'PERMITIDO',a:'BLOQUEADO' },
  { route: '/devolutivas',                 v:'PERMITIDO', g:'PERMITIDO', d:'PERMITIDO',a:'PERMITIDO' },
  { route: '/pdi',                         v:'REDIR',     g:'PERMITIDO', d:'PERMITIDO',a:'PERMITIDO' },
  { route: '/treinamentos',                v:'REDIR',     g:'PERMITIDO', d:'PERMITIDO',a:'PERMITIDO' },
  { route: '/rotina',                      v:'BLOQUEADO', g:'PERMITIDO', d:'BLOQUEADO',a:'PERMITIDO' },
  { route: '/relatorio-matinal',           v:'BLOQUEADO', g:'PERMITIDO', d:'BLOQUEADO',a:'PERMITIDO' },
  { route: '/auditoria',                   v:'BLOQUEADO', g:'PERMITIDO', d:'BLOQUEADO',a:'PERMITIDO' },
  { route: '/lojas',                       v:'BLOQUEADO', g:'BLOQUEADO', d:'BLOQUEADO',a:'PERMITIDO' },
  { route: '/lojas/mx-consultoria',        v:'BLOQUEADO', g:'PERMITIDO', d:'PERMITIDO',a:'PERMITIDO' },
  { route: '/organograma',                 v:'BLOQUEADO', g:'BLOQUEADO', d:'PERMITIDO',a:'PERMITIDO' },
  { route: '/banco-talentos',              v:'BLOQUEADO', g:'BLOQUEADO', d:'PERMITIDO',a:'PERMITIDO' },
  { route: '/painel',                      v:'BLOQUEADO', g:'BLOQUEADO', d:'BLOQUEADO',a:'PERMITIDO' },
  { route: '/simulacao',                   v:'BLOQUEADO', g:'BLOQUEADO', d:'BLOQUEADO',a:'PERMITIDO' },
  { route: '/agenda',                      v:'BLOQUEADO', g:'BLOQUEADO', d:'BLOQUEADO',a:'PERMITIDO' },
  { route: '/consultoria',                 v:'BLOQUEADO', g:'BLOQUEADO', d:'BLOQUEADO',a:'PERMITIDO' },
  { route: '/produtos',                    v:'BLOQUEADO', g:'BLOQUEADO', d:'BLOQUEADO',a:'PERMITIDO' },
  { route: '/configuracoes/operacional',   v:'BLOQUEADO', g:'BLOQUEADO', d:'BLOQUEADO',a:'PERMITIDO' },
  { route: '/configuracoes/consultoria-pmr',v:'BLOQUEADO',g:'BLOQUEADO',d:'BLOQUEADO',a:'PERMITIDO' },
  { route: '/configuracoes/reprocessamento',v:'BLOQUEADO',g:'BLOQUEADO',d:'BLOQUEADO',a:'PERMITIDO' },
  { route: '/relatorios/performance-vendas',v:'BLOQUEADO',g:'BLOQUEADO',d:'BLOQUEADO',a:'PERMITIDO' },
];

function csvField(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
function csvRow(...fields) { return fields.map(csvField).join(','); }

function sha256(filePath) {
  if (!fs.existsSync(filePath)) return 'FILE_NOT_FOUND';
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function log(msg) { console.log(`[${new Date().toISOString()}] [PERM_V5] ${msg}`); }

async function login(page, profile) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator('input[type="email"], #login-email').first().fill(profile.email);
  await page.locator('input[type="password"], #login-password').first().fill(profile.pass);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(1500);
}

async function run() {
  log('=== INÍCIO VERIFICAÇÃO DE PERMISSÕES V5 ===');
  requireProfiles();
  fs.mkdirSync(PERM_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const matrixRows = ['perfil,rota,acesso_esperado,url_final,redirecionado_para,elemento_bloqueio,titulo_pagina,resultado_real,conformidade,hash_evidencia,arquivo_evidencia,timestamp,versao'];

  const browser = await chromium.launch({ headless: true });

  for (const [profileKey, profileExpectedMap] of [
    ['VENDEDOR', r => r.v],
    ['GERENTE',  r => r.g],
    ['DONO',     r => r.d],
    ['ADMIN',    r => r.a],
  ]) {
    log(`\n═══ Testando permissões para ${profileKey} ═══`);
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    try {
      await login(page, PROFILES[profileKey]);
    } catch (e) {
      log(`❌ Falha login ${profileKey}: ${e.message}`);
      await context.close();
      continue;
    }

    for (const row of PERM_MATRIX) {
      const esperado = profileExpectedMap(row);
      const routeSlug = row.route.replace(/[^a-zA-Z0-9]/g, '_');
      const evidenceFile = `PERM_${profileKey}_${routeSlug}.png`;
      const evidencePath = path.join(PERM_DIR, evidenceFile);

      try {
        await page.goto(`${BASE_URL}${row.route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        log(`  ⚠️  Falha de navegação ${row.route}: ${e.message}`);
        const now = new Date().toISOString();
        matrixRows.push(csvRow(profileKey, row.route, esperado, 'ERRO', '', '', '', 'FALHA_NAVEGACAO', 'NAO_CONFORME', '', '', now, SCRIPT_VERSION));
        continue;
      }

      const finalUrl = page.url();
      const pageTitle = await page.title();
      const isRedirected = !finalUrl.replace('http://localhost:3003', '').startsWith(row.route.split('?')[0]);
      const redirectedTo = isRedirected ? finalUrl.replace('http://localhost:3003', '') : '';

      // Detectar elemento de bloqueio (Forbidden, não autorizado, etc.)
      const forbiddenEl = await page.locator('text=Acesso não autorizado, text=Não autorizado, text=403, [data-testid="forbidden"], text=Sem permissão').first().textContent({ timeout: 1000 }).catch(() => '');

      let resultadoReal = 'PERMITIDO';
      if (forbiddenEl) resultadoReal = 'BLOQUEADO';
      else if (isRedirected) resultadoReal = 'REDIRECIONADO';

      const conformidade = resultadoReal === esperado || (esperado === 'REDIR' && resultadoReal === 'REDIRECIONADO') ? 'CONFORME' : 'NAO_CONFORME';

      await page.screenshot({ path: evidencePath, clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height } });
      const hashEvidencia = sha256(evidencePath);
      const now = new Date().toISOString();

      matrixRows.push(csvRow(profileKey, row.route, esperado, finalUrl.replace('http://localhost:3003', ''), redirectedTo, forbiddenEl.trim() || 'N/A', pageTitle, resultadoReal, conformidade, hashEvidencia, evidenceFile, now, SCRIPT_VERSION));

      const icon = conformidade === 'CONFORME' ? '✅' : '⚠️ NAO_CONFORME';
      log(`  ${icon} ${row.route} | esperado=${esperado} real=${resultadoReal}`);
    }

    await context.close();
  }

  await browser.close();

  const matrixPath = path.join(REPORTS_DIR, 'MATRIZ_PERMISSOES_V5.csv');
  fs.writeFileSync(matrixPath, matrixRows.join('\n') + '\n');
  log(`\n✅ MATRIZ_PERMISSOES gravada: ${matrixPath} (${matrixRows.length - 1} registros)`);
  log('=== VERIFICAÇÃO DE PERMISSÕES V5 CONCLUÍDA. Próximo: node scripts/validate_mx_v5.js ===');
}

run().catch(e => { console.error('[FATAL]', e); process.exit(1); });

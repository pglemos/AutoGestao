#!/usr/bin/env node
/**
 * Mede a margem lateral efetiva de cada rota — §7.3 e §28.2.
 *
 * Complementa `audit-page-gutters.mjs`, que só acusa conteúdo colado na borda.
 * Uma tela pode ter margem e ainda assim ter a margem *errada*: 16px onde o
 * breakpoint pede 32, ou 40px porque alguém escolheu um valor próprio. O gutter
 * passa; a consistência entre telas, não.
 *
 * Serve para responder uma pergunta específica antes de migrar em massa: das
 * telas que ainda não usam o PageCanvas, quantas já estão conformes por outro
 * caminho? Adotar o container onde a margem já está certa é retrabalho; adotar
 * onde está errada é correção.
 *
 *   E2E_AUTH_PASSWORD='…' node scripts/audit-page-margins.mjs
 */
import { chromium } from '@playwright/test'

const BASE = process.env.AUDIT_BASE_URL || 'http://localhost:3457'
const PASSWORD = process.env.E2E_AUTH_PASSWORD
/** Margem esperada em 1440px de viewport — classe Expanded (§7.3). */
const ESPERADA = 32

if (!PASSWORD) {
  console.error('E2E_AUTH_PASSWORD é obrigatório.')
  process.exit(2)
}

const PERFIS = [
  {
    nome: 'vendedor',
    email: 'vendedor@mxgestaopreditiva.com.br',
    rotas: ['/home', '/carteira', '/ranking', '/notificacoes', '/perfil', '/devolutivas', '/desenvolvimento', '/central-execucao'],
  },
  {
    nome: 'gerente',
    email: 'gerente@mxgestaopreditiva.com.br',
    rotas: ['/gerente/minha-equipe', '/gerente/rotina-equipe', '/plano-acao', '/feedbacks', '/relatorios', '/mentor-comercial'],
  },
  {
    nome: 'dono',
    email: 'dono@mxgestaopreditiva.com.br',
    rotas: ['/plano-estrategico', '/consultoria', '/mercado', '/lojas', '/decisoes'],
  },
  {
    nome: 'admin',
    email: 'synvollt@gmail.com',
    rotas: ['/painel', '/produtos', '/auditoria', '/agenda'],
  },
]

const browser = await chromium.launch()
const medidas = []

for (const perfil of PERFIS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  try {
    await page.goto(`${BASE}/login`)
    await page.fill('input[type="email"]', perfil.email)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 25_000 })
  } catch {
    console.error(`  ! login falhou para ${perfil.nome}`)
    await ctx.close()
    continue
  }

  for (const rota of perfil.rotas) {
    try {
      await page.goto(BASE + rota)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(400)
    } catch {
      continue
    }
    const m = await page.evaluate(() => {
      const main = document.querySelector('#main-content')
      if (!main) return null
      const inicioArea = Math.round(main.getBoundingClientRect().left) + Math.round(parseFloat(getComputedStyle(main).paddingLeft) || 0)
      // Mede o CONTAINER de página, não o título. A primeira versão media o
      // título e devolvia 109px para /perfil, que tem canvas com 32px — o
      // excedente era o padding do card em volta do título, não margem de
      // página. Distância até o texto não é a mesma coisa que margem lateral.
      const canvas = main.querySelector('[data-mx-page-canvas]')
      if (canvas) {
        const style = getComputedStyle(canvas)
        return { margem: Math.round(parseFloat(style.paddingLeft)), temCanvas: true }
      }
      // Sem canvas: o primeiro descendente que efetivamente recua o conteúdo.
      const candidatos = [...main.querySelectorAll('main, section, div')].slice(0, 12)
      for (const el of candidatos) {
        const cs = getComputedStyle(el)
        const pad = Math.round(parseFloat(cs.paddingLeft) || 0)
        const r = el.getBoundingClientRect()
        if (r.width > 300 && pad > 0) {
          return { margem: Math.round(r.left) - inicioArea + pad, temCanvas: false }
        }
      }
      return { margem: 0, temCanvas: false }
    })
    if (m) medidas.push({ perfil: perfil.nome, rota, ...m })
  }
  await ctx.close()
}
await browser.close()

const conformes = medidas.filter((m) => m.margem === ESPERADA)
const divergentes = medidas.filter((m) => m.margem !== ESPERADA)

console.log(`\nRotas medidas: ${medidas.length} (viewport 1440, margem esperada ${ESPERADA}px)`)
console.log(`  conformes: ${conformes.length}`)
console.log(`  divergentes: ${divergentes.length}\n`)

if (divergentes.length > 0) {
  console.log('Divergentes — margem efetiva ≠ token:\n')
  for (const d of divergentes.sort((a, b) => a.margem - b.margem)) {
    console.log(`  ${d.perfil.padEnd(9)} ${d.rota.padEnd(26)} ${String(d.margem).padStart(4)}px ${d.temCanvas ? '(com canvas)' : '(sem canvas)'}`)
  }
}

const semCanvasConformes = conformes.filter((m) => !m.temCanvas).length
console.log(`\nConformes sem usar o canvas: ${semCanvasConformes} — já corretas por outro caminho.`)
process.exit(divergentes.length > 0 ? 1 : 0)

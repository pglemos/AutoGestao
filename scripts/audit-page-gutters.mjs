#!/usr/bin/env node
/**
 * Procura conteúdo encostado na borda da área de conteúdo — §6.1.
 *
 * A catraca do lint-page-roots pega a tela que *decide* margem própria. Não pega
 * a que não decide nada: `/organograma` passava limpo e tinha o card do header
 * começando exatamente onde a sidebar termina, sem respiro nenhum. Falta de
 * margem é invisível para um lint estático porque não há classe para acusar.
 *
 * Este script abre cada rota autenticada, mede onde o primeiro bloco de conteúdo
 * realmente começa e compara com o início da área de conteúdo. Diferença zero
 * significa conteúdo colado.
 *
 * Diagnóstico, não gate: exige navegador e credenciais, então não entra no
 * `npm run lint`. Roda sob demanda com o dev server de pé.
 *
 *   E2E_AUTH_PASSWORD='…' node scripts/audit-page-gutters.mjs
 */
import { chromium } from '@playwright/test'

const BASE = process.env.AUDIT_BASE_URL || 'http://localhost:3457'
const PASSWORD = process.env.E2E_AUTH_PASSWORD
const MARGIN_MINIMA = 16

if (!PASSWORD) {
  console.error('E2E_AUTH_PASSWORD é obrigatório.')
  process.exit(2)
}

const PERFIS = [
  {
    nome: 'vendedor',
    email: process.env.E2E_SELLER_EMAIL || 'vendedor@mxgestaopreditiva.com.br',
    rotas: ['/home', '/meu-dia', '/carteira', '/ranking', '/notificacoes', '/perfil', '/devolutivas', '/desenvolvimento', '/universidade-mx', '/relatorios-vendedor', '/central-execucao'],
  },
  {
    nome: 'gerente',
    email: process.env.E2E_MANAGER_EMAIL || 'gerente@mxgestaopreditiva.com.br',
    rotas: ['/home', '/gerente/minha-equipe', '/gerente/rotina-equipe', '/gerente/vendas', '/plano-acao', '/feedbacks', '/ranking', '/relatorios', '/mentor-comercial', '/notificacoes'],
  },
  {
    nome: 'dono',
    email: process.env.E2E_OWNER_EMAIL || 'dono@mxgestaopreditiva.com.br',
    rotas: ['/home', '/plano-estrategico', '/plano-acao', '/consultoria', '/mercado', '/lojas', '/departamentos', '/equipe', '/decisoes'],
  },
  {
    nome: 'admin',
    email: process.env.E2E_ADMIN_EMAIL || 'synvollt@gmail.com',
    rotas: ['/painel', '/lojas', '/agenda', '/consultoria', '/produtos', '/auditoria', '/organograma', '/banco-talentos', '/ranking'],
  },
]

const browser = await chromium.launch()
const colados = []
const semConteudo = []
let medidas = 0

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

    const medida = await page.evaluate(() => {
      const main = document.querySelector('#main-content')
      if (!main) return null
      const inicioArea = Math.round(main.getBoundingClientRect().left) + Math.round(parseFloat(getComputedStyle(main).paddingLeft) || 0)

      // Âncora no título, não no primeiro bloco: §28.1 pergunta onde o título
      // começa. Medir "primeiro elemento" pegava wrappers de largura total, que
      // legitimamente começam na borda da área e produziam falso positivo em
      // massa — inclusive em telas já corrigidas e conferidas à mão.
      const titulo = main.querySelector('h1, h2, [data-mx-page-title]')
      if (!titulo) return { inicioArea, semConteudo: true }
      const caixa = titulo.getBoundingClientRect()
      if (caixa.width < 40 || caixa.height < 10) return { inicioArea, semConteudo: true }

      return {
        inicioArea,
        inicioConteudo: Math.round(caixa.left),
        temCanvas: Boolean(main.querySelector('[data-mx-page-canvas]')),
        rolagemHorizontal: document.documentElement.scrollWidth > window.innerWidth,
      }
    })

    if (!medida) continue
    if (medida.semConteudo) {
      semConteudo.push(`${perfil.nome} ${rota}`)
      continue
    }
    medidas += 1
    const respiro = medida.inicioConteudo - medida.inicioArea
    if (respiro < MARGIN_MINIMA) {
      colados.push({ perfil: perfil.nome, rota, respiro, temCanvas: medida.temCanvas })
    }
    if (medida.rolagemHorizontal) {
      colados.push({ perfil: perfil.nome, rota, respiro: -1, temCanvas: medida.temCanvas, scroll: true })
    }
  }
  await ctx.close()
}

await browser.close()

console.log(`\nRotas medidas: ${medidas}`)
if (semConteudo.length) console.log(`Sem conteúdo mensurável (ignoradas): ${semConteudo.length}`)

if (colados.length === 0) {
  console.log('\nNenhuma tela com conteúdo colado na borda.')
  process.exit(0)
}

console.log(`\n${colados.length} ocorrência(s) — conteúdo a menos de ${MARGIN_MINIMA}px da borda da área:\n`)
for (const c of colados) {
  const detalhe = c.scroll ? 'ROLAGEM HORIZONTAL' : `respiro ${c.respiro}px`
  console.log(`  ${c.perfil.padEnd(9)} ${c.rota.padEnd(28)} ${detalhe}${c.temCanvas ? '' : '  (sem PageCanvas)'}`)
}
process.exit(1)

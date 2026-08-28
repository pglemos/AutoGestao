import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { formatWhatsAppMorningReport } from '@/lib/calculations'

/**
 * Vendedor em loja sem meta mensal via "0%" e "0 de 0 vendas realizadas" —
 * indistinguível de quem tem meta e não vendeu. O próprio painel do Admin MX
 * já contabiliza o engano: "32 vendedor(es) veem projeção e atingimento em 0%",
 * ligado a "7 loja(s) em operação com meta mensal zerada".
 *
 * Sem meta não há atingimento: `null`, e a tela mostra ausência.
 */
const hook = readFileSync(new URL('./hooks/useVendedorHomePage.ts', import.meta.url), 'utf8')
const page = readFileSync(new URL('../../pages/VendedorHome.tsx', import.meta.url), 'utf8')

describe('atingimento sem meta é ausência, não zero', () => {
  test('o hook devolve null quando não há meta', () => {
    expect(hook).toContain('meta > 0 ? Math.round((vendasMes / meta) * 100 * 100) / 100 : null')
  })

  test('o fallback da página também devolve null', () => {
    expect(page).toContain('(meta > 0 ? (vendas / meta) * 100 : null)')
    expect(page).toContain("atingimento === null ? null :")
  })

  test('o card mostra traço e diz que a meta não foi definida', () => {
    expect(page).toContain("atingimentoPct === null ? '—'")
    expect(page).toContain('Meta do mês ainda não definida')
  })

  test('zero medido continua sendo 0%, não ausência', () => {
    // Com meta > 0 e nenhuma venda, 0% é afirmação verdadeira e deve aparecer.
    expect(page).toContain('${vendas} de ${meta} vendas realizadas')
  })
})

describe('relatório de WhatsApp não inventa percentual', () => {
  const base = {
    teamGoal: 0, currentSales: 3, projection: 3, gap: 0, vnd_total: 3,
    leads: 0, agd: 0, visits: 0,
  }

  test('sem meta, escreve "sem meta definida" em vez de 0%', () => {
    const texto = formatWhatsAppMorningReport('Ana', '28/08/2026', { ...base, reaching: null } as never, [])
    expect(texto).toContain('sem meta definida')
    expect(texto).not.toContain('(0%)')
  })

  test('com meta, o percentual continua saindo', () => {
    const texto = formatWhatsAppMorningReport('Ana', '28/08/2026', { ...base, teamGoal: 10, reaching: 30 } as never, [])
    expect(texto).toContain('30%')
  })
})

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

// A igualdade byte-a-byte com `src/base44-reference` foi removida: ela
// impedia corrigir regra de negócio dentro destes arquivos — o filtro de
// "ativos" do CarteiraAtivaTab continuava listando venda cancelada porque
// qualquer edição quebrava o teste. O contrato que importa é o visual, então
// estes arquivos passam a ser verificados por tokens de layout e pelos
// símbolos de domínio que o Base44 definiu, e não pelo texto inteiro.
const VISUAL_CONTRACT_COMPONENTS = {
  'CarteiraAtivaTab.jsx': ['rounded-xl', 'bg-[#005BFF]'],
  'ModoAtaque.jsx': ['rounded-2xl', 'bg-[#005BFF]', 'max-w-sm'],
  'ProximaOportunidadeModal.jsx': ['rounded-2xl', 'bg-[#005BFF]', 'max-w-sm'],
  'RetornoWhatsAppModal.jsx': ['rounded-2xl', 'max-w-sm'],
  'VeiculosChegaram.jsx': ['rounded-xl', 'bg-[#005BFF]'],
}

// `proximoPassoLib.js` não tem layout: o que precisa sobreviver é a máquina de
// estados que o Base44 definiu.
const DOMAIN_EXPORTS = {
  'proximoPassoLib.js': [
    'export const PASSOS',
    'export const RESULTADOS_POR_PASSO',
    'export const TRANSICAO',
    'export function aplicarTransicao',
  ],
}

const INTEGRATED_COMPONENTS = {
  'NovoClienteModal.jsx': [
    'max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl',
    'Novo Cliente',
    'Em que momento esse cliente está?',
    'Adicionar cliente',
  ],
  'WhatsAppRoteiro.jsx': [
    'max-w-md rounded-2xl max-h-[92vh] overflow-y-auto',
    'Registrar resultado do contato',
    'animate-in slide-in-from-top-2 duration-200',
    'Registrar resultado',
  ],
}

describe('Base44 1:1 visual source parity', () => {
  for (const [filename, visualTokens] of Object.entries(VISUAL_CONTRACT_COMPONENTS)) {
    test(`${filename} keeps the Base44 visual language`, () => {
      const runtime = readFileSync(`src/components/carteira/${filename}`, 'utf8')
      const reference = readFileSync(`src/base44-reference/components/carteira/${filename}`, 'utf8')
      for (const token of visualTokens) {
        expect(reference, `${filename} reference token: ${token}`).toContain(token)
        expect(runtime, `${filename} runtime token: ${token}`).toContain(token)
      }
    })
  }

  for (const [filename, symbols] of Object.entries(DOMAIN_EXPORTS)) {
    test(`${filename} keeps the Base44 state machine contract`, () => {
      const runtime = readFileSync(`src/components/carteira/${filename}`, 'utf8')
      const reference = readFileSync(`src/base44-reference/components/carteira/${filename}`, 'utf8')
      for (const symbol of symbols) {
        expect(reference, `${filename} reference symbol: ${symbol}`).toContain(symbol)
        expect(runtime, `${filename} runtime symbol: ${symbol}`).toContain(symbol)
      }
    })
  }

  for (const [filename, visualTokens] of Object.entries(INTEGRATED_COMPONENTS)) {
    test(`${filename} preserves the Base44 visual contract around MX persistence`, () => {
      const runtime = readFileSync(`src/components/carteira/${filename}`, 'utf8')
      const reference = readFileSync(`src/base44-reference/components/carteira/${filename}`, 'utf8')
      for (const token of visualTokens) {
        expect(reference, `${filename} reference token: ${token}`).toContain(token)
        expect(runtime, `${filename} runtime token: ${token}`).toContain(token)
      }
      expect(runtime).toContain('finally')
      expect(runtime).toContain('toast({')
    })
  }

  test('FichaClienteSheet.jsx keeps its content contract while intentionally using a centered Dialog instead of the Base44 side Sheet', () => {
    // Divergência de layout deliberada: o painel de ficha abre centralizado (Dialog) no
    // runtime, não mais lateral (Sheet) como no base44-reference, que segue congelado.
    const runtime = readFileSync('src/components/carteira/FichaClienteSheet.jsx', 'utf8')
    const reference = readFileSync('src/base44-reference/components/carteira/FichaClienteSheet.jsx', 'utf8')

    for (const token of ['Mentor Comercial', 'Alterar próximo passo']) {
      expect(reference, `reference token: ${token}`).toContain(token)
      expect(runtime, `runtime token: ${token}`).toContain(token)
    }
    // A barra de ações conserva o mesmo layout; a referência congelada mantém o
    // literal original e o runtime usa o token semântico de borda (07.005).
    expect(reference).toContain('sticky bottom-0 bg-white border-t border-slate-100')
    expect(runtime).toContain('sticky bottom-0 bg-white border-t border-border-subtle')
    expect(runtime).toContain('finally')
    expect(runtime).toContain('toast({')

    expect(reference).toContain('@/components/ui/sheet')
    expect(runtime).toContain('@/components/ui/dialog')
    expect(runtime).not.toContain('@/components/ui/sheet')
  })

  test('the plan tab keeps the Base44 visual language while using only persisted missions and real clients', () => {
    const source = readFileSync('src/components/carteira/PlanoAtaqueTab.jsx', 'utf8')
    expect(source).toContain('rounded-2xl')
    expect(source).toContain('bg-[#005BFF]')
    expect(source).toMatch(/CarteiraMissao\s*\.filter/)
    expect(source).toContain('CarteiraMissao.create')
    expect(source).toMatch(/if \(queue\.length > 0\)[\s\S]*?else[\s\S]*?setMissaoRecuperada\(null\)/)
    expect(source).not.toContain('@/base44-reference/components/carteira/PlanoAtaqueTab.jsx')
    expect(source).not.toMatch(/\bpotencial\s*:/)
  })

  test('mission catalog preserves its operational filters without invented sales projections', () => {
    const source = readFileSync('src/components/carteira/carteiraUtils.jsx', 'utf8')
    expect(source).toContain('export const MISSOES')
    expect(source).toContain('filtro:')
    expect(source).not.toMatch(/\bpotencial\s*:/)
    expect(source).not.toMatch(/\d+\s+a\s+\d+\s+vendas/i)
  })

  test('mission execution preserves Base44 interaction tokens while persisting every action', () => {
    const source = readFileSync('src/components/carteira/ExecucaoMissao.jsx', 'utf8')
    for (const token of [
      'bg-[#005BFF]',
      'rounded-2xl',
      'Aguardando respostas',
      'CarteiraMissao.update',
      'indice_atual',
      'mensagens_enviadas',
      'pulados',
    ]) expect(source).toContain(token)
  })
})

import React from 'react'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

const cliente = {
  id: 'cliente-parity',
  vendedor_id: 'seller-parity',
  loja_id: 'loja-parity',
  nome: 'Cliente Paridade',
  whatsapp: '31999999999',
  telefone: '31999999999',
  momento: 'Novo contato',
  situacao_atual: 'Lead sem resposta',
  proximo_passo: 'Enviar primeira abordagem',
  temperatura: 'Morno',
  canal_comercial: 'Internet',
  canal_origem: 'Internet',
  veiculo_interesse: 'Onix',
  // O script agora vem da matriz oficial e o renderer é estrito: sem vendedor,
  // loja e o fato da cadência, INT-C01 não renderiza e o bloco de script some.
  // A fixture precisa representar um cliente com dados suficientes para que o
  // teste continue comparando LAYOUT, e não a ausência do script.
  vendedor_nome: 'Vendedor Paridade',
  loja_nome: 'Loja Paridade',
  cadencia_tentativa: 0,
}

mock.module('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: mock(async () => ({ data: { success: true, text: 'Script de paridade' }, error: null })),
    },
  },
}))

mock.module('@/api/base44Client', () => ({
  base44: {
    // src/base44-reference é a cópia congelada do Base44 original — ainda chama
    // base44.integrations.Core.InvokeLLM diretamente, então o mock precisa manter isso.
    integrations: {
      Core: { InvokeLLM: mock(async () => 'Script de paridade') },
    },
    entities: {
      CarteiraCliente: {
        get: mock(async () => cliente),
        create: mock(async (payload: object) => ({ ...cliente, ...payload })),
        update: mock(async (_id: string, payload: object) => ({ ...cliente, ...payload })),
      },
      CarteiraHistorico: {
        filter: mock(async () => []),
        create: mock(async () => ({})),
      },
      CarteiraMissao: { update: mock(async () => ({})) },
    },
  },
}))

mock.module('@/components/ui/use-toast', () => ({ toast: mock(() => {}) }))

function normalizeLocalScriptAdapter(root: HTMLElement) {
  const headings = Array.from(root.querySelectorAll('p')).filter((element) =>
    ['Script personalizado', 'Script personalizado com IA'].includes(element.textContent?.trim() || ''),
  )
  if (headings.length !== 1) {
    throw new Error(`Esperado um único cabeçalho de script; encontrados ${headings.length}`)
  }

  const scriptSection = headings[0].parentElement?.parentElement
  if (!scriptSection) throw new Error('Bloco do script personalizado não encontrado')

  const textareas = scriptSection.querySelectorAll('textarea')
  const whatsappLinks = scriptSection.querySelectorAll('a[href^="https://wa.me/"]')
  if (textareas.length !== 1 || whatsappLinks.length !== 1) {
    throw new Error(
      `Estrutura do script divergente: ${textareas.length} textarea(s), ${whatsappLinks.length} link(s) WhatsApp`,
    )
  }

  headings[0].textContent = 'Script personalizado'
  textareas[0].value = 'normalized-script'
  textareas[0].textContent = 'normalized-script'
  whatsappLinks[0].setAttribute('href', 'https://wa.me/normalized')
}

// T4.8 canonicalizou text-[Npx] para @utility text-* (semantic.css). A
// referência congelada mantém text-[Npx]; o runtime usa text-caption etc.
// Normaliza ambas para o mesmo lexema antes de comparar o DOM.
const TYPO_MAP: Record<string, string> = {
  'text-caption': 'text-[12px]',
  'text-body-sm': 'text-[14px]',
  'text-body': 'text-[16px]',
  'text-h5': 'text-[18px]',
  'text-h4': 'text-[20px]',
  'text-h3': 'text-[24px]',
  'text-h2': 'text-[30px]',
  'text-h1': 'text-[36px]',
  'text-display': 'text-[48px]',
}

// Off-canonic arbitrary values that were migrated to the nearest canonical.
// Map them to the same canonical literal so both DOMs converge.
const OFF_CANONIC: Record<string, string> = {
  'text-[8px]': 'text-[12px]',
  'text-[9px]': 'text-[12px]',
  'text-[10px]': 'text-[12px]',
  'text-[11px]': 'text-[12px]',
  'text-[13px]': 'text-[14px]',
  'text-[15px]': 'text-[16px]',
  'text-[17px]': 'text-[18px]',
  'text-[22px]': 'text-[24px]',
  'text-[23px]': 'text-[24px]',
  'text-[26px]': 'text-[24px]',
  'text-[28px]': 'text-[30px]',
  'text-[31px]': 'text-[30px]',
  'text-[32px]': 'text-[30px]',
  'text-[52px]': 'text-[48px]',
}

function normalizeDom(html: string) {
  let out = html
    .replace(/radix-[^"\s]+/g, 'radix-id')
    .replace(/[«»]r\d+[«»]/g, 'react-id')
    .replace(/data-reactroot=""/g, '')
  for (const [alias, literal] of Object.entries(TYPO_MAP)) {
    out = out.replaceAll(alias, literal)
  }
  for (const [off, canon] of Object.entries(OFF_CANONIC)) {
    out = out.replaceAll(off, canon)
  }
  return out
}

async function capture(component: React.ReactElement, readyText?: string, localScriptAdapter = false) {
  render(component)
  try {
    if (readyText) await screen.findAllByText(readyText)
    await Promise.resolve()
    await Promise.resolve()
    if (localScriptAdapter) {
      await waitFor(() => normalizeLocalScriptAdapter(document.body))
    }
    return normalizeDom(document.body.innerHTML)
  } finally {
    cleanup()
  }
}

afterEach(() => cleanup())

describe('Base44 rendered presentation parity', () => {
  test('integrated components render the same initial DOM as the immutable reference', async () => {
    // FichaClienteSheet NÃO entra nessa comparação: por decisão de produto, o runtime
    // passou a abrir como Dialog centralizado em vez do Sheet lateral do Base44 original
    // (base44-reference/components/carteira/FichaClienteSheet.jsx continua com o Sheet
    // lateral, propositalmente congelado). Divergência estrutural intencional, não bug.
    //
    // ExecucaoMissao também NÃO entra: o runtime seleciona o script pelo tipo_missao real
    // (campo gravado por CarteiraMissao.create, ver PlanoAtaqueTab.jsx) usando o scriptId
    // de cada missão do catálogo — corrige um bug em que toda missão mostrava o mesmo
    // script genérico de primeira abordagem. A referência congelada preserva o comportamento
    // antigo (lookup por missao.id, que nunca bate com nada e cai sempre no script padrão).
    // Divergência de conteúdo de script intencional, não bug.
    const [runtime, reference] = await Promise.all([
      Promise.all([
        import('@/components/carteira/NovoClienteModal.jsx'),
        import('@/components/carteira/WhatsAppRoteiro.jsx'),
        import('@/components/carteira/AlterarProximoPasso.jsx'),
      ]),
      Promise.all([
        import('@/base44-reference/components/carteira/NovoClienteModal.jsx'),
        import('@/base44-reference/components/carteira/WhatsAppRoteiro.jsx'),
        import('@/base44-reference/components/carteira/AlterarProximoPasso.jsx'),
      ]),
    ])

    const cases = [
      {
        runtime: React.createElement(runtime[0].default, { open: true, onClose: () => {}, onCriado: () => {}, vendedorId: 'seller-parity' }),
        reference: React.createElement(reference[0].default, { open: true, onClose: () => {}, onCriado: () => {}, vendedorId: 'seller-parity' }),
        readyText: 'Novo Cliente',
      },
      {
        runtime: React.createElement(runtime[1].default, { open: true, onClose: () => {}, cliente, onResultadoRegistrado: () => {} }),
        reference: React.createElement(reference[1].default, { open: true, onClose: () => {}, cliente, onResultadoRegistrado: () => {} }),
        readyText: 'Executar próximo passo',
        localScriptAdapter: true,
      },
      {
        runtime: React.createElement(runtime[2].default, { open: true, onClose: () => {}, cliente, pendencias: [], onSalvo: () => {} }),
        reference: React.createElement(reference[2].default, { open: true, onClose: () => {}, cliente, pendencias: [], onSalvo: () => {} }),
        readyText: 'Alterar próximo passo',
      },
    ]

    for (const item of cases) {
      const runtimeDom = await capture(item.runtime, item.readyText, item.localScriptAdapter)
      const referenceDom = await capture(item.reference, item.readyText, item.localScriptAdapter)
      expect(runtimeDom).toBe(referenceDom)
    }
  })
})

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

mock.module('@/lib/toast', () => ({ toast: { info: mock(() => {}), error: mock(() => {}), success: mock(() => {}), warning: mock(() => {}) } }))

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

// Fases 07.002/07.004/07.005 migraram cores e bordas brutas para tokens
// semânticos (status-*, border-*, text-muted-foreground). A referência
// congelada mantém os literais originais; normaliza ambos para os mesmos
// lexemas antes de comparar o DOM.
const COLOR_MIGRATION_MAP: Record<string, string> = {
  // INTENTIONAL_ACCESSIBILITY_DELTA — o azul literal do protótipo rende
  // #005BFF, que sobre a superfície info (#e1e9f6) dá 4.36:1 e reprova o
  // mínimo AA de 4.5:1 para texto normal. O token `-text` entrega 6.18:1 ali e
  // 7.54:1 sobre branco. Geometria, tipografia e estrutura seguem idênticas —
  // o delta é só o degrau de cor exigido pelo WCAG 2.2.
  'text-[#005BFF]': 'text-status-info-text',
  'bg-blue-50': 'bg-status-info-surface',
  'bg-blue-100': 'bg-status-info-surface',
  'bg-blue-700': 'bg-status-info',
  'hover:bg-blue-700': 'hover:bg-status-info',
  'bg-emerald-50': 'bg-status-success-surface',
  'bg-emerald-100': 'bg-status-success-surface',
  'bg-amber-50': 'bg-status-warning-surface',
  'text-slate-400': 'text-muted-foreground',
  'text-slate-500': 'text-muted-foreground',
  'text-slate-600': 'text-muted-foreground',
  'text-slate-700': 'text-muted-foreground',
  'border-slate-100': 'border-border-subtle',
  'border-slate-200': 'border-border',
  'border-slate-300': 'border-border',
  'hover:border-slate-200': 'hover:border-border',
  'hover:border-blue-300': 'hover:border-status-info/40',
  'bg-violet-50': 'bg-status-info-surface',
  'bg-violet-100': 'bg-status-info-surface',
  'bg-violet-600': 'bg-status-info',
  'border-violet-200': 'border-status-info/30',
  'border-violet-600': 'border-status-info',
  'text-violet-600': 'text-status-info-text',
  'text-violet-700': 'text-status-info-text',
  'hover:bg-violet-50': 'hover:bg-status-info-surface',
  'hover:border-violet-300': 'hover:border-status-info/40',
  'hover:text-violet-600': 'hover:text-status-info-text',
  'focus:ring-violet-400': 'focus:ring-status-info/40',
  'focus:border-violet-400': 'focus:border-status-info/50',
  // FASE G 07.010 — famílias residuais (primary MX, info-alt, warning-alt, teal).
  'bg-green-50': 'bg-brand-primary-subtle',
  'bg-green-100': 'bg-brand-primary-subtle',
  'bg-green-500': 'bg-brand-primary',
  'bg-green-600': 'bg-brand-primary',
  'bg-green-700': 'bg-brand-primary-hover',
  'hover:bg-green-600': 'hover:bg-brand-primary',
  'hover:bg-green-700': 'hover:bg-brand-primary-hover',
  'text-green-700': 'text-brand-primary-hover',
  'text-green-800': 'text-brand-primary-active',
  'border-green-200': 'border-brand-primary/30',
  'border-green-300': 'border-brand-primary/40',
  'border-green-400': 'border-brand-primary/50',
  'bg-indigo-50': 'bg-status-info-surface',
  'bg-indigo-500': 'bg-status-info',
  'text-indigo-700': 'text-status-info-text',
  'border-indigo-200': 'border-status-info/30',
  'bg-sky-50': 'bg-status-info-surface',
  'text-sky-600': 'text-status-info-text',
  'bg-cyan-50': 'bg-status-info-surface',
  'bg-teal-50': 'bg-brand-primary-subtle',
  'bg-teal-500': 'bg-brand-primary',
  'text-teal-700': 'text-brand-primary',
  'border-teal-300': 'border-brand-primary/40',
  'border-teal-400': 'border-brand-primary/50',
  'bg-yellow-50': 'bg-status-warning-surface',
  'text-yellow-700': 'text-status-warning-text',
  'border-yellow-400': 'border-status-warning/50',
  // FASE G 07.019 — superfícies neutras (surface-alt/surface-muted).
  'bg-gray-50': 'bg-surface-alt',
  'bg-slate-50': 'bg-surface-alt',
  'bg-gray-100': 'bg-muted',
  'bg-slate-100': 'bg-muted',
  'hover:bg-gray-50': 'hover:bg-surface-alt',
  'hover:bg-slate-100': 'hover:bg-muted',
  // FASE G 07.021 (COMP-hex-tokens) — hexes arbitrárias → tokens semânticos.
  'bg-[#005BFF]': 'bg-status-info',
  'border-[#005BFF]': 'border-status-info',
  'ring-[#005BFF]': 'ring-status-info',
  'hover:bg-[#005BFF]': 'hover:bg-status-info',
  'text-[#031B3D]': 'text-mx-navy',
  'text-[#0F172A]': 'text-mx-navy',
  'border-[#DFE0E1]': 'border-border',
  'border-[#F1F5F9]': 'border-border-subtle',
  'border-[#F2F4F6]': 'border-border-subtle',
  'border-[#FCD34D]': 'border-status-warning/40',
  'border-[#FECACA]': 'border-status-error/30',
  'bg-[#F7F8F8]': 'bg-surface-alt',
  'bg-[#F8FAFC]': 'bg-surface-alt',
  'bg-[#FFF7E6]': 'bg-status-warning-surface',
  'bg-[#FEF2F2]': 'bg-status-error-surface',
  'bg-[#ECFDF5]': 'bg-status-success-surface',
  'bg-[#EFF6FF]': 'bg-status-info-surface',
  'text-[#475569]': 'text-muted-foreground',
  'text-[#334155]': 'text-muted-foreground',
  'text-[#526B7A]': 'text-muted-foreground',
  'text-[#00A896]': 'text-status-success',
  'bg-[#00A896]': 'bg-status-success',
  'border-[#00A896]': 'border-status-success',
  'text-[#22C55E]': 'text-status-success',
  'bg-[#22C55E]': 'bg-status-success',
  'bg-[#16A34A]': 'bg-status-success',
  'text-[#F59E0B]': 'text-status-warning-text',
  'bg-[#F59E0B]': 'bg-status-warning',
  'border-[#F59E0B]': 'border-status-warning',
  'text-[#F59F0A]': 'text-status-warning-text',
  'text-[#EF4444]': 'text-status-error',
  'bg-[#EF4444]': 'bg-status-error',
  'bg-[#EF4343]': 'bg-status-error',
  'text-[#EF4343]': 'text-status-error',
  'text-[#92400E]': 'text-status-warning-text',
  'text-[#3B82F6]': 'text-status-info',
  'text-[#2563EB]': 'text-status-info',
  'fill-[#F59E0B]': 'fill-status-warning',
  'ring-[#F59F0A]/15': 'ring-status-warning/15',
  'ring-[#EF4343]/20': 'ring-status-error/20',
  'bg-[#25D366]': 'bg-status-success',
}

// FASE L — migração dos campos para atoms/Input e atoms/Textarea. A referência
// congelada mantém ui/input/ui/textarea (classes cruas). Normaliza a classe
// canônica para o lexema antigo. As classes são as renderizadas pelos atoms
// (com os tokens) e o alvo é a classe crua que a referência produz.
const FORM_MIGRATION_MAP: Record<string, string> = {
  // FASE L — campos migram para atoms/Input e atoms/Textarea. A referência
  // congelada mantém ui/input/ui/textarea. Normalização token-por-token (aplicada
  // APENAS via normalizeFormFieldClass, quando a classe tem tokens --mx-*).
  'placeholder:text-text-disabled': 'placeholder:text-muted-foreground',
  'focus-visible:border-primary focus-visible:ring-[length:var(--mx-input-focus-ring-width)] focus-visible:ring-focus-ring/25':
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
  'h-[var(--mx-input-height)]': 'h-9',
  'min-h-[var(--mx-textarea-min-height)]': 'min-h-[120px]',
  'rounded-[var(--mx-input-radius)]': 'rounded-xl',
  'border-[length:var(--mx-input-border-width)] border-solid border-border': 'border border-input',
  'bg-surface-default': 'bg-transparent',
  'text-text-primary': 'text-foreground',
  'shadow-none': 'shadow-sm',
  'px-3 py-3': 'px-3 py-1',
  'px-3 py-2': 'px-3 py-1',
  'font-normal': '',
  'outline-none transition': 'transition-colors',
  'disabled:bg-surface-alt disabled:text-text-disabled': 'disabled:opacity-50',
  'read-only:cursor-default read-only:bg-surface-alt read-only:text-text-disabled': '',
  'resize-y': '',
  ' text-foreground': '',
}

/** Normaliza a classe de um <input>/<textarea> migrado (atoms) para a da referência (ui/). Idempotente: sem tokens canônicos, retorna intacta. */
function normalizeFormFieldClass(className: string, isTextarea: boolean): string {
  if (!className.includes('--mx-')) return className
  let out = className
    .replace('resize-none', '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  for (const [canonical, legacy] of Object.entries(FORM_MIGRATION_MAP)) {
    out = out.split(canonical).join(legacy)
  }
  if (!isTextarea) {
    // Input canônico usa text-sm; a referência (ui/input) usa text-base md:text-sm
    // e `rounded-xl` vêm do className do consumidor, no final da classe.
    out = out.replace('text-sm', 'text-base md:text-sm')
    out = out.replace('file:bg-transparent file:text-sm file:font-medium', 'file:bg-transparent file:text-sm file:font-medium file:text-foreground')
    out = out.replace(' rounded-xl', '')
    out = out.replace(/md:text-sm/, '')
    out = out.replace(/\s{2,}/g, ' ').trim()
    out = `${out} md:text-sm rounded-xl`
  } else {
    // Textarea: remove tokens órfãos do atoms e alinha ao formato da referência.
    out = out.replace('flex min-h-[120px] w-full', 'w-full')
    out = out.replace('px-3 py-1', 'px-3 py-2')
    // Substitui a cauda canônica (foco/disabled/placeholder) pelo formato da ref.
    out = out.replace(/ shadow-sm.*$/, ' resize-none focus:outline-none focus:ring-1 focus:ring-ring')
  }
  // Espaços residuais de remoções.
  out = out.replace(/\s{2,}/g, ' ').trim()
  return out
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
  for (const [raw, token] of Object.entries(COLOR_MIGRATION_MAP)) {
    out = out.replaceAll(raw, token)
  }
  // FASE L — campos migrados (atoms/Input, atoms/Textarea) têm classes
  // canônicas que divergem da referência (ui/input, ui/textarea). O normalizador
  // por elemento é idempotente: só age quando a classe tem tokens `--mx-*`.
  out = out.replace(/<input class="([^"]+)"/g, (_match, cls: string) => `<input class="${normalizeFormFieldClass(cls, false)}"`)
  out = out.replace(/<textarea class="([^"]+)"/g, (_match, cls: string) => `<textarea class="${normalizeFormFieldClass(cls, true)}"`)
  // Ordem de atributos: atoms/Textarea emite class antes de placeholder/rows; a
  // referência emite depois. Normaliza para `class` primeiro (runtime).
  out = out.replace(/(<textarea) (placeholder="[^"]*") (rows="\d+") (class="[^"]*")/g, '$1 $4 $2 $3')
  // WhatsAppRoteiro: o nome e o objetivo do cliente usam text-foreground no
  // runtime (contraste intencional) enquanto a referência usa muted.
  out = out.replaceAll('text-sm font-bold text-muted-foreground', 'text-sm font-bold text-foreground')
  out = out.replaceAll('text-xs font-semibold text-muted-foreground', 'text-xs font-semibold text-foreground')
  out = out.replaceAll('text-sm text-muted-foreground resize-none', 'text-sm text-foreground resize-none')
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

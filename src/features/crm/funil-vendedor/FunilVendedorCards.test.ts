import { describe, expect, it } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ChannelFunnel } from '@/features/crm/lib/funil-vendas-diagnostico'
import { EsforcoNecessarioCard, hasPositiveEffortLever } from './FunilVendedorCards'

describe('hasPositiveEffortLever', () => {
  it('rejects absent, empty, zero and negative calculations', () => {
    expect(hasPositiveEffortLever(null)).toBe(false)
    expect(hasPositiveEffortLever({})).toBe(false)
    expect(hasPositiveEffortLever({ atendimentos: 0, agendamentos: 0 })).toBe(false)
    expect(hasPositiveEffortLever({ qualificados: -1, oportunidades: 0 })).toBe(false)
  })

  it('accepts a calculation with at least one finite positive lever', () => {
    expect(hasPositiveEffortLever({ oportunidades: 1 })).toBe(true)
    expect(hasPositiveEffortLever({ atendimentos: 2, qualificados: 0 })).toBe(true)
  })

  it('renders Internet opportunities when they are the only secondary lever', () => {
    const channels: ChannelFunnel[] = [
      { channel: 'Showroom', steps: [{ key: 'venda', label: 'Vendas', value: 0 }], generalConversion: null },
      {
        channel: 'Internet',
        steps: [
          { key: 'oportunidades', label: 'Oportunidades', value: 2 },
          { key: 'venda', label: 'Vendas', value: 1 },
        ],
        generalConversion: 50,
      },
      {
        channel: 'Carteira',
        steps: [
          { key: 'qualificados', label: 'Qualificados', value: 1 },
          { key: 'venda', label: 'Vendas', value: 1 },
        ],
        generalConversion: 100,
      },
    ]

    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(EsforcoNecessarioCard, { channels, faltam: 1 }),
      ),
    )

    expect(markup).toContain('Internet')
    expect(markup).toContain('Oportunidades')
    expect(markup).toContain('2')
  })
})

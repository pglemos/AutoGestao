import { describe, expect, test } from 'bun:test'
import { MemoryRouter } from 'react-router-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { ConsultingClientTable } from './ConsultingClientTable'
import type { ConsultingClient } from '@/lib/schemas/consulting-client.schema'

const clients: ConsultingClient[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Loja Alfa',
    slug: 'loja-alfa',
    legal_name: 'Alfa Comércio LTDA',
    cnpj: null,
    product_name: 'Consultoria Vendas',
    status: 'ativo',
    notes: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Loja Beta',
    legal_name: null,
    cnpj: null,
    product_name: null,
    status: 'arquivado',
    notes: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
]

describe('ConsultingClientTable — fundação canônica Table', () => {
  test('delega à família Table/TableSurface preservando colunas, status e ações', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ConsultingClientTable rows={clients} onEdit={() => {}} onArchive={() => {}} onRestore={() => {}} />
      </MemoryRouter>,
    )

    expect(html).toContain('data-mx-table=""')
    expect(html).toContain('data-mx-table-header=""')
    expect(html).toContain('data-mx-table-head=""')
    expect(html).toContain('data-mx-table-body=""')
    expect(html).toContain('data-mx-table-row=""')
    expect(html).toContain('data-mx-table-cell=""')
    expect(html).toContain('data-mx-table-surface=""')
    expect(html).toMatch(/scope="col"/)
    expect(html).toContain('Cliente')
    expect(html).toContain('Produto')
    expect(html).toContain('Progresso')
    expect(html).toContain('Status')
    expect(html).toContain('Ação')
    expect(html).toContain('Loja Alfa')
    expect(html).toContain('Alfa Comércio LTDA')
    expect(html).toContain('Consultoria Vendas')
    expect(html).toContain('ATIVO')
    expect(html).toContain('ARQUIVADO')
    expect(html).toContain('Abrir')
    expect(html).toContain('Editar')
    expect(html).toContain('Restaurar')
    expect(html).toContain('Arquivar')
    expect(html).not.toContain('Nenhum cliente encontrado')
  })

  test('condiciona ações ao callback fornecido', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ConsultingClientTable rows={clients} onEdit={undefined} onArchive={undefined} onRestore={undefined} />
      </MemoryRouter>,
    )

    expect(html).not.toContain('Editar')
    expect(html).not.toContain('Restaurar')
    expect(html).not.toContain('Arquivar')
  })

  test('mantém o empty state de negócio', () => {
    const html = renderToStaticMarkup(<ConsultingClientTable rows={[]} onEdit={() => {}} onArchive={() => {}} onRestore={() => {}} />)

    expect(html).toContain('Nenhum cliente encontrado')
    expect(html).toContain('Ajuste a busca ou cadastre um novo cliente.')
    expect(html).not.toContain('data-mx-table=""')
  })
})

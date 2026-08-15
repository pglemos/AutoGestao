import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { DataGrid, type Column } from './DataGrid'

afterEach(cleanup)

type Row = { id: string; nome: string; valor: number; status: 'ativo' | 'inativo' }

const columns: Column<Row>[] = [
  { key: 'nome', header: 'Nome' },
  { key: 'valor', header: 'Valor', align: 'right' },
  { key: 'status', header: 'Status' },
]

const rows: Row[] = [
  { id: '1', nome: 'Ana', valor: 1250, status: 'ativo' },
  { id: '2', nome: 'Bia', valor: 800, status: 'inativo' },
]

/**
 * Contrato FASE N — DataGrid canônico (14.002/14.003/14.004/14.009/14.010/14.011).
 *
 * O DataGrid é a abstração de dados padrão do sistema: header/row height
 * tokenizados, overflow horizontal local, sticky header e estados
 * empty/loading dentro do componente. Qualquer tabela de dados nova deve
 * preferir o DataGrid (ou os primitives de Table.tsx) em vez de um `<table>`
 * avulso com geometria própria.
 */
describe('contrato FASE N — DataGrid canônico', () => {
  test('header usa tipografia de tabela canônica e altura tokenizada', () => {
    render(<DataGrid columns={columns} data={rows} label="Contrato" />)
    const headerCells = screen.getAllByRole('columnheader')
    expect(headerCells).toHaveLength(3)
    for (const cell of headerCells) {
      expect(cell.className).toContain('text-caption')
      expect(cell.className).toContain('font-semibold')
      expect(cell.className).toContain('py-3')
    }
  })

  test('row usa altura canônica h-16 e células com text-body-sm', () => {
    render(<DataGrid columns={columns} data={rows} label="Contrato" />)
    const bodyRows = screen.getAllByRole('row').slice(1)
    expect(bodyRows).toHaveLength(2)
    for (const row of bodyRows) {
      expect(row.className).toContain('h-16')
    }
    const cells = screen.getAllByRole('cell')
    for (const cell of cells) {
      expect(cell.className).toContain('text-body-sm')
    }
  })

  test('coluna numérica com align="right" alinha header e célula à direita', () => {
    render(<DataGrid columns={columns} data={rows} label="Contrato" />)
    const headers = screen.getAllByRole('columnheader')
    const cells = screen.getAllByRole('cell')

    expect(headers[1].className).toContain('text-right')
    expect(cells[1].className).toContain('text-right')
    expect(cells[4].className).toContain('text-right')

    expect(headers[0].className).toContain('text-left')
    expect(cells[0].className).toContain('text-left')
  })

  test('overflow horizontal local com sticky header (quando habilitado)', () => {
    render(<DataGrid columns={columns} data={rows} label="Contrato" stickyHeader />)
    const region = screen.getByRole('region', { name: 'Contrato' })
    expect(region.className).toContain('overflow-x-auto')
    const thead = region.querySelector('thead')
    expect(thead?.className).toContain('sticky')
  })

  test('estado empty renderiza mensagem e descrição canônicas', () => {
    render(
      <DataGrid
        columns={columns}
        data={[]}
        emptyMessage="Nenhum cliente"
        emptyDescription="Cadastre um cliente para começar."
        label="Contrato"
      />,
    )
    expect(screen.getByText('Nenhum cliente')).toBeTruthy()
    expect(screen.getByText('Cadastre um cliente para começar.')).toBeTruthy()
  })

  test('estado loading renderiza skeletons com aria-busy, sem tabela', () => {
    render(<DataGrid columns={columns} data={[]} loading label="Contrato" />)
    const busy = document.querySelector('[aria-busy="true"]')
    expect(busy).not.toBeNull()
    expect(busy?.getAttribute('aria-live')).toBe('polite')
    expect(screen.queryByRole('table')).toBeNull()
    expect(document.querySelectorAll('div[aria-hidden="true"]')).toHaveLength(5)
  })

  test('estado error renderiza ErrorState canônico com retry, sem tabela', () => {
    render(
      <DataGrid
        columns={columns}
        data={[]}
        error="Falha ao carregar os dados"
        onRetry={undefined}
        label="Contrato"
      />,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Falha ao carregar os dados')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  test('estado error dispara onRetry no clique de retry', () => {
    let called = 0
    render(
      <DataGrid
        columns={columns}
        data={[]}
        error="Falha"
        onRetry={() => { called += 1 }}
        label="Contrato"
      />,
    )
    const button = screen.getByRole('button', { name: /Tentar novamente/i })
    button.click()
    expect(called).toBe(1)
  })

  test('célula de status usa StatusBadge canônico via coluna com option status', () => {
    const withStatus: Column<Row>[] = [
      { key: 'nome', header: 'Nome' },
      {
        key: 'status',
        header: 'Status',
        status: (row) => ({
          status: row.status === 'ativo' ? 'success' : 'neutral',
          label: row.status,
        }),
      },
    ]
    render(<DataGrid columns={withStatus} data={rows} label="Contrato" />)
    const table = document.querySelector('table')
    expect(table).not.toBeNull()
    const cells = table?.querySelectorAll('[data-mx-status-cell]') ?? []
    expect(cells.length).toBe(2)
    expect(table?.textContent).toContain('ativo')
    expect(table?.textContent).toContain('inativo')
  })

  test('pagination renderiza Pagination canônico abaixo da tabela', () => {
    let page = 1
    render(
      <DataGrid
        columns={columns}
        data={rows.slice(0, 1)}
        label="Contrato"
        pagination={{
          page,
          pageSize: 1,
          totalItems: rows.length,
          onPageChange: (next: number) => { page = next },
        }}
      />,
    )
    expect(screen.getByText(/1–1 de 2/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeTruthy()
  })

  test('14.015 — 320px: table tem min-width 760px com scroll local (não estoura a página)', () => {
    render(<DataGrid columns={columns} data={rows} label="Contrato" />)
    // O ScrollableRegion recebe o aria-label e declara o scroll local.
    const region = screen.getByRole('region', { name: 'Contrato' })
    expect(region).toHaveAttribute('data-mx-scroll-region', '')
    expect(region).toHaveAttribute('tabindex', '0')
    // A table dentro tem min-width 760px (o overflow fica local, não na página).
    const table = region.querySelector('table')
    expect(table).not.toBeNull()
    expect(table!.className).toContain('min-w-[760px]')
  })

  test('14.015 — teclado: rows com onRowClick são focusáveis (tabIndex 0)', () => {
    render(<DataGrid columns={columns} data={rows} label="Contrato" onRowClick={() => undefined} />)
    const bodyRows = screen.getAllByRole('row').slice(1)
    for (const row of bodyRows) {
      expect(row.getAttribute('tabindex')).toBe('0')
      expect(row.getAttribute('role')).toBe('button')
    }
  })
})

import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSurface } from './Table'

afterEach(cleanup)

describe('Table family', () => {
  test('usa surface horizontal local focável e primitives tokenizadas', () => {
    render(
      <TableSurface label="Tabela de clientes">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead></TableRow></TableHeader>
          <TableBody><TableRow><TableCell>Ana</TableCell></TableRow></TableBody>
        </Table>
      </TableSurface>,
    )

    const surface = screen.getByRole('region', { name: 'Tabela de clientes' })
    expect(surface.getAttribute('data-mx-table-surface')).toBe('')
    expect(surface.className).toContain('overflow-x-auto')
    expect(surface.className).toContain('rounded-2xl')
    expect(surface.className).toContain('bg-white')
    expect(screen.getByRole('table').getAttribute('data-mx-table')).toBe('')
    expect(screen.getByText('Nome').className).toContain('text-caption')
    expect(screen.getByText('Ana').className).toContain('text-body-sm')
  })
})

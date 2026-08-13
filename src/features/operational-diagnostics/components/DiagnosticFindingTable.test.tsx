import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiagnosticFindingTable } from './DiagnosticFindingTable'
import type { DiagnosticFinding } from '../types'

const findings: DiagnosticFinding[] = [
  {
    id: 'f-1',
    severity: 'critical',
    title: 'Funil 20/60/33 fora da meta',
    description: 'Conversão de visitas abaixo do esperado',
    suggestedAction: 'Revisar roteiro de visitas',
    evidence: ['ev-1', 'ev-2'],
    completed: false,
  },
  {
    id: 'f-2',
    severity: 'warning',
    title: 'Ociosidade em picos',
    description: 'Janelas sem agenda no período',
    suggestedAction: 'Antecipar agendamentos',
    evidence: ['ev-3'],
    completed: false,
  },
]

describe('DiagnosticFindingTable', () => {
  test('delega a tabela à fundação canônica Table/TableSurface', () => {
    const html = renderToStaticMarkup(<DiagnosticFindingTable findings={findings} onSelect={() => {}} />)

    expect(html).toContain('data-mx-table=""')
    expect(html).toContain('data-mx-table-header=""')
    expect(html).toContain('data-mx-table-head=""')
    expect(html).toContain('data-mx-table-body=""')
    expect(html).toContain('data-mx-table-row=""')
    expect(html).toContain('data-mx-table-cell=""')
    expect(html).toContain('data-mx-table-surface=""')
    expect(html).toMatch(/scope="col"/)
  })

  test('preserva colunas, conteúdo de negócio e ação', () => {
    const html = renderToStaticMarkup(<DiagnosticFindingTable findings={findings} onSelect={() => {}} />)

    expect(html).toContain('Severidade')
    expect(html).toContain('Achado')
    expect(html).toContain('Evidências')
    expect(html).toContain('Ação')
    expect(html).toContain('Crítico')
    expect(html).toContain('Atenção')
    expect(html).toContain('Funil 20/60/33 fora da meta')
    expect(html).toContain('Conversão de visitas abaixo do esperado')
    expect(html).toContain('ev-1 · ev-2')
    expect(html).toContain('Ver detalhe')
  })

  test('mantém o empty state de negócio', () => {
    const html = renderToStaticMarkup(<DiagnosticFindingTable findings={[]} onSelect={() => {}} />)

    expect(html).toContain('Nenhum achado')
    expect(html).toContain('Não foram identificadas inconsistências no período.')
    expect(html).not.toContain('data-mx-table=""')
  })
})

import { describe, expect, it } from 'bun:test'
import { buildMorningReportSummary, filterMorningReportRows } from './morningReportViewModel'
const rows = [{ storeId:'1', storeName:'Almeida', sales:10, goal:20, sellers:4, checkedIn:3, leads:12, visits:5 }]
describe('morningReportViewModel', () => {
  it('calcula disciplina e atingimento', () => expect(buildMorningReportSummary(rows)).toMatchObject({ discipline:75, attainment:50 }))
  it('filtra unidade sem diferenciar caixa', () => expect(filterMorningReportRows(rows, 'almei')).toHaveLength(1))
})

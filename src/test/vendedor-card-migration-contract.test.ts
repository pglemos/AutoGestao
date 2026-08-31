import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * FASE M — 13.014 migração de cards do módulo Vendedor para a família canônica.
 *
 * Cards de KPI/resumo do vendedor (FinancialSummaryCards, BonusDisputeCard)
 * usavam `bg-white rounded-2xl p-5/6 border border-border-subtle shadow-sm` —
 * geometria crua duplicada. Migrados para StatCard/Card canônicos (tokens
 * --mx-card-*), com single ownership da geometria.
 */
const root = resolve(import.meta.dir, '../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

describe('FASE M 13.014 — vendedor usa família canônica de cards', () => {
  test('FinancialSummaryCards usa StatCard canônico (sem geometria crua)', () => {
    const src = read('src/components/vendedor/FinancialSummaryCards.jsx')
    expect(src).toContain('@/components/molecules/StatCard')
    expect(src).toContain('<StatCard')
    // Sem a geometria crua duplicada
    expect(src).not.toMatch(/bg-white rounded-2xl p-5 border border-border-subtle shadow-sm/)
  })

  test('BonusDisputeCard usa Card/CardContent canônicos (sem geometria crua)', () => {
    const src = read('src/components/vendedor/BonusDisputeCard.jsx')
    expect(src).toContain('@/components/molecules/Card')
    expect(src).toContain('<Card')
    expect(src).toContain('<CardContent')
    // Sem a geometria crua duplicada
    expect(src).not.toMatch(/bg-white rounded-2xl p-6 border border-border-subtle shadow-sm/)
  })

  test('a geometria crua de card não volta (single ownership — Card canônico)', () => {
    // O padrão cru original não existe mais nos dois arquivos migrados.
    expect(read('src/components/vendedor/FinancialSummaryCards.jsx')).not.toContain('rounded-2xl')
    expect(read('src/components/vendedor/BonusDisputeCard.jsx')).not.toContain('rounded-2xl')
  })

  test('ManagerRankingPodium usa SectionCard canônico (sem rounded-2xl cru)', () => {
    const src = read('src/features/ranking/manager/ManagerRankingPodium.tsx')
    expect(src).toContain('@/components/molecules/SectionCard')
    expect(src).toContain('<SectionCard')
    expect(src).toContain('<SectionHeader')
    expect(src).toContain('<SectionContent')
    // Sem a geometria crua do card de seção
    expect(src).not.toMatch(/rounded-2xl border border-border-subtle bg-white p-5 shadow-sm/)
  })

  test('13.014 dono: OwnerActionsBlock, SecondaryAlerts, SalesGoalBlock, ConsultantCard, PriorityIntervention usam SectionCard', () => {
    const files = [
      'src/components/owner/home/OwnerActionsBlock.jsx',
      'src/components/owner/home/SecondaryAlerts.jsx',
      'src/components/owner/home/SalesGoalBlock.jsx',
      'src/components/owner/home/ConsultantCard.jsx',
      'src/components/owner/home/PriorityIntervention.jsx',
    ]
    for (const f of files) {
      const src = read(f)
      expect(src, f).toContain('@/components/molecules/SectionCard')
      expect(src, f).toContain('<SectionCard')
      // Sem a geometria crua de card (section rounded-2xl ... shadow-sm)
      expect(src, f).not.toMatch(/<section className="rounded-2xl/)
    }
  })

  test('13.014 consultoria: VisitExecutionViews usa CardContent (sem p-mx-lg/shadow-sm/rounded-2xl crus no Card)', () => {
    const src = read('src/features/consultoria/components/VisitExecutionViews.tsx')
    expect(src).toContain('CardContent')
    // Nenhum Card com override cru de geometria
    expect(src).not.toMatch(/<Card[^>]*p-mx-lg/)
    expect(src).not.toMatch(/<Card[^>]*shadow-sm/)
    expect(src).not.toMatch(/<Card[^>]*rounded-2xl/)
    // Usa o CardContent para o padding canônico
    expect((src.match(/<CardContent/g) || []).length).toBeGreaterThanOrEqual(9)
  })

  test('13.014 consultoria: ConsultingDriveFilesView usa CardContent (sem p-mx-lg/p-mx-xl crus no Card)', () => {
    const src = read('src/features/consultoria/components/ConsultingDriveFilesView.tsx')
    expect(src).toContain('CardContent')
    expect(src).not.toMatch(/<Card[^>]*p-mx-lg/)
    expect(src).not.toMatch(/<Card[^>]*p-mx-xl/)
    expect(src).not.toMatch(/<Card[^>]*shadow-sm/)
  })

  test('13.014 departamentos: DepartamentoDashboard usa CardContent (sem p-mx-md/rounded-2xl crus no Card)', () => {
    const src = read('src/features/departamentos/sections/DepartamentoDashboard.tsx')
    expect(src).toContain('CardContent')
    expect(src).not.toMatch(/<Card[^>]*p-mx-md/)
    expect(src).not.toMatch(/<Card[^>]*rounded-2xl/)
    expect(src).not.toMatch(/<Card[^>]*shadow-sm/)
  })

  test('13.014 admin-mx: páginas usam MxSectionCard (canônico) sem cards crus', () => {
    const sectionCardPages = [
      'src/features/admin-mx/AdminIndicadoresPage.tsx',
      'src/features/admin-mx/AdminConsultoriaMxPage.tsx',
    ]
    for (const f of sectionCardPages) {
      const src = read(f)
      expect(src, f).toContain('MxSectionCard')
      // Sem card cru (div/section rounded-2xl + shadow-sm)
      expect(src, f).not.toMatch(/<(div|section)[^>]*rounded-2xl[^>]*shadow-sm/)
    }
    const equipe = read('src/features/admin-mx/AdminEquipeMxPage.tsx')
    expect(equipe).toContain('<TeamMemberCard')
    expect(equipe).not.toMatch(/<(div|section)[^>]*rounded-2xl[^>]*shadow-sm/)
  })
})

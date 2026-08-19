import { describe, expect, test } from 'bun:test'
import { buildExecutiveVisitReport } from './executive-visit-report'

describe('executive visit report', () => {
  test('keeps the MX report order deterministic', () => {
    const report = buildExecutiveVisitReport({
      clientName: 'Loja Teste',
      visitNumber: 8,
      objective: 'Acompanhamento Mensal',
      consultantName: 'Jose',
      visitDate: '2026-05-15',
      analysisPeriodPreset: 'previous_month',
      analysisPeriodStart: '2026-04-01',
      analysisPeriodEnd: '2026-04-30',
      monthlyGoal: '20',
      projection: '18',
      leads: '140',
      inventory: '42',
      executiveSummary: 'Plano de acao revisado.',
      feedbackClient: 'Baixo acompanhamento de leads.',
      nextCycleGoal: 'Elevar disciplina diaria.',
      checklist: [
        { task: 'Revisar indicadores', completed: true },
        { task: 'Definir proximas acoes', completed: false },
      ],
      attachments: [{ filename: 'relatorio.pdf' }],
    })

    expect(report).toContain('ACOMPANHAMENTO MENSAL')
    expect(report.indexOf('--- RESULTADO DO PERÍODO ---')).toBeLessThan(report.indexOf('--- PONTOS POSITIVOS E ALINHAMENTOS ---'))
    expect(report.indexOf('--- PONTOS A MELHORAR ---')).toBeLessThan(report.indexOf('--- TAREFAS CONCLUÍDAS ---'))
    expect(report.indexOf('--- TAREFAS E PRÓXIMOS PASSOS ---')).toBeLessThan(report.indexOf('--- FOCO DO PRÓXIMO CICLO ---'))
    expect(report).toContain('Mês anterior: 2026-04-01 a 2026-04-30')
    expect(report).toContain('- relatorio.pdf')
  })

  test('uses clear fallback for incomplete reports', () => {
    const report = buildExecutiveVisitReport({
      visitNumber: 2,
      checklist: [],
      attachments: [],
    })

    expect(report).toContain('Período analisado: Período não informado')
    expect(report).toContain('Resumo executivo ainda não preenchido')
    expect(report).toContain('Nenhum item registrado')
  })
})

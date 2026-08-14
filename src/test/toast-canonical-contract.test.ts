import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/**
 * Contrato FASE Q 17.012 (fatia bounded: owner + fechamento).
 *
 * Os 24 arquivos do escopo devem usar a API canônica `toast` de `@/lib/toast`
 * (success/info/warning/error com durations), nunca o adapter legado
 * `@/components/ui/use-toast`.
 */
const BOUNDED_SLICE = [
  'src/components/fechamento/NovoRegistroModal.jsx',
  'src/components/fechamento/RegularizarFechamentoDrawer.jsx',
  'src/components/fechamento/ClientCardMobile.jsx',
  'src/components/fechamento/ClientCard.jsx',
  'src/components/fechamento/BottomSection.jsx',
  'src/pages/owner/PlanoDeAcao.jsx',
  'src/components/owner/strategic/TargetHistoryPanel.jsx',
  'src/components/owner/consulting/ContentTab.jsx',
  'src/components/owner/consulting/ParticipantsModal.jsx',
  'src/components/owner/consulting/EvidenceTab.jsx',
  'src/components/owner/consulting/AnticipationModal.jsx',
  'src/components/owner/consulting/MeetingDrawer.jsx',
  'src/components/owner/home/SecondaryAlerts.jsx',
  'src/components/owner/home/OwnerActionsBlock.jsx',
  'src/components/owner/strategic/EditTargetsDrawer.jsx',
  'src/components/owner/strategic/FiltersDrawer.jsx',
  'src/components/owner/strategic/CreateActionModal.jsx',
  'src/components/owner/actionplan/board/BoardView.jsx',
  'src/components/owner/home/SalesGoalBlock.jsx',
  'src/components/owner/actionplan/board/HistoryTab.jsx',
  'src/components/owner/actionplan/board/EvidenceTab.jsx',
  'src/components/owner/actionplan/board/ExecutionTab.jsx',
  'src/components/owner/consulting/PreparationTab.jsx',
  'src/components/owner/actionplan/calendar/CalendarView.jsx',
]

describe('FASE Q 17.012 — consumers legados de use-toast (owner + fechamento)', () => {
  test('nenhum arquivo do escopo importa o adapter legado use-toast', () => {
    for (const file of BOUNDED_SLICE) {
      const src = readFileSync(file, 'utf8')
      expect(src, `${file} não deve importar use-toast`).not.toContain('components/ui/use-toast')
      expect(src, `${file} não deve chamar useToast()`).not.toContain('useToast(')
    }
  })

  test('cada arquivo do escopo usa a API canônica @/lib/toast', () => {
    for (const file of BOUNDED_SLICE) {
      const src = readFileSync(file, 'utf8')
      expect(src, `${file} deve importar @/lib/toast`).toContain('@/lib/toast')
    }
  })
})

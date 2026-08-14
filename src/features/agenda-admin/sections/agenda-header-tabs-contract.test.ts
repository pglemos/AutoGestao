import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

/**
 * FASE J — 10.004/10.005/10.006/10.011/10.013 (AgendaAdmin `/agenda`)
 *
 * O `AgendaHeader` tem controles à mão que a FASE J elimina:
 *   - view-mode (Dia/Semana/Mês/Lista): um grupo de `<button>` num
 *     `<div className="flex rounded-xl border ...">` — alternador à mão, sem
 *     roving tabindex e sem navegação por teclado;
 *   - status do popover de filtros: `statusFilters.map` de `<button>` cru.
 *
 * Este contrato trava a migração para os canônicos da família
 * header/toolbar/tabs/filter (TabNavPill / FilterChip / MxToolbar):
 *   - o view-mode precisa usar `TabNavPill` (roving + setas/Home/End);
 *   - o popover de filtros não pode montar botões de status à mão;
 *   - o botão "Filtros" com contador e o botão "Limpar" precisam existir
 *     (padrão 10.009).
 */
const root = resolve(import.meta.dir, '..', '..', '..', '..')

const header = readFileSync(
  resolve(root, 'src/features/agenda-admin/sections/AgendaHeader.tsx'),
  'utf8',
)

describe('FASE J — AgendaHeader: view-mode e filtros canônicos', () => {
  test('view-mode usa TabNavPill (não grupo de botões à mão)', () => {
    expect(header).toContain('TabNavPill')
    expect(header).not.toMatch(/VIEW_OPTIONS\.map\(/)
    expect(header).not.toMatch(/aria-pressed=\{calendarViewMode === option\.key\}/)
  })

  test('popover de filtros não monta botões de status à mão', () => {
    // O map pode continuar existindo (agora renderiza FilterChip); o que é
    // proibido é o `<button>` cru com o toggle manual de cor.
    expect(header).toContain('FilterChip')
    expect(header).not.toContain("'bg-brand-primary text-white font-bold'")
    expect(header).not.toMatch(/statusFilter === filter\.key\n.*: 'border border-border bg-white/)
  })

  test('padrão 10.009: botão Filtros com contador ativo e ação Limpar', () => {
    expect(header).toContain('activeFilters > 0')
    expect(header).toContain('clearFilters')
    expect(header).toMatch(/aria-label="Filtros"/)
  })

  test('superfície do header usa slot canônico de template', () => {
    expect(header).toContain('InternalMxTemplateHeader')
    // O atributo data-mx-template-header vive no componente canônico, não no
    // consumidor — o consumidor apenas monta o slot.
    const slots = readFileSync(
      resolve(root, 'src/components/module/InternalMxTemplateSlots.tsx'),
      'utf8',
    )
    expect(slots).toContain('data-mx-template-header')
  })
})

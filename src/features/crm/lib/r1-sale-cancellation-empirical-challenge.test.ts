import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  assertNotTerminalPresentation,
  mapMxClientToCarteiraVisual,
  selectActiveOpportunity,
  selectLatestCancelledOpportunity,
  situationToStage,
} from '@/features/carteira-clientes/lib/carteira-mappers'
import {
  calcularObjetivoEProximoPasso,
  statusComercialColor,
  MISSOES,
} from '@/components/carteira/carteiraUtils'
import {
  CRM_ETAPAS_ATIVAS,
  CRM_ETAPAS_FUNIL,
  isEtapaTerminal,
} from '@/lib/schemas/crm.schema'
import { buildOportunidadePayload } from '@/features/crm/hooks/useOportunidades'
import { derivarProgresso } from '@/features/crm/lib/cadencia'
import { derivarSituacao, derivarTemperatura } from '@/features/crm/lib/mentorComercial'
import { buildFunnelDashboard, type FunnelRow } from '@/features/crm/lib/funil-vendas-diagnostico'

describe('EMPIRICAL CHALLENGE R1: Sale Cancellation Flow Stress Tests', () => {
  // --------------------------------------------------------------------------
  // Edge Case 1: Attempting to pass terminal states into presentation converters
  // --------------------------------------------------------------------------
  describe('1. Terminal states in presentation converters', () => {
    test('assertNotTerminalPresentation throws error when receiving Venda cancelada or Cancelada', () => {
      expect(() => assertNotTerminalPresentation('Venda cancelada', null)).toThrow(
        'Estados terminais devem ser alterados por uma operação de domínio.',
      )
      expect(() => assertNotTerminalPresentation(null, 'Cancelada')).toThrow(
        'Estados terminais devem ser alterados por uma operação de domínio.',
      )
    })

    test('situationToStage rejects terminal presentation states Venda cancelada and Cancelada', () => {
      expect(() => situationToStage({ situacao_atual: 'Venda cancelada' })).toThrow()
      expect(() => situationToStage({ status_comercial: 'Cancelada' })).toThrow()
    })

    test('mapMxClientToCarteiraVisual correctly resolves a client with a cancelled sale', () => {
      const mockClient = {
        id: 'client-cancelled-1',
        loja_id: 'store-1',
        seller_user_id: 'seller-1',
        nome: 'Cliente Cancelado',
        telefone: '11999999999',
        canal_origem: 'internet',
        status: 'ativo',
        ultima_interacao: '2026-07-20T10:00:00Z',
        proxima_acao: 'Fazer follow-up antigo',
        proxima_acao_em: '2026-07-21T10:00:00Z',
        potencial_negocio: 50000,
        oportunidades: [
          {
            id: 'opp-cancel-1',
            etapa: 'cancelada',
            updated_at: '2026-07-25T12:00:00Z',
            created_at: '2026-07-20T10:00:00Z',
            veiculo_interesse: 'SUV Turbo',
            valor_negociado: 50000,
            motivo_cancelamento: 'Desistência do cliente',
            cancelada_em: '2026-07-25T12:00:00Z',
            cancelada_por: 'user-manager-1',
          },
        ],
        agendamentos: [
          {
            id: 'app-old-1',
            status: 'confirmado',
            data_hora: '2026-07-21T10:00:00Z',
            tipo: 'visita',
          },
        ],
      }

      const visual = mapMxClientToCarteiraVisual(mockClient)

      // Verification: Active opportunity must be null
      expect(visual.oportunidade_id).toBeNull()
      expect(visual.oportunidade_cancelada_id).toBe('opp-cancel-1')
      expect(visual.situacao_atual).toBe('Venda cancelada')
      expect(visual.status_comercial).toBe('Cancelada')
      expect(visual.temperatura).toBe('Frio')
      expect(visual.motivo_cancelamento).toBe('Desistência do cliente')
      expect(visual.cancelada_em).toBe('2026-07-25T12:00:00Z')
      expect(visual.cancelada_por).toBe('user-manager-1')

      // Verification: Next actions and appointments must be wiped for cancelled sale
      expect(visual.proxima_acao).toBe('')
      expect(visual.proxima_acao_data).toBeNull()
      expect(visual.agendamento_id).toBeNull()
      expect(visual.visita_agendada_em).toBeNull()
    })

    test('selectActiveOpportunity ignores terminal stage cancelada', () => {
      const opps = [
        { id: 'opp-1', etapa: 'cancelada', updated_at: '2026-07-25T12:00:00Z' },
        { id: 'opp-2', etapa: 'ganho', updated_at: '2026-07-20T12:00:00Z' },
      ]
      expect(selectActiveOpportunity(opps)).toBeNull()
      expect(selectLatestCancelledOpportunity(opps)?.id).toBe('opp-1')
    })

    test('calcularObjetivoEProximoPasso returns Analisar recuperação for Venda cancelada', () => {
      const res = calcularObjetivoEProximoPasso({ situacao_atual: 'Venda cancelada' })
      expect(res.objetivo).toBe('Analisar recuperação')
      expect(res.proximoPasso).toBe('Analisar recuperação')
    })

    test('statusComercialColor differentiates Cancelada from Vendido and Perdido', () => {
      const colorCancel = statusComercialColor('Cancelada')
      expect(colorCancel).not.toContain('green')
      expect(colorCancel).not.toBe(statusComercialColor('Vendido'))
      expect(colorCancel).not.toBe(statusComercialColor('Perdido'))
    })
  })

  // --------------------------------------------------------------------------
  // Edge Case 2: Re-opening cancelled sales or demoting stages
  // --------------------------------------------------------------------------
  describe('2. Re-opening cancelled sales or demoting stages', () => {
    test('isEtapaTerminal recognizes cancelada as terminal stage', () => {
      expect(isEtapaTerminal('cancelada')).toBe(true)
      expect(CRM_ETAPAS_FUNIL).toContain('cancelada')
      expect(CRM_ETAPAS_ATIVAS).not.toContain('cancelada')
    })

    test('derivarSituacao preserves Venda cancelada outcome even if cadence stage is provided', () => {
      const client = { id: 'c1', status: 'oportunidade' } as never
      const opp = { etapa: 'cancelada' } as never
      expect(derivarSituacao(client, opp, 'negociacao')).toBe('Venda cancelada')
      expect(derivarSituacao(client, opp, 'prospeccao')).toBe('Venda cancelada')
      expect(derivarTemperatura(opp)).toBe('frio')
    })

    test('derivarProgresso ends cadence when opportunity is cancelled', () => {
      const progresso = derivarProgresso(
        { id: 'c1', canal_origem: 'internet', ultima_interacao: null },
        [{ id: 'o1', cliente_id: 'c1', etapa: 'cancelada' }] as never,
        [],
      )
      expect(progresso.encerramento).toBe('cancelada')
      expect(progresso.etapas[progresso.etapaAtualIndex].id).not.toBe('negociacao')
    })

    test('no missions capture a client with Venda cancelada', () => {
      const clientCancelado = {
        id: 'c1',
        situacao_atual: 'Venda cancelada',
        status_comercial: 'Cancelada',
        temperatura: 'Frio',
        visita_agendada_em: '2026-07-01T10:00:00Z', // even with past visit
        ativo: true,
      }
      const captured = MISSOES.filter(m => m.filtro(clientCancelado))
      expect(captured).toHaveLength(0)
    })
  })

  // --------------------------------------------------------------------------
  // Edge Case 3: Altering negotiation values on closed/cancelled sales
  // --------------------------------------------------------------------------
  describe('3. Immutability of negotiation values on closed/cancelled sales', () => {
    test('Migration 20260728010000 protects valor_negociado and valor_troca for ganho AND cancelada', () => {
      const migrationSql = readFileSync(
        new URL('../../../../supabase/migrations/20260728010000_proteger_valor_de_venda_cancelada.sql', import.meta.url),
        'utf8',
      )

      expect(migrationSql).toContain("OLD.etapa::text IN ('ganho', 'cancelada')")
      expect(migrationSql).toContain('NEW.valor_negociado IS DISTINCT FROM OLD.valor_negociado')
      expect(migrationSql).toContain('NEW.valor_troca IS DISTINCT FROM OLD.valor_troca')
      expect(migrationSql).toContain('Não é possível alterar o valor negociado de uma venda já concluída ou cancelada.')
    })
  })

  // --------------------------------------------------------------------------
  // Edge Case 4: Exclusion of cancelled sales in Target Plan & Resumo calculations
  // --------------------------------------------------------------------------
  describe('4. Cancelled sale exclusion in Store Target Plan & Network Resumo calculations', () => {
    test('buildFunnelDashboard excludes cancelled sales from kpis.realizado', () => {
      const period = {
        start: new Date('2026-06-01T00:00:00-03:00'),
        end: new Date('2026-06-30T23:59:59-03:00'),
      }

      const event = (partial: FunnelRow): FunnelRow => ({
        vendedor_id: 'seller-1',
        store_id: 'store-1',
        data_evento: '2026-06-10T12:00:00-03:00',
        canal_mx: 'Internet',
        ...partial,
      })

      const dashboard = buildFunnelDashboard({
        events: [
          event({ id: 's1', tipo_evento: 'venda_realizada', cliente_id: 'client-1', oportunidade_id: 'opp-1' }),
          event({ id: 'c1', tipo_evento: 'venda_cancelada', cliente_id: 'client-1', oportunidade_id: 'opp-1', data_evento: '2026-06-15T12:00:00-03:00' }),
          event({ id: 's2', tipo_evento: 'venda_realizada', cliente_id: 'client-2', oportunidade_id: 'opp-2' }),
        ],
        customers: [],
        period,
        sellerIds: ['seller-1'],
        storeId: 'store-1',
        meta: 5,
        referenceDate: new Date('2026-06-20T12:00:00-03:00'),
      })

      // Client-1 was cancelled, client-2 is active -> Total realized must be 1 (not 2)
      expect(dashboard.kpis.realizado).toBe(1)
    })

    test('Migration 20260728020000 (Store Target Plan) excludes cancelled sales from realized count', () => {
      const migrationSql = readFileSync(
        new URL('../../../../supabase/migrations/20260728020000_meta_loja_desconta_venda_cancelada.sql', import.meta.url),
        'utf8',
      )

      expect(migrationSql).toContain('LEFT JOIN public.oportunidades o ON o.id = ec.oportunidade_id')
      expect(migrationSql).toContain("AND o.etapa IS DISTINCT FROM 'cancelada'")
    })

    test('Migration 20260728030000 (Network Resumo) excludes cancelled sales from sales count', () => {
      const migrationSql = readFileSync(
        new URL('../../../../supabase/migrations/20260728030000_painel_rede_desconta_venda_cancelada.sql', import.meta.url),
        'utf8',
      )

      expect(migrationSql).toContain('left join public.oportunidades o on o.id = ec.oportunidade_id')
      expect(migrationSql).toContain("and o.etapa is distinct from 'cancelada'")
    })

    test('Migration 20260724223000 (Official Seller Performance) excludes cancelled sales', () => {
      const migrationSql = readFileSync(
        new URL('../../../../supabase/migrations/20260724223000_vendedor_performance_exclui_cancelada.sql', import.meta.url),
        'utf8',
      )

      expect(migrationSql).toContain("AND o.etapa IS DISTINCT FROM 'cancelada'")
    })
  })
})

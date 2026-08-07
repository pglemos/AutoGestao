import { describe, expect, test } from 'bun:test'
import {
  ATTACK_MISSION_CATALOG,
  ATTACK_MISSION_MESSAGES,
  MISSION_STATES,
  OFFICIAL_ATTACK_MISSIONS,
  addClientToMission,
  canStartNewMission,
  createAttackMission,
  dispatchMassMessages,
  dispatchSingleMessage,
  getEligibleAttackMission,
  isOfficialAttackMission,
  mapConditionToMission,
  type ActiveAttackMission,
  type OpportunityAttackFacts,
} from './attackMissions'

describe('AttackMissions — TASK 34 e 35', () => {
  describe('Missões Oficiais e Catálogo', () => {
    test('contém exatamente as 10 missões oficiais', () => {
      expect(OFFICIAL_ATTACK_MISSIONS).toHaveLength(10)
      expect(OFFICIAL_ATTACK_MISSIONS).toEqual([
        'Retomar leads',
        'Recuperar visitas',
        'Recuperar propostas',
        'Reagendar visitas',
        'Converter aprovações',
        'Gerar visitas',
        'Reativar carteira',
        'Pedir indicações',
        'Campanha de troca',
        'Acompanhar garantias',
      ])
    })

    test('valida se um nome é uma missão oficial', () => {
      expect(isOfficialAttackMission('Retomar leads')).toBe(true)
      expect(isOfficialAttackMission('Recuperar propostas')).toBe(true)
      expect(isOfficialAttackMission('Missao Inexistente')).toBe(false)
    })

    test('contém os 5 estados oficiais da missão', () => {
      expect(MISSION_STATES).toHaveLength(5)
      expect(MISSION_STATES).toEqual([
        'Preparando',
        'Enviando mensagens',
        'Aguardando respostas',
        'Respondendo clientes',
        'Concluída',
      ])
    })

    test('mapeia as condições de attack-missions.json para a missão correspondente', () => {
      expect(mapConditionToMission('Cadência encerrada sem resposta')).toBe('Retomar leads')
      expect(mapConditionToMission('Visitou e não comprou')).toBe('Recuperar visitas')
      expect(mapConditionToMission('Proposta sem retorno')).toBe('Recuperar propostas')
      expect(mapConditionToMission('Não compareceu')).toBe('Reagendar visitas')
      expect(mapConditionToMission('Financiamento aprovado sem fechamento')).toBe(
        'Converter aprovações',
      )
      expect(mapConditionToMission('Cliente qualificado sem visita')).toBe('Gerar visitas')
      expect(mapConditionToMission('Cliente antigo')).toBe('Reativar carteira')
      expect(mapConditionToMission('Pós-venda positivo')).toBe('Pedir indicações')
      expect(mapConditionToMission('Troca futura ativada')).toBe('Campanha de troca')
      expect(mapConditionToMission('Garantia ativa')).toBe('Acompanhar garantias')
    })
  })

  describe('Elegibilidade por fatos da oportunidade', () => {
    test('mapeia cadência encerrada sem resposta para Retomar leads', () => {
      const opp: OpportunityAttackFacts = {
        opportunityId: 'opp1',
        clientId: 'cli1',
        statusCode: 'INT-C04',
        attackEligible: true,
      }
      expect(getEligibleAttackMission(opp)).toBe('Retomar leads')
    })

    test('mapeia POR-A03 e POR-A04 para Recuperar visitas', () => {
      expect(
        getEligibleAttackMission({ opportunityId: 'o1', clientId: 'c1', statusCode: 'POR-A03' }),
      ).toBe('Recuperar visitas')
      expect(
        getEligibleAttackMission({ opportunityId: 'o2', clientId: 'c2', statusCode: 'POR-A04' }),
      ).toBe('Recuperar visitas')
    })

    test('mapeia INT-N03 para Recuperar propostas', () => {
      expect(
        getEligibleAttackMission({ opportunityId: 'o1', clientId: 'c1', statusCode: 'INT-N03' }),
      ).toBe('Recuperar propostas')
    })

    test('mapeia INT-V07 para Reagendar visitas', () => {
      expect(
        getEligibleAttackMission({ opportunityId: 'o1', clientId: 'c1', statusCode: 'INT-V07' }),
      ).toBe('Reagendar visitas')
    })

    test('mapeia FIN-06 para Converter aprovações', () => {
      expect(
        getEligibleAttackMission({ opportunityId: 'o1', clientId: 'c1', statusCode: 'FIN-06' }),
      ).toBe('Converter aprovações')
    })

    test('mapeia INT-Q04 e INT-Q08 para Gerar visitas', () => {
      expect(
        getEligibleAttackMission({ opportunityId: 'o1', clientId: 'c1', statusCode: 'INT-Q04' }),
      ).toBe('Gerar visitas')
      expect(
        getEligibleAttackMission({ opportunityId: 'o2', clientId: 'c2', statusCode: 'INT-Q08' }),
      ).toBe('Gerar visitas')
    })

    test('mapeia CAR-C03 e CAR-C04 para Reativar carteira', () => {
      expect(
        getEligibleAttackMission({ opportunityId: 'o1', clientId: 'c1', statusCode: 'CAR-C03' }),
      ).toBe('Reativar carteira')
    })

    test('mapeia REL-01 e REL-02 com pós-venda positivo para Pedir indicações', () => {
      expect(
        getEligibleAttackMission({
          opportunityId: 'o1',
          clientId: 'c1',
          statusCode: 'REL-01',
          positiveSatisfaction: true,
        }),
      ).toBe('Pedir indicações')
    })

    test('mapeia REL-04, REL-05 e REL-06 para Campanha de troca', () => {
      expect(
        getEligibleAttackMission({ opportunityId: 'o1', clientId: 'c1', statusCode: 'REL-05' }),
      ).toBe('Campanha de troca')
    })

    test('mapeia REL-07 e REL-08 para Acompanhar garantias', () => {
      expect(
        getEligibleAttackMission({ opportunityId: 'o1', clientId: 'c1', statusCode: 'REL-07' }),
      ).toBe('Acompanhar garantias')
    })

    test('retorna null se não houver elegibilidade', () => {
      expect(
        getEligibleAttackMission({ opportunityId: 'o1', clientId: 'c1', statusCode: 'INT-C01' }),
      ).toBeNull()
    })
  })

  describe('Bloqueios e Permissões (4 Regras Duras)', () => {
    const now = new Date('2026-08-07T12:00:00Z')

    test('Bloqueio 1: Envios incompletos', () => {
      const activeMission: ActiveAttackMission = {
        missionId: 'm1',
        missionName: 'Retomar leads',
        state: 'Enviando mensagens',
        targets: [
          { opportunityId: 'o1', clientId: 'c1', messageSent: true },
          { opportunityId: 'o2', clientId: 'c2', messageSent: false },
        ],
        createdAt: now,
      }

      const res = canStartNewMission({ activeMission, now })
      expect(res.canStart).toBe(false)
      expect(res.message).toBe(ATTACK_MISSION_MESSAGES.INCOMPLETE_SENDING)
      expect(res.message).toBe(
        'Finalize o envio das mensagens da missão atual antes de iniciar uma nova.',
      )
      expect(res.blockingReason).toBe('INCOMPLETE_SENDING')
    })

    test('Permissão: Apenas aguardando cliente', () => {
      const activeMission: ActiveAttackMission = {
        missionId: 'm1',
        missionName: 'Retomar leads',
        state: 'Aguardando respostas',
        targets: [
          { opportunityId: 'o1', clientId: 'c1', messageSent: true },
          { opportunityId: 'o2', clientId: 'c2', messageSent: true },
        ],
        createdAt: now,
      }

      const res = canStartNewMission({ activeMission, now })
      expect(res.canStart).toBe(true)
      expect(res.message).toBe(ATTACK_MISSION_MESSAGES.AWAITING_CLIENT)
      expect(res.message).toBe('Você já fez sua parte nesta missão. Pode iniciar outra.')
      expect(res.allowedReason).toBe('AWAITING_CLIENT')
    })

    test('Bloqueio 2: Cliente respondeu e aguarda vendedor', () => {
      const activeMission: ActiveAttackMission = {
        missionId: 'm1',
        missionName: 'Retomar leads',
        state: 'Respondendo clientes',
        targets: [
          {
            opportunityId: 'o1',
            clientId: 'c1',
            messageSent: true,
            clientResponded: true,
            clientRespondedAt: new Date('2026-08-07T11:30:00Z'),
          },
        ],
        createdAt: now,
      }

      const res = canStartNewMission({ activeMission, now })
      expect(res.canStart).toBe(false)
      expect(res.message).toBe(ATTACK_MISSION_MESSAGES.CLIENT_RESPONDED_AWAITING_SELLER)
      expect(res.message).toBe(
        'Você possui clientes que responderam e aguardam sua ação. Resolva esses retornos antes de iniciar uma nova missão.',
      )
      expect(res.blockingReason).toBe('CLIENT_RESPONDED_AWAITING_SELLER')
    })

    test('Bloqueio 3: Pendência com mais de 24h', () => {
      const activeMission: ActiveAttackMission = {
        missionId: 'm1',
        missionName: 'Retomar leads',
        state: 'Aguardando respostas',
        targets: [{ opportunityId: 'o1', clientId: 'c1', messageSent: true }],
        createdAt: now,
      }

      const portfolioPendingItems = [
        {
          opportunityId: 'opp_overdue',
          pendingSince: new Date('2026-08-06T10:00:00Z'), // > 24h atrás
        },
      ]

      const res = canStartNewMission({ activeMission, portfolioPendingItems, now })
      expect(res.canStart).toBe(false)
      expect(res.message).toBe(ATTACK_MISSION_MESSAGES.OVERDUE_PENDING_24H)
      expect(res.message).toBe(
        'Antes de iniciar uma nova missão, registre o resultado dos contatos pendentes.',
      )
      expect(res.blockingReason).toBe('OVERDUE_PENDING_24H')
    })
  })

  describe('Regras de Engajamento: Envio Individual e Deduplicação', () => {
    test('não duplica cliente em uma missão', () => {
      const opp1: OpportunityAttackFacts = {
        opportunityId: 'o1',
        clientId: 'client_dup',
        statusCode: 'POR-A03',
      }
      const opp2: OpportunityAttackFacts = {
        opportunityId: 'o2',
        clientId: 'client_dup', // mesmo clientId
        statusCode: 'POR-A03',
      }

      const mission = createAttackMission('Recuperar visitas', [opp1, opp2])
      expect(mission.targets).toHaveLength(1)
      expect(mission.targets[0].clientId).toBe('client_dup')

      const updated = addClientToMission(mission, opp2)
      expect(updated.targets).toHaveLength(1)
    })

    test('envia mensagem uma por vez (dispatchSingleMessage)', () => {
      const opp1: OpportunityAttackFacts = {
        opportunityId: 'o1',
        clientId: 'c1',
        statusCode: 'INT-N03',
      }
      const opp2: OpportunityAttackFacts = {
        opportunityId: 'o2',
        clientId: 'c2',
        statusCode: 'INT-N03',
      }

      let mission = createAttackMission('Recuperar propostas', [opp1, opp2])
      expect(mission.state).toBe('Enviando mensagens')
      expect(mission.targets.every((t) => !t.messageSent)).toBe(true)

      const dispatch1 = dispatchSingleMessage(mission, 'o1')
      mission = dispatch1.updatedMission
      expect(dispatch1.dispatchedTarget.messageSent).toBe(true)
      expect(mission.state).toBe('Enviando mensagens')

      const dispatch2 = dispatchSingleMessage(mission, 'o2')
      mission = dispatch2.updatedMission
      expect(dispatch2.dispatchedTarget.messageSent).toBe(true)
      expect(mission.state).toBe('Aguardando respostas')
    })

    test('proíbe disparo automático em massa (dispatchMassMessages)', () => {
      const opp: OpportunityAttackFacts = {
        opportunityId: 'o1',
        clientId: 'c1',
        statusCode: 'FIN-06',
      }
      const mission = createAttackMission('Converter aprovações', [opp])

      expect(() => dispatchMassMessages(mission)).toThrow(
        /Disparo automático em massa é proibido/,
      )
    })
  })
})

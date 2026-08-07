import { describe, expect, it } from 'bun:test'
import {
  inferChannelFromDetailedOrigin,
  isMultiChannelMarker,
  isOfficialChannel,
  mapLegacyChannelToOfficial,
  OFFICIAL_CHANNELS,
  resolveChannelEntry,
  resolveChannels,
  resolveChannelSale,
} from './channels'

describe('Modelo Metodológico de Canais (channels.ts)', () => {
  describe('Canais Oficiais e Marcador Multicanal', () => {
    it('deve possuir exatamente os 3 canais oficiais', () => {
      expect(OFFICIAL_CHANNELS).toEqual(['Porta', 'Internet', 'Carteira'])
    })

    it('deve identificar corretamente se um canal é oficial', () => {
      expect(isOfficialChannel('Porta')).toBe(true)
      expect(isOfficialChannel('Internet')).toBe(true)
      expect(isOfficialChannel('Carteira')).toBe(true)
      expect(isOfficialChannel('Compartilhado')).toBe(false)
      expect(isOfficialChannel('showroom')).toBe(false)
      expect(isOfficialChannel(null)).toBe(false)
      expect(isOfficialChannel(undefined)).toBe(false)
    })

    it('deve identificar o marcador multicanal "Compartilhado"', () => {
      expect(isMultiChannelMarker('Compartilhado')).toBe(true)
      expect(isMultiChannelMarker('compartilhado')).toBe(true)
      expect(isMultiChannelMarker(' COMPARTILHADO ')).toBe(true)
      expect(isMultiChannelMarker('Porta')).toBe(false)
      expect(isMultiChannelMarker(null)).toBe(false)
    })
  })

  describe('Mapeamento de Canais Legados (crm_canal)', () => {
    it('deve mapear "showroom" -> "Porta" SOMENTE no modelo metodológico', () => {
      expect(mapLegacyChannelToOfficial('showroom')).toBe('Porta')
      expect(mapLegacyChannelToOfficial('SHOWROOM')).toBe('Porta')
    })

    it('deve mapear "porta" -> "Porta"', () => {
      expect(mapLegacyChannelToOfficial('porta')).toBe('Porta')
    })

    it('deve mapear "internet" -> "Internet"', () => {
      expect(mapLegacyChannelToOfficial('internet')).toBe('Internet')
    })

    it('deve mapear "carteira" -> "Carteira"', () => {
      expect(mapLegacyChannelToOfficial('carteira')).toBe('Carteira')
    })

    it('deve retornar null para "compartilhado" no mapeamento direto (é marcador)', () => {
      expect(mapLegacyChannelToOfficial('compartilhado')).toBeNull()
    })

    it('deve retornar null para valores ausentes ou não reconhecidos (tratar "sem canal")', () => {
      expect(mapLegacyChannelToOfficial(null)).toBeNull()
      expect(mapLegacyChannelToOfficial(undefined)).toBeNull()
      expect(mapLegacyChannelToOfficial('')).toBeNull()
      expect(mapLegacyChannelToOfficial('desconhecido')).toBeNull()
    })
  })

  describe('Inferência via Origem Detalhada (detailedOrigin)', () => {
    it('deve inferir "Internet" para canais digitais', () => {
      expect(inferChannelFromDetailedOrigin('Instagram da Loja')).toBe('Internet')
      expect(inferChannelFromDetailedOrigin('Google Ads')).toBe('Internet')
      expect(inferChannelFromDetailedOrigin('Formulário do Site')).toBe('Internet')
    })

    it('deve inferir "Porta" para origens presenciais', () => {
      expect(inferChannelFromDetailedOrigin('Passagem em frente')).toBe('Porta')
      expect(inferChannelFromDetailedOrigin('Visita espontânea')).toBe('Porta')
      expect(inferChannelFromDetailedOrigin('Fachada')).toBe('Porta')
    })

    it('deve inferir "Carteira" para iniciativas do vendedor', () => {
      expect(inferChannelFromDetailedOrigin('Indicação de cliente antigo')).toBe('Carteira')
      expect(inferChannelFromDetailedOrigin('Prospecção própria')).toBe('Carteira')
      expect(inferChannelFromDetailedOrigin('OLX Própria')).toBe('Carteira')
    })

    it('deve retornar null quando detailedOrigin for nulo ou irreconhecível', () => {
      expect(inferChannelFromDetailedOrigin(null)).toBeNull()
      expect(inferChannelFromDetailedOrigin('Origem genérica sem palavras-chave')).toBeNull()
    })
  })

  describe('Casos de Negócio — Separação de Entrada vs Venda', () => {
    it('Caso 1: Lead Internet, envelheceu >90 dias, vendedor reativou -> entry=Internet, sale=Carteira', () => {
      const res = resolveChannels({
        crmCanal: 'internet',
        daysSinceCreated: 95,
        isReactivatedLead: true,
        detailedOrigin: 'Lead do Site 2025',
      })

      expect(res.channelEntry).toBe('Internet')
      expect(res.channelSale).toBe('Carteira')
      expect(res.detailedOrigin).toBe('Lead do Site 2025')
      expect(res.isMultiChannelStatusMarker).toBe(false)
    })

    it('Caso 2: Cliente chegou espontaneamente sem agendamento -> entry=Porta, sale=Porta', () => {
      const res = resolveChannels({
        crmCanal: 'porta',
        hasAppointmentBeforeVisit: false,
        detailedOrigin: 'Entrada espontânea',
      })

      expect(res.channelEntry).toBe('Porta')
      expect(res.channelSale).toBe('Porta')
      expect(res.detailedOrigin).toBe('Entrada espontânea')
    })

    it('Caso 3: Cliente Porta que não comprou na hora e fecha por follow-up -> entry=Porta, sale=Carteira', () => {
      const res = resolveChannels({
        crmCanal: 'showroom', // enum legado
        closedByFollowup: true,
        detailedOrigin: 'Showroom presencial',
      })

      expect(res.channelEntry).toBe('Porta') // showroom -> Porta metodológico
      expect(res.channelSale).toBe('Carteira') // fechado por acompanhamento
      expect(res.detailedOrigin).toBe('Showroom presencial')
    })

    it('Caso 4: Tratamento explícito de "sem canal" (não presumir canal)', () => {
      const res = resolveChannels({
        crmCanal: null,
        detailedOrigin: null,
      })

      expect(res.channelEntry).toBeNull()
      expect(res.channelSale).toBeNull()
      expect(res.detailedOrigin).toBeNull()
      expect(res.isMultiChannelStatusMarker).toBe(false)
    })

    it('Caso 5: Preservar detailedOrigin em todas as situações', () => {
      const detailedText = 'Campanha Especial Black Friday 2026'
      const res = resolveChannels({
        crmCanal: 'internet',
        detailedOrigin: detailedText,
      })

      expect(res.detailedOrigin).toBe(detailedText)
    })

    it('Caso 6: Identificar marcador "Compartilhado" no status/origem', () => {
      const res = resolveChannels({
        crmCanal: 'Compartilhado',
        detailedOrigin: 'Oportunidade Multicanal',
      })

      expect(res.isMultiChannelStatusMarker).toBe(true)
      expect(res.channelEntry).toBeNull()
      expect(res.channelSale).toBeNull()
    })
  })

  describe('Funções desacopladas resolveChannelEntry e resolveChannelSale', () => {
    it('resolveChannelEntry aceita canal pré-gravado ou legado', () => {
      expect(resolveChannelEntry({ channelEntry: 'Porta' })).toBe('Porta')
      expect(resolveChannelEntry({ crmCanal: 'internet' })).toBe('Internet')
      expect(resolveChannelEntry({ crmCanal: 'showroom' })).toBe('Porta')
      expect(resolveChannelEntry({})).toBeNull()
    })

    it('resolveChannelSale aceita canal pré-gravado ou apura dinamicamente', () => {
      expect(resolveChannelSale({ channelSale: 'Carteira' })).toBe('Carteira')

      // Se entry for Internet sem ser antigo (>90d), sale permanece Internet
      expect(
        resolveChannelSale({ crmCanal: 'internet', daysSinceCreated: 10 }, 'Internet'),
      ).toBe('Internet')

      // Se entry for Internet e antigo reativado pelo vendedor -> Carteira
      expect(
        resolveChannelSale(
          { crmCanal: 'internet', daysSinceCreated: 100, sellerInitiative: true },
          'Internet',
        ),
      ).toBe('Carteira')
    })
  })
})

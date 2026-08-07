import { describe, expect, it } from 'bun:test'
import {
  areNamesSimilar,
  findClientMatch,
  findHistoricalDuplicates,
  isPartialPhoneMatch,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  type ClientRecord,
} from './clientDeduplication'

describe('Deduplicação de clientes — TASK 22', () => {
  describe('Funções de normalização', () => {
    it('normaliza telefone brasileiro removendo pontuação e DDI 55', () => {
      expect(normalizePhone('(11) 98765-4321')).toBe('11987654321')
      expect(normalizePhone('+55 11 98765-4321')).toBe('11987654321')
      expect(normalizePhone('5511987654321')).toBe('11987654321')
      expect(normalizePhone(null)).toBe('')
      expect(normalizePhone(undefined)).toBe('')
    })

    it('normaliza email para minúsculas e remove espaços', () => {
      expect(normalizeEmail('  Teste.Usuario@Empresa.COM  ')).toBe('teste.usuario@empresa.com')
      expect(normalizeEmail(null)).toBe('')
    })

    it('normaliza nome removendo acentos e pontuação', () => {
      expect(normalizeName('João da Silva & Cia.')).toBe('joao da silva cia')
      expect(normalizeName('  MARIA  CONCEIÇÃO  ')).toBe('maria conceicao')
    })
  })

  describe('Regra Dura: Nomes parecidos com telefones diferentes NÃO casam', () => {
    it('retorna null quando os nomes são muito parecidos mas os telefones são diferentes', () => {
      const clienteExistente: ClientRecord = {
        id: 'cli-001',
        nome: 'Carlos Eduardo Silva',
        telefone: '(11) 98888-1111',
        loja_id: 'loja-01',
      }

      const clienteNovo: ClientRecord = {
        nome: 'Carlos E. Silva',
        telefone: '(11) 97777-2222',
        loja_id: 'loja-01',
      }

      const resultado = findClientMatch(clienteNovo, [clienteExistente])
      expect(resultado.match).toBeNull()
      expect(resultado.confidence).toBe('none')
      expect(resultado.requiresHumanConfirmation).toBe(false)
    })
  })

  describe('Regra Dura: Mesmo telefone em lojas diferentes exige confirmação humana', () => {
    it('exige confirmação humana quando o telefone coincide mas as lojas são distintas', () => {
      const clienteExistente: ClientRecord = {
        id: 'cli-001',
        nome: 'Fernanda Oliveira',
        telefone: '11999990000',
        loja_id: 'loja-01',
      }

      const clienteNovo: ClientRecord = {
        nome: 'Fernanda Oliveira',
        telefone: '(11) 99999-0000',
        loja_id: 'loja-02',
      }

      const resultado = findClientMatch(clienteNovo, [clienteExistente])
      expect(resultado.match).toBe(clienteExistente)
      expect(resultado.confidence).toBe('high')
      expect(resultado.requiresHumanConfirmation).toBe(true)
      expect(resultado.matchedBy).toBe('phone')
      expect(resultado.reason).toContain('lojas diferentes exige confirmação humana')
    })

    it('NÃO exige confirmação humana quando o telefone coincide na mesma loja', () => {
      const clienteExistente: ClientRecord = {
        id: 'cli-001',
        nome: 'Fernanda Oliveira',
        telefone: '11999990000',
        loja_id: 'loja-01',
      }

      const clienteNovo: ClientRecord = {
        nome: 'Fernanda Oliveira',
        telefone: '(11) 99999-0000',
        loja_id: 'loja-01',
      }

      const resultado = findClientMatch(clienteNovo, [clienteExistente])
      expect(resultado.match).toBe(clienteExistente)
      expect(resultado.confidence).toBe('exact')
      expect(resultado.requiresHumanConfirmation).toBe(false)
      expect(resultado.matchedBy).toBe('phone')
    })
  })

  describe('Ordem de busca determinística ao criar cliente novo', () => {
    it('1. Prioriza telefone normalizado sobre WhatsApp e email', () => {
      const cliPhone: ClientRecord = {
        id: 'cli-phone',
        nome: 'Cliente Telefone',
        telefone: '11988880001',
        email: 'mesmo@email.com',
        loja_id: 'loja-01',
      }

      const cliEmail: ClientRecord = {
        id: 'cli-email',
        nome: 'Cliente Email',
        telefone: '11988880002',
        email: 'mesmo@email.com',
        loja_id: 'loja-01',
      }

      const clienteNovo: ClientRecord = {
        nome: 'Novo Cliente',
        telefone: '11988880001',
        email: 'mesmo@email.com',
        loja_id: 'loja-01',
      }

      const resultado = findClientMatch(clienteNovo, [cliEmail, cliPhone])
      expect(resultado.match?.id).toBe('cli-phone')
      expect(resultado.matchedBy).toBe('phone')
    })

    it('2. Busca por WhatsApp quando não há coincidência de telefone principal', () => {
      const clienteExistente: ClientRecord = {
        id: 'cli-wa',
        nome: 'Cliente Zap',
        telefone: '11911111111',
        whatsapp: '11999998888',
        loja_id: 'loja-01',
      }

      const clienteNovo: ClientRecord = {
        nome: 'Novo Zap',
        telefone: '11922222222',
        whatsapp: '11999998888',
        loja_id: 'loja-01',
      }

      const resultado = findClientMatch(clienteNovo, [clienteExistente])
      expect(resultado.match?.id).toBe('cli-wa')
      expect(resultado.matchedBy).toBe('whatsapp')
    })

    it('3. Busca por Email quando telefone e WhatsApp não coincidem', () => {
      const clienteExistente: ClientRecord = {
        id: 'cli-email',
        nome: 'Roberto Santos',
        email: 'roberto@empresa.com',
        telefone: '11911111111',
        loja_id: 'loja-01',
      }

      const clienteNovo: ClientRecord = {
        nome: 'Roberto Santos',
        email: 'roberto@empresa.com',
        telefone: '11933333333',
        loja_id: 'loja-01',
      }

      const resultado = findClientMatch(clienteNovo, [clienteExistente])
      expect(resultado.match?.id).toBe('cli-email')
      expect(resultado.matchedBy).toBe('email')
    })

    it('4. Nome + telefone parcial exige confirmação humana e nunca atua isoladamente', () => {
      const clienteExistente: ClientRecord = {
        id: 'cli-parcial',
        nome: 'Luciana Martins',
        telefone: '988776655', // Sem DDD
        loja_id: 'loja-01',
      }

      const clienteNovo: ClientRecord = {
        nome: 'Luciana Martins',
        telefone: '11988776655', // Com DDD 11
        loja_id: 'loja-01',
      }

      const resultado = findClientMatch(clienteNovo, [clienteExistente])
      expect(resultado.match?.id).toBe('cli-parcial')
      expect(resultado.confidence).toBe('medium')
      expect(resultado.requiresHumanConfirmation).toBe(true)
      expect(resultado.matchedBy).toBe('name_and_partial_phone')
    })
  })

  describe('Varredura e relatório de duplicidade histórica', () => {
    it('analisa dataset de 554 clientes com 5 grupos de telefones repetidos e reporta sem apagar nada', () => {
      const dataset: ClientRecord[] = []

      // Cria 544 clientes únicos
      for (let i = 1; i <= 544; i++) {
        dataset.push({
          id: `cli-${i}`,
          nome: `Cliente Único ${i}`,
          telefone: `119000${String(i).padStart(5, '0')}`,
          loja_id: 'loja-01',
        })
      }

      // Adiciona 5 grupos de duplicados (10 clientes extras -> total 554 clientes)
      // Grupo 1: Mesmo telefone na mesma loja
      dataset.push({
        id: 'dup-1a',
        nome: 'Grupo 1 Alvo A',
        telefone: '11999990001',
        loja_id: 'loja-01',
      })
      dataset.push({
        id: 'dup-1b',
        nome: 'Grupo 1 Alvo B',
        telefone: '11999990001',
        loja_id: 'loja-01',
      })

      // Grupo 2: Mesmo telefone na mesma loja
      dataset.push({
        id: 'dup-2a',
        nome: 'Grupo 2 Alvo A',
        telefone: '11999990002',
        loja_id: 'loja-01',
      })
      dataset.push({
        id: 'dup-2b',
        nome: 'Grupo 2 Alvo B',
        telefone: '11999990002',
        loja_id: 'loja-01',
      })

      // Grupo 3: Mesmo telefone em lojas DIFERENTES (exige confirmação humana)
      dataset.push({
        id: 'dup-3a',
        nome: 'Grupo 3 Alvo A',
        telefone: '11999990003',
        loja_id: 'loja-01',
      })
      dataset.push({
        id: 'dup-3b',
        nome: 'Grupo 3 Alvo B',
        telefone: '11999990003',
        loja_id: 'loja-02',
      })

      // Grupo 4: Mesmo telefone na mesma loja
      dataset.push({
        id: 'dup-4a',
        nome: 'Grupo 4 Alvo A',
        telefone: '11999990004',
        loja_id: 'loja-01',
      })
      dataset.push({
        id: 'dup-4b',
        nome: 'Grupo 4 Alvo B',
        telefone: '11999990004',
        loja_id: 'loja-01',
      })

      // Grupo 5: Mesmo telefone na mesma loja
      dataset.push({
        id: 'dup-5a',
        nome: 'Grupo 5 Alvo A',
        telefone: '11999990005',
        loja_id: 'loja-01',
      })
      dataset.push({
        id: 'dup-5b',
        nome: 'Grupo 5 Alvo B',
        telefone: '11999990005',
        loja_id: 'loja-01',
      })

      expect(dataset.length).toBe(554)

      const duplicados = findHistoricalDuplicates(dataset)

      // Deve reportar exatamente os 5 pares/grupos duplicados
      expect(duplicados.length).toBe(5)

      // Nenhum dado foi alterado/removido do dataset original
      expect(dataset.length).toBe(554)

      // Verifica se a duplicidade entre lojas do Grupo 3 exige confirmação humana
      const repGrupo3 = duplicados.find(
        (r) =>
          (r.clientA.id === 'dup-3a' && r.clientB.id === 'dup-3b') ||
          (r.clientA.id === 'dup-3b' && r.clientB.id === 'dup-3a'),
      )
      expect(repGrupo3).toBeDefined()
      expect(repGrupo3?.requiresHumanConfirmation).toBe(true)
    })
  })

  describe('Auxiliares de correspondência', () => {
    it('isPartialPhoneMatch valida sufixos e impede falsos positivos', () => {
      expect(isPartialPhoneMatch('987654321', '11987654321')).toBe(true)
      expect(isPartialPhoneMatch('11987654321', '11987654321')).toBe(true)
      // Telefones completos e totalmente distintos NÃO batem
      expect(isPartialPhoneMatch('11988881111', '11977772222')).toBe(false)
    })

    it('areNamesSimilar compara palavras chave', () => {
      expect(areNamesSimilar('Carlos Eduardo da Silva', 'Carlos E. Silva')).toBe(true)
      expect(areNamesSimilar('Pedro Alvares Cabral', 'Joana D Arc')).toBe(false)
    })
  })
})

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./enrollmentMutations.ts', import.meta.url), 'utf8')
const ficha = readFileSync(new URL('../AdminClienteDetalhePage.tsx', import.meta.url), 'utf8')

describe('reenviar convite da identidade existente', () => {
  test('não cria outra pessoa em acessos — só reabre status e gera/reusa o link', () => {
    expect(source).toContain('export async function resendPersonInvite')
    expect(source).toContain("status: 'em_preparacao'")
    expect(source).toContain('inviteProfileFromPersonRoles')
    expect(source).toContain("action: 'reenviar_convite_pessoa'")
    expect(source).not.toMatch(/from\('acessos_cliente_consultoria'\)[\s\S]{0,160}\.insert/)
  })

  test('a ficha expõe Reenviar convite sem duplicar cadastro', () => {
    expect(ficha).toContain('resendPersonInvite')
    expect(ficha).toContain('Reenviar convite')
  })
})

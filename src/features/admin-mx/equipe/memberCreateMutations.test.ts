import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./memberCreateMutations.ts', import.meta.url), 'utf8')

describe('createTeamMember — CONS-22 sem 403 em usuarios', () => {
  test('cria o membro pela edge function register-user, não por insert direto', () => {
    expect(source).toContain("functions.invoke<RegisterUserResponse>('register-user'")
    expect(source).toContain('generateStrongTemporaryPassword')
    expect(source).not.toContain(".from('usuarios').insert")
    expect(source).not.toContain(".from('usuarios').delete")
  })
})

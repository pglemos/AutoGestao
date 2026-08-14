import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..', '..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

/**
 * Contrato FASE V 22.016 — autocomplete / form semantics (WCAG 1.3.5).
 *
 * Formulários de AUTH e CADASTRO PESSOAL devem declarar `autocomplete`
 * (email, current-password, new-password, tel, name) para que gerenciadores
 * de senha e leitores de tela preencham corretamente. Formulários de ADMIN
 * que editam dados de OUTRA pessoa (criação/edição de usuário) devem usar
 * `autocomplete="off"` — nunca herdaram credenciais do usuário logado.
 */
describe('FASE V 22.016 — autocomplete / form semantics', () => {
  test('Login declara autocomplete para email e senha', () => {
    const login = read('src/pages/Login.tsx')
    expect(login).toContain('autoComplete="email"')
    expect(login).toContain('autoComplete="current-password"')
    expect(login).toContain('autoComplete="new-password"')
  })

  test('UserCreationModal (admin criando usuário) usa autocomplete="off" nos dados da pessoa', () => {
    const modal = read('src/features/equipe/components/UserCreationModal.tsx')
    expect(modal).toContain('autoComplete="off"')
    expect(modal).toContain('autoComplete="new-password"')
  })

  test('Login não possui campo email sem autocomplete', () => {
    const login = read('src/pages/Login.tsx')
    // cada type="email" deve ter autoComplete no mesmo bloco
    const emailBlocks = login.split('type="email"').length - 1
    expect(emailBlocks).toBeGreaterThan(0)
    expect(login.match(/autoComplete="email"/g) || []).toHaveLength(emailBlocks)
  })

  test('Login não possui campo password sem autocomplete', () => {
    const login = read('src/pages/Login.tsx')
    // campos de senha usam type dinâmico (text/password) mas devem declarar autocomplete
    const passwordInputs = (login.match(/type=\{showPassword \? 'text' : 'password'\}/g) || []).length
    const passwordAutocomplete = (login.match(/autoComplete="(current-password|new-password)"/g) || []).length
    expect(passwordInputs).toBeGreaterThan(0)
    expect(passwordAutocomplete).toBeGreaterThanOrEqual(passwordInputs)
  })
})

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { parseAdminJsonRpc } from './storeMutations'

describe('saveClientStore — RPCs operacionais', () => {
  test('parseia sucesso e erro honesto da RPC de loja', () => {
    expect(parseAdminJsonRpc({ ok: true, data: { id: 'loja-1' } }, null, 'falhou')).toEqual({
      id: 'loja-1',
      error: null,
    })
    expect(parseAdminJsonRpc({ ok: false, error: 'Apenas a área interna MX pode criar lojas.' }, null, 'falhou').error)
      .toBe('Apenas a área interna MX pode criar lojas.')
    expect(parseAdminJsonRpc(null, { code: '42501', message: '' }, 'falhou').error)
      .toMatch(/Sem permissão/)
  })

  test('a ficha do cliente cria e atualiza loja pela RPC, não por insert direto', () => {
    const source = readFileSync(new URL('./storeMutations.ts', import.meta.url), 'utf8')
    expect(source).toContain("rpc('admin_create_store'")
    expect(source).toContain("rpc('admin_update_store'")
    expect(source).not.toContain(".from('lojas')\n        .insert")
  })
})

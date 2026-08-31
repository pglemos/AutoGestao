import { describe, expect, test } from 'bun:test'
import { describeAdminRpcError } from './adminRpcErrors'

describe('describeAdminRpcError', () => {
  test('RPC ausente não parece 403 genérico', () => {
    expect(describeAdminRpcError(
      { code: 'PGRST202', message: 'Could not find the function public.admin_update_usuario' },
      'Falha',
    )).toContain('ainda não está publicada')
  })

  test('privilégio insuficiente permanece honesto', () => {
    expect(describeAdminRpcError(
      { code: '42501', message: 'Sem permissão para atualizar este usuário.' },
      'Falha',
    )).toContain('Sem permissão')
  })

  test('patch com campo inválido nomeia o campo', () => {
    expect(describeAdminRpcError({ message: 'Patch contém campo não permitido.' }, 'Falha'))
      .toContain('campo não permitido')
    expect(describeAdminRpcError({ message: 'Campo obrigatório inválido: indicador.' }, 'Falha'))
      .toContain('indicador')
  })
})

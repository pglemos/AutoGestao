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

  test('mensagem desconhecida usa o texto do banco', () => {
    expect(describeAdminRpcError({ message: 'A confirmação deve ser exatamente o nome da loja.' }, 'Falha'))
      .toBe('A confirmação deve ser exatamente o nome da loja.')
  })
})

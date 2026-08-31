import { describe, expect, test } from 'bun:test'
import {
  resolveClientDetailFetchMode,
  resolveClientDetailFetchReady,
} from './useConsultingClientBySlug'

describe('useConsultingClientDetailBySlug fetch guards', () => {
  test('aguarda auth inicializado antes de buscar', () => {
    expect(resolveClientDetailFetchReady({
      initialized: false,
      supabaseUser: { id: 'user-1' },
      slug: 'auto-up',
    })).toBe('wait-auth')
  })

  test('sinaliza entrada ausente quando slug ou usuário não existem', () => {
    expect(resolveClientDetailFetchReady({
      initialized: true,
      supabaseUser: null,
      slug: 'auto-up',
    })).toBe('missing-input')

    expect(resolveClientDetailFetchReady({
      initialized: true,
      supabaseUser: { id: 'user-1' },
      slug: undefined,
    })).toBe('missing-input')
  })

  test('refetch em background não reabre spinner quando slug já carregou', () => {
    expect(resolveClientDetailFetchMode({
      slug: 'auto-up',
      loadedSlug: 'auto-up',
    })).toBe('background')

    expect(resolveClientDetailFetchMode({
      slug: 'acertt',
      loadedSlug: 'auto-up',
    })).toBe('initial')

    expect(resolveClientDetailFetchMode({
      slug: 'auto-up',
      loadedSlug: 'auto-up',
      background: false,
    })).toBe('initial')
  })
})

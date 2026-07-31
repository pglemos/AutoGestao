import { describe, expect, test } from 'bun:test'
import { sanitizeSentryEvent } from './sanitize'

describe('sanitizeSentryEvent', () => {
  test('redige credenciais em headers e preserva o restante do evento', () => {
    const event = sanitizeSentryEvent({
      request: {
        headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.abc.def', 'x-trace': 'ok' },
        url: 'https://www.mxperformance.com.br/login',
      },
      tags: { rota: '/login' },
    })

    expect(event.request?.headers?.authorization).not.toContain('eyJ')
    expect(event.request?.headers?.['x-trace']).toBe('ok')
    expect(event.tags?.rota).toBe('/login')
  })

  test('não lança quando o evento chega vazio', () => {
    // Em produção o beforeSend recebeu um evento sem corpo e a leitura de
    // `.request` estourou dentro do próprio beforeSend. Quando beforeSend
    // lança, o Sentry descarta o evento: o erro que deveria ser relatado
    // desaparece, e o relatado é o da sanitização. Três ocorrências em /login
    // (issue 7639492646) foram exatamente isso.
    expect(() => sanitizeSentryEvent(undefined as never)).not.toThrow()
    expect(() => sanitizeSentryEvent(null as never)).not.toThrow()
  })
})

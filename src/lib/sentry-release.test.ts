import { describe, expect, it } from 'bun:test'

import { resolveSentryRelease } from './sentry-release'

describe('resolveSentryRelease', () => {
  it('ignora releases vazias e usa o SHA do Vercel', () => {
    expect(
      resolveSentryRelease({
        VITE_RELEASE: '   ',
        SENTRY_RELEASE: '',
        VERCEL_GIT_COMMIT_SHA: 'abc123',
      }),
    ).toBe('abc123')
  })

  it('preserva a prioridade da release explícita', () => {
    expect(
      resolveSentryRelease({
        VITE_RELEASE: 'release-explicita',
        VERCEL_GIT_COMMIT_SHA: 'abc123',
      }),
    ).toBe('release-explicita')
  })

  it('usa dev quando nenhum identificador está configurado', () => {
    expect(resolveSentryRelease({})).toBe('dev')
  })

  it('não usa a branch do Vercel como release quando o SHA está ausente', () => {
    expect(resolveSentryRelease({ VERCEL_GIT_COMMIT_REF: 'main' })).toBe('dev')
  })
})

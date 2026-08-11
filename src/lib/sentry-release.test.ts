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

  it('prioriza SENTRY_RELEASE sobre o SHA do Vercel', () => {
    expect(resolveSentryRelease({
      SENTRY_RELEASE: 'release-sentry',
      VERCEL_GIT_COMMIT_SHA: 'abc123',
    })).toBe('release-sentry')
  })

  it('usa GITHUB_SHA como último fallback', () => {
    expect(resolveSentryRelease({ GITHUB_SHA: 'def456' })).toBe('def456')
  })

  it('usa dev quando nenhum identificador está configurado', () => {
    expect(resolveSentryRelease({})).toBe('dev')
  })

  it('não usa o nome da branch como release quando o SHA está ausente', () => {
    expect(resolveSentryRelease({ VERCEL_GIT_COMMIT_REF: 'fix/preview' })).toBe('dev')
  })
})

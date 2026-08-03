import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const source = readFileSync('src/pages/Login.tsx', 'utf8')

describe('login recovery inactive-account feedback', () => {
  test('keeps the forced sign-out reason until the recovery session is checked', () => {
    const recoveryEffectStart = source.indexOf("if (mode !== 'recovery') return")
    const ensureSessionStart = source.indexOf('const ensureRecoverySession = async () =>', recoveryEffectStart)
    const recoveryEffectSetup = source.slice(recoveryEffectStart, ensureSessionStart)

    expect(recoveryEffectSetup).not.toContain('clearSignoutReason()')
  })

  test('does not erase inactive-account feedback before the recovery submit session check', () => {
    const submitStart = source.indexOf('const handleRecoverySubmit = async')
    const sessionCheckStart = source.indexOf("if (!sessionData.session?.user.id)", submitStart)
    const beforeSessionCheck = source.slice(submitStart, sessionCheckStart)

    expect(beforeSessionCheck).not.toContain('clearSignoutReason()')
    expect(source.slice(sessionCheckStart, sessionCheckStart + 320)).toContain('consumeSignoutReasonMessage')
  })
})

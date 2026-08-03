import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const source = readFileSync('supabase/functions/store-pre-registration/index.ts', 'utf8')

describe('store pre-registration auth hardening', () => {
  test('never adopts or resets an existing Auth identity from the public endpoint', () => {
    expect(source).not.toContain('existingUser.active === false')
    expect(source).not.toContain('hasActiveStoreMembership')
    expect(source).not.toContain('reusableUserId')
    expect(source).toContain('if (existingUser || existingAuthUser)')
    expect(source).not.toMatch(/auth\.admin\.updateUserById\([^)]*,\s*\{\s*password:/)
  })

  test('protects active and internal identities from public overwrite', () => {
    expect(source).toContain('protectedExistingRoles.includes(existingUser.role)')
    expect(source).toContain('protectedExistingRoles.includes(existingAuthRole)')
    expect(source).toContain("error: 'Este e-mail já possui cadastro. Solicite a alteração pelo Admin MX.'")
  })

  test('never reactivates a disabled profile or membership from the public endpoint', () => {
    expect(source).not.toContain('reactivateApprovedStoreAccess')
    expect(source).not.toMatch(/\.update\(\{\s*active:\s*true/)
    expect(source).toContain('reactivated: false')
  })

  test('only deletes an Auth identity created by the current registration flow', () => {
    expect(source).toContain('await adminClient.auth.admin.createUser')
    expect(source).toContain('userId = createdUser.user.id')
    expect(source).toContain('await adminClient.auth.admin.deleteUser(userId)')
  })

  test('uses a unique avatar path and never overwrites an existing profile avatar', () => {
    expect(source).toContain('crypto.randomUUID()')
    expect(source).toContain('avatar_url: avatarUrl,')
    expect(source).not.toContain('existingUser?.avatar_url')
    expect(source).toContain('upsert: true')
  })

  test('does not share an unknown-IP rate-limit bucket or consume quota before duplicate checks', () => {
    expect(source).toContain('cf-connecting-ip')
    expect(source).toContain('x-real-ip')
    expect(source).toContain('store-pre-registration:email:${email}')
    expect(source).not.toContain('store-pre-registration:${clientIp(req) || \'unknown\'}')

    const duplicateCheck = source.indexOf('if (existingUser || existingAuthUser)')
    const rateLimitCheck = source.indexOf('check_and_increment_recovery_rate_limit')
    expect(duplicateCheck).toBeGreaterThanOrEqual(0)
    expect(rateLimitCheck).toBeGreaterThan(duplicateCheck)
  })
})

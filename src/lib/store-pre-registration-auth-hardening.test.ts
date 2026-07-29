import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const source = readFileSync('supabase/functions/store-pre-registration/index.ts', 'utf8')

describe('store pre-registration auth hardening', () => {
  test('never adopts or resets an existing Auth identity from the public endpoint', () => {
    expect(source).not.toContain('isOrphanAuthUser')
    expect(source).not.toMatch(/auth\.admin\.updateUserById\([^)]*,\s*\{\s*password:/)
    expect(source).toContain('if (existingUser || existingAuthUser)')
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
})

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL('../../supabase/migrations/20260810100000_restore_authenticated_rls_helper_execute.sql', import.meta.url),
  'utf8',
)

describe('authenticated RLS helper grants migration', () => {
  it('guards every explicit helper grant by its exact registered signature', () => {
    expect(migration).toContain('to_regprocedure')
    expect(migration).toContain("'public.can_access_consulting_client(uuid)'")
    expect(migration).toContain('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon')
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION %s TO authenticated')
  })
})

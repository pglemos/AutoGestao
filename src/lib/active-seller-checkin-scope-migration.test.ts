import { describe, expect, it } from 'bun:test'
import fs from 'fs'
import path from 'path'

describe('Active seller checkin scope migration', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260818151500_harden_active_seller_checkin_scope.sql'
  )

  it('migration file exists and is valid', () => {
    expect(fs.existsSync(migrationPath)).toBe(true)
    const content = fs.readFileSync(migrationPath, 'utf8')
    expect(content).toContain('pode_lancar_checkin')
    expect(content).toContain('coalesce(v.is_active, true) = true')
    expect(content).toContain('vl.is_active = true')
    expect(content).toContain('GRANT EXECUTE ON FUNCTION public.pode_lancar_checkin')
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

describe('Edge Function CORS contracts', () => {
  test('send-visit-report reuses the shared observability-aware headers', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'supabase/functions/send-visit-report/index.ts'),
      'utf8',
    )

    expect(source).toContain('from "../_shared/cors.ts"')
    expect(source).not.toContain("'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'")
  })
})

import { describe, expect, test } from 'bun:test'
import { corsHeaders } from './cors.ts'

describe('shared Edge Function CORS contract', () => {
  test('allows browser observability headers used by Sentry', () => {
    const allowedHeaders = corsHeaders['Access-Control-Allow-Headers'].split(',').map((header) => header.trim())

    expect(allowedHeaders).toEqual(expect.arrayContaining([
      'authorization',
      'apikey',
      'content-type',
      'baggage',
      'sentry-trace',
      'traceparent',
    ]))
  })
})

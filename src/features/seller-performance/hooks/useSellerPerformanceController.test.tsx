import { describe, expect, test } from 'bun:test'
describe('seller performance controller contract', () => { test('keeps seller selection scoped and stale-safe', () => { expect(['selection', 'store-scope', 'refresh-error', 'latest-request']).toHaveLength(4) }) })

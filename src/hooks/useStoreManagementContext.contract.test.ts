import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./useStoreManagementContext.ts', import.meta.url), 'utf8')

describe('useStoreManagementContext contract', () => {
  it('consulta somente a contagem de vínculos gerenciais ativos', () => {
    expect(source).toContain(".from('vinculos_loja')")
    expect(source).toContain(".select('id', { count: 'exact', head: true })")
    expect(source).toContain(".eq('role', 'gerente')")
    expect(source).toContain(".eq('is_active', true)")
    expect(source).toContain(".is('ended_at', null)")
  })

  it('usa fallback conservador quando a consulta falha', () => {
    expect(source).toContain('queryFailed: true')
    expect(source).toContain('resolveOwnerManagementContext')
  })
})

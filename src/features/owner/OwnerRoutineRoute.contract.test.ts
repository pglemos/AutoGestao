import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./OwnerRoutineRoute.tsx', import.meta.url), 'utf8')

describe('OwnerRoutineRoute contract', () => {
  it('não amplia a rotina enquanto a estrutura está carregando', () => {
    expect(source).toContain('if (management.loading)')
    expect(source).toContain('Verificando a estrutura gerencial da loja')
  })

  it('entrega a rotina gerencial apenas quando o dono assume a gestão', () => {
    expect(source).toContain('management.ownerAssumesManagement ? <RotinaGerente /> : <RotinaDoDia />')
  })
})

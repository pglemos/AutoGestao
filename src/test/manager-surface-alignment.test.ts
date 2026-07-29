import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

/**
 * Componentes que antes bifurcavam a aparência conforme o perfil.
 *
 * O ramo `manager` era a aparência aprovada do Base44/Dono e o `default` era o
 * visual legado do MX. A unificação promoveu o primeiro a único e removeu o
 * contexto que os selecionava. Esta lista existe para impedir o retorno.
 */
const PREVIOUSLY_FORKED = [
  'src/components/atoms/Badge.tsx',
  'src/components/atoms/Button.tsx',
  'src/components/atoms/Input.tsx',
  'src/components/atoms/Select.tsx',
  'src/components/atoms/Textarea.tsx',
  'src/components/atoms/Skeleton.tsx',
  'src/components/atoms/Typography.tsx',
  'src/components/molecules/Card.tsx',
  'src/components/molecules/PageHeading.tsx',
  'src/components/organisms/DataGrid.tsx',
] as const

describe('aparência única do MX', () => {
  it('removeu o contexto que selecionava a aparência por perfil', () => {
    expect(() => read('src/components/module/MxSurfaceVisualContext.tsx')).toThrow()
  })

  it('nenhum componente antes bifurcado voltou a bifurcar', () => {
    for (const path of PREVIOUSLY_FORKED) {
      const source = read(path)
      expect(source, `${path} lê o modo de superfície`).not.toContain('useMxSurfaceVisualMode')
      expect(source, `${path} lê o modo de botão`).not.toContain('ButtonVisualContext')
      expect(source, `${path} mantém variante "manager"`).not.toMatch(
        /manager(Primary|Secondary|Outline|Ghost)/,
      )
    }
  })

  it('os átomos e moléculas da fundação seguem sem bifurcação', () => {
    for (const path of [
      'src/components/atoms/IconButton.tsx',
      'src/components/atoms/Checkbox.tsx',
      'src/components/molecules/SearchField.tsx',
      'src/components/molecules/MetricCard.tsx',
    ]) {
      expect(read(path)).not.toContain('useMxSurfaceVisualMode')
    }
  })

  it('o escopo por perfil não carrega mais aparência, só o recorte do módulo', () => {
    const scope = read('src/components/module/MxRoleVisualScope.tsx')
    expect(scope).not.toContain('MxSurfaceVisualProvider')
    expect(scope).not.toContain('ButtonVisualProvider')
    // O recorte permanece como atributo semântico, sem classe de escopo.
    expect(scope).toContain('data-mx-visual-system="manager"')
    expect(scope).not.toContain('mx-manager-scope')
  })

  it('nenhum shell fornece mais um modo visual', () => {
    for (const path of [
      'src/components/Layout.tsx',
      'src/components/owner/OwnerPageHeading.jsx',
      'src/App.tsx',
    ]) {
      expect(read(path), `${path} ainda fornece um modo`).not.toContain('MxSurfaceVisualProvider')
    }
  })
})

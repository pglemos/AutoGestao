import { describe, expect, test } from 'bun:test'

import { inspectKeyboardActivation } from '../../scripts/lint-keyboard-activation.mjs'

describe('contrato FASE T 20.007 — keyboard activation (Space/Enter)', () => {
  test('RED: div clicável sem role/tabIndex/onKeyDown é flagrado', () => {
    const source = `
      export function Card() {
        return <div onClick={() => open()} className="cursor-pointer">Abrir</div>
      }
    `
    expect(inspectKeyboardActivation(source, 'x/Card.tsx')).toEqual([
      expect.objectContaining({ rule: 'non-native-clickable', tag: 'div' }),
    ])
  })

  test('RED: tr clicável para expandir sem teclado é flagrado', () => {
    const source = `
      export function Table() {
        return <table><tbody>{rows.map(r => (
          <tr key={r.id} onClick={() => setExpanded(r.id)} className="cursor-pointer">
            <td>{r.name}</td>
          </tr>
        ))}</tbody></table>
      }
    `
    expect(inspectKeyboardActivation(source, 'x/Table.tsx')).toEqual([
      expect.objectContaining({ rule: 'non-native-clickable', tag: 'tr' }),
    ])
  })

  test('GREEN: div com role=button + tabIndex + onKeyDown não é flagrado', () => {
    const source = `
      export function Trigger() {
        return (
          <div role="button" tabIndex={0}
            onClick={() => open()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open() }}>
            Abrir
          </div>
        )
      }
    `
    expect(inspectKeyboardActivation(source, 'x/Trigger.tsx')).toEqual([])
  })

  test('GREEN: container com role=presentation e eslint-disable não é flagrado', () => {
    const source = `
      export function Shell() {
        return (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          <div role="presentation" onClick={(e) => e.stopPropagation()}>conteúdo</div>
        )
      }
    `
    expect(inspectKeyboardActivation(source, 'x/Shell.tsx')).toEqual([])
  })

  test('GREEN: botão nativo não é flagrado', () => {
    const source = `
      export function Btn() {
        return <button onClick={() => go()}>OK</button>
      }
    `
    expect(inspectKeyboardActivation(source, 'x/Btn.tsx')).toEqual([])
  })
})

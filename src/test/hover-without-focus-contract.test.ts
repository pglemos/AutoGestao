import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  aggregateByFileRule,
  checkRatchet,
  inspectHoverWithoutFocus,
  runHoverWithoutFocusGate,
} from '../../scripts/lint-hover-without-focus.mjs'

const HERE = fileURLToPath(import.meta.url).replace(/\/[^/]+$/, '')
const BASELINE_PATH = `${HERE}/../../scripts/hover-without-focus-baseline.json`

function readBaseline(): Record<string, Record<string, number>> {
  const data = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  return data.baseline ?? {}
}

describe('contrato FASE T 20.002 — hover sem focus-visible', () => {
  test('RED: tr clicável com hover/cursor e sem role/tabIndex/focus-visible é flagrado', () => {
    const source = `
      export function Table() {
        return <table><tbody>{rows.map(r => (
          <tr key={r.id} onClick={() => go(r.id)} className="cursor-pointer hover:bg-surface-alt">
            <td>{r.name}</td>
          </tr>
        ))}</tbody></table>
      }
    `
    expect(inspectHoverWithoutFocus(source, 'x/Table.tsx')).toEqual([
      expect.objectContaining({ rule: 'clickable-row-without-focus', tag: 'tr' }),
    ])
  })

  test('GREEN: tr com role=button, tabIndex e focus-visible não é flagrado', () => {
    const source = `
      export function Table() {
        return <table><tbody>{rows.map(r => (
          <tr key={r.id} role="button" tabIndex={0} onKeyDown={h} onClick={() => go(r.id)} className="cursor-pointer hover:bg-surface-alt focus-visible:ring-2">
            <td>{r.name}</td>
          </tr>
        ))}</tbody></table>
      }
    `
    expect(inspectHoverWithoutFocus(source, 'x/Table.tsx')).toEqual([])
  })

  test('RED: NavLink com hover sem focus-visible é flagrado', () => {
    const source = `export const C = () => <NavLink to="/x" className="hover:text-foreground transition-colors">Item</NavLink>`
    expect(inspectHoverWithoutFocus(source, 'x/Breadcrumb.tsx')).toEqual([
      expect.objectContaining({ rule: 'hover-only-nav-link', tag: 'NavLink' }),
    ])
  })

  test('GREEN: NavLink com hover e focus-visible não é flagrado', () => {
    const source = `export const C = () => <NavLink to="/x" className="hover:text-foreground focus-visible:ring-2">Item</NavLink>`
    expect(inspectHoverWithoutFocus(source, 'x/Breadcrumb.tsx')).toEqual([])
  })

  test('RED: button com hover sem focus-visible é flagrado', () => {
    const source = `export const C = () => <button onClick={f} className="hover:bg-primary transition-colors">Ação</button>`
    expect(inspectHoverWithoutFocus(source, 'x/Btn.tsx')).toEqual([
      expect.objectContaining({ rule: 'button-hover-without-focus', tag: 'button' }),
    ])
  })

  test('GREEN: button com hover e focus-visible não é flagrado', () => {
    const source = `export const C = () => <button onClick={f} className="hover:bg-primary focus-visible:ring-2">Ação</button>`
    expect(inspectHoverWithoutFocus(source, 'x/Btn.tsx')).toEqual([])
  })

  test('GREEN: button com outline-none e foco via ring de base (padrão canônico) é aceito', () => {
    // O Button canônico põe focus-visible no base cva; aqui simulamos via cn.
    const source = `export const C = () => <button onClick={f} className="hover:bg-primary focus-visible:ring-4">Ação</button>`
    expect(inspectHoverWithoutFocus(source, 'x/Btn.tsx')).toEqual([])
  })

  test('integração: gate roda na árvore viva e reporta candidatos (não bloqueia)', () => {
    const findings = runHoverWithoutFocusGate()
    expect(Array.isArray(findings)).toBe(true)
    expect(findings.length).toBeGreaterThan(0)
  })

  test('RATCHET: contagem atual por arquivo+regra não excede o baseline', () => {
    const findings = runHoverWithoutFocusGate()
    const baseline = readBaseline()
    const { increases, newFiles } = checkRatchet(findings, baseline)
    const detail = [
      ...increases.map((i) => `${i.file} ${i.rule}: ${i.baseline}->${i.current}`),
      ...newFiles.map((f) => `${f}: arquivo novo`),
    ].join('\n')
    expect(detail, `ratchet violado:\n${detail}`).toEqual('')
  })

  test('RATCHET: baseline é arquivo commitável com total coerente', () => {
    const findings = runHoverWithoutFocusGate()
    const current = aggregateByFileRule(findings)
    const baseline = readBaseline()
    const baselineTotal = Object.values(baseline).reduce(
      (sum, rules) => sum + Object.values(rules).reduce((s, c) => s + c, 0),
      0,
    )
    expect(baselineTotal).toBeGreaterThan(0)
    // O total do baseline deve ser >= atual (só pode encolher).
    expect(baselineTotal).toBeGreaterThanOrEqual(findings.length)
  })

  test('checkRatchet detecta aumento acima do baseline', () => {
    const findings = [
      { file: 'x/A.tsx', line: 1, rule: 'button-hover-without-focus', tag: 'button' },
      { file: 'x/A.tsx', line: 2, rule: 'button-hover-without-focus', tag: 'button' },
    ]
    const baseline = { 'x/A.tsx': { 'button-hover-without-focus': 1 } }
    const { increases } = checkRatchet(findings, baseline)
    expect(increases).toEqual([
      expect.objectContaining({ file: 'x/A.tsx', baseline: 1, current: 2 }),
    ])
  })

  test('checkRatchet detecta arquivo novo com findings', () => {
    const findings = [{ file: 'x/Novo.tsx', line: 1, rule: 'button-hover-without-focus', tag: 'button' }]
    const baseline = { 'x/A.tsx': { 'button-hover-without-focus': 1 } }
    const { newFiles } = checkRatchet(findings, baseline)
    expect(newFiles).toEqual(['x/Novo.tsx'])
  })
})

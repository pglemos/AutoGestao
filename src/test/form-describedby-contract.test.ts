import { describe, expect, test } from 'bun:test'

import { inspectFormDescribedBy } from '../../scripts/lint-form-describedby.mjs'

describe('contrato FASE V 22.004 — aria-describedby em field errors', () => {
  test('RED: input com aria-invalid sem aria-describedby/spread é flagrado', () => {
    const source = `
      export function Form() {
        return <input aria-invalid={!!error} value={value} onChange={onChange} />
      }
    `
    expect(inspectFormDescribedBy(source, 'x/Form.tsx')).toEqual([
      expect.objectContaining({ rule: 'error-without-describedby', tag: 'input' }),
    ])
  })

  test('RED: select com aria-invalid sem descrição é flagrado', () => {
    const source = `
      export function SelectForm() {
        return <select aria-invalid={hasError}>{options}</select>
      }
    `
    expect(inspectFormDescribedBy(source, 'x/Select.tsx')).toEqual([
      expect.objectContaining({ rule: 'error-without-describedby', tag: 'select' }),
    ])
  })

  test('GREEN: input com aria-describedby próprio não é flagrado', () => {
    const source = `
      export function Good() {
        return (
          <input id="email" aria-invalid={!!error}
            aria-describedby="email-error"
            value={value} onChange={onChange} />
        )
      }
    `
    expect(inspectFormDescribedBy(source, 'x/Good.tsx')).toEqual([])
  })

  test('GREEN: controle com spread {…control} de wrapper canônico não é flagrado', () => {
    const source = `
      export function Wrapped() {
        return <Input {...control} aria-invalid={error ? true : undefined} {...props} />
      }
    `
    expect(inspectFormDescribedBy(source, 'x/Wrapped.tsx')).toEqual([])
  })

  test('GREEN: campo canônico Field/FormField (spread control) não é flagrado', () => {
    const source = `
      export function CanonicalField() {
        return <Input ref={ref} {...control} aria-invalid={error ? true : undefined} {...props} />
      }
    `
    expect(inspectFormDescribedBy(source, 'x/CanonicalField.tsx')).toEqual([])
  })
})

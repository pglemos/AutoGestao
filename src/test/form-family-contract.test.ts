import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * FASE L — 12.001/12.002/12.003/12.009/12.011/12.012
 *
 * A família de form canônica vive em `src/components/atoms/*.tsx` + os wrappers
 * em `src/components/molecules/*.tsx`. Este contrato fixa que cada primitive de
 * texto consome os tokens de campo (`--mx-input-*`) em vez de medidas cruas, e
 * que o wrapper de campo expõe Label/Required/HelperText/FieldError com a fiação
 * a11y correta (htmlFor/aria-describedby/aria-invalid/role=alert).
 *
 * Foco visível: `focus-visible:` para não acender anel em clique de mouse
 * (§13.1). Erro: a borda não é o único sinal — a mensagem acompanha (§14).
 */
const root = path.resolve(import.meta.dir, '../..')
const read = (name: string) => readFileSync(path.join(root, name), 'utf8')

const TEXT_CONTROLS = [
  'src/components/atoms/Input.tsx',
  'src/components/atoms/Textarea.tsx',
  'src/components/atoms/Select.tsx',
  'src/components/atoms/DatePicker.tsx',
] as const

/** Altura por token: line-edit usa --mx-input-height; textarea usa min-height próprio. */
const HEIGHT_TOKENS: Record<string, string> = {
  'src/components/atoms/Input.tsx': '--mx-input-height',
  'src/components/atoms/Textarea.tsx': '--mx-textarea-min-height',
  'src/components/atoms/Select.tsx': '--mx-input-height',
  'src/components/atoms/DatePicker.tsx': '--mx-input-height',
}

const RAW_LENGTH = /\bh-(?:9|10|11|12|14)\b|h-mx-1[24]\b/
const RAW_RADIUS = /\brounded-(?:sm|md|lg|xl|2xl|3xl)\b/
const RAW_BRAND = /\bbrand-primary\b|focus:ring-4\b/

describe('FASE L — família de form canônica', () => {
  test('primitives de texto consomem os tokens de campo, nunca medidas cruas', () => {
    for (const file of TEXT_CONTROLS) {
      const source = read(file)
      expect(source, `${file} sem ${HEIGHT_TOKENS[file]}`).toContain(HEIGHT_TOKENS[file])
      expect(source, `${file} sem --mx-input-radius`).toContain('--mx-input-radius')
      expect(source, `${file} sem --mx-input-focus-ring-width`).toContain('--mx-input-focus-ring-width')
      expect(source, `${file} usa altura crua`).not.toMatch(RAW_LENGTH)
      expect(source, `${file} usa radius cru`).not.toMatch(RAW_RADIUS)
      expect(source, `${file} usa brand-primary/ring-4 cru`).not.toMatch(RAW_BRAND)
    }
  })

  test('foco visível só em focus-visible (§13.1)', () => {
    for (const file of TEXT_CONTROLS) {
      const source = read(file)
      // `focus:` solto (sem -visible) acende anel até em clique de mouse.
      expect(source, `${file} usa focus: sem -visible`).not.toMatch(/(?<!visible)focus:(?!-visible)/)
    }
  })

  test('estados disabled e read-only presentes nos campos de texto', () => {
    for (const file of ['src/components/atoms/Input.tsx', 'src/components/atoms/Textarea.tsx']) {
      const source = read(file)
      expect(source, `${file} sem disabled`).toContain('disabled:')
      expect(source, `${file} sem read-only`).toContain('read-only:')
    }
    expect(read('src/components/atoms/Select.tsx'), 'Select sem disabled').toContain('disabled:')
    expect(read('src/components/atoms/DatePicker.tsx'), 'DatePicker sem disabled').toContain('disabled:')
  })

  test('wrapper de campo expõe Label, Required, HelperText e FieldError com a11y', () => {
    const field = read('src/components/molecules/Field.tsx')
    expect(field).toContain('label:')
    expect(field).toContain('required?:')
    expect(field).toContain('helperText?:')
    expect(field).toContain('error?:')
    expect(field).toContain('htmlFor')
    expect(field).toContain('aria-describedby')
    expect(field).toContain('aria-invalid')
    expect(field).toContain('role="alert"')
    // HelperText vira descrição; error id é sempre anexado a aria-describedby.
    expect(field).toContain('-error')

    // FormField delega a a11y ao Field — não duplica a fiação.
    const formField = read('src/components/molecules/FormField.tsx')
    expect(formField).toContain('<Field')
    expect(formField).toContain('aria-invalid={error ? true : ariaInvalid}')
  })

  test('primitives de escolha (Checkbox/RadioGroup/Switch) usam tokens e focus-visible', () => {
    for (const file of [
      'src/components/atoms/Checkbox.tsx',
      'src/components/atoms/Radio.tsx',
      'src/components/atoms/Switch.tsx',
    ]) {
      const source = read(file)
      expect(source, `${file} sem focus-visible`).toContain('focus-visible:')
      expect(source, `${file} com radius cru`).not.toMatch(RAW_RADIUS)
      expect(source, `${file} sem disabled`).toContain('disabled:')
      // Repassa aria-* do wrapper para o controle (validation messaging).
      expect(source, `${file} sem spread de props`).toContain('{...props}')
    }
    // Checkbox usa o raio tokenizado da família; Radio/Switch são pill (full).
    expect(read('src/components/atoms/Checkbox.tsx')).toContain('rounded-mx-xs')
    expect(read('src/components/atoms/Radio.tsx')).toContain('rounded-full')
    expect(read('src/components/atoms/Switch.tsx')).toContain('rounded-full')
  })

  test('SearchField usa a aparência compartilhada fieldBaseClasses', () => {
    const search = read('src/components/molecules/SearchField.tsx')
    expect(search).toContain('fieldBaseClasses')
    expect(search).toContain('nakedInputClasses')
  })

  test('Combobox é o select pesquisável canônico (12.004) com a anatomia de campo', () => {
    const combobox = read('src/components/atoms/Combobox.tsx')
    expect(combobox).toContain('role="combobox"')
    expect(combobox).toContain('aria-expanded')
    expect(combobox).toContain('--mx-input-height')
    expect(combobox).toContain('--mx-input-radius')
    expect(combobox).toContain('focus-visible:')
    // O trigger segue a anatomia de campo; `rounded-sm` interno do item cmdk
    // é raio de item de lista, não da borda do controle — permitido.
    expect(combobox).not.toContain('rounded-xl')
    expect(combobox).not.toMatch(RAW_BRAND)
  })
})

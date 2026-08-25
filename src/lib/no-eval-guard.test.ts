import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A CSP de produção (`vercel.json`) declara `script-src 'self'` sem
 * `'unsafe-eval'`. Qualquer `eval()` ou `new Function(<string>)` lança
 * `EvalError` — e, quando a chamada está dentro de um try/catch, a falha é
 * silenciosa: foi assim que todos os indicadores calculados do plano
 * estratégico ficaram vazios em produção por semanas, sem nada no console e
 * com a suíte verde, porque em desenvolvimento não há CSP.
 */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue
      sourceFiles(full, acc)
      continue
    }
    if (!/\.(ts|tsx)$/.test(entry) || /\.test\.(ts|tsx)$/.test(entry)) continue
    acc.push(full)
  }
  return acc
}

describe('CSP: nenhum código de runtime avalia string como JavaScript', () => {
  test('sem eval() nem Function(`...`) em src/', () => {
    const offenders: string[] = []
    for (const file of sourceFiles('src')) {
      const code = readFileSync(file, 'utf8')
      const lines = code.split('\n')
      lines.forEach((line, index) => {
        const trimmed = line.trim()
        // Linha de comentário (`//`, `/*`, continuação `*` de JSDoc) não é runtime.
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
        const withoutComments = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '')
        if (/(^|[^.\w])eval\s*\(/.test(withoutComments) || /\bnew\s+Function\s*\(/.test(withoutComments) || /(^|[^.\w])Function\s*\(\s*[`'"]/.test(withoutComments)) {
          offenders.push(`${file}:${index + 1}: ${line.trim().slice(0, 80)}`)
        }
      })
    }
    expect(offenders).toEqual([])
  })
})

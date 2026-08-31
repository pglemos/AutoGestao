import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PRODUCTION_PATHS = ['src', 'api', 'public', 'index.html', 'vercel.json']
const SOURCE_EXTENSIONS = new Set(['.cjs', '.css', '.html', '.js', '.json', '.jsx', '.mjs', '.ts', '.tsx'])
const TEST_FILE = /\.(?:test|spec|playwright)\.(?:cjs|js|jsx|mjs|ts|tsx)$/
const REPOSITORY_ROOT = join(import.meta.dir, '..', '..')
const LOOPBACK_HOST = '(?:127(?:\\.\\d{1,3}){3}|localhost\\.?|\\[::1\\]|::1|\\[::ffff:127(?:\\.\\d{1,3}){3}\\]|::ffff:127(?:\\.\\d{1,3}){3})'
const FORBIDDEN_RUNTIME_PATTERNS = [
  new RegExp(`(?:https?|wss?):\\/\\/${LOOPBACK_HOST}(?::\\d+)?(?:[/?#]|$)`, 'i'),
  new RegExp(`(?:^|[^A-Za-z0-9_.:])${LOOPBACK_HOST}:\\d+\\b`, 'i'),
  /#region agent log/i,
  /X-Debug-Session-Id/i,
]

function productionFiles(path: string, files: string[] = []): string[] {
  if (!existsSync(path)) throw new Error(`Caminho de produção obrigatório não encontrado: ${path}`)

  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (entry === 'node_modules' || entry === 'dist') continue
      productionFiles(join(path, entry), files)
    }
    return files
  }

  const extension = path.slice(path.lastIndexOf('.')).toLowerCase()
  if (SOURCE_EXTENSIONS.has(extension) && !TEST_FILE.test(path)) files.push(path)
  return files
}

describe('produção: nenhum endpoint de debug local', () => {
  test('não envia telemetria do agente nem mantém marcadores de debug no runtime', () => {
    const offenders: string[] = []

    for (const file of PRODUCTION_PATHS
      .map(path => join(REPOSITORY_ROOT, path))
      .flatMap(path => productionFiles(path))) {
      const source = readFileSync(file, 'utf8')
      for (const pattern of FORBIDDEN_RUNTIME_PATTERNS) {
        if (pattern.test(source)) {
          offenders.push(`${file}: ${pattern}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  test('reconhece protocolos e aliases de loopback usados por endpoints locais', () => {
    const samples = [
      'http://127.0.0.1:7506/ingest',
      'https://localhost.:7506/ingest',
      'ws://[::1]:7506/ingest',
      'wss://[::ffff:127.0.0.1]:7506/ingest',
    ]

    for (const sample of samples) {
      expect(FORBIDDEN_RUNTIME_PATTERNS.some(pattern => pattern.test(sample))).toBe(true)
    }
  })
})

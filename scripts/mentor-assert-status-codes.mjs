// Guarda permanente: nenhum código de status citado no código-fonte pode faltar no catálogo.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
const root = process.cwd()
const catalog = new Set(
  JSON.parse(readFileSync(path.join(root, 'rules/mentor-comercial/v1/statuses.json'), 'utf8'))
    .records.map((r) => r.statusId),
)
const walk = (dir) =>
  readdirSync(dir).flatMap((e) => {
    const p = path.join(dir, e)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
const files = walk(path.join(root, 'src/features/mentor-comercial')).filter((f) =>
  /\.tsx?$/.test(f),
)
const bad = []
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(/['"`]((?:INT|POR|CAR|TR|FIN|VEN|PER|REL)-[A-Z]?\d{2})['"`]/g)) {
    if (!catalog.has(m[1])) bad.push(`${path.relative(root, f)}: ${m[1]}`)
  }
}
if (bad.length) {
  console.error('Códigos de status inexistentes no catálogo v1:')
  for (const b of [...new Set(bad)]) console.error('  ' + b)
  process.exit(1)
}
console.log(`OK: ${files.length} arquivos verificados, nenhum código de status inventado.`)

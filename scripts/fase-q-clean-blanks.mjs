import { execSync } from 'node:child_process'
import fs from 'node:fs'

const files = execSync('git diff --name-only -- src/components/fechamento src/components/owner src/pages/owner', { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
let fixed = 0
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8')
  // Padrão exato do destructure removido: fim da assinatura `) {` ou `}) {` seguido
  // de linha em branco seguida de `const [` (primeiro estado do componente).
  const re = /(\)\s*\{\n)\n+(?=(\s*const \[|\s*const \{))/g
  const out = c.replace(re, '$1')
  if (out !== c) {
    fs.writeFileSync(f, out)
    fixed++
    console.log('limpo:', f)
  }
}
console.log('arquivos com blank colapsado:', fixed)

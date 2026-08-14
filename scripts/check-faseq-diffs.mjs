import { execSync } from 'node:child_process'
import fs from 'node:fs'

const files = execSync('git diff --name-only -- src/components/fechamento src/components/owner src/pages/owner', { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
let doubleBlank = 0
const mixedQuotes = []
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8')
  const m = c.match(/import \{ toast \} from ([^\n]+)/)
  if (m && /"/.test(m[1])) mixedQuotes.push(`${f} -> ${m[1].trim()}`)
  if (/^\s*\n\s*\n\s*const \[/.test(c)) doubleBlank++
  // also check double blank after function opening line
  if (/\)\s*\{\n\s*\n\s*const \[/.test(c)) doubleBlank++
}
console.log('mixedQuotes:', mixedQuotes.length, mixedQuotes.slice(0, 5))
console.log('doubleBlank:', doubleBlank)

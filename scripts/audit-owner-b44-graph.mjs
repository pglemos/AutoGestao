import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDir, '..')
const sourceRoot = path.join(projectRoot, 'src')
const checkOnly = process.argv.includes('--check')

function listFiles(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...listFiles(full))
    else if (/\.(ts|tsx|js|jsx|css)$/.test(entry.name)) files.push(full)
  }
  return files
}

const allFiles = listFiles(sourceRoot)
const importPattern = /(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?['\"]([^'\"]+)['\"]/g

const findings = []

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8')
  const relativeFile = path.relative(projectRoot, file)
  
  let match
  while ((match = importPattern.exec(content)) !== null) {
    const specifier = match[1]
    if (specifier.includes('owner-b44') || specifier.includes('owner-base44') || specifier.includes('owner_b44')) {
      findings.push({
        file: relativeFile,
        specifier,
      })
    }
  }
}

console.log(`Found ${findings.length} runtime imports referencing the retired Dono namespaces:`)
console.log(JSON.stringify(findings, null, 2))

// Classification
const classification = findings.map(f => {
  let status = 'legado ativo'
  if (f.file.includes('test') || f.file.includes('spec')) status = 'removida com teste'
  else if (f.file.includes('features/owner-base44')) status = 'ainda necessária (adapter)'
  else status = 'legado ativo (pendente migração)'
  
  return { ...f, status }
})

if (!checkOnly) {
  const reportPath = path.join(projectRoot, 'docs/execution/2026-08-05-owner-b44-graph.md')
  let md = `# GRAFO DE IMPORTS E CLASSIFICAÇÃO DE DEPENDÊNCIAS RETIRADAS DO DONO — 2026-08-05\n\n`
  md += `O guard cobre apenas imports runtime em \`src/\`; menções documentais não são dependências.\n\n`
  md += `| Arquivo Consumidor | Import Specifier | Classificação | Ação |\n`
  md += `|---|---|---|---|\n`
  for (const item of classification) {
    md += `| \`${item.file}\` | \`${item.specifier}\` | ${item.status} | Migrar para os módulos canônicos do Dono |\n`
  }
  if (classification.length === 0) md += '| — | — | nenhuma dependência runtime | guard CI ativo |\n'
  fs.writeFileSync(reportPath, md, 'utf8')
  console.log(`Wrote graph report to ${reportPath}`)
}

if (findings.length > 0) process.exitCode = 1

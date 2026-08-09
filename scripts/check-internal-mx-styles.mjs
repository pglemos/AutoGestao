import { readFile, readdir, stat } from 'node:fs/promises'

const allowedHexFiles = new Set(['packages/mx-tokens/src/theme.css', 'packages/mx-tokens/src/tokens.json'])
const standaloneUiPackagePrefix = 'packages/mx-ui/'
const targets = [
  'src/components/module',
  'src/design-system/internal-mx',
  'src/features/manager/shared',
  'src/features/lojas',
  'src/features/central-mx/StoreConsultorIa.container.tsx',
  'src/features/dashboard-loja/DashboardLoja.container.tsx',
  'src/pages/AiDiagnostics.tsx',
  'src/pages/GerentePDI.tsx',
  'src/pages/ManagerDevelopment.tsx',
  'src/pages/ManagerMentor.tsx',
  'src/pages/OperationalSettings.tsx',
  'src/pages/PainelConsultor.tsx',
  'src/pages/Reprocessamento.tsx',
  'packages/mx-ui/src',
]

const files = []
async function collect(target) {
  const targetStat = await stat(target)
  if (targetStat.isFile()) {
    if (/\.(test|spec)\.(tsx?|jsx?)$/.test(target)) return
    if (/\.(tsx?|jsx?|css)$/.test(target)) files.push(target)
    return
  }

  for (const name of await readdir(target)) {
    await collect(`${target}/${name}`)
  }
}

for (const target of targets) await collect(target)

for (const file of files) {
  const content = await readFile(file, 'utf8')
  if (!allowedHexFiles.has(file) && /#[0-9a-f]{3,8}\b/i.test(content)) {
    throw new Error(`Cor hexadecimal fora dos tokens: ${file}`)
  }
  // `@mx/ui` is a standalone compatibility package and is intentionally
  // retained by verify-mx-design-system; its coupling is checked below, but
  // its historical class namespace is not part of the application runtime.
  if (!file.startsWith(standaloneUiPackagePrefix) && /mxds-|mx-internal-workspace|!important/.test(content)) {
    throw new Error(`Contrato visual legado encontrado: ${file}`)
  }
  if (file.includes('packages/mx-ui') && /supabase|useAuth|react-router-dom/i.test(content)) {
    throw new Error(`Pacote UI acoplado ao produto: ${file}`)
  }
}
console.log(`OK: ${files.length} arquivos seguem os contratos de estilo e isolamento.`)

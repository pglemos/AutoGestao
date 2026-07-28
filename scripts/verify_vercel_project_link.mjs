import { readFileSync } from 'node:fs'

const OFFICIAL_PROJECT_ID = 'prj_fpYjxc851kMs55GzR6tgQEr7uWUj'
const OFFICIAL_PROJECT_NAME = 'mxperformance'

function readLocalProject() {
  try {
    return JSON.parse(readFileSync('.vercel/project.json', 'utf8'))
  } catch {
    return null
  }
}

const localProject = readLocalProject()
const configuredProjectId = process.env.VERCEL_PROJECT_ID || localProject?.projectId
const configuredProjectName = localProject?.projectName

if (configuredProjectId !== OFFICIAL_PROJECT_ID) {
  console.error(
    `Deploy bloqueado: projeto Vercel incorreto (${configuredProjectId || 'não configurado'}). ` +
    `Religue com: vercel link --project ${OFFICIAL_PROJECT_NAME}`,
  )
  process.exit(1)
}

if (configuredProjectName && configuredProjectName !== OFFICIAL_PROJECT_NAME) {
  console.error(
    `Deploy bloqueado: nome do projeto Vercel incorreto (${configuredProjectName}). ` +
    `Esperado: ${OFFICIAL_PROJECT_NAME}.`,
  )
  process.exit(1)
}

console.log(`Vercel target OK: ${OFFICIAL_PROJECT_NAME} (${OFFICIAL_PROJECT_ID})`)

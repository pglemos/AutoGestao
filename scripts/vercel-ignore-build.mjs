import { execFileSync } from 'node:child_process'

const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA
const currentSha = process.env.VERCEL_GIT_COMMIT_SHA || 'HEAD'

// Vercel's first deployment has no previous commit to compare. Build it so
// the application can establish its initial production artifact.
if (!previousSha || /^0+$/.test(previousSha)) {
  console.log('Vercel ignore: no previous commit; build required')
  process.exit(1)
}

let changedFiles
try {
  changedFiles = execFileSync(
    'git',
    [
      'diff',
      '--no-renames',
      '--name-only',
      '--diff-filter=ACDMRTUXB',
      `${previousSha}..${currentSha}`,
      '--',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean)
} catch {
  // A missing shallow-clone object must never suppress a deployment.
  console.log('Vercel ignore: unable to inspect commit range; build required')
  process.exit(1)
}

const documentationPrefixes = [
  'docs/',
  'evidence/',
  'screenshots/',
  'visual-evidence/',
  'test-results/',
  'playwright-report/',
]

function isDocumentationOnly(file) {
  return (
    documentationPrefixes.some((prefix) => file.startsWith(prefix)) ||
    file.endsWith('.md') ||
    file.endsWith('.mdx')
  )
}

const runtimeFiles = changedFiles.filter((file) => !isDocumentationOnly(file))

if (runtimeFiles.length === 0) {
  console.log(`Vercel ignore: documentation/QA-only change (${changedFiles.length} file(s))`)
  process.exit(0)
}

console.log(`Vercel ignore: runtime-impacting change (${runtimeFiles.length} file(s)); build required`)
process.exit(1)

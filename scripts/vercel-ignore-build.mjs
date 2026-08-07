import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export const documentationPrefixes = [
  'docs/',
  'evidence/',
  'screenshots/',
  'visual-evidence/',
  'test-results/',
  'playwright-report/',
]

export function isDocumentationOnly(file) {
  return (
    documentationPrefixes.some((prefix) => file.startsWith(prefix)) ||
    file.endsWith('.md') ||
    file.endsWith('.mdx')
  )
}

export function classifyChangedFiles(files) {
  return {
    runtimeFiles: files.filter((file) => !isDocumentationOnly(file)),
    documentationFiles: files.filter((file) => isDocumentationOnly(file)),
  }
}

export function shouldSkipBuild(files) {
  return classifyChangedFiles(files).runtimeFiles.length === 0
}

function hasCommitLocally(sha) {
  try {
    execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function diffFilesLocally(previousSha, currentSha) {
  if (!hasCommitLocally(previousSha) || !hasCommitLocally(currentSha)) return null
  try {
    return execFileSync(
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
    return null
  }
}

export async function diffFilesViaApi(previousSha, currentSha, repoSlug) {
  if (!repoSlug) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoSlug}/compare/${previousSha}...${currentSha}`,
      {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'vercel-ignore-build' },
        signal: controller.signal,
      },
    )
    if (!response.ok) return null
    const data = await response.json()
    return (data.files || []).map((file) => file.filename).filter(Boolean)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function repoSlugFromRemote() {
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    const match = remote.match(/github\.com[/:]([^/]+\/[^/.]+)(\.git)?$/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

export function detectRepoSlug() {
  return (
    process.env.VERCEL_GIT_REPO_SLUG ||
    process.env.MX_VERCEL_REPO_SLUG ||
    repoSlugFromRemote()
  )
}

export async function resolveChangedFiles(previousSha, currentSha) {
  const local = diffFilesLocally(previousSha, currentSha)
  if (local) return local
  return diffFilesViaApi(previousSha, currentSha, detectRepoSlug())
}

export async function main(argv = process.argv, env = process.env) {
  const previousSha = env.VERCEL_GIT_PREVIOUS_SHA
  const currentSha = env.VERCEL_GIT_COMMIT_SHA || 'HEAD'

  // Vercel's first deployment has no previous commit to compare. Build it so
  // the application can establish its initial production artifact.
  if (!previousSha || /^0+$/.test(previousSha)) {
    console.log('Vercel ignore: no previous commit; build required')
    return 1
  }

  const changedFiles = await resolveChangedFiles(previousSha, currentSha)

  // A missing object or failed API must never suppress a deployment.
  if (!changedFiles) {
    console.log('Vercel ignore: unable to inspect commit range; build required')
    return 1
  }

  if (shouldSkipBuild(changedFiles)) {
    console.log(`Vercel ignore: documentation/QA-only change (${changedFiles.length} file(s))`)
    return 0
  }

  const { runtimeFiles } = classifyChangedFiles(changedFiles)
  console.log(
    `Vercel ignore: runtime-impacting change (${runtimeFiles.length} file(s)); build required`,
  )
  return 1
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code))
}

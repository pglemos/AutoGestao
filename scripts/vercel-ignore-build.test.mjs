import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isDocumentationOnly,
  classifyChangedFiles,
  shouldSkipBuild,
  diffFilesLocally,
  resolveChangedFiles,
  main,
} from './vercel-ignore-build.mjs'

test('isDocumentationOnly: prefixos documentais são reconhecidos', () => {
  assert.equal(isDocumentationOnly('docs/auditoria/fase-1/T1.1.md'), true)
  assert.equal(isDocumentationOnly('evidence/run-1/shot.png'), true)
  assert.equal(isDocumentationOnly('screenshots/a.png'), true)
  assert.equal(isDocumentationOnly('visual-evidence/b.jpg'), true)
  assert.equal(isDocumentationOnly('test-results/log.txt'), true)
  assert.equal(isDocumentationOnly('playwright-report/index.html'), true)
  assert.equal(isDocumentationOnly('README.md'), true)
  assert.equal(isDocumentationOnly('CHANGELOG.mdx'), true)
})

test('isDocumentationOnly: arquivos runtime não são reconhecidos como docs', () => {
  assert.equal(isDocumentationOnly('src/App.tsx'), false)
  assert.equal(isDocumentationOnly('package.json'), false)
  assert.equal(isDocumentationOnly('vercel.json'), false)
  assert.equal(isDocumentationOnly('.github/workflows/ci.yml'), false)
  assert.equal(isDocumentationOnly('supabase/functions/x/index.ts'), false)
})

test('classifyChangedFiles separa runtime de docs', () => {
  const { runtimeFiles, documentationFiles } = classifyChangedFiles([
    'docs/README.md',
    'src/App.tsx',
    'scripts/vercel-ignore-build.mjs',
    'evidence/run.png',
  ])
  assert.deepEqual(runtimeFiles, ['src/App.tsx', 'scripts/vercel-ignore-build.mjs'])
  assert.deepEqual(documentationFiles, ['docs/README.md', 'evidence/run.png'])
})

test('shouldSkipBuild: docs-only → skip; qualquer runtime → build', () => {
  assert.equal(shouldSkipBuild(['docs/a.md', 'evidence/b.png']), true)
  assert.equal(shouldSkipBuild(['README.md']), true)
  assert.equal(shouldSkipBuild(['docs/a.md', 'src/App.tsx']), false)
  assert.equal(shouldSkipBuild(['vercel.json']), false)
})

test('caminho renomeado docs→docs continua docs-only', () => {
  assert.equal(shouldSkipBuild(['docs/old.md', 'docs/new.md']), true)
})

test('merge commit com apenas docs → skip', () => {
  assert.equal(shouldSkipBuild(['docs/a.md', 'docs/auditoria/fase-2/T2.1.md']), true)
})

test('múltiplos commits mistos → build', () => {
  assert.equal(shouldSkipBuild(['docs/a.md', 'src/hooks/useX.ts', 'src/lib/y.ts']), false)
})

test('diffFilesLocally: clone raso sem objetos → null (fallback p/ API)', () => {
  const changed = diffFilesLocally('0000000000000000000000000000000000000000', 'HEAD')
  assert.equal(changed, null)
})

test('diffFilesLocally: objetos presentes → lista de arquivos', () => {
  const changed = diffFilesLocally('HEAD~1', 'HEAD')
  assert.ok(Array.isArray(changed))
  assert.ok(changed.length >= 0)
})

test('resolveChangedFiles: sem prev local, com API falhando → null (nunca supõe skip)', async () => {
  const files = await resolveChangedFiles(
    '0000000000000000000000000000000000000000',
    'HEAD',
    undefined,
  )
  assert.equal(files, null)
})

test('main: primeiro deploy sem previousSha → build (exit 1)', async () => {
  assert.equal(
    await main([], { VERCEL_GIT_COMMIT_SHA: 'abc', VERCEL_GIT_PREVIOUS_SHA: undefined }),
    1,
  )
})

test('main: previousSha de zeros → build (exit 1)', async () => {
  assert.equal(
    await main([], { VERCEL_GIT_COMMIT_SHA: 'abc', VERCEL_GIT_PREVIOUS_SHA: '0000000000000000000000000000000000000000' }),
    1,
  )
})

test('main: diff local indisponível e API sem slug → build (exit 1, conservador)', async () => {
  const code = await main([], {
    VERCEL_GIT_COMMIT_SHA: 'HEAD',
    VERCEL_GIT_PREVIOUS_SHA: '0000000000000000000000000000000000000000',
    VERCEL_GIT_REPO_SLUG: undefined,
    MX_VERCEL_REPO_SLUG: undefined,
  })
  assert.equal(code, 1)
})

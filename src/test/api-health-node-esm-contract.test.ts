/**
 * Contrato do artefato serverless que a Vercel executa.
 *
 * Os contratos Bun dos endpoints não bastam: Bun resolve o módulo TypeScript
 * sem extensão, enquanto o Node ESM usado pelo artefato compilado não faz essa
 * resolução. Este teste transpila os handlers e o helper para JavaScript em um
 * sandbox `type: module` e pede ao Node real para carregar os dois entrypoints.
 */
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import * as ts from 'typescript'
import { describe, expect, it } from 'bun:test'

const repositoryRoot = path.resolve(import.meta.dir, '../..')

async function transpileTo(root: string, source: string, destination: string) {
    const sourceText = await readFile(path.join(repositoryRoot, source), 'utf8')
    const output = ts.transpileModule(sourceText, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
        },
        fileName: source,
    })

    const outputPath = path.join(root, destination)
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, output.outputText, 'utf8')
}

describe('health serverless artefact — Node ESM', () => {
    it('carrega health e health.release depois da transpilação', async () => {
        const sandbox = await mkdtemp(path.join(os.tmpdir(), 'mx-health-node-esm-'))

        try {
            await writeFile(
                path.join(sandbox, 'package.json'),
                JSON.stringify({ type: 'module' }),
                'utf8',
            )
            await transpileTo(sandbox, 'api/health.ts', 'api/health.js')
            await transpileTo(sandbox, 'api/health.release.ts', 'api/health.release.js')
            await transpileTo(
                sandbox,
                'src/lib/observability/server-release.ts',
                'src/lib/observability/server-release.js',
            )

            const healthUrl = pathToFileURL(path.join(sandbox, 'api/health.js')).href
            const releaseUrl = pathToFileURL(path.join(sandbox, 'api/health.release.js')).href
            const result = spawnSync(
                'node',
                [
                    '--input-type=module',
                    '-e',
                    'await import(process.argv[1]); await import(process.argv[2])',
                    healthUrl,
                    releaseUrl,
                ],
                { encoding: 'utf8' },
            )

            expect(result.error).toBeUndefined()
            expect(result.status, result.stderr || result.stdout).toBe(0)
            expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND')
        } finally {
            await rm(sandbox, { recursive: true, force: true })
        }
    })
})

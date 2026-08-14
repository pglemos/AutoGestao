import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir, hostname } from 'node:os'
import { join } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'

import {
  safeSlug,
  caseStatePath,
  isCompleteCapture,
  planWork,
  parseBatchSize,
  acquireRunLock,
  acquireGlobalLock,
  globalLockPath,
  aggregateSummaryFromDisk,
  mergeCoverage,
  runRoleLoop,
} from '../../scripts/foundation-zero-runner.mjs'

function item(role: string, path: string, viewportKey: string) {
  return {
    row: { path, role, surface: 'STANDARD_CANVAS', kind: 'route', element: 'page' },
    viewport: { key: viewportKey, width: 360, height: 800 },
  }
}

function items(specs: Array<[string, string, string]>) {
  return specs.map(([role, path, viewportKey]) => item(role, path, viewportKey))
}

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = join(tmpdir(), `fz-runner-test-${randomUUID()}`)
  try {
    await run(dir)
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

async function writeState(outputRoot: string, role: string, routeTemplate: string, viewportKey: string, state: Record<string, unknown>) {
  const dir = join(outputRoot, role, safeSlug(routeTemplate), viewportKey)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'state.json'), `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

async function seedLock(dir: string, lock: Record<string, unknown>) {
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'run.lock'), `${JSON.stringify(lock, null, 2)}\n`, 'utf8')
}

function completeState(status: 'PASS' | 'FAIL' | 'SKIP', classification = { geometry: 'PASS', runtime: 'PASS', accessibility: 'PASS' }) {
  return {
    runId: 'test-run',
    status,
    role: 'dono',
    routeTemplate: '/x',
    viewport: { key: '360x800', width: 360, height: 800 },
    startedAt: '2026-08-01T00:00:00.000Z',
    finishedAt: '2026-08-01T00:00:01.000Z',
    classification,
  }
}

describe('foundation-zero-runner lifecycle', () => {
  test('safeSlug normaliza rotas com parâmetros', () => {
    expect(safeSlug('/lojas/:storeSlug')).toBe('lojas-param')
    expect(safeSlug('/')).toBe('root')
    expect(safeSlug('/consultoria/clientes/:clientSlug/visitas/:visitNumber')).toBe('consultoria-clientes-param-visitas-param')
  })

  test('caseStatePath espelha o caminho de artefatos do harness', () => {
    expect(caseStatePath('/out', 'dono', '/lojas/:storeSlug', '1440x900')).toBe(
      join('/out', 'dono', 'lojas-param', '1440x900', 'state.json'),
    )
  })

  test('isCompleteCapture exige status PASS/FAIL sem NOT_CAPTURED', () => {
    expect(isCompleteCapture(completeState('PASS'))).toBe(true)
    expect(isCompleteCapture(completeState('FAIL'))).toBe(true)
    expect(isCompleteCapture(completeState('SKIP'))).toBe(false)
    expect(isCompleteCapture(completeState('FAIL', { geometry: 'NOT_CAPTURED', runtime: 'NOT_CAPTURED', accessibility: 'NOT_CAPTURED' }))).toBe(false)
    expect(isCompleteCapture(completeState('PASS', { geometry: 'PASS', runtime: 'NOT_CAPTURED', accessibility: 'PASS' }))).toBe(false)
    expect(isCompleteCapture(null)).toBe(false)
  })

  test('planWork retoma apenas captures completos e re-roda NOT_CAPTURED/corruptos', async () => {
    await withTempDir(async outputRoot => {
      const planned = items([
        ['dono', '/home', '360x800'],
        ['dono', '/meta-loja', '360x800'],
        ['dono', '/crash', '360x800'],
        ['dono', '/corrupto', '360x800'],
      ])
      await writeState(outputRoot, 'dono', '/home', '360x800', completeState('PASS'))
      await writeState(outputRoot, 'dono', '/crash', '360x800', completeState('FAIL', { geometry: 'NOT_CAPTURED', runtime: 'NOT_CAPTURED', accessibility: 'NOT_CAPTURED' }))
      await writeState(outputRoot, 'dono', '/corrupto', '360x800', { notJson: true })

      const plan = await planWork({ planned, outputRoot, resume: true, limit: Infinity })
      expect(plan.resumed.map(c => c.row.path)).toEqual(['/home'])
      expect(plan.toRun.map(c => c.row.path)).toEqual(['/meta-loja', '/crash', '/corrupto'])
      expect(plan.counts.resumedCases).toBe(1)
      expect(plan.counts.plannedCases).toBe(4)
    })
  })

  test('--no-resume produz resumed=[] e toRun=planned antes do slice', async () => {
    await withTempDir(async outputRoot => {
      const planned = items([
        ['dono', '/home', '360x800'],
        ['dono', '/home', '1440x900'],
      ])
      await writeState(outputRoot, 'dono', '/home', '360x800', completeState('PASS'))

      const plan = await planWork({ planned, outputRoot, resume: false, limit: Infinity })
      expect(plan.resumed).toEqual([])
      expect(plan.toRun).toHaveLength(2)
      expect(plan.counts.resumedCases).toBe(0)
      expect(plan.counts.effectiveCases).toBe(2)
    })
  })

  test('--limit limita selected (new captures), NÃO effective (resumed pode ser milhares)', async () => {
    await withTempDir(async outputRoot => {
      const planned = items([
        ['dono', '/home', '360x800'],
        ['dono', '/home', '1440x900'],
        ['dono', '/meta-loja', '360x800'],
        ['dono', '/meta-loja', '1440x900'],
        ['dono', '/painel', '360x800'],
      ])
      for (const p of planned.slice(0, 3)) {
        await writeState(outputRoot, p.row.role, p.row.path, p.viewport.key, completeState('PASS'))
      }

      const plan = await planWork({ planned, outputRoot, resume: true, limit: 1 })
      expect(plan.resumed).toHaveLength(3)
      expect(plan.selected).toHaveLength(1)
      expect(plan.counts.resumedCases).toBe(3)
      expect(plan.counts.selectedCases).toBe(1)
      expect(plan.counts.remainingCases).toBe(1)
      expect(plan.counts.effectiveCases).toBe(4)
      expect(plan.effective).toHaveLength(4)
    })
  })

  test('parseBatchSize aceita 1/N/Infinity e rejeita valores inválidos', () => {
    expect(parseBatchSize(undefined)).toBe(Infinity)
    expect(parseBatchSize('1')).toBe(1)
    expect(parseBatchSize('5')).toBe(5)
    expect(parseBatchSize('inf')).toBe(Infinity)
    expect(parseBatchSize('Infinity')).toBe(Infinity)
    for (const bad of ['0', '-1', '1.5', 'abc', '']) {
      expect(() => parseBatchSize(bad)).toThrow(/BATCH_SIZE_INVALID/)
    }
  })

  test('lock: mesmo host com pid vivo aborta; pid morto faz takeover', async () => {
    await withTempDir(async dir => {
      const meta = { runId: 'r1', baseUrl: 'http://x' }
      const h1 = await acquireRunLock(dir, meta)
      await expect(acquireRunLock(dir, meta)).rejects.toThrow(/HARNESS_LOCK_HELD/)
      await h1.release()

      await seedLock(dir, { token: 't-dead', pid: 999999, host: hostname(), baseUrl: meta.baseUrl, runId: meta.runId, startedAt: new Date().toISOString(), prev: null })
      const h2 = await acquireRunLock(dir, meta)
      await h2.release()
    })
  })

  test('lock: host diferente NÃO é stale automático; --force ou TTL expirado fazem takeover', async () => {
    await withTempDir(async dir => {
      const meta = { runId: 'r1', baseUrl: 'http://x' }

      await seedLock(dir, { token: 't-other', pid: 4242, host: 'outro-host', baseUrl: meta.baseUrl, runId: meta.runId, startedAt: new Date().toISOString(), prev: null })
      await expect(acquireRunLock(dir, meta)).rejects.toThrow(/HARNESS_LOCK_HELD/)
      await expect(acquireRunLock(dir, meta, { ttlHours: 24 })).rejects.toThrow(/HARNESS_LOCK_HELD/)

      const ttl = await acquireRunLock(dir, meta, { force: true })
      const currentForce = JSON.parse(await readFile(join(dir, 'run.lock'), 'utf8'))
      expect(currentForce.prev?.token).toBe('t-other')
      await ttl.release()

      await seedLock(dir, { token: 't-expired', pid: 4242, host: 'outro-host', baseUrl: meta.baseUrl, runId: meta.runId, startedAt: new Date(Date.now() - 25 * 3600_000).toISOString(), prev: null })
      const h = await acquireRunLock(dir, meta, { ttlHours: 24 })
      const current = JSON.parse(await readFile(join(dir, 'run.lock'), 'utf8'))
      expect(current.prev?.token).toBe('t-expired')
      const audit = await readFile(join(dir, '.lock-audit.log'), 'utf8')
      expect(audit).toContain('"reason":"force"')
      expect(audit).toContain('"reason":"stale"')
      expect(audit).toContain('"from":"t-expired"')
      await h.release()
    })
  })

  test('lock: mesmo host com pid vivo + TTL expirado permanece HELD (TTL só vale para host diferente)', async () => {
    await withTempDir(async dir => {
      const meta = { runId: 'r1', baseUrl: 'http://x' }
      await seedLock(dir, {
        token: 't-expired-samehost',
        pid: process.pid,
        host: hostname(),
        baseUrl: meta.baseUrl,
        runId: meta.runId,
        startedAt: new Date(Date.now() - 25 * 3600_000).toISOString(),
        prev: null,
      })
      await expect(acquireRunLock(dir, meta, { ttlHours: 24 })).rejects.toThrow(/HARNESS_LOCK_HELD/)
    })
  })

  test('lock: release só remove lock com token próprio', async () => {
    await withTempDir(async dir => {
      const meta = { runId: 'r1', baseUrl: 'http://x' }
      const h1 = await acquireRunLock(dir, meta)
      // outro processo assume (force) e reescreve o lock
      const h2 = await acquireRunLock(dir, meta, { force: true })
      // release do handle antigo não apaga o lock novo (token difere)
      await h1.release()
      await expect(acquireRunLock(dir, meta)).rejects.toThrow(/HARNESS_LOCK_HELD/)
      await h2.release()
      const h3 = await acquireRunLock(dir, meta)
      await h3.release()
    })
  })

  test('global lock é chaveado por baseUrl: baseUrls diferentes não conflitam', async () => {
    await withTempDir(async dir => {
      const a = await acquireGlobalLock(dir, { runId: 'r1', baseUrl: 'http://app-a:3107' })
      const b = await acquireGlobalLock(dir, { runId: 'r2', baseUrl: 'http://app-b:3107' })
      await expect(acquireGlobalLock(dir, { runId: 'r3', baseUrl: 'http://app-a:3107' })).rejects.toThrow(/HARNESS_LOCK_HELD/)

      const sha12 = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 12)
      expect(globalLockPath(dir, 'http://app-a:3107')).toBe(join(dir, `matrix-${sha12('http://app-a:3107')}.lock`))
      expect(globalLockPath(dir, 'http://app-a:3107')).not.toContain(`/${'.'}matrix-`)
      expect(globalLockPath(dir, 'http://app-a:3107')).not.toBe(globalLockPath(dir, 'http://app-b:3107'))

      await a.release()
      await b.release()
    })
  })

  test('ordem de locks global->output: falha no output libera o global (release inversa)', async () => {
    await withTempDir(async dir => {
      const globalHandle = await acquireGlobalLock(dir, { runId: 'r1', baseUrl: 'http://app-a:3107' })
      const outDir = join(dir, 'out')
      const held = await acquireRunLock(outDir, { runId: 'outro', baseUrl: 'http://app-a:3107' })
      await expect(acquireRunLock(outDir, { runId: 'r1', baseUrl: 'http://app-a:3107' })).rejects.toThrow(/HARNESS_LOCK_HELD/)

      // o harness libera o global no finally mesmo com falha do output
      await globalHandle.release()
      const again = await acquireGlobalLock(dir, { runId: 'r1', baseUrl: 'http://app-a:3107' })
      await again.release()
      await held.release()
    })
  })

  test('aggregateSummaryFromDisk conta o subconjunto efetivo, inclui RESUMED FAIL e calcula capturedCases', async () => {
    await withTempDir(async outputRoot => {
      const resumedFail = item('dono', '/minha-equipe', '360x800')
      const selectedPass = item('dono', '/home', '360x800')
      const selectedCrash = item('dono', '/crash', '360x800')
      await writeState(outputRoot, resumedFail.row.role, resumedFail.row.path, resumedFail.viewport.key, completeState('FAIL'))
      await writeState(outputRoot, selectedPass.row.role, selectedPass.row.path, selectedPass.viewport.key, completeState('PASS'))
      await writeState(outputRoot, selectedCrash.row.role, selectedCrash.row.path, selectedCrash.viewport.key, completeState('FAIL', { geometry: 'NOT_CAPTURED', runtime: 'NOT_CAPTURED', accessibility: 'NOT_CAPTURED' }))

      const summary = await aggregateSummaryFromDisk([resumedFail, selectedPass, selectedCrash], outputRoot, [selectedPass, selectedCrash], 'test-run')
      expect(summary.pass).toBe(1)
      expect(summary.fail).toBe(2)
      expect(summary.skip).toBe(0)
      expect(summary.capturedCases).toBe(2)
    })
  })

  test('aggregateSummaryFromDisk não conta estado antigo de outro runId em --no-resume', async () => {
    await withTempDir(async outputRoot => {
      const stale = item('dono', '/home', '360x800')
      const fresh = item('dono', '/meta-loja', '360x800')
      await writeState(outputRoot, stale.row.role, stale.row.path, stale.viewport.key, { ...completeState('PASS'), runId: 'run-velho' })
      await writeState(outputRoot, fresh.row.role, fresh.row.path, fresh.viewport.key, { ...completeState('FAIL'), runId: 'run-atual' })

      const summary = await aggregateSummaryFromDisk([stale, fresh], outputRoot, [stale, fresh], 'run-atual')
      expect(summary.pass).toBe(0)
      expect(summary.fail).toBe(1)
      expect(summary.skip).toBe(0)
      expect(summary.capturedCases).toBe(1)
    })
  })

  test('mergeCoverage deduplica por role+route+viewport e prefere timestamp mais recente', () => {
    const oldState = { role: 'dono', routeTemplate: '/home', viewport: { key: '360x800' }, status: 'PASS', finishedAt: '2026-08-01T00:00:00.000Z' }
    const newState = { role: 'dono', routeTemplate: '/home', viewport: { key: '360x800' }, status: 'FAIL', finishedAt: '2026-08-02T00:00:00.000Z' }
    const other = { role: 'gerente', routeTemplate: '/meta-loja', viewport: { key: '1440x900' }, status: 'PASS', finishedAt: '2026-08-02T00:00:00.000Z' }

    const merged = mergeCoverage([oldState, newState, other])
    expect(merged).toHaveLength(2)
    const home = merged.find(c => c.routeTemplate === '/home')
    expect(home?.status).toBe('FAIL')
    expect(home?.finishedAt).toBe(newState.finishedAt)
  })

  test('runRoleLoop abre/fecha uma sessão por role e captura os itens selecionados', async () => {
    const calls: Array<Record<string, string>> = []
    const selected = items([
      ['dono', '/home', '360x800'],
      ['dono', '/home', '1440x900'],
      ['gerente', '/meta-loja', '360x800'],
    ])
    const outcome = await runRoleLoop({
      roles: ['dono', 'gerente'],
      selected,
      openSession: async role => {
        calls.push({ kind: 'open', role })
        return { ok: true, session: { role } }
      },
      closeSession: async s => calls.push({ kind: 'close', role: s.session.role }),
      capture: async (s, c) => {
        calls.push({ kind: 'capture', role: s.session.role, path: c.row.path })
        return { status: 'PASS', role: s.session.role, routeTemplate: c.row.path, viewport: c.viewport }
      },
      writeSkip: async () => ({ status: 'SKIP', role: '', routeTemplate: '', viewport: {} }),
      onResult: () => {},
      batchSize: Infinity,
    })
    expect(outcome.sessionsOpened).toBe(2)
    expect(outcome.sessionsClosed).toBe(2)
    expect(calls.filter(c => c.kind === 'capture')).toHaveLength(3)
    expect(calls.filter(c => c.kind === 'open').map(c => c.role)).toEqual(['dono', 'gerente'])
  })

  test('runRoleLoop recicla sessão a cada batchSize casos', async () => {
    const calls: Array<Record<string, string>> = []
    const selected = items([
      ['dono', '/a', '360x800'],
      ['dono', '/b', '360x800'],
      ['dono', '/c', '360x800'],
    ])
    const run = async (batchSize: number) => {
      calls.length = 0
      return runRoleLoop({
        roles: ['dono'],
        selected,
        openSession: async role => {
          calls.push({ kind: 'open', role })
          return { ok: true, session: { role } }
        },
        closeSession: async s => calls.push({ kind: 'close', role: s.session.role }),
        capture: async (s, c) => ({ status: 'PASS', role: s.session.role, routeTemplate: c.row.path, viewport: c.viewport }),
        writeSkip: async () => ({ status: 'SKIP', role: '', routeTemplate: '', viewport: {} }),
        onResult: () => {},
        batchSize,
      })
    }

    const one = await run(1)
    expect(one.sessionsOpened).toBe(3)
    expect(one.sessionsClosed).toBe(3)

    const two = await run(2)
    expect(two.sessionsOpened).toBe(2)
    expect(two.sessionsClosed).toBe(2)

    const inf = await run(Infinity)
    expect(inf.sessionsOpened).toBe(1)
    expect(inf.sessionsClosed).toBe(1)
  })

  test('runRoleLoop invoca onRoleComplete por role com states e contadores cumulativos', async () => {
    const roleCompletes: Array<{ role: string; count: number; opened: number; closed: number }> = []
    const selected = items([
      ['dono', '/home', '360x800'],
      ['dono', '/home', '1440x900'],
      ['gerente', '/meta-loja', '360x800'],
    ])
    await runRoleLoop({
      roles: ['dono', 'gerente'],
      selected,
      openSession: async role => ({ ok: true, session: { role } }),
      closeSession: async () => {},
      capture: async (_s, c) => ({ status: 'PASS', role: c.row.role, routeTemplate: c.row.path, viewport: c.viewport }),
      writeSkip: async () => ({ status: 'SKIP', role: '', routeTemplate: '', viewport: {} }),
      onResult: () => {},
      onRoleComplete: async (role, roleResults, counters) => {
        roleCompletes.push({ role, count: roleResults.length, opened: counters.sessionsOpened, closed: counters.sessionsClosed })
      },
      batchSize: Infinity,
    })
    expect(roleCompletes).toEqual([
      { role: 'dono', count: 2, opened: 1, closed: 1 },
      { role: 'gerente', count: 1, opened: 2, closed: 2 },
    ])
  })

  test('runRoleLoop invoca onRoleComplete também no caminho de auth falho (SKIP)', async () => {
    const roleCompletes: Array<{ role: string; count: number; status: string; opened: number; closed: number }> = []
    const selected = items([
      ['administrador_mx', '/painel', '360x800'],
    ])
    await runRoleLoop({
      roles: ['administrador_mx'],
      selected,
      openSession: async () => ({ ok: false, reason: 'credencial ausente' }),
      closeSession: async () => {},
      capture: async () => ({ status: 'PASS', role: '', routeTemplate: '', viewport: {} }),
      writeSkip: async c => ({ status: 'SKIP', role: c.row.role, routeTemplate: c.row.path, viewport: c.viewport }),
      onResult: () => {},
      onRoleComplete: async (role, roleResults, counters) => {
        roleCompletes.push({ role, count: roleResults.length, status: String(roleResults[0]?.status), opened: counters.sessionsOpened, closed: counters.sessionsClosed })
      },
      batchSize: Infinity,
    })
    expect(roleCompletes).toEqual([{ role: 'administrador_mx', count: 1, status: 'SKIP', opened: 1, closed: 1 }])
  })

  test('runRoleLoop com auth falha grava SKIP sem capturar', async () => {
    const calls: Array<Record<string, string>> = []
    const selected = items([
      ['administrador_mx', '/painel', '360x800'],
    ])
    const outcome = await runRoleLoop({
      roles: ['administrador_mx'],
      selected,
      openSession: async () => ({ ok: false, reason: 'credencial ausente' }),
      closeSession: async () => calls.push({ kind: 'close' }),
      capture: async () => {
        calls.push({ kind: 'capture' })
        return { status: 'PASS', role: '', routeTemplate: '', viewport: {} }
      },
      writeSkip: async c => {
        calls.push({ kind: 'skip', path: c.row.path })
        return { status: 'SKIP', role: c.row.role, routeTemplate: c.row.path, viewport: c.viewport }
      },
      onResult: () => {},
      batchSize: Infinity,
    })
    expect(calls.filter(c => c.kind === 'capture')).toHaveLength(0)
    expect(calls.filter(c => c.kind === 'skip')).toHaveLength(1)
    expect(outcome.sessionsOpened).toBe(1)
    expect(outcome.sessionsClosed).toBe(1)
  })
})

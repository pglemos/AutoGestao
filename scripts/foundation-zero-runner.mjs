#!/usr/bin/env node
/**
 * Lifecycle helpers for `scripts/foundation_zero_harness.ts` (FASE AF / H1).
 *
 * This module is intentionally playwright-free: the browser/session lifecycle
 * is injected by the harness as closures, and everything here is pure enough to
 * be unit-tested with `bun test` without ever launching a browser or running
 * the 5400-case matrix.
 *
 * Responsibilities:
 *  - idempotent resume keyed by persisted `state.json` (H1 dec. 1/2);
 *  - `--limit` applies to *new* captures only, never to resumed cases (H1 final);
 *  - per-role/batch session recycling decision (H1 dec. 3);
 *  - concurrent-process detection via output + per-baseUrl global locks (H1
 *    dec. 4/5/6/8) with atomic `wx` takeover and an audit log;
 *  - invocation-scoped summary that reads persisted states from disk (H1 dec.
 *    7), so failures that died before `onResult` are never masked.
 */

import { appendFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { randomUUID, createHash } from 'node:crypto'
import os from 'node:os'
import { join } from 'node:path'

export function safeSlug(value) {
  return (
    value
      .replace(/:[^/]+/g, 'param')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'root'
  )
}

export function caseStatePath(outputRoot, role, routeTemplate, viewportKey) {
  return join(outputRoot, role, safeSlug(routeTemplate), viewportKey, 'state.json')
}

export function isCompleteCapture(state) {
  if (!state || typeof state !== 'object') return false
  if (state.status !== 'PASS' && state.status !== 'FAIL') return false
  const classification = state.classification || {}
  if (
    classification.geometry === 'NOT_CAPTURED' ||
    classification.runtime === 'NOT_CAPTURED' ||
    classification.accessibility === 'NOT_CAPTURED'
  ) {
    return false
  }
  return true
}

export async function readCaseState(outputRoot, role, routeTemplate, viewportKey) {
  try {
    return JSON.parse(await readFile(caseStatePath(outputRoot, role, routeTemplate, viewportKey), 'utf8'))
  } catch {
    return null
  }
}

/**
 * Plans the work for a single invocation.
 *
 * `resume=true` splits `planned` into `resumed` (persisted, complete) and
 * `toRun` (missing, SKIP, or NOT_CAPTURED leftovers). `limit` slices only
 * `toRun` — resumed cases can be in the thousands and are never limited.
 */
export async function planWork({ planned, outputRoot, resume, limit }) {
  const limitApplied = Number.isFinite(limit) ? limit : Number.POSITIVE_INFINITY
  let resumed = []
  let toRun = planned
  if (resume) {
    resumed = []
    toRun = []
    for (const plannedCase of planned) {
      const state = await readCaseState(outputRoot, plannedCase.row.role, plannedCase.row.path, plannedCase.viewport.key)
      if (isCompleteCapture(state)) resumed.push(plannedCase)
      else toRun.push(plannedCase)
    }
  }
  const selected = Number.isFinite(limitApplied) ? toRun.slice(0, limitApplied) : toRun
  const effective = [...resumed, ...selected]
  return {
    resumed,
    toRun,
    selected,
    effective,
    counts: {
      plannedCases: planned.length,
      resumedCases: resumed.length,
      selectedCases: selected.length,
      remainingCases: toRun.length - selected.length,
      effectiveCases: resumed.length + selected.length,
    },
  }
}

export function parseBatchSize(value) {
  if (value === undefined || value === null) return Number.POSITIVE_INFINITY
  const raw = String(value).trim().toLowerCase()
  if (raw === 'inf' || raw === 'infinity') return Number.POSITIVE_INFINITY
  if (!/^\d+$/.test(raw)) throw new Error(`BATCH_SIZE_INVALID: esperado inteiro >= 1 ou Infinity, recebido "${value}"`)
  const parsed = Number(raw)
  if (parsed < 1) throw new Error(`BATCH_SIZE_INVALID: esperado inteiro >= 1, recebido "${value}"`)
  return parsed
}

export function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error && error.code === 'EPERM'
  }
}

export function isStaleLock(lock, { force, ttlHours, host }) {
  if (force) return true
  if (!lock) return false
  if (lock.host === host) {
    // mesmo host: pid vivo = HELD sempre; TTL NÃO sobrepõe (só --force assume).
    return !isPidAlive(lock.pid)
  }
  // host diferente: TTL expirado é o ÚNICO autorizador de takeover automático.
  if (ttlHours && lock.startedAt) {
    const started = Date.parse(lock.startedAt)
    if (Number.isFinite(started) && Date.now() - started > ttlHours * 3600_000) return true
  }
  return false
}

export function globalLockPath(lockDir, baseUrl) {
  const slug = createHash('sha256').update(String(baseUrl)).digest('hex').slice(0, 12)
  return join(lockDir, `matrix-${slug}.lock`)
}

async function appendAudit(dir, event) {
  try {
    await appendFile(join(dir, '.lock-audit.log'), `${JSON.stringify(event)}\n`, 'utf8')
  } catch {
    // best-effort: audit must never take the run down
  }
}

async function acquireLockAt(path, meta, { force = false, ttlHours, host = os.hostname() } = {}) {
  const payload = {
    token: meta.token || randomUUID(),
    pid: Number.isInteger(meta.pid) ? meta.pid : process.pid,
    host,
    baseUrl: meta.baseUrl,
    runId: meta.runId,
    startedAt: meta.startedAt || new Date().toISOString(),
    prev: null,
  }
  const writeOptions = { encoding: 'utf8', flag: 'wx' }
  const serialized = `${JSON.stringify(payload, null, 2)}\n`
  await mkdir(dirnameOf(path), { recursive: true })
  try {
    await writeFile(path, serialized, writeOptions)
  } catch (error) {
    if (!error || error.code !== 'EEXIST') throw error
    let existing = null
    try {
      existing = JSON.parse(await readFile(path, 'utf8'))
    } catch {
      existing = null
    }
    if (!existing) {
      // race: file vanished between EEXIST and read -> retry the exclusive write
      await writeFile(path, serialized, writeOptions)
      return {
        token: payload.token,
        path,
        release: makeRelease(path, payload.token),
      }
    }
    const stale = isStaleLock(existing, { force, ttlHours, host })
    if (!stale) {
      throw new Error(
        `HARNESS_LOCK_HELD: lock existente em ${path} (pid=${existing.pid}, host=${existing.host}, runId=${existing.runId}, startedAt=${existing.startedAt}). Use --force para assumir ou aguarde a liberacao.`,
      )
    }
    const stalePath = `${path}.stale-${new Date().toISOString().replace(/[:.]/g, '-')}`
    await rename(path, stalePath)
    payload.prev = existing
    await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, writeOptions)
    await appendAudit(dirnameOf(path), {
      at: new Date().toISOString(),
      from: existing.token,
      to: payload.token,
      prevToken: existing.token,
      reason: force ? 'force' : 'stale',
      fromHost: existing.host,
      toHost: host,
      movedTo: stalePath,
      runId: meta.runId,
    })
  }
  return {
    token: payload.token,
    path,
    release: makeRelease(path, payload.token),
  }
}

function dirnameOf(path) {
  const index = path.lastIndexOf('/')
  return index >= 0 ? path.slice(0, index) : '.'
}

function makeRelease(path, token) {
  return async () => {
    try {
      const current = JSON.parse(await readFile(path, 'utf8'))
      if (current && current.token === token) await unlink(path)
    } catch {
      // lock already gone (or taken over by another process)
    }
  }
}

export function acquireRunLock(dir, meta, opts = {}) {
  return acquireLockAt(join(dir, 'run.lock'), meta, opts)
}

export function acquireGlobalLock(lockDir, meta, opts = {}) {
  return acquireLockAt(globalLockPath(lockDir, meta.baseUrl), meta, opts)
}

/**
 * Invocation-scoped summary over `effective` (resumed + selected). Reads the
 * persisted state.json of each case.
 *
 * Counting rules (no stale-state leakage):
 *  - resumed cases (in `effective` but not `selected`) count whatever complete
 *    state they carry — they are legitimately part of the cumulative effective
 *    set from earlier invocations;
 *  - selected cases count ONLY states whose `runId` matches the current
 *    invocation (a --no-resume run whose capture died must not count an old
 *    state left by a previous runId in the same path);
 *  - NOT_CAPTURED leftovers with `status: FAIL` count as FAIL (never masked).
 * `capturedCases` = selected cases that produced a state in THIS invocation.
 */
export async function aggregateSummaryFromDisk(effective, outputRoot, selected = [], runId) {
  const selectedKeys = new Set()
  for (const plannedCase of selected) {
    selectedKeys.add(`${plannedCase.row.role}\u0000${plannedCase.row.path}\u0000${plannedCase.viewport.key}`)
  }
  let pass = 0
  let fail = 0
  let skip = 0
  for (const plannedCase of effective) {
    const key = `${plannedCase.row.role}\u0000${plannedCase.row.path}\u0000${plannedCase.viewport.key}`
    const state = await readCaseState(outputRoot, plannedCase.row.role, plannedCase.row.path, plannedCase.viewport.key)
    if (!state) continue
    if (selectedKeys.has(key) && state.runId !== runId) continue
    if (state.status === 'PASS') pass += 1
    else if (state.status === 'FAIL') fail += 1
    else if (state.status === 'SKIP') skip += 1
  }
  let capturedCases = 0
  for (const plannedCase of selected) {
    const state = await readCaseState(outputRoot, plannedCase.row.role, plannedCase.row.path, plannedCase.viewport.key)
    if (state && state.runId === runId) capturedCases += 1
  }
  return { pass, fail, skip, capturedCases }
}

function viewportKeyOf(entry) {
  if (typeof entry.viewportKey === 'string') return entry.viewportKey
  if (entry.viewport && typeof entry.viewport.key === 'string') return entry.viewport.key
  return ''
}

function timestampOf(entry) {
  const parsed = Date.parse(entry.finishedAt || entry.startedAt || '')
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Cumulative coverage across invocations. Deduplicates by
 * role+routeTemplate+viewportKey and keeps the entry with the latest
 * timestamp. Never blindly sums run-summaries (would double-count resumed).
 */
export function mergeCoverage(entries) {
  const byKey = new Map()
  for (const entry of entries) {
    const key = `${entry.role}\u0000${entry.routeTemplate}\u0000${viewportKeyOf(entry)}`
    const existing = byKey.get(key)
    if (!existing || timestampOf(entry) > timestampOf(existing)) byKey.set(key, entry)
  }
  return [...byKey.values()]
}

/**
 * Runs the selected (new-capture) cases across roles, recycling the session
 * per role (batchSize=Infinity) or every `batchSize` cases. A session whose
 * `openSession` returns `{ ok:false, reason }` yields SKIP placeholders via
 * `writeSkip` and is never captured.
 */
export async function runRoleLoop({
  roles,
  selected,
  openSession,
  capture,
  closeSession,
  onResult,
  onRoleComplete,
  writeSkip,
  batchSize = Number.POSITIVE_INFINITY,
}) {
  const byRole = new Map()
  for (const plannedCase of selected) {
    if (!byRole.has(plannedCase.row.role)) byRole.set(plannedCase.row.role, [])
    byRole.get(plannedCase.row.role).push(plannedCase)
  }

  let sessionsOpened = 0
  let sessionsClosed = 0
  const results = []

  for (const role of roles) {
    const roleCases = byRole.get(role)
    if (!roleCases || roleCases.length === 0) continue

    const roleResults = []
    let session = await openSession(role)
    sessionsOpened += 1
    if (!session.ok) {
      for (const plannedCase of roleCases) {
        const state = await writeSkip(plannedCase, session.reason || 'credencial ausente')
        roleResults.push(state)
        results.push(state)
        if (onResult) onResult(state)
      }
      await closeSession(session)
      sessionsClosed += 1
      if (onRoleComplete) await onRoleComplete(role, roleResults, { sessionsOpened, sessionsClosed })
      continue
    }

    // A sessão corrente é sempre fechada, mesmo se capture/onResult lançar —
    // nenhum browser/context vaza para o próximo role ou para o processo.
    let sessionOpen = true
    try {
      for (let index = 0; index < roleCases.length; index += 1) {
        const plannedCase = roleCases[index]
        const state = await capture(session, plannedCase)
        roleResults.push(state)
        results.push(state)
        if (onResult) onResult(state)

        const reachedBatch = Number.isFinite(batchSize) && (index + 1) % batchSize === 0
        if (reachedBatch && index + 1 < roleCases.length) {
          await closeSession(session)
          sessionsClosed += 1
          sessionOpen = false
          session = await openSession(role)
          sessionsOpened += 1
          if (!session.ok) {
            sessionOpen = true
            for (const rest of roleCases.slice(index + 1)) {
              const skipState = await writeSkip(rest, session.reason || 'credencial ausente')
              roleResults.push(skipState)
              results.push(skipState)
              if (onResult) onResult(skipState)
            }
            break
          }
          sessionOpen = true
        }
      }
    } finally {
      if (sessionOpen) {
        await closeSession(session)
        sessionsClosed += 1
      }
    }
    if (onRoleComplete) await onRoleComplete(role, roleResults, { sessionsOpened, sessionsClosed })
  }

  return { sessionsOpened, sessionsClosed, results }
}

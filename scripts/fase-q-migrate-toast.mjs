#!/usr/bin/env node
/* FASE Q 17.012 — migra consumers legados use-toast -> API canonica lib/toast.
 * Escopo bounded: owner + fechamento (24 arquivos).
 * Mapeamento: variant="destructive" -> toast.error; sem variant -> toast.info.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const FILES = [
  'src/components/fechamento/NovoRegistroModal.jsx',
  'src/components/fechamento/RegularizarFechamentoDrawer.jsx',
  'src/components/fechamento/ClientCardMobile.jsx',
  'src/components/fechamento/ClientCard.jsx',
  'src/components/fechamento/BottomSection.jsx',
  'src/pages/owner/PlanoDeAcao.jsx',
  'src/components/owner/strategic/TargetHistoryPanel.jsx',
  'src/components/owner/consulting/ContentTab.jsx',
  'src/components/owner/consulting/ParticipantsModal.jsx',
  'src/components/owner/consulting/EvidenceTab.jsx',
  'src/components/owner/consulting/AnticipationModal.jsx',
  'src/components/owner/consulting/MeetingDrawer.jsx',
  'src/components/owner/home/SecondaryAlerts.jsx',
  'src/components/owner/home/OwnerActionsBlock.jsx',
  'src/components/owner/strategic/EditTargetsDrawer.jsx',
  'src/components/owner/strategic/FiltersDrawer.jsx',
  'src/components/owner/strategic/CreateActionModal.jsx',
  'src/components/owner/actionplan/board/BoardView.jsx',
  'src/components/owner/home/SalesGoalBlock.jsx',
  'src/components/owner/actionplan/board/HistoryTab.jsx',
  'src/components/owner/actionplan/board/EvidenceTab.jsx',
  'src/components/owner/actionplan/board/ExecutionTab.jsx',
  'src/components/owner/consulting/PreparationTab.jsx',
  'src/components/owner/actionplan/calendar/CalendarView.jsx',
]

function extractFields(inner) {
  const fields = {}
  // title / description / variant podem ser expressões arbitrárias (com vírgulas, ternários).
  // Estratégia: procurar top-level `key:` até a vírgula top-level.
  const re = /(\w+):\s*/g
  let m
  const keys = []
  while ((m = re.exec(inner))) {
    const key = m[1]
    const start = m.index + m[0].length
    // encontrar fim: vírgula no nível de profundidade 0 (respeitando ()[]{} e strings/templates)
    let depth = 0
    let quote = null
    let template = null
    let end = start
    let found = false
    for (let i = start; i < inner.length; i++) {
      const ch = inner[i]
      const next = inner[i + 1]
      if (quote) {
        if (ch === '\\') { i++; continue }
        if (ch === quote) quote = null
        continue
      }
      if (template) {
        if (ch === '\\') { i++; continue }
        if (ch === '`') template = null
        continue
      }
      if (ch === '"' || ch === "'") { quote = ch; continue }
      if (ch === '`') { template = true; continue }
      if (ch === '(' || ch === '[' || ch === '{') depth++
      if (ch === ')' || ch === ']' || ch === '}') depth--
      if ((ch === ',' || ch === '}') && depth === 0) {
        end = i
        found = true
        break
      }
    }
    if (!found) end = inner.length
    const value = inner.slice(start, end).trim()
    // remove trailing comma if captured
    if (value.endsWith(',')) fields[key] = value.slice(0, -1).trim()
    else fields[key] = value
    keys.push(key)
  }
  return fields
}

function parseCall(src, startIdx) {
  // src[startIdx] === '(' after 'toast'
  let depth = 0
  let quote = null
  let template = null
  for (let i = startIdx; i < src.length; i++) {
    const ch = src[i]
    if (quote) {
      if (ch === '\\') { i++; continue }
      if (ch === quote) quote = null
      continue
    }
    if (template) {
      if (ch === '\\') { i++; continue }
      if (ch === '`') template = null
      continue
    }
    if (ch === '"' || ch === "'") { quote = ch; continue }
    if (ch === '`') { template = true; continue }
    if (ch === '(') depth++
    if (ch === ')') {
      depth--
      if (depth === 0) return { end: i + 1, body: src.slice(startIdx + 1, i) }
    }
  }
  return null
}

function transformCall(body) {
  // body = '{ title: X, description: Y, variant: "destructive" }'
  const trimmed = body.trim()
  if (!trimmed.startsWith('{')) return null // chamada nao-objeto (nao deve ocorrer)
  const inner = trimmed.slice(1, trimmed.length - 1)
  const f = extractFields(inner)
  const destructive = /["']destructive["']/.test(f.variant || '')
  const kind = destructive ? 'error' : 'info'
  const title = f.title ?? "''"
  const opts = []
  if (f.description) opts.push(`description: ${f.description}`)
  const optsStr = opts.length ? `{ ${opts.join(', ')} }` : ''
  return `toast.${kind}(${title}${optsStr ? `, ${optsStr}` : ''})`
}

let totalCalls = 0
for (const file of FILES) {
  let src = fs.readFileSync(file, 'utf8')
  const orig = src

  // 1) import
  src = src.replace(
    /import\s*\{\s*useToast\s*\}\s*from\s*["']@\/components\/ui\/use-toast["'];?/,
    `import { toast } from '@/lib/toast'`,
  )
  // 2) destructure const { toast } = useToast();
  src = src.replace(/^\s*const\s*\{\s*toast\s*\}\s*=\s*useToast\(\);\s*$/gm, '')
  // 3) transform toast({ ... }) calls (regex para achar inicio "toast({")
  const callRe = /toast\(\{/g
  let m
  const out = []
  let last = 0
  while ((m = callRe.exec(src))) {
    const openParen = m.index + 'toast'.length
    const res = parseCall(src, openParen)
    if (!res) { console.error('PARSE FAIL', file, m.index); process.exit(1) }
    const transformed = transformCall(res.body)
    if (!transformed) { console.error('TRANSFORM FAIL', file, m.index); process.exit(1) }
    out.push(src.slice(last, m.index))
    out.push(transformed)
    last = res.end
    totalCalls++
    callRe.lastIndex = res.end
  }
  out.push(src.slice(last))
  src = out.join('')

  if (src !== orig) {
    fs.writeFileSync(file, src)
    console.log('OK', file)
  } else {
    console.log('NOCHANGE', file)
  }
}
console.log('total toast() calls transformadas:', totalCalls)

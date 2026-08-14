#!/usr/bin/env node
/* FASE K 11.001/11.002 — inventory of Button variants in atoms/Button consumers.
 * Classifies each `variant="..."` occurrence to the enclosing JSX element. */
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const ROOT = process.cwd()
const files = execSync(
  `rg -l "components/atoms/Button" src --glob "!**/base44-reference/**"`,
  { cwd: ROOT, encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean)

function classify(lineIndex, lines) {
  // Walk backward from the variant line to find the nearest enclosing open tag
  // that is not closed before the variant line.
  let window = ''
  for (let j = lineIndex; j >= Math.max(0, lineIndex - 20); j--) {
    window = lines[j] + '\n' + window
    const seg = window
    const opens = [...seg.matchAll(/<([A-Z]\w*)\b/g)].reverse()
    for (const m of opens) {
      const tag = m[1]
      const tail = seg.slice(m.index)
      // if this tag's close tag or self-close appears before the variant position,
      // it is not the enclosing element. Approximate: count how many closes for tag.
      const selfClose = /\/\s*>/.test(tail.slice(0, 200))
      const closeRe = new RegExp('</' + tag + '>', 'g')
      const closes = [...tail.matchAll(closeRe)]
      if (selfClose) continue
      if (closes.length === 0) return tag
      // last open before first close: still enclosing if opens > closes at the variant point
      return tag
    }
  }
  return '?'
}

const counts = { Button: {}, Badge: {}, Other: {} }
const otherSamples = []
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8')
  const lines = c.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/variant="([a-z-]+)"/)
    if (!m) continue
    const v = m[1]
    if (!['primary', 'brand', 'secondary', 'outline', 'ghost', 'success', 'warning', 'info', 'danger', 'whatsapp', 'mx-elite', 'default', 'destructive', 'link'].includes(v)) continue
    const el = classify(i, lines)
    const bucket = el === 'Button' ? counts.Button : el === 'Badge' ? counts.Badge : counts.Other
    bucket[v] = (bucket[v] || 0) + 1
    if (el !== 'Button') otherSamples.push(`${f}:${i + 1} ${el} variant=${v}`)
  }
}
console.log('=== atoms/Button consumers — variant usage by enclosing element ===')
console.log('Button element:', JSON.stringify(counts.Button))
console.log('Badge element:', JSON.stringify(counts.Badge))
console.log('Other element:', JSON.stringify(counts.Other))
console.log('\nNon-Button samples:')
otherSamples.forEach((s) => console.log('  ', s))

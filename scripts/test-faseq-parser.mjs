// Test harness for fase-q parser
const src = 'toast({ title: `Acao ${x} criada`, description: err?.message || "Erro desconhecido", variant: "destructive" })'
function parseCall(src, startIdx) {
  let depth = 0, quote = null, template = null
  for (let i = startIdx; i < src.length; i++) {
    const ch = src[i]
    if (quote) { if (ch === '\\') { i++; continue } if (ch === quote) quote = null; continue }
    if (template) { if (ch === '\\') { i++; continue } if (ch === '`') template = null; continue }
    if (ch === '"' || ch === "'") { quote = ch; continue }
    if (ch === '`') { template = true; continue }
    if (ch === '(') depth++
    if (ch === ')') { depth--; if (depth === 0) return { end: i + 1, body: src.slice(startIdx + 1, i) } }
  }
  return null
}
const openParen = src.indexOf('(')
const res = parseCall(src, openParen)
console.log('body:', res.body)

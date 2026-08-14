// Test extractFields + transformCall
const body = '{ title: `Acao ${x} criada`, description: err?.message || "Erro desconhecido", variant: "destructive" }'

function extractFields(inner) {
  const fields = {}
  const re = /(\w+):\s*/g
  let m
  while ((m = re.exec(inner))) {
    const key = m[1]
    const start = m.index + m[0].length
    let depth = 0
    let quote = null
    let template = null
    let end = start
    let found = false
    for (let i = start; i < inner.length; i++) {
      const ch = inner[i]
      if (quote) { if (ch === '\\') { i++; continue } if (ch === quote) quote = null; continue }
      if (template) { if (ch === '\\') { i++; continue } if (ch === '`') template = null; continue }
      if (ch === '"' || ch === "'") { quote = ch; continue }
      if (ch === '`') { template = true; continue }
      if (ch === '(' || ch === '[' || ch === '{') depth++
      if (ch === ')' || ch === ']' || ch === '}') depth--
      if ((ch === ',' || ch === '}') && depth === 0) { end = i; found = true; break }
    }
    if (!found) end = inner.length
    const value = inner.slice(start, end).trim()
    fields[key] = value.endsWith(',') ? value.slice(0, -1).trim() : value
  }
  return fields
}

function transformCall(body) {
  const trimmed = body.trim()
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

console.log('fields:', JSON.stringify(extractFields(body.slice(1, -1))))
console.log('transform:', transformCall(body))

// sem variant
const body2 = '{ title: "Acao aprovada com sucesso.", description: "detalhe" }'
console.log('transform2:', transformCall(body2))

// title sem aspas (variavel)
const body3 = '{ title: successMessage }'
console.log('transform3:', transformCall(body3))

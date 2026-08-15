#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { loadEnvFile } from 'node:process'

try { loadEnvFile('.env') } catch { /* env may already be set */ }

const token = process.env.SUPABASE_ACCESS_TOKEN
const project = 'fbhcmzzgwjdgkctlfvbo'
const sql = readFileSync(process.argv[2], 'utf8')

const res = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})
const text = await res.text()
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text}`)
  process.exit(1)
}
try {
  const json = JSON.parse(text)
  console.log(typeof json === 'string' ? json : JSON.stringify(json, null, 2))
} catch {
  console.log(text)
}

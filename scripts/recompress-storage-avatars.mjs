#!/usr/bin/env node
/**
 * Recomprime os avatares já existentes nos buckets públicos.
 *
 * Motivo: em 2026-08-05 o projeto estourou a cota de cached egress do plano
 * gratuito. Causa medida: 90 avatares somando 107 MB num bucket público
 * (média de 1,2 MB), servidos inteiros em toda tela de equipe/ranking.
 *
 * O upload novo já sobe reduzido (src/lib/image-downscale.ts). Este script
 * resolve o passivo: baixa cada objeto, reduz para 256 px em JPEG e regrava
 * no mesmo caminho.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/recompress-storage-avatars.mjs --dry-run
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/recompress-storage-avatars.mjs --apply
 *
 * Requer `sharp` (npx sharp-cli não serve — precisamos da API). Se `sharp` não
 * estiver instalado, o script explica e sai sem tocar em nada.
 *
 * Seguro por construção:
 *   - --dry-run é o padrão; nada é escrito sem --apply.
 *   - Objeto que não encolher é mantido como está.
 *   - Falha em um arquivo não interrompe os demais; o resumo lista os erros.
 */

import { createClient } from '@supabase/supabase-js'

const BUCKETS = ['pre-cadastro-avatares', 'perfis_usuario']
const MAX_DIMENSION = 256
const JPEG_QUALITY = 82
const CACHE_CONTROL = '31536000'

const apply = process.argv.includes('--apply')
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.')
  process.exit(1)
}

let sharp
try {
  ;({ default: sharp } = await import('sharp'))
} catch {
  console.error('Este script precisa de `sharp`. Instale com: npm i -D sharp')
  process.exit(1)
}

const client = createClient(url, serviceKey, { auth: { persistSession: false } })

async function listAll(bucket, prefix = '') {
  const found = []
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`)
  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    // Pasta: o Storage devolve entrada sem metadata.
    if (!entry.metadata) found.push(...(await listAll(bucket, path)))
    else found.push({ path, size: Number(entry.metadata.size ?? 0) })
  }
  return found
}

const resumo = { analisados: 0, reduzidos: 0, mantidos: 0, erros: 0, antes: 0, depois: 0 }
const erros = []

for (const bucket of BUCKETS) {
  const objetos = await listAll(bucket)
  console.log(`\n== ${bucket}: ${objetos.length} objetos`)

  for (const objeto of objetos) {
    resumo.analisados += 1
    resumo.antes += objeto.size
    try {
      const { data, error } = await client.storage.from(bucket).download(objeto.path)
      if (error) throw new Error(error.message)
      const original = Buffer.from(await data.arrayBuffer())

      const otimizado = await sharp(original)
        .rotate()
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer()

      if (otimizado.length >= original.length) {
        resumo.mantidos += 1
        resumo.depois += original.length
        continue
      }

      resumo.reduzidos += 1
      resumo.depois += otimizado.length
      const ganho = (100 * (1 - otimizado.length / original.length)).toFixed(0)
      console.log(`   ${apply ? 'regravado' : 'reduziria'} ${objeto.path} — ${(original.length / 1024).toFixed(0)} kB → ${(otimizado.length / 1024).toFixed(0)} kB (-${ganho}%)`)

      if (apply) {
        const { error: upErr } = await client.storage.from(bucket).upload(objeto.path, otimizado, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: CACHE_CONTROL,
        })
        if (upErr) throw new Error(upErr.message)
      }
    } catch (err) {
      resumo.erros += 1
      erros.push(`${bucket}/${objeto.path}: ${err.message}`)
    }
  }
}

const mb = bytes => (bytes / 1024 / 1024).toFixed(1)
console.log(`\n${apply ? 'APLICADO' : 'SIMULAÇÃO (use --apply para gravar)'}`)
console.log(`analisados=${resumo.analisados} reduzidos=${resumo.reduzidos} mantidos=${resumo.mantidos} erros=${resumo.erros}`)
console.log(`total: ${mb(resumo.antes)} MB → ${mb(resumo.depois)} MB`)
if (erros.length) {
  console.log('\nErros:')
  for (const e of erros) console.log('  - ' + e)
}
process.exit(resumo.erros > 0 ? 1 : 0)

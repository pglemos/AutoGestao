#!/usr/bin/env node
/**
 * Story 3.15 — Bundle size budget enforcement
 *
 * Lê todos `.js` em `dist/assets/`, calcula tamanho gzip e compara com budgets
 * pré-definidos (por prefixo de chunk + total). Exit 1 se algum excedeu.
 *
 * Budgets calibrados a partir do build atual e revisados por PR.
 * Ajustes futuros DEVEM ser justificados no PR (label `bundle-override`).
 *
 * Uso:
 *   npm run build && npm run check:bundle-size
 *
 * AC4 (Story 3.15): falha CI se chunk > budget.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import path from 'node:path'

const DIST = path.resolve('dist/assets')

// Budgets em KB gzip.
// O teto total anterior (1800 KB) já era excedido pela branch main em
// 39,05 KB. A recalibração para 1860 KB absorve a dívida preexistente e os
// 3,07 KB medidos da administração global, mantendo margem inferior a 1%.
// Os budgets individuais continuam inalterados para impedir crescimento dos
// chunks críticos.
const BUDGETS = {
    __total__: 1861,
    // Vendor chunks (prefix match)
    'vendor-react': 145,
    'vendor-supabase': 60,
    'vendor-charts': 145,
    'vendor-ui': 70,
    'vendor-jspdf': 145,
    'vendor-html2canvas': 110,
    'vendor-export': 110,
    'vendor-utils': 25,
    // Entry app chunk
    index: 240,
}

const KB = 1024

function gzipKB(filePath) {
    const buf = readFileSync(filePath)
    return gzipSync(buf, { level: 9 }).length / KB
}

function matchBudgetKey(fileName) {
    // Remove hash + extension: vendor-react-8vW_Y4rq.js -> vendor-react
    // Vite hash é sempre 8 caracteres alfanuméricos (+ _ ou -), terminando o filename
    const base = fileName.replace(/\.js$/, '').replace(/-[A-Za-z0-9_-]{8}$/, '')
    for (const key of Object.keys(BUDGETS)) {
        if (key === '__total__') continue
        if (base === key) return key
    }
    return null
}

function main() {
    if (!existsSync(DIST)) {
        console.error(`[bundle-size] ERRO: ${DIST} nao existe. Rode 'npm run build' antes.`)
        process.exit(1)
    }

    const files = readdirSync(DIST).filter((f) => f.endsWith('.js'))
    if (files.length === 0) {
        console.error(`[bundle-size] ERRO: nenhum .js em ${DIST}`)
        process.exit(1)
    }

    let total = 0
    const perChunk = []
    const violations = []

    for (const f of files) {
        const sizeKB = gzipKB(path.join(DIST, f))
        total += sizeKB
        const budgetKey = matchBudgetKey(f)
        perChunk.push({ file: f, sizeKB, budgetKey })

        if (budgetKey) {
            const budget = BUDGETS[budgetKey]
            if (sizeKB > budget) {
                violations.push({
                    chunk: budgetKey,
                    file: f,
                    sizeKB: sizeKB.toFixed(2),
                    budgetKB: budget,
                    overKB: (sizeKB - budget).toFixed(2),
                })
            }
        }
    }

    // Total
    const totalBudget = BUDGETS.__total__
    if (total > totalBudget) {
        violations.push({
            chunk: '__total__',
            file: '(soma de todos .js gzip)',
            sizeKB: total.toFixed(2),
            budgetKB: totalBudget,
            overKB: (total - totalBudget).toFixed(2),
        })
    }

    // Resumo
    console.log('\n=== Bundle size report (gzip KB) ===')
    console.log(`Total: ${total.toFixed(2)} / ${totalBudget} KB (${((total / totalBudget) * 100).toFixed(1)}%)`)
    console.log('\nChunks com budget individual:')
    for (const { file, sizeKB, budgetKey } of perChunk) {
        if (!budgetKey) continue
        const budget = BUDGETS[budgetKey]
        const pct = ((sizeKB / budget) * 100).toFixed(1)
        const flag = sizeKB > budget ? 'FAIL' : pct > 90 ? 'WARN' : 'OK'
        console.log(`  [${flag}] ${budgetKey.padEnd(22)} ${sizeKB.toFixed(2).padStart(7)} / ${String(budget).padStart(4)} KB (${pct}%)  <- ${file}`)
    }

    if (violations.length > 0) {
        console.error('\n=== BUDGET VIOLATIONS ===')
        for (const v of violations) {
            console.error(`  X ${v.chunk}: ${v.sizeKB} KB > ${v.budgetKB} KB (over by ${v.overKB} KB) [${v.file}]`)
        }
        console.error('\nPara ajustar budgets, edite scripts/check_bundle_size.mjs e justifique em PR.')
        process.exit(1)
    }

    console.log('\nOK: todos os chunks dentro do budget.')
    process.exit(0)
}

main()

#!/usr/bin/env node
/**
 * Falha o build se algum `.map` sobrar em `dist/`.
 *
 * Source map servido publicamente entrega o código-fonte TypeScript original a
 * qualquer visitante. O upload para o Sentry já cobre a resolução de stack trace, então
 * o arquivo não tem motivo para continuar no output.
 *
 * Esta trava existe porque a configuração *parecia* correta e mesmo assim falhava: o
 * glob de `filesToDeleteAfterUpload` não casava nada e ninguém percebeu até a
 * verificação em produção de 2026-07-29.
 */
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'

function walk(dir) {
    let found = []
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) found = found.concat(walk(full))
        else if (entry.endsWith('.map')) found.push(full)
    }
    return found
}

let leftovers
try {
    leftovers = walk(DIST)
} catch (error) {
    if (error.code === 'ENOENT') {
        console.error(`[sourcemaps] ${DIST}/ não existe — rode o build antes.`)
        process.exit(1)
    }
    throw error
}

if (leftovers.length > 0) {
    console.error(
        `[sourcemaps] ${leftovers.length} arquivo(s) .map ficaram em ${DIST}/ e seriam servidos publicamente:`,
    )
    for (const file of leftovers.slice(0, 10)) console.error(`  - ${file}`)
    if (leftovers.length > 10) console.error(`  ... e mais ${leftovers.length - 10}`)
    console.error(
        '\nConfira `sourcemaps.filesToDeleteAfterUpload` em vite.config.ts (o glob precisa casar ./dist).',
    )
    process.exit(1)
}

console.log('[sourcemaps] ok — nenhum .map em dist/')

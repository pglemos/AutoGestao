#!/usr/bin/env node
/**
 * Guard de dimensões (T4.8) — "Tokens usados por primitives".
 *
 * Critério: largura/altura arbitrária em classes Tailwind deve estar na
 * escala de spacing 4px/8px (T4.5). Hairlines 1/2px permitidos.
 *
 * Detecta:
 *   1. TSX/TS/JSX: `w-[Npx]` / `h-[Npx]` fora de múltiplo de 4
 *      (exceção: 1px/2px hairlines)
 *
 * Page roots (`src/pages/**`, `src/App.tsx`, `src/layouts/**`):
 * política zero-tolerance.
 *
 * Uso: node scripts/lint-dimensions.mjs
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

let failures = 0;
const violations = [];

function report(file, line, desc) {
  violations.push({ file, line, desc });
}

const tsxFiles = execSync(`rg -l "\\b(w|h)-\\[[0-9]+px\\]" src --glob '*.{tsx,ts,jsx}' -g '!**/*.test.*' -g '!**/base44-reference/**' -g '!**/_stories/**' 2>/dev/null || true`)
  .toString().trim().split('\n').filter(Boolean);

for (const file of tsxFiles) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const dimRe = /\b(?<prop>w|h)-\[(?<value>\d+px)\]/g;
    let dm;
    while ((dm = dimRe.exec(line)) !== null) {
      const v = dm.groups.value;
      const n = parseInt(v, 10);
      if (n === 1 || n === 2) continue; // hairline
      if (n % 4 !== 0) {
        report(file, i + 1, `${dm.groups.prop}-[${v}]: fora da escala 4px/8px (múltiplo de 4)`);
      }
    }
  }
}

const rootFiles = ['src/App.tsx', ...execSync(`ls src/pages/*.tsx src/pages/**/*.tsx 2>/dev/null || true`).toString().trim().split('\n').filter(Boolean)];
const rootViolations = violations.filter(v => rootFiles.some(f => v.file === f));

if (violations.length) {
  console.log(`\n=== violações de dimensões (${violations.length}) ===`);
  for (const v of violations) {
    console.log(`${v.file}:${v.line}  ${v.desc}`);
  }
}

if (rootViolations.length) {
  console.log(`\n[FAIL] ${rootViolations.length} violação(ões) em page roots (obrigatório zero)`);
  failures += rootViolations.length;
} else {
  console.log('[OK] page roots sem violações de dimensões');
}

console.log(`--- violações totais: ${violations.length} | page roots: ${rootViolations.length} | falhas: ${failures}`);
process.exit(failures === 0 ? 0 : 1);

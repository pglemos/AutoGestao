#!/usr/bin/env node
/**
 * Guard de tipografia (T4.8) — "Tokens usados por primitives".
 *
 * Critério: tamanho de fonte, line-height e letter-spacing derivam da
 * escala canônica (`@utility text-*` em semantic.css + Tailwind built-ins).
 *
 * Detecta:
 *   1. TSX/TS/JSX: `text-[Npx]` fora da escala canônica
 *      (12/14/16/18/20/24/30/36/48px)
 *   2. TSX/TS/JSX: `leading-[Npx]` arbitrário (use `leading-*` ou omita)
 *   3. TSX/TS/JSX: `tracking-[Nem]` fora da escala canônica
 *      (0.06/0.08/0.1/0.12/0.14/0.15em — documentada em semantic.css)
 *
 * Page roots (`src/pages/**`, `src/App.tsx`, `src/layouts/**`):
 * política zero-tolerance.
 *
 * Uso: node scripts/lint-typography.mjs
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const FONT_PX = new Set([12, 14, 16, 18, 20, 24, 30, 36, 48]);
const TRACKING_EM = new Set([0.06, 0.08, 0.1, 0.12, 0.14, 0.15]);
const ROOT_GLOB = 'src/pages/**/*.{tsx,ts} src/App.tsx src/layouts/**/*.{tsx,ts}';

let failures = 0;
const violations = [];

function report(file, line, desc) {
  violations.push({ file, line, desc });
}

const tsxFiles = execSync(`rg -l "text-\\[|leading-\\[|tracking-\\[" src --glob '*.{tsx,ts,jsx}' -g '!**/*.test.*' -g '!**/base44-reference/**' -g '!**/_stories/**' 2>/dev/null || true`)
  .toString().trim().split('\n').filter(Boolean);

for (const file of tsxFiles) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const textRe = /text-\[(?<value>[^\]]+)\]/g;
    let tm;
    while ((tm = textRe.exec(line)) !== null) {
      const v = tm.groups.value;
      if (!/^\d+px$/.test(v)) continue;
      const n = parseInt(v, 10);
      if (!FONT_PX.has(n)) {
        report(file, i + 1, `text-[${v}]: fora da escala canônica (${[...FONT_PX].join('/')}px). Use @utility text-* (caption/body-sm/body/h5/h4/h3/h2/h1/display)`);
      }
    }

    const leadRe = /leading-\[(?<value>[^\]]+)\]/g;
    let lm;
    while ((lm = leadRe.exec(line)) !== null) {
      const v = lm.groups.value;
      if (/^\d+(\.\d+)?(px|rem|em)$/.test(v)) {
        report(file, i + 1, `leading-[${v}]: line-height arbitrário. Use leading-* (Tailwind built-in) ou omita`);
      }
    }

    const trackRe = /tracking-\[(?<value>[^\]]+)\]/g;
    let km;
    while ((km = trackRe.exec(line)) !== null) {
      const v = km.groups.value;
      const m = v.match(/^(-?\d*\.?\d+)em$/);
      if (!m) continue;
      const n = parseFloat(m[1]);
      if (!TRACKING_EM.has(n)) {
        report(file, i + 1, `tracking-[${v}]: fora da escala canônica (${[...TRACKING_EM].join('/')}em)`);
      }
    }
  }
}

const rootFiles = ['src/App.tsx', ...execSync(`ls src/pages/*.tsx src/pages/**/*.tsx 2>/dev/null || true`).toString().trim().split('\n').filter(Boolean)];
const rootViolations = violations.filter(v => rootFiles.some(f => v.file === f));

if (violations.length) {
  console.log(`\n=== violações de tipografia (${violations.length}) ===`);
  for (const v of violations) {
    console.log(`${v.file}:${v.line}  ${v.desc}`);
  }
}

if (rootViolations.length) {
  console.log(`\n[FAIL] ${rootViolations.length} violação(ões) em page roots (obrigatório zero)`);
  failures += rootViolations.length;
} else {
  console.log('[OK] page roots sem violações de tipografia');
}

console.log(`--- violações totais: ${violations.length} | page roots: ${rootViolations.length} | falhas: ${failures}`);
process.exit(failures === 0 ? 0 : 1);

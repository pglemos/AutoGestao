#!/usr/bin/env node
/**
 * Guard de motion (T4.7) — "Tokens usados por primitives".
 *
 * Critério: toda duração/easing de interação deriva da escala canônica
 * `--mx-duration-*` / `--mx-easing-*` (primitives, MD3). Aliases do @theme:
 * `duration-{instant,fast,normal,slow,deliberate}` / `ease-{standard,enter,exit,emphasized}`.
 *
 * Detecta:
 *   1. CSS: `transition`/`animation` finita com duração literal (sem var(--mx-duration-*)
 *   2. CSS: animações ambientais contínuas permitidas apenas no padrão
 *      `>=1s (ease-in-out|linear) infinite` (float/glow/drift/pulse/spin)
 *   3. TSX/TS/JSX: `duration-[Nms]` fora da escala canônica (150/200/300/600ms)
 *   4. TSX/TS/JSX: `ease-[...]` arbitrário (usar alias `ease-{standard|enter|exit|emphasized}`)
 *   5. TSX/TS/JSX: `animate-[...]` arbitrário (exceção: spin 1.5s sob motion-reduce)
 *   6. Inline styles JSX: `transition:` com duração literal sem var(--mx-duration-*)
 *   7. Framer Motion: `transition: { duration: N }` fora de {0.15, 0.2, 0.3, 0.6}
 *
 * Uso: node scripts/lint-motion.mjs
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const DURATION_MS = new Set([150, 200, 300, 600]);
const FRAMER_S = new Set([0.15, 0.2, 0.3, 0.6]);
const AMBIENT_RE = /^[a-z0-9-]+\s+(\d+(\.\d+)?s|\d+ms)\s+(ease-in-out|linear)\s+infinite$/;
const SPIN_REDUCE = 'spin_1.5s_linear_infinite';
const ROOT_GLOB = 'src/pages/**/*.{tsx,ts} src/App.tsx src/layouts/**/*.{tsx,ts}';

let failures = 0;
const violations = [];

function report(file, line, desc) {
  violations.push({ file, line, desc });
}

// 1 + 2. CSS — transições/animações com duração literal
const cssFiles = [
  'src/index.css',
  'src/styles/internal-mx-manager-scope.css',
  'src/design-system/tokens/semantic.css',
  'src/design-system/tokens/components.css',
];
for (const file of cssFiles) {
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }
  const lines = src.split('\n');
  const durationLit = /\b\d+(\.\d+)?(ms|s)\b/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s*(transition[a-z-]*|animation[a-z-]*):\s*(.+);$/);
    if (!m) continue;
    const prop = m[1];
    const value = m[2];

    if (prop === 'transition' || prop === 'transition-property') {
      if (durationLit.test(value) && !value.includes('var(--mx-duration-')) {
        report(file, i + 1, `${prop}: duração literal (use var(--mx-duration-*) var(--mx-easing-*))`);
      }
      continue;
    }
    // animation / animation-duration / animation-timing-function
    if (prop === 'animation' && !value.includes('infinite')) {
      if (durationLit.test(value) && !value.includes('var(--mx-duration-')) {
        report(file, i + 1, `animation: duração literal em animação finita (use var(--mx-duration-*))`);
      }
      continue;
    }
    if (prop === 'animation' && value.includes('infinite')) {
      if (durationLit.test(value) && !value.includes('var(--mx-duration-') && !AMBIENT_RE.test(value.trim())) {
        report(file, i + 1, `animation: ambiental fora do padrão (>=1s ease-in-out|linear infinite)`);
      }
      continue;
    }
  }
}

// 3-7. TSX/TS/JSX — classes e transições arbitrárias
const tsxFiles = execSync(`rg -l "duration-\\[|ease-\\[|animate-\\[|transition:\\s*['\\"]|duration: [0-9]" src --glob '*.{tsx,ts,jsx}' -g '!**/*.test.*' -g '!**/base44-reference/**' 2>/dev/null || true`)
  .toString().trim().split('\n').filter(Boolean);
for (const file of tsxFiles) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const durRe = /duration-\[(?<value>[^\]]+)\]/g;
    let dm;
    while ((dm = durRe.exec(line)) !== null) {
      const v = dm.groups.value;
      if (v.startsWith('var(--mx-duration-')) continue;
      const n = parseInt(v, 10);
      if (Number.isNaN(n) || !DURATION_MS.has(n)) {
        report(file, i + 1, `duration-[${v}]: fora da escala canônica (${[...DURATION_MS].join('/')}ms)`);
      }
    }

    const easeRe = /ease-\[(?<content>[^\]]+)\]/g;
    let em;
    while ((em = easeRe.exec(line)) !== null) {
      report(file, i + 1, `ease-[${em.groups.content}]: use alias ease-{standard|enter|exit|emphasized}`);
    }

    const animRe = /animate-\[(?<content>[^\]]+)\]/g;
    let am;
    while ((am = animRe.exec(line)) !== null) {
      const content = am.groups.content;
      if (content !== SPIN_REDUCE) {
        report(file, i + 1, 'animate-[' + content + ']: fora da whitelist (apenas spin_1.5s_linear_infinite sob motion-reduce)');
      }
    }

    const inlineRe = /transition:\s*["'](?<value>[^"']+)["']/g;
    let im;
    while ((im = inlineRe.exec(line)) !== null) {
      const v = im.groups.value;
      if (/\b\d+(\.\d+)?(ms|s)\b/.test(v) && !v.includes('var(--mx-duration-')) {
        report(file, i + 1, `transition inline: duração literal sem var(--mx-duration-*)`);
      }
    }

    const framerRe = /transition:\s*\{\s*duration:\s*(?<value>[\d.]+)\s*\}/g;
    let fm;
    while ((fm = framerRe.exec(line)) !== null) {
      const v = parseFloat(fm.groups.value);
      if (v !== 0 && !FRAMER_S.has(v)) {
        report(file, i + 1, `transition: { duration: ${v} } — fora da escala (${[...FRAMER_S].join('/')}s)`);
      }
    }
  }
}

// Page roots — regra estrita: NENHUMA violação permitida
const rootFiles = ['src/App.tsx', ...execSync(`ls src/pages/*.tsx src/pages/**/*.tsx 2>/dev/null || true`).toString().trim().split('\n').filter(Boolean)];
const rootViolations = violations.filter(v => rootFiles.some(f => v.file === f));

if (violations.length) {
  console.log(`\n=== violações de motion (${violations.length}) ===`);
  for (const v of violations) {
    console.log(`${v.file}:${v.line}  ${v.desc}`);
  }
}

if (rootViolations.length) {
  console.log(`\n[FAIL] ${rootViolations.length} violação(ões) em page roots (obrigatório zero)`);
  failures += rootViolations.length;
} else {
  console.log('[OK] page roots sem violações de motion');
}

console.log(`--- violações totais: ${violations.length} | page roots: ${rootViolations.length} | falhas: ${failures}`);
process.exit(failures === 0 ? 0 : 1);

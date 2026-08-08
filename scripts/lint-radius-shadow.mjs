#!/usr/bin/env node
/**
 * Guard de raio e sombra (T4.6) — "Tokens usados por primitives".
 *
 * Critério: tokens do @theme (`--radius-*`, `--shadow-*`) DEVEM derivar dos
 * primitivos `--mx-radius-*` / `--mx-shadow-*` (única fonte canônica).
 *
 * Detecta:
 *   1. CSS: `--radius-*` / `--shadow-*` com valor literal (não-var) no @theme
 *   2. TSX/TS: `rounded-[Npx]` fora da escala canônica
 *      (4, 6, 8, 10, 12, 16, 20, 24, 9999px)
 *   3. TSX/TS: `shadow-[...]` com elevação neutra literal (slate-900)
 *      — exceções documentadas: sombras direcionais de coluna sticky,
 *        glows coloridos (cor != slate-900), drop-shadow de texto
 *
 * Uso: node scripts/lint-radius-shadow.mjs
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const RADIUS_SCALE = new Set([4, 6, 8, 10, 12, 16, 20, 24, 9999]);
const ROOT_GLOB = 'src/pages/**/*.{tsx,ts} src/App.tsx src/layouts/**/*.{tsx,ts}';

let failures = 0;
const violations = [];

function report(file, line, desc) {
  violations.push({ file, line, desc });
}

// 1. CSS — tokens do @theme derivam de primitives
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
  const re = /--(radius|shadow)(?:[\w-]*):\s*([^;]+);/g;
  for (let i = 0; i < lines.length; i++) {
    let m;
    const lineRe = /--(radius|shadow)([\w-]*):\s*([^;]+);/g;
    while ((m = lineRe.exec(lines[i])) !== null) {
      const [, kind, suffix, value] = m;
      const tokenName = `--${kind}${suffix}`;
      if (tokenName.startsWith('--shadow-mx-glow-')) {
        if (!value.includes('var(--mx-')) {
          report(file, i + 1, `${tokenName}: glow deve usar cor primitive (var(--mx-*))`);
        }
        continue;
      }
      const requiredVar = kind === 'radius' ? 'var(--mx-radius-' : 'var(--mx-shadow-';
      if (!value.includes(requiredVar)) {
        report(file, i + 1, `${tokenName}: valor literal (deve derivar de ${requiredVar}*)`);
      }
    }
  }
}

// 2 + 3. TSX/TS — classes arbitrárias de raio/sombra
const tsxFiles = execSync(`rg -l "rounded-\\[|shadow-\\[" src --glob '*.{tsx,ts}' -g '!**/*.test.*' 2>/dev/null || true`)
  .toString().trim().split('\n').filter(Boolean);
for (const file of tsxFiles) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const roundedRe = /rounded-\[(?<value>\d+(?:\.\d+)?)px\]/g;
    let rm;
    while ((rm = roundedRe.exec(line)) !== null) {
      const v = parseFloat(rm.groups.value);
      if (!RADIUS_SCALE.has(v)) {
        report(file, i + 1, `rounded-[${rm.groups.value}px]: fora da escala canônica (${[...RADIUS_SCALE].join('/')}px)`);
      }
    }

    const shadowRe = /(?:^|[\s'"])shadow-\[(?<content>[^\]]+)\]/g;
    let sm;
    while ((sm = shadowRe.exec(line)) !== null) {
      const content = sm.groups.content;
      if (content.includes('var(--mx')) continue; // token → OK
      if (content.includes('rgba(15,23,42') || content.includes('rgb(15 23 42')) {
        // elevação neutra (slate-900) — só permitida como sombra direcional de coluna sticky
        const isSticky = /^-?\d+px_0_\d+px_-10px/.test(content.replace(/\(15,23,42,[^)]*\)/g, '').replace(/\s/g, '_').split('rgba')[0]);
        if (!isSticky) {
          report(file, i + 1, `shadow-[${content}]: elevação neutra literal (use token shadow-mx-*)`);
        }
      }
      // cores != slate-900 → glow colorido / focus ring → exceção documentada → OK
    }
  }
}

// 4. Page roots — regra estrita: NENHUMA violação permitida
const rootFiles = ['src/App.tsx', ...execSync(`ls src/pages/*.tsx src/pages/**/*.tsx 2>/dev/null || true`).toString().trim().split('\n').filter(Boolean)];
const rootViolations = violations.filter(v => rootFiles.some(f => v.file === f));

if (violations.length) {
  console.log(`\n=== violações de raio/sombra (${violations.length}) ===`);
  for (const v of violations) {
    console.log(`${v.file}:${v.line}  ${v.desc}`);
  }
}

if (rootViolations.length) {
  console.log(`\n[FAIL] ${rootViolations.length} violação(ões) em page roots (obrigatório zero)`);
  failures += rootViolations.length;
} else {
  console.log('[OK] page roots sem violações de raio/sombra');
}

console.log(`--- violações totais: ${violations.length} | page roots: ${rootViolations.length} | falhas: ${failures}`);
process.exit(failures === 0 ? 0 : 1);

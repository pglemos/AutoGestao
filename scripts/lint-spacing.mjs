#!/usr/bin/env node
/**
 * Guard da escala de spacing canônica (T4.5).
 *
 * Escala canônica baseada em 4px/8px:
 *   - px: múltiplos de 4 (0,4,8,12,16,20,24,28,32,36,40,44,48,52,56,60,64,72,80,88,96,112,128,160,192,224,256,320,384...)
 *         + hairlines 1px/2px permitidos (bordas finas)
 *   - rem: múltiplos de 0.25 (0.25,0.5,0.75,1,1.25,1.5,1.75,2,2.5,3,4,5,6,8,10,12,16,20,24)
 *
 * Detecta:
 *   1. CSS: padding/margin/gap/inset (top/right/bottom/left) com valores px/rem fora da escala
 *   2. TSX/TS: classes arbitrárias de espaçamento ([Npx]/[Nrem]) fora da escala
 *
 * Uso: node scripts/lint-spacing.mjs
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CSS_PROPS = 'padding|padding-top|padding-right|padding-bottom|padding-left|margin|margin-top|margin-right|margin-bottom|margin-left|gap|row-gap|column-gap|top|right|bottom|left';
const SPACING_PREFIXES = 'p|m|px|py|pt|pb|pl|pr|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|inset|inset-x|inset-y|top|right|bottom|left';

const ROOT_GLOB = 'src/pages/**/*.{tsx,ts} src/App.tsx src/layouts/**/*.{tsx,ts}';

let failures = 0;
const violations = [];

function checkPx(file, prop, value, line) {
  const v = parseFloat(value);
  if (Number.isNaN(v)) return;
  const isHairline = v === 1 || v === 2;
  const inScale = v % 4 === 0;
  if (!isHairline && !inScale) {
    violations.push({ file, line, desc: `${prop}: ${value}px (fora da escala 4px/8px)` });
  }
}

function checkRem(file, prop, value, line) {
  const v = parseFloat(value);
  if (Number.isNaN(v)) return;
  const px = v * 16;
  const isHairline = px === 1 || px === 2;
  const inScale = px % 4 === 0;
  if (!isHairline && !inScale) {
    violations.push({ file, line, desc: `${prop}: ${value}rem (fora da escala 4px/8px)` });
  }
}

// 1. CSS
const cssFiles = [
  'src/index.css',
  'src/styles/internal-mx-canonical-template.css',
  'src/design-system/tokens/semantic.css',
  'src/design-system/tokens/components.css',
];
for (const file of cssFiles) {
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }
  const lines = src.split('\n');
  const re = new RegExp(`(${CSS_PROPS}):\\s*([0-9.]+)(px|rem)\\b`, 'g');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(new RegExp(`(${CSS_PROPS}):\\s*([0-9.]+)(px|rem)\\b`));
    if (m) {
      if (m[3] === 'px') checkPx(file, m[1], m[2], i + 1);
      else checkRem(file, m[1], m[2], i + 1);
    }
  }
}

// 2. TSX/TS — classes arbitrárias de spacing
const tsxFiles = execSync(`rg -l "-\\[[0-9.]+(px|rem)\\]" src --glob '*.{tsx,ts}' -g '!**/*.test.*' 2>/dev/null || true`)
  .toString().trim().split('\n').filter(Boolean);
for (const file of tsxFiles) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const re = new RegExp(`(?<prefix>${SPACING_PREFIXES})-\\[(?<value>[0-9.]+)(?<unit>px|rem)\\]`, 'g');
  for (let i = 0; i < lines.length; i++) {
    let m;
    const lineRe = new RegExp(`(?<prefix>${SPACING_PREFIXES})-\\[(?<value>[0-9.]+)(?<unit>px|rem)\\]`, 'g');
    while ((m = lineRe.exec(lines[i])) !== null) {
      const { value, unit } = m.groups;
      if (unit === 'px') checkPx(file, `class *-${value}px`, value, i + 1);
      else checkRem(file, `class *-${value}rem`, value, i + 1);
    }
  }
}

// 3. Page roots — regra estrita: NENHUMA violação permitida
const rootFiles = ['src/App.tsx', ...execSync(`ls src/pages/*.tsx src/pages/**/*.tsx 2>/dev/null || true`).toString().trim().split('\n').filter(Boolean)];
const rootViolations = violations.filter(v => rootFiles.some(f => v.file === f));

if (violations.length) {
  console.log(`\n=== violações de escala de spacing (${violations.length}) ===`);
  for (const v of violations) {
    console.log(`${v.file}:${v.line}  ${v.desc}`);
  }
}

if (rootViolations.length) {
  console.log(`\n[FAIL] ${rootViolations.length} violação(ões) em page roots (obrigatório zero)`);
  failures += rootViolations.length;
} else {
  console.log('[OK] page roots sem violações de escala de spacing');
}

console.log(`--- violações totais: ${violations.length} | page roots: ${rootViolations.length} | falhas: ${failures}`);
process.exit(failures === 0 ? 0 : 1);

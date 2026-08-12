#!/usr/bin/env node
/**
 * Auditoria 07.001 — Inventário de cores usadas no runtime.
 *
 * Conta e classifica:
 *   1. Classes Tailwind de cor (bg-*, text-*, border-*, ring-*, divide-*,
 *      fill-*, stroke-*, from-*, to-*, via-*, placeholder-*, accent-*,
 *      caret-*, decoration-*, outline-*) — palette e arbitrárias
 *   2. Raw hex/hsl/rgb em TSX/TS/JSX (estilo inline, CSS-in-JS, strings)
 *   3. Raw hex/hsl/rgb em CSS runtime (design-system + index.css)
 *
 * Distingue cor de não-cor: text-sm/text-center/border-b/outline-none são
 * tamanho/alinhamento/largura/estilo, NÃO cores — não entram no inventário.
 *
 * Uso: node scripts/audit-colors-runtime.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

const COLOR_PREFIXES = new Set([
  'bg', 'text', 'border', 'ring', 'divide', 'fill', 'stroke', 'from', 'to', 'via',
  'placeholder', 'accent', 'caret', 'decoration', 'outline',
]);

const NON_COLOR_TEXTS = new Set([
  'text-sm', 'text-xs', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl',
  'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl',
  'text-caption', 'text-body', 'text-body-sm', 'text-label', 'text-data',
  'text-h1', 'text-h2', 'text-h3', 'text-h4', 'text-h5', 'text-h6', 'text-display',
  'text-center', 'text-left', 'text-right', 'text-justify', 'text-start', 'text-end',
  'text-balance', 'text-pretty', 'text-wrap', 'text-nowrap', 'text-truncate',
]);

const NON_COLOR_UTILS = new Set([
  'outline-none', 'outline-hidden', 'outline-0', 'outline-1', 'outline-2', 'outline-4', 'outline-8',
  'border', 'border-0', 'border-2', 'border-4', 'border-8', 'border-b', 'border-t', 'border-l', 'border-r',
  'border-x', 'border-y', 'border-b-0', 'border-t-0', 'border-l-0', 'border-r-0', 'border-b-2',
  'border-t-2', 'border-l-2', 'border-r-2', 'border-b-4', 'border-t-4', 'border-l-4', 'border-r-4',
  'border-b-8', 'border-t-8', 'border-l-8', 'border-r-8', 'border-dashed', 'border-dotted',
  'border-solid', 'border-none', 'border-collapse', 'border-separate', 'border-spacing-*',
]);

// palette Tailwind + cores flat + semânticas do projeto (semantic.css / @theme)
const PALETTES = new Set([
  'gray', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan',
  'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'slate',
  'zinc', 'neutral', 'stone', 'white', 'black', 'transparent', 'current', 'inherit',
  'foreground', 'muted-foreground', 'primary', 'primary-foreground', 'secondary',
  'secondary-foreground', 'accent', 'accent-foreground', 'destructive', 'destructive-foreground',
  'card', 'card-foreground', 'popover', 'popover-foreground', 'border', 'input', 'ring',
  'background', 'success', 'success-foreground', 'warning', 'warning-foreground',
  'danger', 'danger-foreground', 'info', 'info-foreground', 'focus-ring', 'mx',
]);

const TS_GLOBS = 'src --glob "*.{tsx,ts,jsx}" -g "!**/*.test.*" -g "!**/*.playwright.ts" -g "!**/base44-reference/**" -g "!**/_stories/**" -g "!**/generated/**"';

function tsFiles() {
  return execSync(`rg -l "" ${TS_GLOBS} 2>/dev/null || true`, { cwd: ROOT, encoding: 'utf-8' })
    .split('\n').filter(Boolean);
}

function cssFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.css$/.test(e.name)) out.push(p);
    }
  };
  walk(join(SRC, 'design-system'));
  for (const f of ['src/index.css']) if (fileExists(f)) out.push(f);
  return out;
}

function fileExists(p) {
  try { readFileSync(p); return true } catch { return false }
}

const ARB_RE = /\b(bg|text|border|ring|divide|fill|stroke|from|to|via|placeholder|accent|caret|decoration|outline)-\[([^\]]+)\]/g;
const PALETTE_CLS_RE = /\b(bg|text|border|ring|divide|fill|stroke|from|to|via|placeholder|accent|caret|decoration|outline)-([a-z0-9][a-z0-9-]*)/g;
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const HSL_RGB_RE = /\b(hsl|hsla|rgb|rgba)\(\s*[^)]*\)/g;

const stats = { tailwind: {}, arbitrary: {}, arbitraryHex: {}, hex: {}, hslrgb: {} };
const fileCount = new Set();
const hexSamples = {};

function tally(map, key, file) {
  map[key] = (map[key] || 0) + 1;
  fileCount.add(file);
}

function isColorValue(v) {
  return /^#/.test(v) || /^hsl|^hsla|^rgb|^rgba/.test(v);
}

function isPaletteColor(v) {
  const [name, shade] = v.split('-');
  if (shade === undefined) return PALETTES.has(v);
  return PALETTES.has(name) && /^\d+$/.test(shade);
}

for (const f of tsFiles()) {
  const rel = relative(ROOT, f);
  const src = readFileSync(f, 'utf8');

  for (const m of src.matchAll(ARB_RE)) {
    const prefix = m[1];
    const value = m[2];
    if (isColorValue(value)) {
      const key = `${prefix}-[${value.slice(0, 40)}]`;
      tally(stats.arbitrary, key, rel);
      const meta = { file: rel, count: 1 };
      hexSamples[key] = hexSamples[key] || meta;
    }
  }

  for (const m of src.matchAll(PALETTE_CLS_RE)) {
    const prefix = m[1];
    const value = m[2];
    const cls = m[0];
    if (!COLOR_PREFIXES.has(prefix)) continue;
    if (NON_COLOR_TEXTS.has(cls) || NON_COLOR_UTILS.has(cls)) continue;
    if (!isPaletteColor(value)) continue;
    tally(stats.tailwind, cls, rel);
  }

  for (const m of src.matchAll(HEX_RE)) {
    const hex = m[0].toLowerCase();
    const skip = /^#(000000|ffffff|fff|000|0000)\b/.test(hex);
    if (!skip) {
      tally(stats.hex, hex, rel);
      hexSamples[hex] = hexSamples[hex] || { file: rel, count: 1 };
    }
  }
  for (const m of src.matchAll(HSL_RGB_RE)) {
    tally(stats.hslrgb, m[0].toLowerCase().replace(/\s+/g, '').slice(0, 80), rel);
  }
}

for (const f of cssFiles()) {
  const rel = relative(ROOT, f);
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(HEX_RE)) {
    const hex = m[0].toLowerCase();
    const skip = /^#(000000|ffffff|fff|000|0000)\b/.test(hex);
    if (!skip) {
      tally(stats.hex, hex, rel);
      hexSamples[hex] = hexSamples[hex] || { file: rel, count: 1 };
    }
  }
  for (const m of src.matchAll(HSL_RGB_RE)) {
    tally(stats.hslrgb, m[0].toLowerCase().replace(/\s+/g, '').slice(0, 80), rel);
  }
}

const sortTop = (map, n = 25) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n);
const sum = (map) => Object.values(map).reduce((a, b) => a + b, 0);

console.log('=== 07.001 inventario de cores runtime ===');
console.log(`arquivos distintos afetados: ${fileCount.size}`);
console.log(`\n[classes tailwind palette] total: ${sum(stats.tailwind)} (variantes: ${Object.keys(stats.tailwind).length})`);
for (const [k, v] of sortTop(stats.tailwind)) console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log(`\n[classes arbitrarias de cor] total: ${sum(stats.arbitrary)} (variantes: ${Object.keys(stats.arbitrary).length})`);
for (const [k, v] of sortTop(stats.arbitrary)) console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log(`\n[raw hex] total: ${sum(stats.hex)} (variantes: ${Object.keys(stats.hex).length})`);
for (const [k, v] of sortTop(stats.hex, 30)) console.log(`  ${String(v).padStart(4)}  ${k}  (ex: ${hexSamples[k]?.file})`);
console.log(`\n[raw hsl/rgb] total: ${sum(stats.hslrgb)} (variantes: ${Object.keys(stats.hslrgb).length})`);
for (const [k, v] of sortTop(stats.hslrgb)) console.log(`  ${String(v).padStart(4)}  ${k}`);
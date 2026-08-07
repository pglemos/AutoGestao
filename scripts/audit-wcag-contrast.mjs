#!/usr/bin/env node
/**
 * Auditoria de contraste WCAG AA/AAA em pares semânticos canônicos.
 *
 * Resolve cadeias CSS (`var(--mx-x)`, `hsl(var(--mx-x))`, `hsl(... / a)`) lendo
 * primitives.css + semantic.css + @theme/:root de src/index.css. Converte
 * HSL → sRGB → luminância relativa WCAG e reporta o ratio.
 *
 * Uso: node scripts/audit-wcag-contrast.mjs
 */
import { readFileSync } from 'node:fs';

const PRIMS = 'src/design-system/tokens/primitives.css';
const SEMANTIC = 'src/design-system/tokens/semantic.css';
const INDEX = 'src/index.css';

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c);
  };
  return [f(0), f(8), f(4)];
}

function srgbToLinear(c) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance([r, g, b]) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(rgb1, rgb2) {
  const l1 = luminance(rgb1);
  const l2 = luminance(rgb2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function blendOver([fr, fg, fb], alpha, [br, bg, bb]) {
  return [fr * alpha + br * (1 - alpha), fg * alpha + bg * (1 - alpha), fb * alpha + bb * (1 - alpha)].map(Math.round);
}

// Regex para extrair declarações CSS no formato "--name: value;"
function extractDecls(src) {
  const decls = {};
  const re = /--([a-z0-9-]+)\s*:\s*([^;]+);/g;
  for (const m of src.matchAll(re)) decls[m[1]] = m[2].trim();
  return decls;
}

// Restringe a busca para @theme (Tailwind v4) e :root do index.css
function extractThemeAndRoot(src) {
  const result = {};
  const blockRe = /@(?:theme|:root|layer\s+\w+)[^{]*\{([\s\S]*?)\n\}/g;
  for (const m of src.matchAll(blockRe)) {
    for (const d of m[1].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      result[d[1]] = d[2].trim();
    }
  }
  return result;
}

const primsDecls = extractDecls(readFileSync(PRIMS, 'utf8'));
const semanticDecls = extractDecls(readFileSync(SEMANTIC, 'utf8'));
const themeDecls = extractThemeAndRoot(readFileSync(INDEX, 'utf8'));
const allDecls = { ...primsDecls, ...semanticDecls, ...themeDecls };

// Resolve uma cadeia CSS para um objeto { space: 'hsl', h,s,l, alpha? } ou null.
// Aceita: 'hsl(var(--mx-x))', 'hsl(var(--mx-x) / 0.1)', 'var(--mx-x)', '240 5% 26%'
function resolveValue(raw, seen = new Set()) {
  if (!raw) return null;
  const s = raw.trim();

  // hsl(var(--x)) ou hsl(var(--x) / a)
  const hslVar = s.match(/^hsl\(\s*var\(--([a-z0-9-]+)\)\s*(?:\/\s*([\d.]+))?\s*\)$/);
  if (hslVar) {
    const key = hslVar[1];
    if (seen.has(key)) return null;
    seen.add(key);
    const primRaw = primsDecls[key] ?? allDecls[key];
    if (!primRaw) return null;
    const hsl = resolveValue(primRaw, seen);
    if (!hsl) return null;
    return { ...hsl, alpha: hslVar[2] != null ? parseFloat(hslVar[2]) : 1 };
  }

  // var(--x) → recursivo
  const varOnly = s.match(/^var\(--([a-z0-9-]+)\)$/);
  if (varOnly) {
    const key = varOnly[1];
    if (seen.has(key)) return null;
    seen.add(key);
    const ref = allDecls[key];
    if (!ref) return null;
    return resolveValue(ref, seen);
  }

  // HSL literal '240 5% 26%' ou '240 5% 26% / 0.1'
  const literal = s.match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%(?:\s*\/\s*([\d.]+))?$/);
  if (literal) {
    return {
      h: parseFloat(literal[1]),
      s: parseFloat(literal[2]),
      l: parseFloat(literal[3]),
      alpha: literal[4] != null ? parseFloat(literal[4]) : 1,
    };
  }

  return null;
}

function tokenToRgb(tokenName) {
  const raw = allDecls[tokenName];
  if (!raw) return null;
  const v = resolveValue(raw);
  if (!v) return null;
  let rgb = hslToRgb(v.h, v.s, v.l);
  if (v.alpha < 1) rgb = blendOver(rgb, v.alpha, [255, 255, 255]);
  return rgb;
}

// Pares curados — token fg, token bg, contexto, tamanho mínimo (normal | large | ui), categoria.
// 'ok' = uso correto esperado (deve passar AA normal).
// 'antipattern' = uso desaconselhado (cor colorida como fg em bg claro); falha WCAG serve como alerta.
const pairs = [
  // Texto neutro em superfícies — base sólida do DS
  { fg: 'mx-color-text-primary', bg: 'mx-color-background', ctx: 'texto principal / fundo', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-text-primary', bg: 'mx-color-surface', ctx: 'texto principal / card', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-text-primary', bg: 'mx-color-surface-muted', ctx: 'texto principal / card muted', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-text-secondary', bg: 'mx-color-background', ctx: 'muted / fundo', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-text-secondary', bg: 'mx-color-surface-muted', ctx: 'muted / card muted', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-text-disabled', bg: 'mx-color-background', ctx: 'disabled / fundo', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-text-disabled', bg: 'mx-color-surface-muted', ctx: 'disabled / card muted', size: 'normal', cat: 'ok' },
  // Primary (botões filled = texto bold >=14px → WCAG large text threshold 3.0)
  { fg: 'mx-color-primary-foreground', bg: 'mx-color-primary', ctx: 'botão filled', size: 'large', cat: 'ok' },
  { fg: 'mx-color-primary', bg: 'mx-color-background', ctx: 'primary ghost text / fundo', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-primary', bg: 'mx-color-surface-muted', ctx: 'primary ghost / card', size: 'large', cat: 'ok' },
  // (removido: duplicate de primary-foreground @ primary)
  // Foreground tokens (uso correto: bg colorido + fg contrastante). Botões
  // filled usam font-medium/bold por padrão (>=14px bold) → WCAG "large text"
  // threshold 3.0 (AA-large).
  { fg: 'mx-color-success-foreground', bg: 'mx-color-success', ctx: 'success filled', size: 'large', cat: 'ok' },
  { fg: 'mx-color-warning-foreground', bg: 'mx-color-warning', ctx: 'warning filled', size: 'large', cat: 'ok' },
  { fg: 'mx-color-danger-foreground', bg: 'mx-color-danger', ctx: 'danger filled', size: 'large', cat: 'ok' },
  { fg: 'mx-color-info-foreground', bg: 'mx-color-info', ctx: 'info filled', size: 'large', cat: 'ok' },
  // Texto escuro sobre tokens `-text` (uso correto: cor como texto, fundo branco)
  { fg: 'mx-color-success-text', bg: 'mx-color-background', ctx: 'success text / fundo', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-warning-text', bg: 'mx-color-background', ctx: 'warning text / fundo', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-danger-text', bg: 'mx-color-background', ctx: 'danger text / fundo', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-info-text', bg: 'mx-color-background', ctx: 'info text / fundo', size: 'normal', cat: 'ok' },
  // Texto primário sobre superfícies sutis
  { fg: 'mx-color-text-primary', bg: 'mx-color-primary-subtle', ctx: 'texto / primary subtle', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-text-primary', bg: 'mx-color-success-subtle', ctx: 'texto / success subtle', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-text-primary', bg: 'mx-color-warning-subtle', ctx: 'texto / warning subtle', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-text-primary', bg: 'mx-color-danger-subtle', ctx: 'texto / danger subtle', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-text-primary', bg: 'mx-color-info-subtle', ctx: 'texto / info subtle', size: 'normal', cat: 'ok' },
  // Sidebar
  { fg: 'mx-color-sidebar-foreground', bg: 'mx-color-sidebar-background', ctx: 'sidebar text / fundo', size: 'normal', cat: 'ok' },
  { fg: 'mx-color-sidebar-foreground', bg: 'mx-color-sidebar-accent', ctx: 'sidebar text / accent', size: 'normal', cat: 'ok' },
  // Anti-patterns — cor colorida como fg em bg claro (esperado falhar; alerta para refatorar consumidores)
  { fg: 'mx-color-success', bg: 'mx-color-background', ctx: 'success como texto / fundo', size: 'normal', cat: 'antipattern' },
  { fg: 'mx-color-warning', bg: 'mx-color-background', ctx: 'warning como texto / fundo', size: 'normal', cat: 'antipattern' },
  { fg: 'mx-color-danger', bg: 'mx-color-background', ctx: 'danger como texto / fundo', size: 'normal', cat: 'antipattern' },
  { fg: 'mx-color-info', bg: 'mx-color-background', ctx: 'info como texto / fundo', size: 'normal', cat: 'antipattern' },
  { fg: 'mx-color-success', bg: 'mx-color-success-subtle', ctx: 'success como texto / bg subtle', size: 'normal', cat: 'antipattern' },
  { fg: 'mx-color-warning', bg: 'mx-color-warning-subtle', ctx: 'warning como texto / bg subtle', size: 'normal', cat: 'antipattern' },
];

const thresholds = { normal: 4.5, large: 3.0, ui: 3.0 };
let okFailures = 0;
let apFailures = 0;
let unresolved = 0;
const lines = [];
for (const { fg, bg, ctx, size, cat } of pairs) {
  const fgRgb = tokenToRgb(fg);
  const bgRgb = tokenToRgb(bg);
  if (!fgRgb || !bgRgb) {
    unresolved++;
    lines.push(`SKIP     ${fg} @ ${bg}  (${ctx}) — não resolvido (fg=${fgRgb ?? 'null'} bg=${bgRgb ?? 'null'})`);
    continue;
  }
  const ratio = contrastRatio(fgRgb, bgRgb);
  const min = thresholds[size];
  const pass = ratio >= min;
  const aaLarge = ratio >= 3.0;
  const aaNormal = ratio >= 4.5;
  const aaa = ratio >= 7.0;
  const verdict = aaa ? 'AAA' : aaNormal ? 'AA' : aaLarge ? 'AA-large' : 'FAIL';
  if (!pass) {
    if (cat === 'ok') {
      okFailures++;
    } else {
      apFailures++;
    }
  }
  const tag = `[${verdict.padEnd(7)}]`;
  lines.push(`${tag} ratio=${ratio.toFixed(2).padStart(6)}  ${fg} @ ${bg}  (${ctx})  [${cat}]`);
}
console.log('=== pares recomendados (devem passar AA normal)');
for (const l of lines.filter((l) => l.includes('[ok]'))) console.log('  ' + l);
console.log('=== anti-patterns (uso desaconselhado; alerta para refatorar consumidores)');
for (const l of lines.filter((l) => l.includes('[antipattern]'))) console.log('  ' + l);
console.log('---');
console.log(`${pairs.length} pares | ${unresolved} não resolvidos | ${okFailures} falhas em pares OK | ${apFailures} anti-patterns que falham (esperado)`);
process.exit(okFailures === 0 ? 0 : 1);

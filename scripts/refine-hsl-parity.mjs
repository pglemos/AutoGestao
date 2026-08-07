#!/usr/bin/env node
/**
 * Aplica valores HSL de paridade exata aos primitivos do template canônico.
 * Para cada primitivo com hex-alvo único, reescreve o valor para o HSL
 * (mínimos decimais, mais próximo do atual) que reproduz o hex exato.
 * O conflito mx-amber-500 (#F59E0B vs #F59F0A) é resolvido criando o
 * primitivo --mx-warning (#F59E0B) e apontando --color-mx-warning para ele.
 *
 * Uso: node scripts/refine-hsl-parity.mjs --apply
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const CURRENT = 'src/index.css';
const PRIMS = 'src/design-system/tokens/primitives.css';
const APPLY = process.argv.includes('--apply');

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

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

function findExactHsl(rgb, current, maxDec = 2) {
  const [ch, cs, cl] = current;
  const rounds = [
    { dec: 0, step: 1, range: 4 },
    { dec: 1, step: 0.1, range: 0.9 },
    { dec: 2, step: 0.01, range: 0.09 },
  ];
  for (const { dec, step, range } of rounds) {
    let best = null;
    let bestDist = Infinity;
    for (let dh = -range; dh <= range + 1e-9; dh += step) {
      for (let ds = -range; ds <= range + 1e-9; ds += step) {
        for (let dl = -range; dl <= range + 1e-9; dl += step) {
          const S = Math.min(100, Math.max(0, cs + ds));
          const L = Math.min(100, Math.max(0, cl + dl));
          const H = (((ch + dh) % 360) + 360) % 360;
          const Hf = +H.toFixed(dec);
          const Sf = +S.toFixed(dec);
          const Lf = +L.toFixed(dec);
          const [r2, g2, b2] = hslToRgb(Hf, Sf, Lf);
          if (r2 === rgb[0] && g2 === rgb[1] && b2 === rgb[2]) {
            const dist = Math.abs(Hf - ch) + Math.abs(Sf - cs) + Math.abs(Lf - cl);
            if (dist < bestDist) {
              bestDist = dist;
              best = { H: Hf, S: Sf, L: Lf, dec };
            }
          }
        }
      }
    }
    if (best) return best;
  }
  return null;
}

const oldSrc = execSync(`git show HEAD:${CURRENT}`, { encoding: 'utf8' });
const nowSrc = readFileSync(CURRENT, 'utf8');
const primsSrc = readFileSync(PRIMS, 'utf8');

const themeNow = {};
for (const m of nowSrc.matchAll(/(--color-[a-z0-9-]+):\s*([^;]+);/g)) themeNow[m[1]] = m[2].trim();

const themeOld = {};
for (const m of oldSrc.matchAll(/(--color-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8}|[^;]+);/g))
  themeOld[m[1]] = m[2].trim();

// hex-alvo por primitivo (excluindo --color-mx-warning que ganha primitivo próprio)
const primToHex = {};
const warningChains = [];
for (const [k, v] of Object.entries(themeOld)) {
  const hexMatch = v.match(/^(#[0-9a-fA-F]{3,8})$/);
  if (!hexMatch) continue;
  const newVal = themeNow[k];
  const chain = newVal?.match(/^hsl\(var\(--(mx-[a-z0-9-]+)\)(?:\s*\/\s*[\d.]+)?\)$/);
  if (!chain) continue;
  const hex = hexMatch[1].toUpperCase();
  const full = hex.length === 4 ? hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3] : hex;
  if (k === '--color-mx-warning') { warningChains.push({ k, hex: full }); continue; }
  if (!primToHex[chain[1]]) primToHex[chain[1]] = [];
  primToHex[chain[1]].push({ k, hex: full });
}

const replacements = new Map(); // prim -> { old, val, hex }

for (const [prim, uses] of Object.entries(primToHex)) {
  const distinctHex = [...new Set(uses.map((u) => u.hex))];
  if (distinctHex.length > 1) continue; // conflito não resolvível aqui
  const hex = distinctHex[0];
  const lineRe = new RegExp(`^(\\s*--${prim}:\\s*)([^;]+)(;\\s*)$`, 'm');
  const m = primsSrc.match(lineRe);
  if (!m) continue;
  const current = m[2].trim().split(' ').map((x) => parseFloat(x));
  const exactHsl = findExactHsl(hexToRgb(hex), current);
  if (!exactHsl) { console.log(`SEM-EXATO ${prim}`); continue; }
  const newVal = `${exactHsl.H} ${exactHsl.S}% ${exactHsl.L}%`;
  replacements.set(prim, { old: m[0], val: newVal, hex });
}

if (!APPLY) {
  for (const [prim, r] of replacements) {
    const oldVal = r.old.match(/:\s*([^;]+);/)[1].trim();
    console.log(`AJUSTE ${prim} ${r.hex} ${oldVal} -> ${r.val}`);
  }
  console.log(`--- ${replacements.size} ajustes pendentes (use --apply para gravar)`);
  process.exit(0);
}

let out = primsSrc;
for (const [prim, r] of replacements) {
  const newLine = r.old.replace(/^(\s*--mx-[a-z0-9-]+:\s*)[^;]+(;)/, `$1${r.val}$2`);
  out = out.replace(r.old, newLine);
}
writeFileSync(PRIMS, out);

// --color-mx-warning -> --mx-warning (primitivo novo)
const wHex = warningChains[0]?.hex ?? '#F59E0B';
const wLine = nowSrc.match(/^(--color-mx-warning:\s*)[^;]+(;.*)$/m);
if (!wLine) { console.log('ERRO: --color-mx-warning não encontrado'); process.exit(1); }
const wCurrent = [38, 92, 50];
const wExact = findExactHsl(hexToRgb(wHex), wCurrent);
if (!wExact) { console.log('ERRO: sem representação exata para mx-warning'); process.exit(1); }
const wVal = `${wExact.H} ${wExact.S}% ${wExact.L}%`;
const primBlock = /^(\s*--mx-warning-light:)/m;
out = readFileSync(PRIMS, 'utf8');
if (!out.includes('--mx-warning:')) {
  out = out.replace(primBlock, `  --mx-warning: ${wVal};\n$1`);
  writeFileSync(PRIMS, out);
}
const indexOut = nowSrc.replace(/^(--color-mx-warning:\s*)[^;]+(;.*)$/m, `$1hsl(var(--mx-warning))$2`);
writeFileSync(CURRENT, indexOut);
console.log(`OK: ${replacements.size} ajustes aplicados + --mx-warning: ${wVal} + --color-mx-warning -> hsl(var(--mx-warning))`);

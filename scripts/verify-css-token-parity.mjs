#!/usr/bin/env node
/**
 * Verifica paridade byte a byte entre o @theme atual (hsl(var(--mx-*)))
 * e o @theme anterior (hex) de src/index.css.
 *
 * Uso: node scripts/verify-css-token-parity.mjs [arquivo-anterior]
 *   arquivo-anterior: caminho opcional; default: `git show HEAD:src/index.css`
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const CURRENT = 'src/index.css';
const PRIMS = 'src/design-system/tokens/primitives.css';
const OLD_ARG = process.argv[2];

const oldSrc = OLD_ARG
  ? (existsSync(OLD_ARG) ? readFileSync(OLD_ARG, 'utf8') : null)
  : (() => {
      try {
        return execSync(`git show HEAD:${CURRENT}`, { encoding: 'utf8' });
      } catch {
        return null;
      }
    })();

if (oldSrc === null) {
  console.error('ERRO: arquivo anterior indisponivel (git show falhou e nenhum path fornecido).');
  process.exit(2);
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

const prims = readFileSync(PRIMS, 'utf8');
const primMap = {};
for (const m of prims.matchAll(/--(mx-[a-z0-9-]+):\s*([^;]+);/g)) primMap[m[1]] = m[2].trim();

const now = readFileSync(CURRENT, 'utf8');
const themeNow = {};
for (const m of now.matchAll(/(--color-[a-z0-9-]+):\s*([^;]+);/g)) themeNow[m[1]] = m[2].trim();

const themeOld = {};
for (const m of oldSrc.matchAll(/(--color-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8}|[^;]+);/g))
  themeOld[m[1]] = m[2].trim();

let total = 0;
let ok = 0;
let mismatch = 0;

for (const [k, v] of Object.entries(themeOld)) {
  const hexMatch = v.match(/^(#[0-9a-fA-F]{3,8})$/);
  if (!hexMatch) continue; // declaração não-hex (rgb, var, etc.) fora do escopo
  total++;

  const newVal = themeNow[k];
  if (!newVal) {
    console.log(`FALTANDO       ${k} antes=${v}`);
    mismatch++;
    continue;
  }
  const chain = newVal.match(/^hsl\(var\(--(mx-[a-z0-9-]+)\)(?:\s*\/\s*[\d.]+)?\)$/);
  if (!chain) {
    console.log(`NAO-CADEIA     ${k} agora=${newVal}`);
    mismatch++;
    continue;
  }
  const primVal = primMap[chain[1]];
  if (!primVal) {
    console.log(`SEM-PRIM       ${k} prim=${chain[1]}`);
    mismatch++;
    continue;
  }

  const [h, s, l] = primVal.split(' ').map((x) => parseFloat(x));
  const computed = hslToHex(h, s, l);
  const ref = hexMatch[1].toUpperCase();
  const refFull = ref.length === 4 ? ref[0] + ref[1] + ref[1] + ref[2] + ref[2] + ref[3] + ref[3] : ref;

  if (computed !== refFull) {
    console.log(`DIVERGENTE     ${k} antes=${refFull} depois=${computed} prim=${primVal}`);
    mismatch++;
  } else {
    ok++;
  }
}

console.log(`--- hex originais no @theme comparados: ${total} | paridade OK: ${ok} | divergentes: ${mismatch}`);
process.exit(mismatch === 0 ? 0 : 1);

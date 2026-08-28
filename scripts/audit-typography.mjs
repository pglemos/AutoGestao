#!/usr/bin/env node
/**
 * Auditoria da escala tipográfica canônica (T4.4).
 *
 * Valida que:
 * 1. Primitivos tipográficos existem em primitives.css
 *    (font-sans, font-mono, font-weight-{normal,medium,semibold,bold,extrabold},
 *     line-height-{tight,snug,normal,relaxed,loose}, tracking-{tighter,tight,normal,wide,wider,widest})
 * 2. Mapeamentos em @theme (index.css) cobrem o canônico
 *    (font-sans, font-mono, font-weight-{...}, leading-{...}, tracking-{...})
 * 3. @utility classes semânticas estão em index.css — a RAIZ Tailwind
 *    (text-display, text-h1..text-h6, text-body, text-body-sm, text-caption, text-label, text-data)
 *
 *    Este check exigia que morassem em semantic.css, e era essa a premissa
 *    errada: `@utility` só é compilado no arquivo que tem `@import
 *    "tailwindcss"`. Em semantic.css os 12 blocos iam CRUS para o bundle e o
 *    browser descartava — a escala não existia em produção e 662 pontos
 *    herdavam o tamanho do pai. Agora o gate exige o contrário: os blocos na
 *    raiz, e nenhum sobrando em semantic.css.
 *
 * Uso: node scripts/audit-typography.mjs
 */
import { readFileSync } from 'node:fs';

const PRIMS = 'src/design-system/tokens/primitives.css';
const INDEX = 'src/index.css';
const SEMANTIC = 'src/design-system/tokens/semantic.css';

const expectedPrimitives = {
  '--mx-font-sans': /^\s*--mx-font-sans:\s*[^;]+;\s*$/m,
  '--mx-font-mono': /^\s*--mx-font-mono:\s*[^;]+;\s*$/m,
  '--mx-font-weight-normal': /^\s*--mx-font-weight-normal:\s*400\s*;\s*$/m,
  '--mx-font-weight-medium': /^\s*--mx-font-weight-medium:\s*500\s*;\s*$/m,
  '--mx-font-weight-semibold': /^\s*--mx-font-weight-semibold:\s*600\s*;\s*$/m,
  '--mx-font-weight-bold': /^\s*--mx-font-weight-bold:\s*700\s*;\s*$/m,
  '--mx-font-weight-extrabold': /^\s*--mx-font-weight-extrabold:\s*800\s*;\s*$/m,
  '--mx-line-height-tight': /^\s*--mx-line-height-tight:\s*1\.25\s*;\s*$/m,
  '--mx-line-height-snug': /^\s*--mx-line-height-snug:\s*1\.375\s*;\s*$/m,
  '--mx-line-height-normal': /^\s*--mx-line-height-normal:\s*1\.5\s*;\s*$/m,
  '--mx-line-height-relaxed': /^\s*--mx-line-height-relaxed:\s*1\.625\s*;\s*$/m,
  '--mx-line-height-loose': /^\s*--mx-line-height-loose:\s*2\s*;\s*$/m,
  '--mx-tracking-tighter': /^\s*--mx-tracking-tighter:\s*-0\.05em\s*;\s*$/m,
  '--mx-tracking-tight': /^\s*--mx-tracking-tight:\s*-0\.025em\s*;\s*$/m,
  '--mx-tracking-normal': /^\s*--mx-tracking-normal:\s*0\s*;\s*$/m,
  '--mx-tracking-wide': /^\s*--mx-tracking-wide:\s*0\.025em\s*;\s*$/m,
  '--mx-tracking-wider': /^\s*--mx-tracking-wider:\s*0\.05em\s*;\s*$/m,
  '--mx-tracking-widest': /^\s*--mx-tracking-widest:\s*0\.1em\s*;\s*$/m,
};

const expectedTheme = [
  '--font-sans', '--font-mono',
  '--font-weight-normal', '--font-weight-medium', '--font-weight-semibold',
  '--font-weight-bold', '--font-weight-extrabold',
  '--leading-tight', '--leading-snug', '--leading-normal', '--leading-relaxed', '--leading-loose',
  '--tracking-tighter', '--tracking-tight', '--tracking-normal',
  '--tracking-wide', '--tracking-wider', '--tracking-widest',
];

const expectedUtilities = [
  'text-display', 'text-h1', 'text-h2', 'text-h3', 'text-h4', 'text-h5', 'text-h6',
  'text-body', 'text-body-sm', 'text-caption', 'text-label', 'text-data',
];

const primsSrc = readFileSync(PRIMS, 'utf8');
const indexSrc = readFileSync(INDEX, 'utf8');
const semanticSrc = readFileSync(SEMANTIC, 'utf8');

let failures = 0;

console.log('=== primitivos tipográficos em primitives.css');
for (const [name, re] of Object.entries(expectedPrimitives)) {
  if (re.test(primsSrc)) console.log(`OK   ${name}`);
  else { console.log(`FAIL ${name}`); failures++; }
}

console.log('=== mapeamento @theme em index.css');
for (const name of expectedTheme) {
  const re = new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}:`, 'm');
  if (re.test(indexSrc)) console.log(`OK   ${name}`);
  else { console.log(`FAIL ${name}`); failures++; }
}

console.log('=== @utility classes na raiz Tailwind (index.css)');
for (const name of expectedUtilities) {
  const re = new RegExp(`@utility\\s+${name}\\b`);
  if (re.test(indexSrc)) console.log(`OK   @utility ${name}`);
  else { console.log(`FAIL @utility ${name} (ausente da raiz Tailwind)`); failures++; }
}

console.log('=== nenhum @utility fora da raiz (seria descartado pelo browser)');
const foraDaRaiz = [...semanticSrc.matchAll(/^@utility\s+([\w-]+)/gm)].map((m) => m[1]);
if (foraDaRaiz.length === 0) console.log('OK   semantic.css sem @utility');
else {
  console.log(`FAIL semantic.css declara @utility que nunca compila: ${foraDaRaiz.join(', ')}`);
  failures++;
}

console.log(`--- primitivos: ${Object.keys(expectedPrimitives).length} | theme: ${expectedTheme.length} | utilities: ${expectedUtilities.length} | falhas: ${failures}`);
process.exit(failures === 0 ? 0 : 1);

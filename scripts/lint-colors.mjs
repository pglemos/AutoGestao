#!/usr/bin/env node
/**
 * Guard T4.9 — Cores: proíbe classes utilitárias com valor inline
 * `-[hsl(var(--mx-color-<token>))]` em TSX/JSX/TS. O @theme (src/index.css)
 * define aliases canônicos `--color-*` que geram classes Tailwind diretas
 * (`bg-primary`, `text-text-secondary`, `ring-focus-ring`, etc.).
 *
 * Exceção: nenhuma — o padrão inline é substituível por alias em 100% dos
 * casos (164/164 na T4.9). Page roots com política zero-tolerance.
 *
 * Uso: node scripts/lint-colors.mjs
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const RE = /[a-z-]+-\[hsl\(var\(--mx-color-[a-z-]+\)\)\]/g;

const PAGE_ROOTS = new Set([
  'src/pages/manager/ManagerDailyClosing.container.tsx',
  'src/features/agenda/AgendaD1Panel.container.tsx',
  'src/features/agenda/AgendaD1Panel.tsx',
  'src/features/carteira-clientes/components/CarteiraManagerTabs.tsx',
  'src/components/carteira/FichaClienteSheet.jsx',
  'src/components/carteira/ModoAtaque.tsx',
  'src/pages/owner/HomeDono.tsx',
  'src/pages/owner/Consultoria.tsx',
]);

const files = execSync(
  `rg -l "mx-color-" src --glob '*.{tsx,ts,jsx}' -g '!**/*.test.*' -g '!**/base44-reference/**' -g '!**/_stories/**' 2>/dev/null || true`
)
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);

let total = 0;
let rootHits = 0;
const byFile = {};

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  let fileHits = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    while ((m = RE.exec(line)) !== null) {
      total++;
      fileHits++;
      const isRoot = PAGE_ROOTS.has(file);
      if (isRoot) rootHits++;
      const pad = `${i + 1}`.padStart(4);
      console.log(
        `${file}:${pad} ${isRoot ? '[PAGE-ROOT] ' : ''}${line.trim().slice(0, 100)}`
      );
    }
  }
  if (fileHits > 0) byFile[file] = fileHits;
}

console.log('=== lint-colors (T4.9) ===');
console.log(`violações totais: ${total}`);
console.log(`page roots: ${rootHits}`);
console.log(`arquivos afetados: ${Object.keys(byFile).length}`);

if (total > 0) {
  console.error('FALHA: cores inline mx-color-* detectadas — use o alias canônico do @theme.');
  process.exit(1);
}
console.log('OK: nenhum valor inline de cor.');

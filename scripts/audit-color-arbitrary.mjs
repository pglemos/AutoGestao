#!/usr/bin/env node
/**
 * Audit advisory (T4.8 Gap C) — Inventário do uso de classes arbitrárias
 * `bg-[hsl(var(--mx-color-*))]` / `text-[hsl(var(--mx-color-*))]` /
 * `border-[hsl(var(--mx-color-*))]`.
 *
 * Padrão token-derivado (não viola lint-tokens-ast), mas o @theme já define
 * `--color-*` que gera aliases Tailwind automáticos (`bg-primary`, etc.).
 * Esta auditoria lista ocorrências para priorização de uma migração futura.
 *
 * Uso: node scripts/audit-color-arbitrary.mjs
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const RE = /\b(bg|text|border)-\[hsl\(var\(--mx-color-([a-z-]+)\)\)\]/g;

const files = execSync(`rg -l "hsl\\(var\\(--mx-color-" src --glob '*.{tsx,ts,jsx}' -g '!**/*.test.*' -g '!**/base44-reference/**' -g '!**/_stories/**' 2>/dev/null || true`)
  .toString().trim().split('\n').filter(Boolean);

const byToken = {};
const byFile = {};
let total = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  for (const line of lines) {
    let m;
    while ((m = RE.exec(line)) !== null) {
      const [, util, token] = m;
      const key = `${util}-${token}`;
      byToken[key] = (byToken[key] ?? 0) + 1;
      byFile[file] = (byFile[file] ?? 0) + 1;
      total++;
    }
  }
}

console.log('=== audit-color-arbitrary (T4.8 advisory) ===');
console.log(`total de ocorrências: ${total}`);
console.log(`arquivos distintos: ${Object.keys(byFile).length}`);
console.log('\ntop 15 tokens mais usados:');
Object.entries(byToken).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, n]) => {
  console.log(`  ${n.toString().padStart(4)}  ${k}`);
});
console.log('\ntop 15 arquivos com mais ocorrências:');
Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([f, n]) => {
  console.log(`  ${n.toString().padStart(4)}  ${f}`);
});

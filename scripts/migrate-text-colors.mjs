#!/usr/bin/env node
/**
 * FASE G 07.004 — Migra text colors para semantic text tokens.
 *
 * Mapa (fonte: 07-002-classificacao.json):
 *   text-{gray,slate}-400|500|600  -> text-muted-foreground (text-secondary)
 *   text-{gray,slate}-700|800|900  -> text-foreground        (text-primary)
 *   text-{gray,slate}-300          -> text-text-disabled     (text-disabled)
 *   text-black                     -> text-foreground        (7 usos revisados)
 *
 * Não toca: text-white (text-on-dark, exceção de contexto), variantes
 * arbitratorias nem classes de fundo/borda.
 *
 * Uso: node scripts/migrate-text-colors.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const RULES = [
  { re: /text-(?:gray|slate)-(?:400|500|600)(?![\d-])/g, to: 'text-muted-foreground' },
  { re: /text-(?:gray|slate)-(?:700|800|900)(?![\d-])/g, to: 'text-foreground' },
  { re: /text-(?:gray|slate)-300(?![\d-])/g, to: 'text-text-disabled' },
  { re: /text-black(?![\w-])/g, to: 'text-foreground' },
];

const files = execSync(
  `rg -l "text-(gray|slate)-(300|400|500|600|700|800|900)|text-black" src --glob '*.{tsx,ts,jsx}' -g '!**/*.test.*' -g '!**/_stories/**' -g '!**/base44-reference/**' 2>/dev/null || true`
)
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);

let total = 0;
const byFile = {};

for (const file of files) {
  const orig = readFileSync(file, 'utf8');
  let next = orig;
  for (const rule of RULES) next = next.replace(rule.re, rule.to);
  if (next !== orig) {
    const hits = (orig.match(/text-(?:gray|slate)-(?:300|400|500|600|700|800|900)|text-black/g) || []).length;
    writeFileSync(file, next);
    total += hits;
    byFile[file] = hits;
  }
}

console.log(`Arquivos alterados: ${Object.keys(byFile).length}`);
console.log(`Substituições: ${total}`);
for (const [f, n] of Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${String(n).padStart(4)}  ${f}`);
}
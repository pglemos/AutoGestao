#!/usr/bin/env node
/**
 * FASE G 07.005 — Migra border colors para semantic border tokens.
 *
 * Mapa (fonte: 07-002-classificacao.json):
 *   border-{gray,slate}-200        -> border-border          (border-default)
 *   ring-{gray,slate}-200          -> ring-border            (idem)
 *   border-{gray,slate}-100        -> border-border-subtle   (border-subtle)
 *   divide-{gray,slate}-100        -> divide-border-subtle   (idem)
 *   ring-{gray,slate}-100          -> ring-border-subtle     (idem)
 *   border-{gray,slate}-300        -> border-border-strong   (border-strong)
 *
 * Não toca: border-white / border-{gray,slate}-{400,600,700,800} (contextos
 * dark de marca ou seleção em superfície clara — exceções documentadas),
 * nem classes de texto/fundo.
 *
 * Uso: node scripts/migrate-border-colors.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const RULES = [
  { re: /border-(?:gray|slate)-200(?![\d-])/g, to: 'border-border' },
  { re: /ring-(?:gray|slate)-200(?![\d-])/g, to: 'ring-border' },
  { re: /border-(?:gray|slate)-100(?![\d-])/g, to: 'border-border-subtle' },
  { re: /divide-(?:gray|slate)-100(?![\d-])/g, to: 'divide-border-subtle' },
  { re: /ring-(?:gray|slate)-100(?![\d-])/g, to: 'ring-border-subtle' },
  { re: /border-(?:gray|slate)-300(?![\d-])/g, to: 'border-border-strong' },
];

const files = execSync(
  `rg -l "border-(gray|slate)-(100|200|300)|ring-(gray|slate)-(100|200)|divide-(gray|slate)-100" src --glob '*.{tsx,ts,jsx}' -g '!**/*.test.*' -g '!**/_stories/**' -g '!**/base44-reference/**' 2>/dev/null || true`
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
    const hits = (orig.match(/border-(?:gray|slate)-(?:100|200|300)|ring-(?:gray|slate)-(?:100|200)|divide-(?:gray|slate)-100/g) || []).length;
    writeFileSync(file, next);
    total += hits;
    byFile[file] = hits;
  }
}

console.log(`Arquivos alterados: ${Object.keys(byFile).length}`);
console.log(`Substituições: ${total}`);
for (const [f, n] of Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`  ${String(n).padStart(4)}  ${f}`);
}
#!/usr/bin/env node
/**
 * Audit 07.008 — Inventário de Raios e Valores Arbitrários (FASE G).
 *
 * Gera o relatório audit-07.008.md e audit-07.008.json em
 * .superpowers/mx-foundation-zero/radius/.
 *
 * Uso: node scripts/audit-radius-runtime.mjs
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT_DIR = '.superpowers/mx-foundation-zero/radius';
mkdirSync(OUT_DIR, { recursive: true });

// 1. Files in src excluding base44-reference, tests, specs, stories.
// Include SVG radius attributes in discovery: a file containing only `rx`/`ry`
// is still part of the radius inventory even when it has no CSS/Tailwind radius.
const runtimeExtensions = new Set(['.css', '.ts', '.tsx', '.js', '.jsx', '.mjs']);

function isExcluded(file) {
  if (file.startsWith('src/base44-reference/')) return true;
  if (/\.test\.[^.]+$/.test(file)) return true;
  if (/\.spec\.[^.]+$/.test(file)) return true;
  if (/\.stories\.[^.]+$/.test(file)) return true;
  return false;
}

function collectRuntimeFiles(dir = 'src', files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const file = path.posix.normalize(path.relative('.', path.join(dir, entry.name)));
    if (entry.isDirectory()) {
      collectRuntimeFiles(file, files);
      continue;
    }
    if (!runtimeExtensions.has(path.extname(file)) || isExcluded(file)) continue;
    files.push(file);
  }
  return files.sort();
}

const codeFiles = collectRuntimeFiles().filter(file =>
  /(rounded|border-.*radius|borderRadius|\b(rx|ry)=)/.test(readFileSync(file, 'utf8'))
);

const tailwindStandard = {};
const tailwindArbitraryPx = {};
const tailwindArbitraryVar = {};
const tailwindArbitraryOther = {};
const cssBorderRadius = [];
const inlineStyles = [];
const svgRxRy = [];

const roundedRegex = /rounded(-\[[^\]]+\]|-[a-zA-Z0-9\/-]+)?/g;

codeFiles.forEach(file => {
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    let match;
    while ((match = roundedRegex.exec(line)) !== null) {
      const cls = match[0];
      if (cls.includes('[')) {
        if (cls.includes('var(')) {
          tailwindArbitraryVar[cls] = (tailwindArbitraryVar[cls] || 0) + 1;
        } else if (/\d+px/.test(cls)) {
          tailwindArbitraryPx[cls] = (tailwindArbitraryPx[cls] || 0) + 1;
        } else {
          tailwindArbitraryOther[cls] = (tailwindArbitraryOther[cls] || 0) + 1;
        }
      } else {
        tailwindStandard[cls] = (tailwindStandard[cls] || 0) + 1;
      }
    }

    if (file.endsWith('.css') && line.includes('border') && line.includes('radius')) {
      cssBorderRadius.push({ file, line: idx + 1, content: line.trim() });
    }

    if (!file.endsWith('.css') && /border.*Radius/.test(line)) {
      inlineStyles.push({ file, line: idx + 1, content: line.trim() });
    }

    // Count each attribute, not just each line. A single SVG line may contain
    // both `rx` and `ry`, and the inventory is an occurrence inventory.
    for (const match of line.matchAll(/\b(rx|ry)=/g)) {
      svgRxRy.push({ file, line: idx + 1, attribute: match[1], content: line.trim() });
    }
  });
});

const reportData = {
  timestamp: new Date().toISOString(),
  scope: {
    root: 'src',
    includePattern: 'rounded|border-.*radius|borderRadius|\\b(rx|ry)=',
    excluded: ['src/base44-reference/**', '**/*.test.*', '**/*.spec.*', '**/*.stories.*'],
  },
  totalCodeFilesAudited: codeFiles.length,
  tailwindStandard,
  tailwindArbitraryPx,
  tailwindArbitraryVar,
  tailwindArbitraryOther,
  cssBorderRadius,
  inlineStyles,
  svgRxRy,
};

writeFileSync(path.join(OUT_DIR, 'audit-07.008.json'), JSON.stringify(reportData, null, 2));

const mdContent = `# Audit 07.008 — Inventário de Raios Runtime

FASE G — Cores, Bordas, Raios e Sombras. Baseline de raios no runtime (\`src/\`).
Comando: \`node scripts/audit-radius-runtime.mjs\` (dados completos: \`audit-07.008.json\`).

Escopo: arquivos em \`src/\` que contêm utilities/declarations de raio ou
atributos SVG \`rx/ry\`, excluindo \`base44-reference\` e fixtures de teste.

## Resumo

| Categoria | Ocorrências | Variantes |
|---|---|---|
| Tailwind Standard (\`rounded-*\`) | ${Object.values(tailwindStandard).reduce((a, b) => a + b, 0)} | ${Object.keys(tailwindStandard).length} |
| Arbitrárias Px (\`rounded-[Npx]\`) | ${Object.values(tailwindArbitraryPx).reduce((a, b) => a + b, 0)} | ${Object.keys(tailwindArbitraryPx).length} |
| Arbitrárias Var (\`rounded-[var(...)]\`) | ${Object.values(tailwindArbitraryVar).reduce((a, b) => a + b, 0)} | ${Object.keys(tailwindArbitraryVar).length} |
| Outras Arbitrárias (\`rounded-[inherit]\`) | ${Object.values(tailwindArbitraryOther).reduce((a, b) => a + b, 0)} | ${Object.keys(tailwindArbitraryOther).length} |
| Raw CSS \`border-radius\` | ${cssBorderRadius.length} | — |
| Inline React Styles (\`borderRadius\`) | ${inlineStyles.length} | — |
| Atributos SVG \`rx\` / \`ry\` | ${svgRxRy.length} | — |
| Arquivos distintos auditados | — | ${codeFiles.length} |

## Top Classes Tailwind Standard

\`\`\`
${Object.entries(tailwindStandard)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([k, v]) => `${v.toString().padStart(5)}  ${k}`)
  .join('\n')}
\`\`\`

## Classes Arbitrárias Pixel (\`rounded-[Npx]\`)

\`\`\`
${Object.entries(tailwindArbitraryPx)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${v.toString().padStart(5)}  ${k}`)
  .join('\n')}
\`\`\`

## Classes Arbitrárias Variável (\`rounded-[var(...)]\`)

\`\`\`
${Object.entries(tailwindArbitraryVar)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${v.toString().padStart(5)}  ${k}`)
  .join('\n')}
\`\`\`

## CSS Declarations (\`border-radius\`)

${cssBorderRadius.map(c => `- \`${c.file}:${c.line}\`: \`${c.content}\``).join('\n')}

## Escopo e Exceções Permitidas
- Excluído: \`src/base44-reference/**\` (127 arquivos congelados para paridade visual).
- Excluído: \`src/**/*.test.*\`, \`src/**/*.spec.*\`, \`src/**/*.stories.*\`.
- Exceção SVG: \`rx\`/\`ry\` de elementos SVG (geometria vetorial, não caixa CSS).
- Exceção Impressão: \`VisitReportTemplate.tsx\` (12 inline styles para exportação PDF/impressão).

## Próxima Etapa (07.009)
Migrar componentes de interface (Wave 1: Primitives/Inputs, Wave 2: Cards, Wave 3: Overlays, Wave 4: Domain Features) para a escala canônica \`rounded-mx-*\` / tokens \`--mx-*-radius\`.
`;

writeFileSync(path.join(OUT_DIR, 'audit-07.008.md'), mdContent);
console.log(`[OK] Inventário gerado com sucesso em ${OUT_DIR}/audit-07.008.md e .json`);

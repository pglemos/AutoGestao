#!/usr/bin/env node
/**
 * Guard 07.014 — proíbe decisão visual crua (cor/raio/sombra) fora dos tokens.
 *
 * Três regras de tolerância zero, todas já em conformidade quando o guard foi
 * criado (nenhuma dívida foi anistiada por baseline):
 *
 *  1. `rounded-[Npx]` em qualquer lugar do runtime — a escala canônica é
 *     `rounded-mx-*` (07.009).
 *  2. `shadow-[...]` arbitrário que não referencie `var(--mx-*)` — a elevação
 *     pertence a `--mx-shadow-*` (07.010/07.011).
 *  3. hex cru (`#rgb`/`#rrggbb`) em TODO runtime — cor pertence aos tokens
 *     semânticos (07.003–07.007). Fontes de token (primitives/semantic/
 *     charts-tokens/CSS/templates) e canais externos congelados (branding,
 *     print/export, landing, PDF) ficam fora do escopo do hex. KEEP
 *     deliberados (error boundary dark, neon intencional, medalhas de ranking,
 *     winnerColor dinâmico) entram na allowlist com justificativa.
 *
 * A allowlist é POR REGRA: excluir `index.css`/`landing` do hex NÃO abre
 * exceção para raio/sombra nesses mesmos arquivos.
 *
 * Scanner 100% fs (readdir/readFile): nenhum subprocesso — o bun test 1.3.5
 * engole o stdout de subprocessos sob o project root (C8). O contrato de teste
 * importa `auditVisualRaw()` diretamente; o CLI só imprime/seta exit quando
 * este módulo é o entrypoint (import.meta.url === argv[1]).
 *
 * Uso: node scripts/lint-visual-raw.mjs [--json]
 */
import { readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(import.meta.url), '..', '..')

/** Extensões consideradas runtime (componentes/estilos). */
const RUNTIME_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css'])

/**
 * Exclusões COMUNS a todas as regras — arquivos que não são UI de app.
 * Caminhos relativos ao root; aceitam `**`/`*` simples.
 */
const COMMON_EXCLUDED = [
  'src/base44-reference/**',
  // Token definitions are the source of truth for raw fallback values.
  'src/design-system/tokens/**',
  'src/**/*.test.*',
  'src/**/*.spec.*',
  'src/**/*.stories.*',
  'src/**/*.playwright.*',
]

/**
 * Exclusões SÓ do escopo de hex — fontes de token e canais externos congelados.
 * O motivo de cada uma está no comentário. São aplicadas ALÉM das comuns.
 */
const HEX_SCOPE_EXCLUDED = [
  // Fonte de tokens: o fallback hardcoded É a origem de verdade.
  'src/index.css',
  'src/lib/charts/tokens.ts',
  'src/styles/internal-mx-canonical-template.css',
  // Landing congelada (página pública isolada, sem tokens de app).
  'src/features/landing/**',
  // Branding externo: ícone oficial Google (SVG de marca registrada).
  'src/components/GoogleIcon.jsx',
  // Print/export: documentos A4/HTML/PDF fora da UI de app.
  'src/features/consultoria/components/VisitReportTemplate.tsx',
  'src/lib/pdf/downloadHtmlAsPdf.ts',
  'src/pages/PDIPrint.tsx',
  'src/components/owner/actionplan/calendar/CalendarExport.js',
  'src/components/owner/strategic/StrategicExportMenu.jsx',
]

/**
 * KEEP por regra: `ruleId -> file -> reason`. Só se acrescenta linha aqui com
 * justificativa escrita. GlobalErrorBoundary usa marcador `lint-tokens-ignore`
 * explícito no código.
 */
const RULE_ALLOWLIST = {
  'shadow-arbitrario': new Map([
    [
      'src/features/checkin/sections/CheckinCrmSection.tsx',
      'CTA de paridade Base44: glow teal casado com o `bg-status-success` literal. Sai junto com a migração da cor, não antes.',
    ],
    [
      'src/features/checkin/sections/CheckinForm.tsx',
      'CTA de paridade Base44: glow verde casado com o gradiente literal do botão de finalizar.',
    ],
  ]),
  'hex-cru-em-componentes': new Map([
    [
      'src/components/observability/GlobalErrorBoundary.tsx',
      'Tema dark de erro crítico com marcador `// lint-tokens-ignore` explícito em cada cor — o boundary roda antes de qualquer CSS de token estar disponível.',
    ],
    [
      'src/components/vendedor/CommissionHeroCard.jsx',
      'Neon `#39FF5A` intencional: accent decorativo de destaque sobre card dark, contraste alto. Só o neon é exceção; fundos/status já migraram.',
    ],
    [
      'src/components/vendedor/PotentialCommissionCard.jsx',
      'Neon `#39FF5A` intencional: valor de comissão projetada em glow sobre card dark. Só o neon é exceção; fundos/status já migraram.',
    ],
    [
      'src/components/vendedor/RecordRoutineCard.jsx',
      'Neon `#39FF5A` intencional: recorde de comissão em glow sobre card dark. Só o neon é exceção; fundos/status já migraram.',
    ],
    [
      'src/components/ranking/BonificacaoPeriodo.jsx',
      'Paleta de medalhas (ouro/prata/bronze) deliberada de ranking — dado visual categórico, não estado semântico.',
    ],
    [
      'src/components/ranking/PodioRanking.jsx',
      'Paleta de medalhas + pódio (ouro/prata/bronze) deliberada de ranking.',
    ],
    [
      'src/components/ranking/TabelaRanking.jsx',
      'Paleta de medalhas + linhas de pódio (ouro/prata/bronze) deliberada de ranking.',
    ],
  ]),
}

/**
 * Converte um padrão de caminho (com ** e *) em RegExp ancorada.
 * `src/foo/…` casa qualquer coisa sob src/foo; `src/…/*.test.*` casa
 * arquivos de teste em qualquer profundidade.
 */
function globToRegExp(pattern) {
  let escaped = ''
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        escaped += '.*'
        i++
      } else {
        escaped += '[^/]*'
      }
    } else if ('\\^$.|?+()[]{}'.includes(ch)) {
      escaped += '\\' + ch
    } else {
      escaped += ch
    }
  }
  return new RegExp('^' + escaped + '$')
}

/** Monta RegExps de exclusão para um escopo (common + extra). */
function buildExclusionMatchers(extra = []) {
  return [...COMMON_EXCLUDED, ...extra].map((p) => globToRegExp(p))
}

/** Varre `src` e devolve `[{ rel, lines }]` dos arquivos runtime não excluídos. */
function scanSources(extraExcluded = []) {
  const exclusions = buildExclusionMatchers(extraExcluded)
  const out = []
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(abs)
        continue
      }
      if (!RUNTIME_EXT.has(extname(entry.name))) continue
      const rel = relative(root, abs)
      if (exclusions.some((re) => re.test(rel))) continue
      out.push({ rel, lines: readFileSync(abs, 'utf8').split('\n') })
    }
  }
  walk(resolve(root, 'src'))
  return out
}

/**
 * Aplica as exclusões do escopo de hex (fontes/canais congelados) a um rel.
 */
function isHexScopeExcluded(rel) {
  return buildExclusionMatchers(HEX_SCOPE_EXCLUDED).some((re) => re.test(rel))
}

/** Converte uma ocorrência em hit no formato `arquivo:linha:conteúdo`. */
function hitFor(rel, lineNo, line) {
  return `${rel}:${lineNo}:${line.trim()}`
}

function allowed(ruleId, hit) {
  const file = hit.slice(0, hit.indexOf(':'))
  const allowlist = RULE_ALLOWLIST[ruleId]
  return allowlist ? allowlist.has(file) : false
}

/** Executa as três regras sobre o runtime e devolve o report completo. */
export function auditVisualRaw() {
  const findings = {
    'radius-arbitrario-px': [],
    'shadow-arbitrario': [],
    'hex-cru-em-componentes': [],
    'token-call-em-string': [],
  }

  const commonSources = scanSources()
  const hexFiles = new Set(scanSources(HEX_SCOPE_EXCLUDED).map((s) => s.rel))

  for (const { rel, lines } of commonSources) {
    const inHexScope = hexFiles.has(rel)
    lines.forEach((line, idx) => {
      const no = idx + 1
      // 1. raio arbitrário em pixel.
      if (/rounded(-[a-z]+)?-\[[0-9]+px\]/.test(line)) {
        findings['radius-arbitrario-px'].push(hitFor(rel, no, line))
      }
      // 2. sombra arbitrária que não referencie var(--mx-*) nem drop-shadow.
      const shadowMatch = line.match(/shadow-\[[^\]]*\]/)
      if (shadowMatch && !/var\(--mx-/.test(shadowMatch[0]) && !/drop-shadow-\[/.test(line)) {
        findings['shadow-arbitrario'].push(hitFor(rel, no, line))
      }
      // 3. hex cru — aplica as exclusões de fontes/canais apenas ao hex.
      if (inHexScope && /(^|[^0-9a-fA-F])#[0-9a-fA-F]{3,8}([^0-9a-fA-F]|$)/.test(line)) {
        findings['hex-cru-em-componentes'].push(hitFor(rel, no, line))
      }
      // 4. token call dentro de literal de string (chartTokens.xxx() cru em
      //    style value) — o call vira o valor CSS por expressão, nunca texto.
      if (/["'\x60]chartTokens\.[a-zA-Z]+\s*\(/.test(line)) {
        findings['token-call-em-string'].push(hitFor(rel, no, line))
      }
    })
  }

  const rules = [
    {
      id: 'radius-arbitrario-px',
      message: 'raio arbitrário em pixel — use a escala rounded-mx-*',
      hits: findings['radius-arbitrario-px'],
    },
    {
      id: 'shadow-arbitrario',
      message: 'sombra arbitrária — use --mx-shadow-* / shadow-mx-*',
      hits: findings['shadow-arbitrario'],
    },
    {
      id: 'hex-cru-em-componentes',
      message: 'hex cru em runtime — use token semântico / chartTokens',
      // Aplica as exclusões de fontes/canais apenas ao hex.
      hits: findings['hex-cru-em-componentes'],
    },
    {
      id: 'token-call-em-string',
      message: 'token call dentro de string literal — use expressão/interpolação',
      hits: findings['token-call-em-string'],
    },
  ]

  let totalViolations = 0
  const report = []
  const openByRule = {}
  for (const rule of rules) {
    const open = rule.hits.filter((hit) => !allowed(rule.id, hit))
    const waived = rule.hits.length - open.length
    totalViolations += open.length
    openByRule[rule.id] = open
    report.push({ rule: rule.id, message: rule.message, violations: open.length, waived })
  }

  return { scope: 'src', rules: report, totalViolations, openByRule }
}

/** Só executa como CLI quando este módulo é o entrypoint. */
const isCli = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url
if (isCli) {
  const audit = auditVisualRaw()
  const { openByRule, ...summary } = audit
  console.log(JSON.stringify(summary, null, 2))
  if (summary.totalViolations > 0) {
    for (const rule of summary.rules) {
      if (openByRule[rule.rule].length > 0) {
        console.error(`\n[${rule.rule}] ${rule.message}`)
        for (const hit of openByRule[rule.rule]) console.error(`  ${hit}`)
      }
    }
    process.exitCode = 1
  }
}

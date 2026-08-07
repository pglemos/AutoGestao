#!/usr/bin/env node
/**
 * Extrai a matriz oficial do Mentor Comercial (fonte Nível 1) para JSON canônico versionado.
 *
 * Fonte:  rules/mentor-comercial/v1/source/Mentor_Comercial_Motor_Regras_v1.xlsx
 * Saída:  rules/mentor-comercial/v1/*.json
 *
 * Uso:
 *   node scripts/mentor-rules-extract.mjs            # grava
 *   node scripts/mentor-rules-extract.mjs --check    # não grava; falha se saída divergir
 *
 * Regras de fidelidade:
 * - Textos de conteúdo são preservados verbatim (acentos, pontuação, quebras de linha,
 *   placeholders `{var}`). Nenhum trim, nenhuma normalização.
 * - Apenas colunas de IDENTIFICADOR (IDs/códigos) sofrem trim, porque espaço acidental
 *   em célula quebraria o casamento referencial. As colunas com trim estão declaradas
 *   explicitamente em `ID_COLUMNS` para auditoria.
 * - Células vazias viram `null`, nunca string vazia, nunca valor inventado.
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RULES_DIR = path.join(projectRoot, 'rules/mentor-comercial/v1')
const SOURCE = path.join(RULES_DIR, 'source/Mentor_Comercial_Motor_Regras_v1.xlsx')
const CHECK_ONLY = process.argv.includes('--check')
const RULE_VERSION = 'v1'

/**
 * Mapeamento explícito aba -> arquivo de saída e coluna da planilha -> chave canônica.
 * Declarado por extenso (em vez de derivado por slug automático) para que qualquer
 * renomeação de coluna na planilha quebre a extração de forma visível, em vez de
 * silenciosamente produzir um catálogo com campo faltando.
 */
const SHEETS = {
  '01 Canais': {
    out: 'channels.json',
    key: 'channel',
    columns: {
      'Canal Comercial': 'channel',
      'Conceito oficial': 'officialConcept',
      'O que mede': 'measures',
      'Entram como origem detalhada': 'detailedOrigins',
      'Regras importantes': 'rules',
      Exemplos: 'examples',
    },
  },
  '02 Status': {
    out: 'statuses.json',
    key: 'statusId',
    columns: {
      'Status ID': 'statusId',
      Canal: 'channel',
      'Família': 'family',
      'Status atual': 'label',
      'Definição / quando usar': 'definition',
      Origem: 'origin',
      'Responsável atual': 'responsible',
      Temperatura: 'temperature',
      'Objetivo atual': 'objective',
      'Próximo passo': 'nextStep',
      'Cadência': 'cadenceId',
      'Script base': 'scriptId',
      Potencial: 'potential',
      'Entra na Central quando': 'centralRule',
      'Ativo na Carteira': 'activeInPortfolio',
      'Orientação do Mentor': 'mentorGuidance',
      'Resultados principais': 'mainResults',
      'Observações / regras': 'notes',
    },
  },
  '03 Cadências': {
    out: 'cadences.json',
    key: 'cadenceId',
    columns: {
      'Cadência ID': 'cadenceId',
      Nome: 'name',
      'Objetivo principal': 'objective',
      Tentativas: 'attempts',
      'Padrão de dias': 'dayPattern',
      'Aplicação': 'application',
      'Condição de interrupção': 'interruptionCondition',
      'Condição final': 'finalCondition',
    },
  },
  '04 Passos_Cadência': {
    out: 'cadence-steps.json',
    key: null,
    columns: {
      'Cadência ID': 'cadenceId',
      'Tentativa/Marco': 'attempt',
      Offset: 'offset',
      'Objetivo da tentativa': 'objective',
      'Observação': 'notes',
    },
  },
  '05 Scripts': {
    out: 'scripts.json',
    key: 'scriptId',
    columns: {
      'Script ID': 'scriptId',
      'Área': 'area',
      'Tentativa/Marco': 'attempt',
      Objetivo: 'objective',
      'Texto padrão': 'text',
    },
  },
  '06 Transições': {
    out: 'transitions.json',
    key: null,
    columns: {
      'Família': 'family',
      'Status/Contexto de origem': 'fromStatusOrContext',
      'Resultado informado': 'result',
      'Novo status sugerido': 'toStatus',
      'Nova decisão / observação': 'decisionNotes',
    },
  },
  '07 Score_Prioridade': {
    out: 'score-priority.json',
    key: null,
    columns: {
      Pilar: 'pillar',
      Peso: 'weight',
      'Regra para pontuação total': 'fullRule',
      'Regra parcial': 'partialRule',
      'Regra zero': 'zeroRule',
    },
  },
  '08 Plano_Ataque': {
    out: 'attack-missions.json',
    key: null,
    columns: {
      'Condição encontrada no Mentor': 'condition',
      'Missão sugerida': 'mission',
      Objetivo: 'objective',
      'Quando aparece': 'whenItAppears',
      'Observações': 'notes',
    },
  },
  Listas: {
    out: 'lists.json',
    key: null,
    columns: {
      'Status ID': 'statusId',
      Canal: 'channel',
      'Urgência': 'urgency',
      'Pontuação': 'points',
    },
  },
  '09 Teste_Clientes': {
    out: 'test-clients.json',
    key: null,
    columns: {
      Cliente: 'client',
      'Canal Comercial': 'channel',
      'Origem Detalhada': 'detailedOrigin',
      'Status ID': 'statusId',
      'Status atual': 'statusLabel',
      'Família': 'family',
      'Responsável': 'responsible',
      Temperatura: 'temperature',
      Objetivo: 'objective',
      'Próximo passo': 'nextStep',
      'Cadência': 'cadenceId',
      'Script base': 'scriptId',
      Potencial: 'potential',
      'Regra Central': 'centralRule',
      'Por que está aqui': 'whyHere',
      'Próxima ação': 'nextAction',
      'Urgência': 'urgency',
      'Pontos urgência': 'urgencyPoints',
      'Status coerente (0/15)': 'scoreStatus',
      'Próximo passo/data (0/20)': 'scoreNextStep',
      'Execução prazo (0/30)': 'scoreExecution',
      'Cadência (0/20)': 'scoreCadence',
      'Histórico (0/15)': 'scoreHistory',
      Score: 'score',
      'Classificação': 'scoreClass',
      'Pontos Potencial': 'potentialPoints',
      'Risco Condução': 'conductionRisk',
      'Índice Prioridade': 'priorityIndex',
      Prioridade: 'priorityClass',
      'Ação na Central?': 'centralAction',
      'Observação do teste': 'testNotes',
    },
  },
  '10 Integrações': {
    out: 'integrations.json',
    key: null,
    columns: {
      'Origem / Módulo': 'sourceModule',
      'Evento / Condição': 'event',
      'Ação do Mentor Comercial': 'mentorAction',
      'Regra importante': 'rule',
      Destino: 'destination',
    },
  },
  '11 Testes_Cenários': {
    out: 'acceptance-scenarios.json',
    key: null,
    columns: {
      'Cenário': 'scenario',
      Entrada: 'input',
      'Status esperado': 'expectedStatus',
      'Próximo passo esperado': 'expectedNextStep',
      'Central?': 'expectedCentral',
      'Score/Prioridade esperados': 'expectedScorePriority',
      'Observação': 'notes',
    },
  },
}

/** Colunas cujo valor é identificador e portanto recebe trim. Todo o resto é verbatim. */
const ID_COLUMNS = new Set([
  'statusId',
  'cadenceId',
  'scriptId',
  'channel',
  'family',
  'area',
  'attempt',
  'offset',
])

/** A aba `00 Guia` é informativa e tem duas tabelas lado a lado; extraída como grade crua. */
const GUIDE_SHEET = '00 Guia'

function normalizeCell(value, canonicalKey) {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    // IDs e códigos nunca são numéricos nesta planilha; números aqui são quantidades/pesos.
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()
  const str = String(value)
  if (ID_COLUMNS.has(canonicalKey)) {
    const trimmed = str.trim()
    return trimmed === '' ? null : trimmed
  }
  return str === '' ? null : str
}

function findHeaderRow(grid) {
  for (let i = 0; i < Math.min(grid.length, 10); i += 1) {
    const filled = grid[i].filter((c) => c !== null && c !== undefined && c !== '')
    if (filled.length >= 2) return i
  }
  throw new Error('Nenhuma linha de cabeçalho encontrada nas 10 primeiras linhas')
}

function sheetToGrid(worksheet) {
  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  })
}

function extractSheet(workbook, sheetName, spec) {
  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) throw new Error(`Aba ausente na planilha: "${sheetName}"`)

  const grid = sheetToGrid(worksheet)
  const headerRow = findHeaderRow(grid)
  const headers = grid[headerRow].map((h) => (h === null || h === undefined ? '' : String(h).trim()))

  // Casa cada coluna declarada com seu índice real; coluna declarada e ausente é erro duro.
  const columnIndex = {}
  for (const [sheetColumn, canonicalKey] of Object.entries(spec.columns)) {
    const idx = headers.indexOf(sheetColumn)
    if (idx === -1) {
      throw new Error(
        `Aba "${sheetName}": coluna declarada "${sheetColumn}" não existe na planilha. ` +
          `Colunas encontradas: ${JSON.stringify(headers.filter(Boolean))}`,
      )
    }
    columnIndex[canonicalKey] = idx
  }

  const records = []
  for (let r = headerRow + 1; r < grid.length; r += 1) {
    const row = grid[r]
    if (!row || row.every((c) => c === null || c === undefined || c === '')) continue
    const record = {}
    for (const [canonicalKey, idx] of Object.entries(columnIndex)) {
      record[canonicalKey] = normalizeCell(row[idx], canonicalKey)
    }
    // Linha em que todas as colunas mapeadas ficaram vazias é ruído de formatação.
    if (Object.values(record).every((v) => v === null)) continue
    records.push(record)
  }

  if (spec.key) {
    const seen = new Map()
    for (const [i, record] of records.entries()) {
      const id = record[spec.key]
      if (id === null) {
        throw new Error(`Aba "${sheetName}" linha ${headerRow + 2 + i}: "${spec.key}" vazio`)
      }
      if (seen.has(id)) {
        throw new Error(
          `Aba "${sheetName}": "${spec.key}" duplicado "${id}" ` +
            `(linhas ${seen.get(id)} e ${headerRow + 2 + i})`,
        )
      }
      seen.set(id, headerRow + 2 + i)
    }
  }

  return records
}

function extractGuide(workbook) {
  const worksheet = workbook.Sheets[GUIDE_SHEET]
  if (!worksheet) throw new Error(`Aba ausente na planilha: "${GUIDE_SHEET}"`)
  const grid = sheetToGrid(worksheet)
  return grid
    .filter((row) => row.some((c) => c !== null && c !== undefined && c !== ''))
    .map((row) => row.map((c) => (c === null || c === undefined || c === '' ? null : String(c))))
}

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function main() {
  if (!existsSync(SOURCE)) {
    console.error(`FALHA: planilha fonte não encontrada em ${path.relative(projectRoot, SOURCE)}`)
    process.exit(2)
  }

  const buffer = readFileSync(SOURCE)
  const sourceSha256 = createHash('sha256').update(buffer).digest('hex')
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

  const outputs = new Map()
  const counts = {}

  for (const [sheetName, spec] of Object.entries(SHEETS)) {
    const records = extractSheet(workbook, sheetName, spec)
    outputs.set(spec.out, {
      version: RULE_VERSION,
      sheet: sheetName,
      count: records.length,
      records,
    })
    counts[spec.out.replace(/\.json$/, '')] = records.length
  }

  const guide = extractGuide(workbook)
  outputs.set('guide.json', { version: RULE_VERSION, sheet: GUIDE_SHEET, rows: guide })

  outputs.set('metadata.json', {
    version: RULE_VERSION,
    sourceFile: 'Mentor_Comercial_Motor_Regras_v1.xlsx',
    sourceSha256,
    generatedAt: new Date().toISOString(),
    generator: 'scripts/mentor-rules-extract.mjs',
    sheets: Object.keys(SHEETS).concat(GUIDE_SHEET),
    counts,
  })

  if (CHECK_ONLY) {
    let drift = 0
    for (const [filename, payload] of outputs) {
      if (filename === 'metadata.json') continue // generatedAt muda a cada execução
      const target = path.join(RULES_DIR, filename)
      if (!existsSync(target)) {
        console.error(`DRIFT: ${filename} não existe`)
        drift += 1
        continue
      }
      if (readFileSync(target, 'utf8') !== stableStringify(payload)) {
        console.error(`DRIFT: ${filename} difere da extração da planilha`)
        drift += 1
      }
    }
    const metaPath = path.join(RULES_DIR, 'metadata.json')
    if (existsSync(metaPath)) {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
      if (meta.sourceSha256 !== sourceSha256) {
        console.error(
          `DRIFT: sourceSha256 do metadata (${meta.sourceSha256.slice(0, 12)}…) ` +
            `difere da planilha atual (${sourceSha256.slice(0, 12)}…)`,
        )
        drift += 1
      }
    } else {
      console.error('DRIFT: metadata.json não existe')
      drift += 1
    }
    if (drift > 0) {
      console.error(`\n${drift} divergência(s). Rode: node scripts/mentor-rules-extract.mjs`)
      process.exit(1)
    }
    console.log('OK: catálogos JSON estão em sincronia com a planilha fonte.')
    return
  }

  mkdirSync(RULES_DIR, { recursive: true })
  for (const [filename, payload] of outputs) {
    writeFileSync(path.join(RULES_DIR, filename), stableStringify(payload), 'utf8')
  }

  console.log(`Fonte: Mentor_Comercial_Motor_Regras_v1.xlsx`)
  console.log(`SHA256: ${sourceSha256}`)
  console.log('Catálogos gerados em rules/mentor-comercial/v1/:')
  for (const [name, count] of Object.entries(counts)) {
    console.log(`  ${String(count).padStart(4)}  ${name}.json`)
  }
  console.log(`  ${String(guide.length).padStart(4)}  guide.json (linhas cruas)`)
}

main()

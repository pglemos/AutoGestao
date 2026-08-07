#!/usr/bin/env node
/**
 * Validator da matriz oficial do Mentor Comercial (TASK 2).
 *
 * Lê os catálogos canônicos em rules/mentor-comercial/v1/ e prova a integridade
 * referencial exigida pela fonte. Sai com código != 0 em qualquer inconsistência
 * OBRIGATÓRIA, para que o seed e o build nunca apliquem catálogo inválido.
 *
 * Uso:
 *   node scripts/mentor-rules-validate.mjs
 *   node scripts/mentor-rules-validate.mjs --json    # saída legível por máquina
 *
 * Classificação de achados:
 *   ERROR          — quebra invariante estrutural. Bloqueia.
 *   SOURCE_BLOCKER — a própria planilha é ambígua/inconsistente e não há
 *                    interpretação determinística única. Bloqueia por padrão;
 *                    só é tolerado quando listado em KNOWN_SOURCE_BLOCKERS,
 *                    e mesmo assim é sempre reportado. Nunca é "resolvido"
 *                    inventando ID ou texto de script.
 *   WARN           — divergência informativa, não bloqueia.
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RULES_DIR = path.join(projectRoot, 'rules/mentor-comercial/v1')
const AS_JSON = process.argv.includes('--json')

/** Contagens esperadas, conforme a fonte v1. Divergência = a planilha mudou. */
const EXPECTED_COUNTS = {
  channels: 3,
  statuses: 86,
  cadences: 13,
  'cadence-steps': 57,
  scripts: 77,
  transitions: 52,
  'attack-missions': 15,
  'acceptance-scenarios': 15,
  integrations: 18,
}

/**
 * Valores da coluna "Cadência" (aba 02 Status) que NÃO são referência a CAD-*.
 * A coluna é polimórfica na fonte: ou aponta uma cadência, ou descreve um modo
 * de operação sem cadência. Sem esta lista o validator acusaria 40+ falsas órfãs.
 */
const NON_CADENCE_DIRECTIVES = new Set([
  'Automática',
  'Ação imediata',
  'Ação no mesmo dia',
  'Central',
  'Central de Execução',
  'Derivada',
  'Derivada pela data',
  'Hoje',
  'Imediata',
  'Mesmo dia',
  'Sem ação',
  'Sem ação imediata',
  'Sem cadência',
  'Verificação periódica',
  'Verificação única',
])

/** Os 15 placeholders oficiais (TASK 16). Placeholder fora desta lista é erro. */
const OFFICIAL_PLACEHOLDERS = new Set([
  '{nome}',
  '{vendedor}',
  '{loja}',
  '{veiculo}',
  '{nomeIndicador}',
  '{motivoRealDoContato}',
  '{resumoNecessidade}',
  '{opcao1}',
  '{opcao2}',
  '{data}',
  '{hora}',
  '{valorAvaliacao}',
  '{listaPendencias}',
  '{tipoDecisor}',
  '{dataRetorno}',
])

/**
 * Referências que a planilha v1 declara mas não define, e para as quais NÃO existe
 * interpretação determinística única (§17/§88 do prompt mestre).
 *
 * Estão registradas aqui para que o pipeline continue executando o restante do
 * escopo sem que o bloqueio seja esquecido: o validator SEMPRE reporta estas
 * entradas, e nenhuma delas pode ser contada como resolvida.
 *
 * Resolver exige decisão do proprietário da fonte (corrigir a planilha), não
 * decisão do software.
 */
const KNOWN_SOURCE_BLOCKERS = {
  'INT-Q07': 'SCR-REATIVACAO-CAD03-T1',
  'INT-N04': 'SCR-DECISAO-01',
  'POR-A04': 'SCR-POS-VISITA-CAD03-T{n}',
  'CAR-C07': 'SCR-TROCA-FUTURA-01',
  'CAR-C08': 'SCR-POSVENDA-01',
}

const findings = []
const add = (severity, code, message, context) =>
  findings.push({ severity, code, message, ...(context ? { context } : {}) })

function load(name) {
  const file = path.join(RULES_DIR, `${name}.json`)
  if (!existsSync(file)) {
    console.error(`FALHA: catálogo ausente: rules/mentor-comercial/v1/${name}.json`)
    console.error('Rode: node scripts/mentor-rules-extract.mjs')
    process.exit(2)
  }
  return JSON.parse(readFileSync(file, 'utf8'))
}

function main() {
  const metadata = load('metadata')
  const catalogs = Object.fromEntries(
    Object.keys(EXPECTED_COUNTS).map((name) => [name, load(name).records]),
  )
  const { statuses, cadences, scripts, transitions, channels } = catalogs
  const cadenceSteps = catalogs['cadence-steps']

  const statusById = new Map(statuses.map((s) => [s.statusId, s]))
  const statusByLabel = new Map()
  for (const s of statuses) {
    if (!statusByLabel.has(s.label)) statusByLabel.set(s.label, [])
    statusByLabel.get(s.label).push(s.statusId)
  }
  const cadenceIds = new Set(cadences.map((c) => c.cadenceId))
  const scriptIds = new Set(scripts.map((s) => s.scriptId))
  const channelNames = new Set(channels.map((c) => c.channel))
  const statusFamilies = new Set(statuses.map((s) => s.family))

  // 1. Contagens esperadas
  for (const [name, expected] of Object.entries(EXPECTED_COUNTS)) {
    const actual = catalogs[name].length
    if (actual !== expected) {
      add('ERROR', 'count_mismatch', `${name}: esperado ${expected}, encontrado ${actual}`)
    }
  }

  // 2. Unicidade de IDs
  for (const [label, key, list] of [
    ['status', 'statusId', statuses],
    ['cadência', 'cadenceId', cadences],
    ['script', 'scriptId', scripts],
  ]) {
    const seen = new Set()
    for (const record of list) {
      const id = record[key]
      if (id === null) add('ERROR', 'empty_id', `${label}: ${key} vazio`)
      else if (seen.has(id)) add('ERROR', 'duplicate_id', `${label}: ${key} duplicado "${id}"`)
      else seen.add(id)
    }
  }

  // 3. Campos obrigatórios do status
  for (const s of statuses) {
    for (const field of ['channel', 'family', 'label', 'responsible', 'objective', 'nextStep']) {
      if (s[field] === null) {
        add('ERROR', 'missing_required_field', `Status ${s.statusId}: campo "${field}" vazio`)
      }
    }
  }

  // 4. Canais válidos ("Compartilhado" é marcador oficial de status multicanal)
  for (const s of statuses) {
    if (s.channel !== 'Compartilhado' && !channelNames.has(s.channel)) {
      add('ERROR', 'invalid_channel', `Status ${s.statusId}: canal desconhecido "${s.channel}"`)
    }
  }

  // 5. status -> cadência
  for (const s of statuses) {
    const value = s.cadenceId
    if (value === null) continue
    if (cadenceIds.has(value)) continue
    if (NON_CADENCE_DIRECTIVES.has(value)) continue
    add('ERROR', 'orphan_cadence_ref', `Status ${s.statusId}: cadência desconhecida "${value}"`)
  }

  // 6. passos -> cadência, e cobertura de tentativas
  for (const step of cadenceSteps) {
    if (!cadenceIds.has(step.cadenceId)) {
      add('ERROR', 'orphan_step_cadence', `Passo: cadência desconhecida "${step.cadenceId}"`)
    }
  }
  for (const c of cadences) {
    const steps = cadenceSteps.filter((s) => s.cadenceId === c.cadenceId)
    if (steps.length === 0) {
      add('ERROR', 'cadence_without_steps', `Cadência ${c.cadenceId} sem nenhum passo em 04`)
    }
    const declared = Number.parseInt(String(c.attempts), 10)
    if (Number.isFinite(declared) && declared !== steps.length) {
      add(
        'WARN',
        'cadence_attempt_count',
        `Cadência ${c.cadenceId}: declara ${declared} tentativas, tem ${steps.length} passos`,
      )
    }
  }

  // 7. status -> script (inclui expansão {n}, que é válida quando existir)
  for (const s of statuses) {
    const ref = s.scriptId
    if (ref === null) {
      add('WARN', 'status_without_script', `Status ${s.statusId} sem script base`)
      continue
    }
    if (scriptIds.has(ref)) continue
    if (ref.includes('{n}')) {
      const base = ref.replace('-T{n}', '')
      const expansions = [...scriptIds].filter((id) => id.startsWith(`${base}-T`))
      if (expansions.length > 0) {
        // Expansão só é aceita se casar com o número de passos da cadência do status.
        const steps = cadenceSteps.filter((x) => x.cadenceId === s.cadenceId).length
        if (steps > 0 && expansions.length !== steps) {
          add(
            'ERROR',
            'template_expansion_mismatch',
            `Status ${s.statusId}: "${ref}" expande em ${expansions.length} scripts ` +
              `mas cadência ${s.cadenceId} tem ${steps} passos`,
          )
        }
        continue
      }
    }
    const severity = KNOWN_SOURCE_BLOCKERS[s.statusId] === ref ? 'SOURCE_BLOCKER' : 'ERROR'
    add(severity, 'orphan_script_ref', `Status ${s.statusId}: script inexistente "${ref}"`, {
      statusId: s.statusId,
      scriptRef: ref,
      family: s.family,
      channel: s.channel,
    })
  }

  // Bloqueio registrado que deixou de existir na fonte deve ser removido da lista.
  for (const [statusId, ref] of Object.entries(KNOWN_SOURCE_BLOCKERS)) {
    const s = statusById.get(statusId)
    if (!s) {
      add('WARN', 'stale_blocker', `Bloqueio registrado para status inexistente ${statusId}`)
    } else if (s.scriptId !== ref) {
      add(
        'WARN',
        'stale_blocker',
        `Bloqueio de ${statusId} aponta "${ref}" mas a planilha agora diz "${s.scriptId}" — revalidar`,
      )
    }
  }

  // 8. Placeholders dos scripts
  for (const s of scripts) {
    if (s.text === null) {
      add('ERROR', 'script_without_text', `Script ${s.scriptId} sem texto padrão`)
      continue
    }
    for (const match of s.text.matchAll(/\{[^}]*\}/g)) {
      if (!OFFICIAL_PLACEHOLDERS.has(match[0])) {
        add(
          'ERROR',
          'unknown_placeholder',
          `Script ${s.scriptId}: placeholder desconhecido "${match[0]}"`,
        )
      }
    }
  }

  // 9. Transições: origem e destino resolvem para status conhecido.
  //    A fonte referencia status por RÓTULO, não por ID. "Qualquer" é curinga oficial.
  const isWildcard = (value) => value !== null && /^qualquer/i.test(value.trim())
  for (const [i, t] of transitions.entries()) {
    const line = `Transição #${i + 1} (${t.family} / ${t.result})`
    for (const [field, value] of [
      ['origem', t.fromStatusOrContext],
      ['destino', t.toStatus],
    ]) {
      if (value === null) {
        add('ERROR', 'transition_missing_endpoint', `${line}: ${field} vazio`)
        continue
      }
      if (isWildcard(value)) continue
      if (statusByLabel.has(value)) {
        const ids = statusByLabel.get(value)
        if (field === 'destino' && ids.length > 1) {
          add(
            'WARN',
            'ambiguous_transition_target',
            `${line}: destino "${value}" casa com ${ids.length} status (${ids.join(', ')}); ` +
              `resolução precisa de família/canal`,
          )
        }
        continue
      }
      add(
        field === 'destino' ? 'ERROR' : 'WARN',
        'unresolved_transition_endpoint',
        `${line}: ${field} "${value}" não casa com nenhum rótulo de status`,
      )
    }
    if (t.family !== null && !statusFamilies.has(t.family)) {
      add(
        'WARN',
        'transition_family_not_in_statuses',
        `${line}: família "${t.family}" não existe em 02 Status (agrupamento mais amplo)`,
      )
    }
  }

  // ---- Relatório ----
  const bySeverity = (sev) => findings.filter((f) => f.severity === sev)
  const errors = bySeverity('ERROR')
  const blockers = bySeverity('SOURCE_BLOCKER')
  const warns = bySeverity('WARN')

  if (AS_JSON) {
    console.log(
      JSON.stringify(
        {
          ruleVersion: metadata.version,
          sourceSha256: metadata.sourceSha256,
          counts: metadata.counts,
          summary: { errors: errors.length, sourceBlockers: blockers.length, warnings: warns.length },
          findings,
        },
        null,
        2,
      ),
    )
  } else {
    console.log(`Mentor Comercial — validação da matriz ${metadata.version}`)
    console.log(`Fonte SHA256: ${metadata.sourceSha256}`)
    console.log('')
    for (const [title, list] of [
      ['ERROS', errors],
      ['BLOQUEIOS DE FONTE', blockers],
      ['AVISOS', warns],
    ]) {
      if (list.length === 0) continue
      console.log(`${title} (${list.length}):`)
      for (const f of list) console.log(`  [${f.code}] ${f.message}`)
      console.log('')
    }
    console.log(
      `Resumo: ${errors.length} erro(s), ${blockers.length} bloqueio(s) de fonte, ` +
        `${warns.length} aviso(s).`,
    )
    if (blockers.length > 0) {
      console.log('')
      console.log('Bloqueios de fonte NÃO podem ser resolvidos pelo software: exigem correção')
      console.log('da planilha pelo proprietário. Nenhum ID ou texto de script foi inventado.')
    }
  }

  process.exit(errors.length > 0 ? 1 : 0)
}

main()

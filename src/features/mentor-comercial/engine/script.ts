/**
 * Script Engine (TASK 16). Fonte: aba `05 Scripts` da matriz v1.
 *
 * Biblioteca de scripts 100% determinística. A IA nunca gera, substitui ou
 * completa texto comercial — ela apenas implementou este renderer.
 *
 * Regra central: o renderer é ESTRITO. Variável obrigatória ausente NUNCA é
 * preenchida, adivinhada ou silenciosamente removida. Ela bloqueia o envio.
 */

/** Os 15 placeholders oficiais. Verificado contra os 77 scripts: nem mais, nem menos. */
export const OFFICIAL_PLACEHOLDERS: ReadonlySet<string> = new Set([
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

/** Script de ação interna: nunca vira mensagem de WhatsApp. */
export const INTERNAL_SCRIPT_ID = 'SCR-INTERNO'

/**
 * Referências de script declaradas na matriz v1 que a própria planilha não define,
 * e para as quais não existe interpretação determinística única (§17/§88).
 *
 * Isto NÃO é defeito da implementação. Enquanto a fonte não for corrigida, estes
 * status operam com `scriptReady=false` e WhatsApp bloqueado — o mesmo tratamento
 * dado a variável obrigatória ausente. Todo o restante do Mentor funciona normalmente
 * para eles: status, responsável, objetivo, próximo passo, cadência, score, prioridade,
 * Central e Plano de Ataque.
 */
export const SOURCE_BLOCKED_STATUSES = {
  'INT-Q07': 'SCR-REATIVACAO-CAD03-T1',
  'INT-N04': 'SCR-DECISAO-01',
  'POR-A04': 'SCR-POS-VISITA-CAD03-T{n}',
  'CAR-C07': 'SCR-TROCA-FUTURA-01',
  'CAR-C08': 'SCR-POSVENDA-01',
} as const

export type ScriptVariables = Record<string, string | null | undefined>

export type RenderedScript = {
  /** Texto final, ou `null` quando faltou alguma variável obrigatória. */
  text: string | null
  scriptReady: boolean
  /** Nomes das variáveis ausentes, na ordem em que aparecem no texto, sem repetição. */
  missingVariables: string[]
  /** Placeholders que não pertencem à lista oficial. */
  unknownPlaceholders: string[]
  isInternal: boolean
  allowWhatsApp: boolean
}

export function isInternalScript(scriptId: string | null | undefined): boolean {
  return scriptId === INTERNAL_SCRIPT_ID
}

/** Valor ausente, vazio ou só espaços conta como ausência — nunca como texto válido. */
function isMissing(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === ''
}

export function renderScript(
  template: string,
  variables: ScriptVariables,
  options: { scriptId?: string | null } = {},
): RenderedScript {
  const missingVariables: string[] = []
  const unknownPlaceholders: string[] = []

  for (const match of template.matchAll(/\{[^}]*\}/g)) {
    const token = match[0]
    if (!OFFICIAL_PLACEHOLDERS.has(token)) {
      if (!unknownPlaceholders.includes(token)) unknownPlaceholders.push(token)
      continue
    }
    const name = token.slice(1, -1)
    if (isMissing(variables[name]) && !missingVariables.includes(name)) {
      missingVariables.push(name)
    }
  }

  const isInternal = isInternalScript(options.scriptId)
  const scriptReady = missingVariables.length === 0 && unknownPlaceholders.length === 0

  const text = scriptReady
    ? template.replace(/\{[^}]*\}/g, (token) => {
        const name = token.slice(1, -1)
        return String(variables[name])
      })
    : null

  return {
    text,
    scriptReady,
    missingVariables,
    unknownPlaceholders,
    isInternal,
    // Abrir WhatsApp exige script pronto E não ser ação interna.
    allowWhatsApp: scriptReady && !isInternal,
  }
}

export type ScriptResolutionReason =
  | 'RESOLVED'
  | 'NOT_FOUND'
  | 'ATTEMPT_OUT_OF_RANGE'
  | 'SOURCE_BLOCKER'

export type ScriptResolution = {
  resolved: boolean
  scriptId: string | null
  reason: ScriptResolutionReason
}

/**
 * Resolve a referência de script de um status contra o catálogo.
 *
 * `{n}` é expansão real por número de tentativa — provado estruturalmente para
 * `SCR-INT-CAD01-T{n}`, cujas 6 expansões casam com as 6 tentativas de CAD-01.
 * A expansão só é aceita quando o script correspondente existe; nunca se fabrica ID.
 */
export function resolveScriptRef(
  ref: string | null | undefined,
  context: { catalog: ReadonlySet<string>; attempt: number; statusId?: string | null },
): ScriptResolution {
  const blocked =
    context.statusId != null &&
    context.statusId in SOURCE_BLOCKED_STATUSES &&
    SOURCE_BLOCKED_STATUSES[context.statusId as keyof typeof SOURCE_BLOCKED_STATUSES] === ref

  if (ref == null || ref.trim() === '') {
    return { resolved: false, scriptId: null, reason: blocked ? 'SOURCE_BLOCKER' : 'NOT_FOUND' }
  }

  if (context.catalog.has(ref)) {
    return { resolved: true, scriptId: ref, reason: 'RESOLVED' }
  }

  if (ref.includes('{n}')) {
    const candidate = ref.replace('{n}', String(context.attempt))
    if (context.catalog.has(candidate)) {
      return { resolved: true, scriptId: candidate, reason: 'RESOLVED' }
    }
    const base = ref.replace('-T{n}', '')
    const hasAnyExpansion = [...context.catalog].some((id) => id.startsWith(`${base}-T`))
    if (hasAnyExpansion) {
      return { resolved: false, scriptId: null, reason: 'ATTEMPT_OUT_OF_RANGE' }
    }
  }

  return { resolved: false, scriptId: null, reason: blocked ? 'SOURCE_BLOCKER' : 'NOT_FOUND' }
}

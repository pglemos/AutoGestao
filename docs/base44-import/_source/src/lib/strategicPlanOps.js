import { base44 } from '@/api/base44Client';
import { STANDARD_INDICATORS, STANDARD_PARAMETERS, evaluateFormula, calculateAnnualValue } from '@/lib/indicatorCatalog';
import { createStrategicPlanFromProduct, syncStrategicPlanWithProductPackage } from './productPackageOps';
import { syncStrategicPlanUnitScopes } from './unitScopeOps';
import { resolveUnitPolicy } from './unitPolicyDefaults';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// ─── Catálogo: importar 45 indicadores + 13 parâmetros (idempotente) ──────────
export async function seedCatalog() {
  const existing = await base44.entities.IndicatorDefinition.list('-created_date', 200).catch(() => []);
  const existingParams = await base44.entities.StrategicParameterDefinition.list().catch(() => []);
  let created = 0, paramsCreated = 0;

  for (const ind of STANDARD_INDICATORS) {
    const exists = existing.find(i => i.code === ind.code);
    if (!exists) {
      await base44.entities.IndicatorDefinition.create({
        ...ind,
        aliases: ind.aliases ? JSON.stringify(ind.aliases) : '',
        is_standard: true, is_active: true, status: 'PUBLICADO',
        default_owner_visibility: true, effective_from_year: 2025,
        created_by: 'Administrador MX',
      });
      created++;
    }
  }

  for (const par of STANDARD_PARAMETERS) {
    const exists = existingParams.find(p => p.code === par.code);
    if (!exists) {
      await base44.entities.StrategicParameterDefinition.create({
        ...par,
        monthly_defaults: par.monthly_defaults ? JSON.stringify(par.monthly_defaults) : '',
        effective_from_year: 2025, status: 'ATIVO',
      });
      paramsCreated++;
    }
  }

  await base44.entities.AuditLog.create({
    user_name: 'Administrador MX', user_role: 'ADMINISTRADOR_PRINCIPAL',
    resource: 'IndicatorDefinition', action: 'CATALOG_SEED',
    value_after: `${created} indicadores e ${paramsCreated} parâmetros criados. Total padrão: ${STANDARD_INDICATORS.length}`,
    origin: 'Plano Estratégico — Catálogo', environment: 'PROTOTIPO',
  });

  return { created, paramsCreated };
}

// ─── Migração: corrigir indicadores com departamento undefined ─────────────────
export async function migrateUndefinedIndicators() {
  const all = await base44.entities.IndicatorDefinition.list('-created_date', 200).catch(() => []);
  const undefinedInds = all.filter(i => !i.department);
  let migrated = 0, archived = 0;

  for (const ind of undefinedInds) {
    // Procurar equivalente pelo nome normalizado
    const normalized = ind.name?.toLowerCase().trim()
      .replace(/[áàâãä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
      .replace(/[óòôõö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ç/g, 'c')
      .replace(/[^a-z0-9 ]/g, '').trim();

    const equivalent = STANDARD_INDICATORS.find(si => {
      const siNorm = si.name.toLowerCase().trim()
        .replace(/[áàâãä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
        .replace(/[óòôõö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ç/g, 'c')
        .replace(/[^a-z0-9 ]/g, '').trim();
      return siNorm === normalized || si.name.toLowerCase() === ind.name?.toLowerCase();
    });

    if (equivalent) {
      // Arquivar duplicado
      await base44.entities.IndicatorDefinition.update(ind.id, {
        status: 'ARQUIVADO', is_active: false, department: equivalent.department,
      });
      await base44.entities.AuditLog.create({
        user_name: 'Administrador MX', user_role: 'ADMINISTRADOR_PRINCIPAL',
        resource: 'IndicatorDefinition', resource_id: ind.id,
        action: 'INDICATOR_MIGRATED',
        value_before: ind.name, value_after: `Arquivado — equivalente: ${equivalent.code}`,
        origin: 'Plano Estratégico — Migração', environment: 'PROTOTIPO',
      });
      archived++;
    } else {
      // Classificar corretamente como Indicador Criado
      await base44.entities.IndicatorDefinition.update(ind.id, {
        department: 'OPERACOES', is_standard: false, unit: ind.unit || 'Número inteiro',
        default_direction: ind.default_direction || 'AUMENTAR',
        status: ind.status || 'RASCUNHO',
      });
      await base44.entities.AuditLog.create({
        user_name: 'Administrador MX', user_role: 'ADMINISTRADOR_PRINCIPAL',
        resource: 'IndicatorDefinition', resource_id: ind.id,
        action: 'INDICATOR_RECLASSIFIED',
        value_before: 'undefined', value_after: 'OPERACOES',
        origin: 'Plano Estratégico — Migração', environment: 'PROTOTIPO',
      });
      migrated++;
    }
  }
  return { migrated, archived, total: undefinedInds.length };
}

// ─── Criar Plano Estratégico do cliente ────────────────────────────────────────
export async function createStrategicPlan(clientId, year, options = {}) {
  const { copyFromPreviousYear = false, copyTargets = false, responsibleName = '', responsibleId = '', scope = 'EMPRESA', observation = '' } = options;

  // Nova regra: criar a partir do pacote do produto contratado (não mais "todos os indicadores publicados")
  const result = await createStrategicPlanFromProduct({
    clientAccountId: clientId,
    referenceYear: year,
    scope,
    responsibleName,
    responsibleId,
  });

  if (result.error) return result;
  if (result.alreadyExists) return result;

  // Copiar metas do ano anterior se solicitado
  if (copyFromPreviousYear && copyTargets && result.cycle) {
    const prevCycles = await base44.entities.StrategicPlanCycle.filter({ client_account_id: clientId, year: year - 1 });
    if (prevCycles.length > 0) {
      const prevMonthlyValues = await base44.entities.StrategicTargetMonthlyValue.filter({ strategic_plan_cycle_id: prevCycles[0].id });
      const currentMonthlyValues = await base44.entities.StrategicTargetMonthlyValue.filter({ strategic_plan_cycle_id: result.cycle.id });
      const updates = [];
      for (const pmv of prevMonthlyValues) {
        const cmv = currentMonthlyValues.find(m => m.indicator_code === pmv.indicator_code && m.month === pmv.month);
        if (cmv && pmv.applied_value != null) {
          updates.push({ id: cmv.id, target_value: pmv.applied_value, applied_value: pmv.applied_value });
        }
      }
      for (let i = 0; i < updates.length; i += 500) {
        await base44.entities.StrategicTargetMonthlyValue.bulkUpdate(updates.slice(i, i + 500));
      }
      await recalculateMonthlyValues(result.cycle.id, clientId, year);
    }
  }

  return result;
}

// ─── Reparar escopos de Loja e valores por unidade (Seções 32-33) ───────────────
// Idempotente: cria escopos ausentes, cria valores mensais por Loja ausentes,
// preserva valores legados sem store_id como scope_type=COMPANY (não replica).
export async function repairStrategicPlanStoreScopes({ strategicPlanCycleId, requestedBy = 'Administrador MX' }) {
  const cycle = await base44.entities.StrategicPlanCycle.get(strategicPlanCycleId);
  const clientId = cycle.client_account_id;

  // 1. Sincronizar escopos (criar ausentes para Matriz + Filiais)
  const scopeResult = await syncStrategicPlanUnitScopes({ strategicPlanCycleId, requestedBy });
  const activeScopes = scopeResult.scopes.filter(s => s.status === 'ACTIVE' || s.status === 'FUTURE');

  // 2. Carregar targets e indicadores
  const targets = await base44.entities.StrategicTarget.filter({ strategic_plan_cycle_id: strategicPlanCycleId });
  const indicatorIds = targets.map(t => t.indicator_definition_id);
  const allIndicators = await base44.entities.IndicatorDefinition.filter({ status: 'PUBLICADO' });
  const indicators = allIndicators.filter(i => indicatorIds.includes(i.id));

  // 3. Carregar valores mensais existentes
  const existingMvs = await base44.entities.StrategicTargetMonthlyValue.filter({
    strategic_plan_cycle_id: strategicPlanCycleId,
  });

  // 4. Marcar valores antigos sem store_id como COMPANY_LEGACY (Seção 33 — não replicar)
  const legacyUpdates = existingMvs
    .filter(mv => !mv.store_id && mv.scope_type !== 'COMPANY')
    .map(mv => ({ id: mv.id, scope_type: 'COMPANY', store_id: null, strategic_plan_unit_scope_id: null }));
  if (legacyUpdates.length > 0) {
    for (let i = 0; i < legacyUpdates.length; i += 500) {
      await base44.entities.StrategicTargetMonthlyValue.bulkUpdate(legacyUpdates.slice(i, i + 500));
    }
  }

  // 5. Criar valores mensais ausentes por Loja (idempotente — não duplica existentes)
  const toCreate = [];
  for (const target of targets) {
    const ind = indicators.find(i => i.id === target.indicator_definition_id);
    if (!ind) continue;
    const policy = resolveUnitPolicy(ind.code, null, null, ind);
    const entryMode = policy.unit_entry_mode || 'PER_UNIT_REQUIRED';

    if (entryMode === 'COMPANY_ONLY' || entryMode === 'SHARED_COMPANY_VALUE') {
      // Indicador empresarial: garantir 12 valores scope_type=COMPANY
      for (const month of MONTHS) {
        const exists = existingMvs.find(mv =>
          mv.strategic_target_id === target.id &&
          mv.month === month &&
          (mv.scope_type === 'COMPANY' || !mv.store_id)
        );
        if (!exists) {
          toCreate.push({
            strategic_target_id: target.id,
            strategic_plan_cycle_id: strategicPlanCycleId,
            client_account_id: clientId,
            indicator_definition_id: ind.id,
            indicator_code: ind.code,
            year: cycle.year, month,
            store_id: null,
            scope_type: 'COMPANY',
            strategic_plan_unit_scope_id: null,
            target_value: null, calculated_value: null, applied_value: null,
            is_overridden: false, status: 'RASCUNHO', version_number: '1',
            updated_by: requestedBy, updated_at: new Date().toISOString(),
          });
        }
      }
    } else {
      // Indicador por unidade: criar 12 valores × N unidades ativas
      for (const scope of activeScopes) {
        for (const month of MONTHS) {
          const exists = existingMvs.find(mv =>
            mv.strategic_target_id === target.id &&
            mv.month === month &&
            mv.store_id === scope.store_id
          );
          if (!exists) {
            toCreate.push({
              strategic_target_id: target.id,
              strategic_plan_cycle_id: strategicPlanCycleId,
              client_account_id: clientId,
              indicator_definition_id: ind.id,
              indicator_code: ind.code,
              year: cycle.year, month,
              store_id: scope.store_id,
              scope_type: 'STORE',
              strategic_plan_unit_scope_id: scope.id,
              target_value: null, calculated_value: null, applied_value: null,
              is_overridden: false, status: 'RASCUNHO', version_number: '1',
              updated_by: requestedBy, updated_at: new Date().toISOString(),
            });
          }
        }
      }
    }
  }

  let mvsCreated = 0;
  if (toCreate.length > 0) {
    for (let i = 0; i < toCreate.length; i += 500) {
      await base44.entities.StrategicTargetMonthlyValue.bulkCreate(toCreate.slice(i, i + 500));
    }
    mvsCreated = toCreate.length;
  }

  // 5b. Marcar snapshots de Realizado/Ano Anterior sem store_id como COMPANY_LEGACY
  if (activeScopes.length > 1) {
    const snapshots = await base44.entities.IndicatorActualSnapshot.filter({
      client_account_id: clientId,
    }).catch(() => []);
    const snapLegacyUpdates = snapshots
      .filter(s => !s.store_id && s.scope_type !== 'COMPANY')
      .map(s => ({ id: s.id, scope_type: 'COMPANY', store_id: null, strategic_plan_unit_scope_id: null }));
    if (snapLegacyUpdates.length > 0) {
      for (let i = 0; i < snapLegacyUpdates.length; i += 500) {
        await base44.entities.IndicatorActualSnapshot.bulkUpdate(snapLegacyUpdates.slice(i, i + 500));
      }
    }
  }

  // 6. Recalcular indicadores calculados
  await recalculateMonthlyValues(strategicPlanCycleId, clientId, cycle.year);

  // 7. Auditoria
  await base44.entities.AuditLog.create({
    user_name: requestedBy, user_role: 'ADMINISTRADOR_PRINCIPAL',
    client_account_id: clientId,
    resource: 'StrategicPlanCycle', resource_id: strategicPlanCycleId,
    action: 'UNIT_SCOPES_REPAIR',
    value_after: JSON.stringify({
      scopesCreated: scopeResult.created, mvsCreated,
      legacyPreserved: legacyUpdates.length, unitCount: activeScopes.length,
    }),
    origin: 'Plano Estratégico — Reparação de Escopos de Loja', environment: 'PROTOTIPO',
  }).catch(() => {});

  return {
    scopesCreated: scopeResult.created,
    mvsCreated,
    legacyPreserved: legacyUpdates.length,
    unitCount: activeScopes.length,
    unitNames: activeScopes.map(s => s.store_name_snapshot),
  };
}

// ─── Reparar Plano Estratégico existente (idempotente) ──────────────────────────
export async function repairStrategicPlan(cycleId) {
  // Reparar escopos de Loja e valores por unidade ANTES da sincronização do pacote
  const scopeRepair = await repairStrategicPlanStoreScopes({ strategicPlanCycleId: cycleId });
  // Nova regra: sincronizar com o pacote do produto (não mais "todos os indicadores publicados")
  const result = await syncStrategicPlanWithProductPackage({ strategicPlanCycleId: cycleId });
  if (result.error) return result;

  const cycle = await base44.entities.StrategicPlanCycle.get(cycleId);
  const finalTargets = await base44.entities.StrategicTarget.filter({ strategic_plan_cycle_id: cycleId });
  const finalMvs = await base44.entities.StrategicTargetMonthlyValue.filter({ strategic_plan_cycle_id: cycleId });
  const indicators = await base44.entities.IndicatorDefinition.filter({ status: 'PUBLICADO' });
  const manualCount = finalTargets.filter(t => {
    const ind = indicators.find(i => i.id === t.indicator_definition_id);
    return ind && (ind.input_mode === 'MANUAL' || ind.target_calculation_mode === 'MANUAL');
  }).length;

  return {
    cycleId,
    newIndicatorCount: finalTargets.length,
    newMonthlyValueCount: finalMvs.length,
    manualCount,
    calculatedCount: finalTargets.length - manualCount,
    created: result.added,
    repaired: result.backfilled,
    duplicatesRemoved: 0,
    scopesCreated: scopeRepair.scopesCreated,
    mvsCreated: scopeRepair.mvsCreated,
    legacyPreserved: scopeRepair.legacyPreserved,
    unitCount: scopeRepair.unitCount,
    unitNames: scopeRepair.unitNames,
  };
}

// ─── Parâmetro efetivo (hierarquia: cliente/mês > cliente/ano > MX mês > MX padrão) ──
export function getEffectiveParameter(paramCode, month, params, overrides) {
  const param = params.find(p => p.code === paramCode);
  if (!param) return { value: null, source: 'SEM_PARAMETRO' };

  // 1. Override específico do cliente para este mês
  const monthOverride = overrides.find(o => o.parameter_code === paramCode && o.status === 'ATIVO' && o.month === month);
  if (monthOverride) return { value: monthOverride.override_value, source: 'CLIENT_MONTH_OVERRIDE' };

  // 2. Override do cliente para o ano inteiro
  const yearOverride = overrides.find(o => o.parameter_code === paramCode && o.status === 'ATIVO' && !o.month);
  if (yearOverride) return { value: yearOverride.override_value, source: 'CLIENT_YEAR_OVERRIDE' };

  // 3. Padrão MX mensal
  if (param.allows_monthly_values && param.monthly_defaults) {
    const monthly = typeof param.monthly_defaults === 'string' ? JSON.parse(param.monthly_defaults) : param.monthly_defaults;
    if (monthly && monthly[month - 1] != null) return { value: monthly[month - 1], source: 'MX_DEFAULT' };
  }

  // 4. Padrão MX geral
  return { value: param.default_value, source: 'MX_DEFAULT' };
}

// ─── Recalcular valores mensais calculados ────────────────────────────────────
export async function recalculateMonthlyValues(cycleId, clientId, year) {
  const targets = await base44.entities.StrategicTarget.filter({ strategic_plan_cycle_id: cycleId });
  const monthlyValues = await base44.entities.StrategicTargetMonthlyValue.filter({ strategic_plan_cycle_id: cycleId });
  const params = await base44.entities.StrategicParameterDefinition.filter({ status: 'ATIVO' });
  const overrides = await base44.entities.ClientStrategicParameterOverride.filter({
    client_account_id: clientId, reference_year: Number(year), status: 'ATIVO',
  }).catch(() => []);

  const indicators = await base44.entities.IndicatorDefinition.filter({ status: 'PUBLICADO' });
  const indicatorMap = {};
  for (const i of indicators) indicatorMap[i.code] = i;

  // Mapa de valores por indicador e mês
  const valueMap = {};
  for (const mv of monthlyValues) {
    if (!valueMap[mv.indicator_code]) valueMap[mv.indicator_code] = {};
    valueMap[mv.indicator_code][mv.month] = mv.applied_value ?? mv.target_value;
  }

  // Passar 3 vezes para resolver dependências
  for (let pass = 0; pass < 3; pass++) {
    const bulkUpdates = [];
    for (const target of targets) {
      const ind = indicatorMap[target.indicator_code];
      if (!ind || ind.input_mode === 'MANUAL' || ind.target_calculation_mode === 'MANUAL') continue;

      for (const month of MONTHS) {
        const mv = monthlyValues.find(v => v.strategic_target_id === target.id && v.month === month);
        if (!mv) continue;

        // Construir paramMap efetivo para este mês
        const paramMap = {};
        const paramSources = {};
        const paramCodes = ind.parameter_codes ? (typeof ind.parameter_codes === 'string' ? JSON.parse(ind.parameter_codes) : ind.parameter_codes) : [];
        for (const pc of paramCodes) {
          const eff = getEffectiveParameter(pc, month, params, overrides);
          paramMap[pc] = eff.value;
          paramSources[pc] = eff.source;
        }
        // Também incluir todos os params para fórmulas que podem referenciar outros
        for (const p of params) {
          if (paramMap[p.code] == null) paramMap[p.code] = p.default_value;
        }

        // Construir mapa de valores flat para este mês (evaluateFormula espera valores simples)
        const flatValues = {};
        for (const [code, monthMap] of Object.entries(valueMap)) {
          flatValues[code] = monthMap[month] ?? null;
        }

        const calc = evaluateFormula(ind.formula_expression, flatValues, paramMap);
        if (calc != null) {
          valueMap[ind.code][month] = calc;
          bulkUpdates.push({
            id: mv.id,
            calculated_value: calc,
            applied_value: calc,
            target_value: calc,
            parameter_source: Object.values(paramSources).join(','),
            parameter_snapshot: JSON.stringify(paramMap),
            formula_snapshot: ind.formula_expression,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }
    for (let i = 0; i < bulkUpdates.length; i += 500) {
      const chunk = bulkUpdates.slice(i, i + 500);
      if (chunk.length > 0) await base44.entities.StrategicTargetMonthlyValue.bulkUpdate(chunk);
    }
  }

  return valueMap;
}

// ─── Atualizar um valor mensal (apenas MANUAL) ────────────────────────────────
export async function updateMonthlyValue(monthlyValueId, value, options = {}) {
  const mv = await base44.entities.StrategicTargetMonthlyValue.get(monthlyValueId);
  const ind = await base44.entities.IndicatorDefinition.get(mv.indicator_definition_id);

  // Bloquear somente indicadores que são calculados em ambos os sentidos (input e target).
  // Alinhado com o filtro do QuickEntryView: se input_mode === 'MANUAL' OU target_calculation_mode === 'MANUAL', o indicador é digitável.
  if (ind.input_mode !== 'MANUAL' && ind.target_calculation_mode !== 'MANUAL') {
    throw new Error('Indicador calculado não pode ser editado diretamente. Ajuste os indicadores-base ou os parâmetros do cliente.');
  }

  const update = {
    target_value: value,
    applied_value: value,
    updated_at: new Date().toISOString(),
    updated_by: options.updatedBy || 'Administrador MX',
  };

  await base44.entities.StrategicTargetMonthlyValue.update(monthlyValueId, update);

  await base44.entities.AuditLog.create({
    user_name: options.updatedBy || 'Administrador MX', user_role: 'CONSULTOR_RESPONSAVEL',
    client_account_id: mv.client_account_id,
    resource: 'StrategicTargetMonthlyValue', resource_id: monthlyValueId,
    action: 'TARGET_UPDATE',
    value_before: String(mv.applied_value ?? mv.target_value ?? ''),
    value_after: String(value),
    origin: 'Editor Anual — Meta', environment: 'PRODUCTION',
    indicator_code: ind.code,
  });

  return update;
}

// ─── Publicar Plano Estratégico ────────────────────────────────────────────────
export async function publishPlan(cycleId) {
  const cycle = await base44.entities.StrategicPlanCycle.get(cycleId);
  const monthlyValues = await base44.entities.StrategicTargetMonthlyValue.filter({ strategic_plan_cycle_id: cycleId });

  // Copiar valores para published_value em lote
  const now = new Date().toISOString();
  const mvUpdates = monthlyValues.map(mv => ({
    id: mv.id,
    published_value: mv.applied_value ?? mv.target_value,
    published_at: now,
    status: 'PUBLICADO',
  }));
  for (let i = 0; i < mvUpdates.length; i += 500) {
    const chunk = mvUpdates.slice(i, i + 500);
    if (chunk.length > 0) await base44.entities.StrategicTargetMonthlyValue.bulkUpdate(chunk);
  }

  await base44.entities.StrategicPlanCycle.update(cycleId, {
    status: 'PUBLICADO',
    published_at: now,
    published_by: 'Administrador MX',
  });

  await base44.entities.AuditLog.create({
    user_name: 'Administrador MX', user_role: 'ADMINISTRADOR_IMPLANTACAO',
    client_account_id: cycle.client_account_id,
    resource: 'StrategicPlanCycle', resource_id: cycleId,
    action: 'PLAN_PUBLISH',
    value_after: `Plano ${cycle.year} publicado com ${monthlyValues.length} valores mensais`,
    origin: 'Editor Anual — Publicar', environment: 'PROTOTIPO',
  });

  return cycle;
}

// ─── Validar Plano ────────────────────────────────────────────────────────────
export async function validatePlan(cycleId) {
  const cycle = await base44.entities.StrategicPlanCycle.get(cycleId);
  const targets = await base44.entities.StrategicTarget.filter({ strategic_plan_cycle_id: cycleId });
  const monthlyValues = await base44.entities.StrategicTargetMonthlyValue.filter({ strategic_plan_cycle_id: cycleId });
  const indicators = await base44.entities.IndicatorDefinition.filter({ status: 'PUBLICADO' });
  const indMap = {};
  for (const i of indicators) indMap[i.id] = i;

  // Detectar plano incompleto
  if (targets.length === 0) {
    return {
      ready: 0, pending: 0, total: 0, isIncomplete: true,
      issues: [{ type: 'PLAN_EMPTY', severity: 'CRITICAL', message: 'Plano incompleto: nenhum indicador foi carregado.' }],
    };
  }
  // Sem threshold hard-coded — o roster vem do pacote do produto (pode ter 10, 46, etc.)
  if (targets.length < 3) {
    return {
      ready: 0, pending: 1, total: targets.length, isIncomplete: true,
      issues: [{ type: 'PLAN_INCOMPLETE', severity: 'CRITICAL', message: `Plano com apenas ${targets.length} indicador(es). Sincronize com o pacote do produto.` }],
    };
  }

  const issues = [];
  let ready = 0;

  for (const target of targets) {
    const ind = indMap[target.indicator_definition_id];
    if (!ind) continue;
    const mvs = monthlyValues.filter(mv => mv.strategic_target_id === target.id);

    for (const mv of mvs) {
      const val = mv.applied_value ?? mv.target_value;
      if (val == null || val === '') {
        if (ind.target_calculation_mode === 'MANUAL') {
          issues.push({
            type: 'CAMPO_VAZIO', severity: 'PENDENCIA',
            indicator: ind.name, indicator_code: ind.code,
            month: mv.month, target_id: target.id, monthly_value_id: mv.id,
            message: `${ind.name} — ${MONTH_LABELS[mv.month - 1]}: valor não preenchido`,
          });
        }
      } else if (ind.target_calculation_mode === 'CALCULATED_ADJUSTABLE' && mv.is_overridden && !mv.override_reason) {
        issues.push({
          type: 'AJUSTE_SEM_JUSTIFICATIVA', severity: 'PENDENCIA',
          indicator: ind.name, indicator_code: ind.code,
          month: mv.month, target_id: target.id, monthly_value_id: mv.id,
          message: `${ind.name} — ${MONTH_LABELS[mv.month - 1]}: ajuste sem justificativa`,
        });
      }
    }
    if (!issues.some(i => i.target_id === target.id)) ready++;
  }

  return { ready, pending: issues.length, issues, total: targets.length };
}

// ─── Criar cliente demonstrativo + plano 2026 ────────────────────────────────
export async function seedDemoData() {
  let client = null;
  const existing = await base44.entities.ClientAccount.filter({ name: 'Cliente Demonstração — Plano Estratégico' });
  if (existing.length > 0) {
    client = existing[0];
  } else {
    client = await base44.entities.ClientAccount.create({
      name: 'Cliente Demonstração — Plano Estratégico',
      short_name: 'Demo',
      structure_type: 'LOJA_UNICA',
      lifecycle_status: 'ATIVO',
      business_phase: 'CRESCIMENTO',
      city: 'São Paulo', state: 'SP',
      main_contact_name: 'Dono Demonstração',
      commercial_owner_mx: 'Administrador MX',
      implementation_owner_mx: 'Administrador MX',
      activated_at: new Date().toISOString().split('T')[0],
      onboarding_completed: true, onboarding_step: 7,
    });
  }

  // Criar plano 2026
  const cycle = await createStrategicPlan(client.id, 2026, { responsibleName: 'Administrador MX' });

  // Preencher valores de exemplo
  const demoValues = {
    SALES_WALKIN: 15, SALES_REFERRAL: 5, SALES_COMPANY_PORTFOLIO: 5,
    SALES_SELLER_PORTFOLIO: 10, SALES_INTERNET: 20, SALES_OTHER: 0,
    SELLER_COUNT: 7,
    CONTRIBUTION_MARGIN: 440000, ADDITIONAL_REVENUE: 50000, TOTAL_EXPENSE: 300000,
    INVENTORY_AVERAGE_TICKET: 45000,
    INTERNET_COST_PER_SALE: 350,
    INSTAGRAM_FOLLOWERS: 5000,
    GOOGLE_BUSINESS_RATING: 4.9,
    CONTENT_QUALITY: 5,
    AVERAGE_PREPARATION_COST: 800,
    AVERAGE_AFTER_SALES_COST: 600,
    EMPLOYEE_COUNT: 12,
  };

  const monthlyValues = await base44.entities.StrategicTargetMonthlyValue.filter({ strategic_plan_cycle_id: cycle.id });
  for (const [code, val] of Object.entries(demoValues)) {
    const mvs = monthlyValues.filter(mv => mv.indicator_code === code);
    for (const mv of mvs) {
      await base44.entities.StrategicTargetMonthlyValue.update(mv.id, {
        target_value: val, applied_value: val,
        updated_at: new Date().toISOString(),
        updated_by: 'Administrador MX',
      });
    }
  }

  // Recalcular indicadores calculados
  await recalculateMonthlyValues(cycle.id, client.id, 2026);

  await base44.entities.AuditLog.create({
    user_name: 'Administrador MX', user_role: 'ADMINISTRADOR_PRINCIPAL',
    client_account_id: client.id, client_account_name: client.name,
    resource: 'StrategicPlanCycle', resource_id: cycle.id,
    action: 'DEMO_DATA_SEED',
    value_after: 'Dados demonstrativos preenchidos para 2026',
    origin: 'Plano Estratégico — Demo', environment: 'PROTOTIPO',
  });

  return { client, cycle };
}

// ─── Ocultar/Reativar indicador no Dono ────────────────────────────────────────
export async function toggleIndicatorVisibility(indicatorId, visible, options = {}) {
  const ind = await base44.entities.IndicatorDefinition.get(indicatorId);
  await base44.entities.IndicatorDefinition.update(indicatorId, {
    default_owner_visibility: visible,
    updated_by: options.updatedBy || 'Administrador MX',
  });

  await base44.entities.AuditLog.create({
    user_name: options.updatedBy || 'Administrador MX', user_role: 'ADMINISTRADOR_PRINCIPAL',
    resource: 'IndicatorDefinition', resource_id: indicatorId,
    action: visible ? 'INDICATOR_REACTIVATE' : 'INDICATOR_HIDE',
    value_before: String(!visible), value_after: String(visible),
    origin: 'Plano Estratégico — Visibilidade', environment: 'PROTOTIPO',
    justification: options.reason,
  });

  return ind;
}

// ─── Atualizar parâmetro (criar nova versão) ──────────────────────────────────
export async function updateParameter(paramId, newValue, options = {}) {
  const param = await base44.entities.StrategicParameterDefinition.get(paramId);
  const oldValue = param.default_value;
  await base44.entities.StrategicParameterDefinition.update(paramId, {
    default_value: newValue,
  });

  await base44.entities.AuditLog.create({
    user_name: options.updatedBy || 'Administrador MX', user_role: 'ADMINISTRADOR_PRINCIPAL',
    resource: 'StrategicParameterDefinition', resource_id: paramId,
    action: 'PARAMETER_UPDATE',
    value_before: String(oldValue), value_after: String(newValue),
    origin: 'Plano Estratégico — Parâmetros', environment: 'PROTOTIPO',
    justification: options.reason,
  });

  return param;
}

// ─── Salvar override de parâmetro por cliente ──────────────────────────────────
export async function saveClientParameterOverride(clientId, cycleId, year, paramDef, newValue, scope, selectedMonths, reason, options = {}) {
  const param = await base44.entities.StrategicParameterDefinition.get(paramDef.id);
  const oldValue = param.default_value;

  // Encerrar overrides anteriores do mesmo parâmetro para este cliente/ano
  const existing = await base44.entities.ClientStrategicParameterOverride.filter({
    client_account_id: clientId, reference_year: Number(year), parameter_code: param.code, status: 'ATIVO',
  }).catch(() => []);
  for (const o of existing) {
    await base44.entities.ClientStrategicParameterOverride.update(o.id, { status: 'ENCERRADO', updated_by: options.updatedBy || 'Administrador MX' });
  }

  // Criar novo override
  const monthsToApply = scope === 'ANO_INTEIRO' ? [] : (scope === 'SOMENTE_ESTE_MES' ? [selectedMonths[0]] : selectedMonths);
  for (const month of (monthsToApply.length > 0 ? monthsToApply : [null])) {
    await base44.entities.ClientStrategicParameterOverride.create({
      client_account_id: clientId,
      strategic_plan_cycle_id: cycleId,
      reference_year: Number(year),
      parameter_definition_id: paramDef.id,
      parameter_code: param.code,
      parameter_name: param.name,
      month: month || null,
      override_value: newValue,
      default_value_snapshot: oldValue,
      application_scope: scope,
      applied_months: JSON.stringify(monthsToApply),
      reason,
      status: 'ATIVO',
      effective_from: new Date().toISOString().split('T')[0],
      created_by: options.updatedBy || 'Administrador MX',
      updated_by: options.updatedBy || 'Administrador MX',
    });
  }

  await base44.entities.AuditLog.create({
    user_name: options.updatedBy || 'Administrador MX', user_role: 'CONSULTOR_RESPONSAVEL',
    client_account_id: clientId,
    resource: 'ClientStrategicParameterOverride',
    action: 'PARAMETER_OVERRIDE_SAVE',
    value_before: String(oldValue), value_after: String(newValue),
    origin: 'Parâmetros do Cliente', environment: 'PRODUCTION',
    parameter_code: param.code, justification: reason,
  });

  // Recalcular
  if (cycleId) await recalculateMonthlyValues(cycleId, clientId, Number(year));

  return { oldValue, newValue };
}

// ─── Restaurar parâmetro ao padrão MX ──────────────────────────────────────────
export async function restoreParameterToDefault(clientId, cycleId, year, paramCode, options = {}) {
  const overrides = await base44.entities.ClientStrategicParameterOverride.filter({
    client_account_id: clientId, reference_year: Number(year), parameter_code: paramCode, status: 'ATIVO',
  }).catch(() => []);

  for (const o of overrides) {
    await base44.entities.ClientStrategicParameterOverride.update(o.id, { status: 'ENCERRADO', updated_by: options.updatedBy || 'Administrador MX' });
  }

  await base44.entities.AuditLog.create({
    user_name: options.updatedBy || 'Administrador MX', user_role: 'CONSULTOR_RESPONSAVEL',
    client_account_id: clientId,
    resource: 'ClientStrategicParameterOverride',
    action: 'PARAMETER_RESTORE_DEFAULT',
    parameter_code: paramCode,
    value_after: 'Padrão MX restaurado',
    origin: 'Parâmetros do Cliente', environment: 'PRODUCTION',
  });

  if (cycleId) await recalculateMonthlyValues(cycleId, clientId, Number(year));

  return { restored: overrides.length };
}

// ─── Prévia do impacto de alteração de parâmetro ───────────────────────────────
export async function previewParameterImpact(clientId, cycleId, year, paramCode, newValue, month) {
  const params = await base44.entities.StrategicParameterDefinition.filter({ status: 'ATIVO' });
  const param = params.find(p => p.code === paramCode);
  if (!param) return null;

  const overrides = await base44.entities.ClientStrategicParameterOverride.filter({
    client_account_id: clientId, reference_year: Number(year), status: 'ATIVO',
  }).catch(() => []);

  const indicators = await base44.entities.IndicatorDefinition.filter({ status: 'PUBLICADO' });
  const impactedCodes = typeof param.indicator_codes === 'string' ? JSON.parse(param.indicator_codes) : (param.indicator_codes || []);

  const monthlyValues = await base44.entities.StrategicTargetMonthlyValue.filter({ strategic_plan_cycle_id: cycleId });
  const valueMap = {};
  for (const mv of monthlyValues) {
    if (!valueMap[mv.indicator_code]) valueMap[mv.indicator_code] = {};
    valueMap[mv.indicator_code][mv.month] = mv.applied_value ?? mv.target_value;
  }

  // Simular cálculo antes e depois
  const buildParamMap = (overrideValue) => {
    const pm = {};
    for (const p of params) {
      const mo = overrides.find(o => o.parameter_code === p.code && o.month === month);
      const yo = overrides.find(o => o.parameter_code === p.code && !o.month);
      if (p.code === paramCode) pm[p.code] = overrideValue;
      else if (mo) pm[p.code] = mo.override_value;
      else if (yo) pm[p.code] = yo.override_value;
      else if (p.allows_monthly_values && p.monthly_defaults) {
        const md = typeof p.monthly_defaults === 'string' ? JSON.parse(p.monthly_defaults) : p.monthly_defaults;
        pm[p.code] = md?.[month - 1] ?? p.default_value;
      } else pm[p.code] = p.default_value;
    }
    return pm;
  };

  const oldParamMap = buildParamMap(param.default_value);
  const newParamMap = buildParamMap(newValue);

  const results = [];
  for (const code of impactedCodes) {
    const ind = indicators.find(i => i.code === code);
    if (!ind || !ind.formula_expression) continue;
    const oldVal = evaluateFormula(ind.formula_expression, valueMap, oldParamMap);
    const newVal = evaluateFormula(ind.formula_expression, valueMap, newParamMap);
    results.push({ code, name: ind.name, oldValue: oldVal, newValue: newVal });
  }

  return { paramCode, paramName: param.name, oldValue: param.default_value, newValue, month, impacted: results };
}

// ─── Criar revisão de plano publicado ──────────────────────────────────────────
export async function createPlanRevision(cycleId, options = {}) {
  const cycle = await base44.entities.StrategicPlanCycle.get(cycleId);
  const newVersion = String(parseInt(cycle.version_number || '1') + 1);

  // Criar novo ciclo (revisão)
  const newCycle = await base44.entities.StrategicPlanCycle.create({
    client_account_id: cycle.client_account_id,
    name: cycle.name + ' (Revisão ' + newVersion + ')',
    year: cycle.year,
    start_date: cycle.start_date, end_date: cycle.end_date,
    status: 'RASCUNHO',
    responsible_consultant_id: cycle.responsible_consultant_id,
    responsible_consultant_name: cycle.responsible_consultant_name,
    version_number: newVersion,
  });

  // Copiar targets e monthly values
  const targets = await base44.entities.StrategicTarget.filter({ strategic_plan_cycle_id: cycleId });
  for (const t of targets) {
    const newTarget = await base44.entities.StrategicTarget.create({
      ...t,
      id: undefined, created_date: undefined, updated_date: undefined,
      strategic_plan_cycle_id: newCycle.id, status: 'RASCUNHO', version_number: newVersion,
    });
    const mvs = await base44.entities.StrategicTargetMonthlyValue.filter({ strategic_target_id: t.id });
    for (const mv of mvs) {
      await base44.entities.StrategicTargetMonthlyValue.create({
        ...mv,
        id: undefined, created_date: undefined, updated_date: undefined,
        strategic_target_id: newTarget.id,
        strategic_plan_cycle_id: newCycle.id,
        status: 'RASCUNHO', version_number: newVersion,
      });
    }
  }

  await base44.entities.AuditLog.create({
    user_name: options.updatedBy || 'Administrador MX', user_role: 'CONSULTOR_RESPONSAVEL',
    client_account_id: cycle.client_account_id,
    resource: 'StrategicPlanCycle', resource_id: newCycle.id,
    action: 'PLAN_REVISION_CREATE',
    value_before: `Versão ${cycle.version_number} (PUBLICADO)`,
    value_after: `Versão ${newVersion} (RASCUNHO)`,
    origin: 'Parâmetros do Cliente — Revisão', environment: 'PRODUCTION',
  });

  return newCycle;
}

// ─── Adicionar indicador ao Plano (cria Target + 12 mensais + ClientStrategicIndicator) ──
export async function addIndicatorToPlan(cycleId, clientId, year, indicatorId, options = {}) {
  const ind = await base44.entities.IndicatorDefinition.get(indicatorId);

  // Verificar duplicidade
  const existing = await base44.entities.StrategicTarget.filter({
    strategic_plan_cycle_id: cycleId,
    indicator_definition_id: indicatorId,
  });
  if (existing.length > 0) {
    return { error: 'Este indicador já faz parte do Plano Estratégico.', alreadyExists: true, target: existing[0] };
  }

  // Criar StrategicTarget
  const target = await base44.entities.StrategicTarget.create({
    strategic_plan_cycle_id: cycleId,
    client_account_id: clientId,
    indicator_definition_id: ind.id,
    indicator_name: ind.name,
    indicator_code: ind.code,
    indicator_area: ind.department,
    scope_type: 'EMPRESA',
    target_direction: ind.default_direction || 'AUMENTAR',
    aggregation_policy: 'SOMA',
    display_format: ind.display_format || 'INTEIRO',
    unit: ind.unit,
    status: 'RASCUNHO',
    version_number: '1',
    created_by: options.updatedBy || 'Administrador MX',
  });

  // Criar 12 valores mensais
  for (const month of MONTHS) {
    await base44.entities.StrategicTargetMonthlyValue.create({
      strategic_target_id: target.id,
      strategic_plan_cycle_id: cycleId,
      client_account_id: clientId,
      indicator_definition_id: ind.id,
      indicator_code: ind.code,
      year, month,
      target_value: null,
      calculated_value: null,
      applied_value: null,
      is_overridden: false,
      status: 'RASCUNHO',
      version_number: '1',
      updated_by: options.updatedBy || 'Administrador MX',
      updated_at: new Date().toISOString(),
    });
  }

  // Criar ClientStrategicIndicator com origem de personalização do cliente
  await base44.entities.ClientStrategicIndicator.create({
    strategic_plan_cycle_id: cycleId,
    client_account_id: clientId,
    indicator_definition_id: ind.id,
    indicator_code: ind.code,
    indicator_name: ind.name,
    enabled: true,
    visible_to_owner: ind.default_owner_visibility !== false,
    scope_type: 'EMPRESA',
    display_order: ind.global_display_order || 99,
    status: 'ATIVO',
    origin_type: 'CLIENT_CUSTOMIZATION',
    added_by: options.updatedBy || 'Administrador MX',
    added_at: new Date().toISOString(),
    created_by: options.updatedBy || 'Administrador MX',
  });

  // Recalcular
  await recalculateMonthlyValues(cycleId, clientId, year);

  // Auditoria
  await base44.entities.AuditLog.create({
    user_name: options.updatedBy || 'Administrador MX', user_role: 'ADMINISTRADOR_PRINCIPAL',
    client_account_id: clientId,
    resource: 'ClientStrategicIndicator', resource_id: target.id,
    action: 'INDICATOR_ADDED_TO_PLAN',
    value_after: `${ind.name} (${ind.code}) adicionado ao Plano ${year}`,
    origin: 'Plano Estratégico — Adicionar Indicador', environment: 'PROTOTIPO',
  });

  return { target, indicator: ind };
}

export const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MONTH_LABELS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

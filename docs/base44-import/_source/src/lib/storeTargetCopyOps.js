// ─── Copiar e Exportar Metas entre Lojas ──────────────────────────────────────
// Seções 4-16, 17-21: operações de cópia e exportação de metas por Loja

import { base44 } from '@/api/base44Client';
import { recalculateMonthlyValues, createPlanRevision, MONTH_LABELS } from './strategicPlanOps';
import { resolveUnitPolicy } from './unitPolicyDefaults';
import { computeValueMap } from './strategicCalc';
import { generateStoreTargetExport } from './excelTargetTemplateGenerator';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function isManualIndicator(ind) {
  return ind.input_mode === 'MANUAL' || ind.target_calculation_mode === 'MANUAL';
}

function isCompanyLevelIndicator(ind) {
  const policy = resolveUnitPolicy(ind.code, null, null, ind);
  return policy.unit_entry_mode === 'COMPANY_ONLY' || policy.unit_entry_mode === 'SHARED_COMPANY_VALUE';
}

// ─── Prévia da cópia (Seção 12) ───────────────────────────────────────────────
export async function previewStoreTargetsCopy({
  strategicPlanCycleId, sourceStoreId, targetStoreIds, selectedMonths, selectedIndicatorIds, conflictPolicy,
}) {
  const cycle = await base44.entities.StrategicPlanCycle.get(strategicPlanCycleId);
  const targets = await base44.entities.StrategicTarget.filter({ strategic_plan_cycle_id: strategicPlanCycleId });
  const allIndicators = await base44.entities.IndicatorDefinition.filter({ status: 'PUBLICADO' });
  const indicators = allIndicators.filter(i => targets.some(t => t.indicator_definition_id === i.id));
  const scopes = await base44.entities.StrategicPlanUnitScope.filter({
    strategic_plan_cycle_id: strategicPlanCycleId,
  }).catch(() => []);

  const manualIndicators = indicators.filter(isManualIndicator);
  const copyableIndicators = manualIndicators.filter(i => !isCompanyLevelIndicator(i));
  const filteredIndicators = selectedIndicatorIds?.length > 0
    ? copyableIndicators.filter(i => selectedIndicatorIds.includes(i.id))
    : copyableIndicators;

  const companyIgnored = manualIndicators.filter(isCompanyLevelIndicator);
  const calcIndicators = indicators.filter(i => !isManualIndicator(i));

  const allMvs = await base44.entities.StrategicTargetMonthlyValue.filter({
    strategic_plan_cycle_id: strategicPlanCycleId,
  });

  const sourceMvs = allMvs.filter(mv => mv.store_id === sourceStoreId);
  const sourceScope = scopes.find(s => s.store_id === sourceStoreId);
  const months = selectedMonths?.length > 0 ? selectedMonths : MONTHS;

  const rows = [];
  let toFill = 0, toReplace = 0, preserved = 0, ignored = 0;

  for (const targetStoreId of targetStoreIds) {
    const targetScope = scopes.find(s => s.store_id === targetStoreId);
    const targetMvs = allMvs.filter(mv => mv.store_id === targetStoreId);

    for (const ind of filteredIndicators) {
      const target = targets.find(t => t.indicator_definition_id === ind.id);
      if (!target) continue;

      for (const month of months) {
        const sourceMv = sourceMvs.find(mv => mv.strategic_target_id === target.id && mv.month === month);
        const sourceValue = sourceMv?.applied_value ?? sourceMv?.target_value ?? null;

        if (sourceValue == null) {
          ignored++;
          rows.push({ indicatorCode: ind.code, indicatorName: ind.name, department: ind.department, month, storeId: targetStoreId, storeName: targetScope?.store_name_snapshot || 'Loja', sourceValue: null, targetCurrent: null, newValue: null, action: 'IGNORAR', included: false });
          continue;
        }

        const targetMv = targetMvs.find(mv => mv.strategic_target_id === target.id && mv.month === month);
        const targetCurrent = targetMv?.applied_value ?? targetMv?.target_value ?? null;

        let action, newValue, included;
        if (targetCurrent == null) {
          action = 'PREENCHER'; newValue = sourceValue; included = true; toFill++;
        } else if (conflictPolicy === 'FILL_EMPTY_ONLY') {
          action = 'MANTER'; newValue = targetCurrent; included = false; preserved++;
        } else {
          action = 'SUBSTITUIR'; newValue = sourceValue; included = true; toReplace++;
        }

        rows.push({ indicatorCode: ind.code, indicatorName: ind.name, department: ind.department, month, storeId: targetStoreId, storeName: targetScope?.store_name_snapshot || 'Loja', sourceValue, targetCurrent, newValue, action, included });
      }
    }
  }

  return {
    rows, counters: { toFill, toReplace, preserved, ignored, calcToRecalc: calcIndicators.length, companyIgnored: companyIgnored.length, totalRows: rows.length },
    sourceStoreName: sourceScope?.store_name_snapshot || 'Loja de Origem',
    filteredIndicatorCount: filteredIndicators.length,
  };
}

// ─── Executar cópia (Seção 14) ─────────────────────────────────────────────────
export async function copyStoreStrategicTargets({
  strategicPlanCycleId, sourceStoreId, targetStoreIds, referenceYear,
  selectedMonths, selectedIndicatorIds, conflictPolicy, includedRows, copiedBy = 'Administrador MX',
}) {
  const cycle = await base44.entities.StrategicPlanCycle.get(strategicPlanCycleId);
  const targets = await base44.entities.StrategicTarget.filter({ strategic_plan_cycle_id: strategicPlanCycleId });
  const allIndicators = await base44.entities.IndicatorDefinition.filter({ status: 'PUBLICADO' });
  const indicators = allIndicators.filter(i => targets.some(t => t.indicator_definition_id === i.id));

  const manualIndicators = indicators.filter(isManualIndicator);
  const copyableIndicators = manualIndicators.filter(i => !isCompanyLevelIndicator(i));
  const filteredIndicators = selectedIndicatorIds?.length > 0
    ? copyableIndicators.filter(i => selectedIndicatorIds.includes(i.id))
    : copyableIndicators;

  const allMvs = await base44.entities.StrategicTargetMonthlyValue.filter({ strategic_plan_cycle_id: strategicPlanCycleId });
  const sourceMvs = allMvs.filter(mv => mv.store_id === sourceStoreId);
  const months = selectedMonths?.length > 0 ? selectedMonths : MONTHS;

  let totalCreated = 0, totalUpdated = 0;

  for (const targetStoreId of targetStoreIds) {
    const targetMvs = allMvs.filter(mv => mv.store_id === targetStoreId);
    const toCreate = [], toUpdate = [];

    for (const ind of filteredIndicators) {
      const target = targets.find(t => t.indicator_definition_id === ind.id);
      if (!target) continue;

      for (const month of months) {
        if (includedRows) {
          const key = `${ind.code}|${month}|${targetStoreId}`;
          if (!includedRows[key]) continue;
        }

        const sourceMv = sourceMvs.find(mv => mv.strategic_target_id === target.id && mv.month === month);
        const sourceValue = sourceMv?.applied_value ?? sourceMv?.target_value ?? null;
        if (sourceValue == null) continue;

        const existingMv = targetMvs.find(mv => mv.strategic_target_id === target.id && mv.month === month);

        if (existingMv) {
          const currentVal = existingMv.applied_value ?? existingMv.target_value;
          if (conflictPolicy === 'FILL_EMPTY_ONLY' && currentVal != null && !includedRows) continue;
          toUpdate.push({ id: existingMv.id, target_value: sourceValue, applied_value: sourceValue, updated_at: new Date().toISOString(), updated_by: copiedBy });
          totalUpdated++;
        } else {
          toCreate.push({
            strategic_target_id: target.id, strategic_plan_cycle_id: strategicPlanCycleId,
            client_account_id: cycle.client_account_id, indicator_definition_id: ind.id, indicator_code: ind.code,
            year: referenceYear, month, store_id: targetStoreId, scope_type: 'STORE',
            target_value: sourceValue, calculated_value: null, applied_value: sourceValue,
            is_overridden: false, status: 'RASCUNHO', version_number: cycle.version_number || '1',
            updated_by: copiedBy, updated_at: new Date().toISOString(),
          });
          totalCreated++;
        }
      }
    }

    if (toCreate.length > 0) {
      for (let i = 0; i < toCreate.length; i += 500) await base44.entities.StrategicTargetMonthlyValue.bulkCreate(toCreate.slice(i, i + 500));
    }
    if (toUpdate.length > 0) {
      for (let i = 0; i < toUpdate.length; i += 500) await base44.entities.StrategicTargetMonthlyValue.bulkUpdate(toUpdate.slice(i, i + 500));
    }
  }

  await recalculateMonthlyValues(strategicPlanCycleId, cycle.client_account_id, referenceYear);

  await base44.entities.AuditLog.create({
    user_name: copiedBy, user_role: 'ADMINISTRADOR_PRINCIPAL', client_account_id: cycle.client_account_id,
    resource: 'StrategicTargetMonthlyValue', resource_id: strategicPlanCycleId,
    action: 'onStoreTargetsCopied',
    value_after: JSON.stringify({ sourceStoreId, targetStoreIds, referenceYear, indicatorsCopied: filteredIndicators.length, cellsCreated: totalCreated, cellsUpdated: totalUpdated, conflictPolicy, months: months.length }),
    origin: 'Plano Estratégico — Copiar Metas entre Lojas', environment: 'PROTOTIPO',
  });

  return { cellsCreated: totalCreated, cellsUpdated: totalUpdated, indicatorsCopied: filteredIndicators.length, targetStores: targetStoreIds.length };
}

// ─── Exportar metas preenchidas da Loja (Seções 17-19) ─────────────────────────
export async function exportStoreTargets({ client, cycle, indicators, targets, monthlyValues, params, overrides, referenceYear, sourceStoreId, sourceStoreName }) {
  const { buffer, fileName } = await generateStoreTargetExport({
    client, cycle, indicators, targets, monthlyValues, params, overrides, referenceYear, sourceStoreId, sourceStoreName,
  });

  await base44.entities.AuditLog.create({
    user_name: 'Administrador MX', user_role: 'ADMINISTRADOR_PRINCIPAL', client_account_id: client?.id,
    resource: 'StrategicTargetMonthlyValue', resource_id: cycle?.id,
    action: 'onStoreTargetsExported',
    value_after: JSON.stringify({ sourceStoreId, sourceStoreName, referenceYear, fileName }),
    origin: 'Plano Estratégico — Exportar Metas da Loja', environment: 'PROTOTIPO',
  }).catch(() => {});

  return { buffer, fileName };
}
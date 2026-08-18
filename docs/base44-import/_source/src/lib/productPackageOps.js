// ─── Produto → Pacote de Indicadores → Plano Estratégico ──────────────────────
// Camada que substitui a regra "todo indicador publicado entra em todos os planos"
// pela regra "o plano recebe os indicadores do pacote do produto contratado".

import { base44 } from '@/api/base44Client';
import { recalculateMonthlyValues } from './strategicPlanOps';
import { createUnitScopes, buildMonthlyValuesByUnit, syncStrategicPlanUnitScopes } from './unitScopeOps';
import { resolveUnitPolicy } from './unitPolicyDefaults';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// ─── Resolver cliente → contrato → produto → pacote publicado ─────────────────
export async function resolveClientProductPackage(clientId) {
  // 1. Contrato vigente
  const contracts = await base44.entities.ClientContract.filter({
    client_account_id: clientId,
    status: 'ATIVO',
  }).catch(() => []);

  let product = null;
  let contract = null;

  if (contracts.length > 0) {
    contract = contracts[0];
    product = await base44.entities.ConsultingProduct.get(contract.product_id).catch(() => null);
  }

  // 2. Fallback: jornada com product_id
  if (!product) {
    const encounters = await base44.entities.JourneyEncounter.filter({
      client_account_id: clientId,
    }).catch(() => []);
    const withProduct = encounters.find(e => e.product_id);
    if (withProduct) {
      product = await base44.entities.ConsultingProduct.get(withProduct.product_id).catch(() => null);
    }
  }

  if (!product) return { error: 'Cliente sem produto de consultoria contratado.' };
  if (product.uses_strategic_plan === false) return { error: 'Este produto não utiliza Plano Estratégico.', product };
  if (!product.indicator_package_version_id) return { error: 'Produto sem pacote de indicadores vinculado.', product };

  // 3. Versão do pacote publicado
  const pkgVersion = await base44.entities.StrategicIndicatorPackageVersion.get(
    product.indicator_package_version_id
  ).catch(() => null);

  if (!pkgVersion) return { error: 'Pacote de indicadores não encontrado.', product };
  if (pkgVersion.status !== 'PUBLISHED') return { error: 'Pacote de indicadores não está publicado.', product, pkgVersion };

  // 4. Itens do pacote
  const items = await base44.entities.StrategicIndicatorPackageItem.filter({
    package_version_id: pkgVersion.id,
  });

  // 5. Definições dos indicadores
  const indicatorIds = items.map(i => i.indicator_definition_id);
  const allIndicators = await base44.entities.IndicatorDefinition.filter({ status: 'PUBLICADO' });
  const indicators = allIndicators.filter(i => indicatorIds.includes(i.id))
    .sort((a, b) => (a.global_display_order ?? 999) - (b.global_display_order ?? 999));

  return {
    product,
    contract,
    pkgVersion,
    items,
    indicators,
    manualCount: indicators.filter(i => i.input_mode === 'MANUAL').length,
    calculatedCount: indicators.filter(i => i.input_mode === 'CALCULATED').length,
    departments: [...new Set(indicators.map(i => i.department))],
  };
}

// ─── Roster oficial do Plano (seção 27) ────────────────────────────────────────
export async function getStrategicPlanIndicatorRoster(strategicPlanCycleId) {
  const [targets, clientIndicators] = await Promise.all([
    base44.entities.StrategicTarget.filter({ strategic_plan_cycle_id: strategicPlanCycleId }),
    base44.entities.ClientStrategicIndicator.filter({ strategic_plan_cycle_id: strategicPlanCycleId }),
  ]);

  const indicatorIds = targets.map(t => t.indicator_definition_id);
  const allIndicators = await base44.entities.IndicatorDefinition.filter({ status: 'PUBLICADO' });
  const indicators = allIndicators.filter(i => indicatorIds.includes(i.id))
    .sort((a, b) => (a.global_display_order ?? 999) - (b.global_display_order ?? 999));

  return indicators.map(ind => {
    const target = targets.find(t => t.indicator_definition_id === ind.id);
    const csi = clientIndicators.find(c => c.indicator_definition_id === ind.id);
    return {
      ...ind,
      target_id: target?.id,
      origin_type: csi?.origin_type || 'PRODUCT_PACKAGE',
      package_version_id: csi?.package_version_id,
      package_item_id: csi?.package_item_id,
    };
  });
}

// ─── Criar Plano Estratégico a partir do produto (seção 24-25) ─────────────────
export async function createStrategicPlanFromProduct({ clientAccountId, referenceYear, scope = 'EMPRESA', responsibleName = '', responsibleId = '', createdBy = 'Administrador MX' }) {
  const client = await base44.entities.ClientAccount.get(clientAccountId);

  // 1. Idempotência
  const existing = await base44.entities.StrategicPlanCycle.filter({ client_account_id: clientAccountId, year: referenceYear });
  if (existing.length > 0) return { cycle: existing[0], alreadyExists: true };

  // 2-5. Resolver produto → pacote → indicadores
  const resolution = await resolveClientProductPackage(clientAccountId);
  if (resolution.error) return { error: resolution.error };

  const { product, pkgVersion, items, indicators } = resolution;

  // 6. Criar StrategicPlanCycle
  const cycleName = `Plano Estratégico ${referenceYear} — ${client.name}`;
  const cycle = await base44.entities.StrategicPlanCycle.create({
    client_account_id: clientAccountId,
    name: cycleName,
    year: referenceYear,
    start_date: `${referenceYear}-01-01`,
    end_date: `${referenceYear}-12-31`,
    status: 'RASCUNHO',
    responsible_consultant_id: responsibleId,
    responsible_consultant_name: responsibleName,
    version_number: '1',
  });

  try {
    // 7-8. BulkCreate StrategicTargets
    const targetsData = indicators.map(ind => ({
      strategic_plan_cycle_id: cycle.id,
      client_account_id: clientAccountId,
      indicator_definition_id: ind.id,
      indicator_name: ind.name,
      indicator_code: ind.code,
      indicator_area: ind.department,
      scope_type: scope,
      target_direction: ind.default_direction || 'AUMENTAR',
      aggregation_policy: 'SOMA',
      display_format: ind.display_format || 'INTEIRO',
      unit: ind.unit,
      status: 'RASCUNHO',
      version_number: '1',
      created_by: createdBy,
    }));
    const targets = await base44.entities.StrategicTarget.bulkCreate(targetsData);

    // 9. Criar escopos de unidade (Matriz + Filiais) — Seção 25
    const { scopes } = await createUnitScopes({ cycleId: cycle.id, clientId: clientAccountId, createdBy });

    // 10. BulkCreate valores mensais por unidade (12 meses × N unidades × M indicadores) — Seção 26
    const monthlyData = buildMonthlyValuesByUnit({ targets, scopes, indicators, year: referenceYear, createdBy });
    await base44.entities.StrategicTargetMonthlyValue.bulkCreate(monthlyData);

    // 11. BulkCreate ClientStrategicIndicator com origem e políticas de unidade
    const csiData = indicators.map(ind => {
      const item = items.find(it => it.indicator_definition_id === ind.id);
      const policy = resolveUnitPolicy(ind.code, null, item, ind);
      return {
        strategic_plan_cycle_id: cycle.id,
        client_account_id: clientAccountId,
        indicator_definition_id: ind.id,
        indicator_code: ind.code,
        indicator_name: ind.name,
        enabled: true,
        visible_to_owner: ind.default_owner_visibility !== false,
        scope_type: scope,
        display_order: ind.global_display_order || 99,
        target_calculation_mode: ind.target_calculation_mode || ind.input_mode,
        status: 'ATIVO',
        origin_type: item?.inclusion_reason === 'FORMULA_DEPENDENCY' ? 'PRODUCT_DEPENDENCY' : 'PRODUCT_PACKAGE',
        origin_reference_id: product.id,
        package_version_id: pkgVersion.id,
        package_item_id: item?.id,
        unit_entry_mode: policy.unit_entry_mode,
        unit_rollup_method: policy.unit_rollup_method,
        weight_indicator_code: policy.weight_indicator_code,
        added_by: createdBy,
        added_at: new Date().toISOString(),
        created_by: createdBy,
      };
    });
    await base44.entities.ClientStrategicIndicator.bulkCreate(csiData);

    // 11. Recalcular indicadores calculados
    await recalculateMonthlyValues(cycle.id, clientAccountId, referenceYear);

    // 12. Auditoria
    await base44.entities.AuditLog.create({
      user_name: responsibleName || createdBy, user_role: 'ADMINISTRADOR_IMPLANTACAO',
      client_account_id: clientAccountId, client_account_name: client.name,
      resource: 'StrategicPlanCycle', resource_id: cycle.id,
      action: 'onStrategicPlanCreatedFromProduct',
      value_after: JSON.stringify({
        year: referenceYear, product_id: product.id, product_name: product.name,
        package_version_id: pkgVersion.id, package_name: pkgVersion.name,
        total_indicators: indicators.length,
        manual: indicators.filter(i => i.input_mode === 'MANUAL').length,
        calculated: indicators.filter(i => i.input_mode === 'CALCULATED').length,
        departments: [...new Set(indicators.map(i => i.department))].length,
        monthly_values: monthlyData.length,
        unit_count: scopes.length,
        unit_names: scopes.map(s => s.store_name_snapshot),
      }),
      origin: 'Plano Estratégico — Criação a partir do produto', environment: 'PROTOTIPO',
    });

    return {
      cycle, created: true,
      indicatorCount: indicators.length,
      manualCount: indicators.filter(i => i.input_mode === 'MANUAL').length,
      calculatedCount: indicators.filter(i => i.input_mode === 'CALCULATED').length,
      unitCount: scopes.length,
      product, pkgVersion,
    };
  } catch (e) {
    // Rollback
    const mvs = await base44.entities.StrategicTargetMonthlyValue.filter({ strategic_plan_cycle_id: cycle.id }).catch(() => []);
    if (mvs.length > 0) await base44.entities.StrategicTargetMonthlyValue.deleteMany({ strategic_plan_cycle_id: cycle.id }).catch(() => {});
    const ts = await base44.entities.StrategicTarget.filter({ strategic_plan_cycle_id: cycle.id }).catch(() => []);
    if (ts.length > 0) await base44.entities.StrategicTarget.deleteMany({ strategic_plan_cycle_id: cycle.id }).catch(() => {});
    await base44.entities.ClientStrategicIndicator.deleteMany({ strategic_plan_cycle_id: cycle.id }).catch(() => {});
    await base44.entities.StrategicPlanUnitScope.deleteMany({ strategic_plan_cycle_id: cycle.id }).catch(() => {});
    await base44.entities.StrategicPlanCycle.delete(cycle.id).catch(() => {});
    return { error: 'Não foi possível criar o Plano Estratégico.', detail: e.message };
  }
}

// ─── Sincronizar Plano existente com o pacote do produto (seção 40) ────────────
export async function syncStrategicPlanWithProductPackage({ strategicPlanCycleId, requestedBy = 'Administrador MX' }) {
  const cycle = await base44.entities.StrategicPlanCycle.get(strategicPlanCycleId);
  const resolution = await resolveClientProductPackage(cycle.client_account_id);
  if (resolution.error) return { error: resolution.error };

  const { product, pkgVersion, items, indicators } = resolution;

  // Sincronizar escopos de unidade com unidades atuais (Seção 56)
  await syncStrategicPlanUnitScopes({ strategicPlanCycleId, requestedBy });
  const scopes = await base44.entities.StrategicPlanUnitScope.filter({
    strategic_plan_cycle_id: strategicPlanCycleId,
    status: { $in: ['ACTIVE', 'FUTURE'] },
  }).catch(() => []);

  const existingTargets = await base44.entities.StrategicTarget.filter({ strategic_plan_cycle_id: strategicPlanCycleId });
  const existingCSIs = await base44.entities.ClientStrategicIndicator.filter({ strategic_plan_cycle_id: strategicPlanCycleId });

  const existingByIndId = {};
  for (const t of existingTargets) existingByIndId[t.indicator_definition_id] = t;

  const csiByIndId = {};
  for (const c of existingCSIs) csiByIndId[c.indicator_definition_id] = c;

  // Adicionar apenas indicadores ausentes do pacote
  const toAdd = indicators.filter(ind => !existingByIndId[ind.id]);
  let added = 0;

  if (toAdd.length > 0) {
    // BulkCreate targets
    const targetsData = toAdd.map(ind => ({
      strategic_plan_cycle_id: strategicPlanCycleId,
      client_account_id: cycle.client_account_id,
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
      created_by: requestedBy,
    }));
    const newTargets = await base44.entities.StrategicTarget.bulkCreate(targetsData);

    // BulkCreate monthly values por unidade (Seção 26)
    const monthlyData = buildMonthlyValuesByUnit({ targets: newTargets, scopes, indicators: toAdd, year: cycle.year, createdBy: requestedBy });
    await base44.entities.StrategicTargetMonthlyValue.bulkCreate(monthlyData);

    // BulkCreate ClientStrategicIndicator
    const csiData = toAdd.map(ind => {
      const item = items.find(it => it.indicator_definition_id === ind.id);
      const policy = resolveUnitPolicy(ind.code, null, item, ind);
      return {
        strategic_plan_cycle_id: strategicPlanCycleId,
        client_account_id: cycle.client_account_id,
        indicator_definition_id: ind.id,
        indicator_code: ind.code,
        indicator_name: ind.name,
        enabled: true,
        visible_to_owner: ind.default_owner_visibility !== false,
        scope_type: 'EMPRESA',
        display_order: ind.global_display_order || 99,
        target_calculation_mode: ind.target_calculation_mode || ind.input_mode,
        status: 'ATIVO',
        origin_type: item?.inclusion_reason === 'FORMULA_DEPENDENCY' ? 'PRODUCT_DEPENDENCY' : 'PRODUCT_PACKAGE',
        origin_reference_id: product.id,
        package_version_id: pkgVersion.id,
        package_item_id: item?.id,
        unit_entry_mode: policy.unit_entry_mode,
        unit_rollup_method: policy.unit_rollup_method,
        weight_indicator_code: policy.weight_indicator_code,
        added_by: requestedBy,
        added_at: new Date().toISOString(),
        created_by: requestedBy,
      };
    });
    await base44.entities.ClientStrategicIndicator.bulkCreate(csiData);
    added = toAdd.length;
  }

  // Backfill: vincular CSIs existentes sem package_version_id
  const csisToBackfill = existingCSIs.filter(c => !c.package_version_id && indicators.find(i => i.id === c.indicator_definition_id));
  if (csisToBackfill.length > 0) {
    await base44.entities.ClientStrategicIndicator.bulkUpdate(
      csisToBackfill.map(c => {
        const item = items.find(it => it.indicator_definition_id === c.indicator_definition_id);
        return {
          id: c.id,
          origin_type: 'PRODUCT_PACKAGE',
          package_version_id: pkgVersion.id,
          package_item_id: item?.id,
        };
      })
    );
  }

  // Recalcular
  await recalculateMonthlyValues(strategicPlanCycleId, cycle.client_account_id, cycle.year);

  // Contagens finais
  const finalTargets = await base44.entities.StrategicTarget.filter({ strategic_plan_cycle_id: strategicPlanCycleId });

  await base44.entities.AuditLog.create({
    user_name: requestedBy, user_role: 'ADMINISTRADOR_PRINCIPAL',
    client_account_id: cycle.client_account_id,
    resource: 'StrategicPlanCycle', resource_id: strategicPlanCycleId,
    action: 'PLAN_SYNC_WITH_PACKAGE',
    value_after: JSON.stringify({
      added, backfilled: csisToBackfill.length,
      total: finalTargets.length,
      package: pkgVersion.name,
    }),
    origin: 'Sincronização Plano ↔ Pacote', environment: 'PROTOTIPO',
  });

  return {
    added,
    backfilled: csisToBackfill.length,
    totalIndicators: finalTargets.length,
    alreadySynced: added === 0,
  };
}

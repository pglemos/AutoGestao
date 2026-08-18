// ─── Gestão de Escopos de Unidade do Plano Estratégico ───────────────────────
// Seções 7, 25-26, 40-41, 53-56: criar, sincronizar e migrar escopos de unidade

import { base44 } from '@/api/base44Client';
import { UNIT_POLICY_DEFAULTS, resolveUnitPolicy } from '@/lib/unitPolicyDefaults';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// ─── Carregar unidades ativas do cliente (Matriz + Filiais) ───────────────────
export async function loadClientUnits(clientId) {
  const stores = await base44.entities.Store.filter({
    client_account_id: clientId,
    status: { $in: ['ATIVA', 'EM_CONFIGURACAO'] },
  }).catch(() => []);

  // Ordenar: Matriz primeiro, depois Filiais por nome
  const sorted = stores.sort((a, b) => {
    if (a.store_type === 'MATRIZ' && b.store_type !== 'MATRIZ') return -1;
    if (a.store_type !== 'MATRIZ' && b.store_type === 'MATRIZ') return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  return sorted;
}

// ─── Carregar escopos de unidade de um Plano ──────────────────────────────────
export async function loadUnitScopes(cycleId) {
  const scopes = await base44.entities.StrategicPlanUnitScope.filter({
    strategic_plan_cycle_id: cycleId,
  }).catch(() => []);

  return scopes.sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99));
}

// ─── Verificar se o cliente tem múltiplas unidades (para mostrar seletor) ────
export async function hasMultipleUnits(clientId) {
  const units = await loadClientUnits(clientId);
  return units.length > 1;
}

// ─── Criar escopos de unidade para um Plano (Seção 25) ────────────────────────
// Idempotente: não duplica escopos existentes
export async function createUnitScopes({ cycleId, clientId, createdBy = 'Administrador MX' }) {
  const stores = await loadClientUnits(clientId);
  const existingScopes = await loadUnitScopes(cycleId);

  // Mapear escopos existentes por store_id
  const existingByStoreId = {};
  for (const s of existingScopes) existingByStoreId[s.store_id] = s;

  // Criar apenas escopos ausentes
  const toCreate = [];
  for (let i = 0; i < stores.length; i++) {
    const store = stores[i];
    if (!existingByStoreId[store.id]) {
      toCreate.push({
        strategic_plan_cycle_id: cycleId,
        client_account_id: clientId,
        store_id: store.id,
        store_type: store.store_type || (i === 0 ? 'MATRIZ' : 'FILIAL'),
        store_name_snapshot: store.name,
        status: 'ACTIVE',
        effective_from: `${new Date().getFullYear()}-01-01`,
        is_required: true,
        display_order: i + 1,
        created_by: createdBy,
        updated_by: createdBy,
      });
    }
  }

  let created = 0;
  if (toCreate.length > 0) {
    await base44.entities.StrategicPlanUnitScope.bulkCreate(toCreate);
    created = toCreate.length;
  }

  // Retornar todos os escopos (existentes + novos)
  const allScopes = await loadUnitScopes(cycleId);

  return { scopes: allScopes, created, total: allScopes.length };
}

// ─── Sincronizar escopos com unidades atuais (Seção 56) ──────────────────────
// Idempotente: cria ausentes, preserva existentes, identifica encerradas
export async function syncStrategicPlanUnitScopes({ strategicPlanCycleId, requestedBy = 'Administrador MX' }) {
  const cycle = await base44.entities.StrategicPlanCycle.get(strategicPlanCycleId);
  const stores = await loadClientUnits(cycle.client_account_id);
  const existingScopes = await loadUnitScopes(strategicPlanCycleId);

  const existingByStoreId = {};
  for (const s of existingScopes) existingByStoreId[s.store_id] = s;

  const toCreate = [];
  const storeIds = new Set(stores.map(s => s.id));

  for (let i = 0; i < stores.length; i++) {
    const store = stores[i];
    if (!existingByStoreId[store.id]) {
      toCreate.push({
        strategic_plan_cycle_id: strategicPlanCycleId,
        client_account_id: cycle.client_account_id,
        store_id: store.id,
        store_type: store.store_type || (i === 0 ? 'MATRIZ' : 'FILIAL'),
        store_name_snapshot: store.name,
        status: 'ACTIVE',
        effective_from: `${cycle.year}-01-01`,
        is_required: true,
        display_order: i + 1,
        created_by: requestedBy,
        updated_by: requestedBy,
      });
    }
  }

  // Identificar escopos de unidades encerradas (não estão mais na lista de ativas)
  const closedScopes = existingScopes.filter(s => !storeIds.has(s.store_id) && s.status === 'ACTIVE');
  const closedUpdates = closedScopes.map(s => ({
    id: s.id,
    status: 'CLOSED',
    effective_until: `${cycle.year}-12-31`,
    updated_by: requestedBy,
  }));

  let created = 0, closed = 0;
  if (toCreate.length > 0) {
    await base44.entities.StrategicPlanUnitScope.bulkCreate(toCreate);
    created = toCreate.length;
  }
  if (closedUpdates.length > 0) {
    await base44.entities.StrategicPlanUnitScope.bulkUpdate(closedUpdates);
    closed = closedUpdates.length;
  }

  const allScopes = await loadUnitScopes(strategicPlanCycleId);

  await base44.entities.AuditLog.create({
    user_name: requestedBy, user_role: 'ADMINISTRADOR_PRINCIPAL',
    client_account_id: cycle.client_account_id,
    resource: 'StrategicPlanUnitScope', resource_id: strategicPlanCycleId,
    action: 'UNIT_SCOPES_SYNC',
    value_after: JSON.stringify({ created, closed, total: allScopes.length }),
    origin: 'Plano Estratégico — Sincronização de Unidades', environment: 'PROTOTIPO',
  }).catch(() => {});

  return { scopes: allScopes, created, closed, total: allScopes.length };
}

// ─── Migração: atribuir valores existentes à Matriz (Seção 53) ────────────────
// Para clientes com uma única Matriz: atribuir todos os valores sem store_id à Matriz
export async function migrateSingleUnitValues({ strategicPlanCycleId, requestedBy = 'Administrador MX' }) {
  const cycle = await base44.entities.StrategicPlanCycle.get(strategicPlanCycleId);
  const scopes = await loadUnitScopes(strategicPlanCycleId);

  // Se há apenas uma unidade (Matriz), atribuir valores legados a ela
  if (scopes.length !== 1) {
    return { skipped: true, reason: 'Cliente possui múltiplas unidades — usar distribuição manual.' };
  }

  const matrizScope = scopes[0];

  // Migrar StrategicTargetMonthlyValue: atribuir store_id da Matriz onde estiver null
  const monthlyValues = await base44.entities.StrategicTargetMonthlyValue.filter({
    strategic_plan_cycle_id: strategicPlanCycleId,
  });

  const toUpdate = monthlyValues
    .filter(mv => !mv.store_id && mv.scope_type !== 'COMPANY')
    .map(mv => ({
      id: mv.id,
      store_id: matrizScope.store_id,
      scope_type: 'STORE',
      strategic_plan_unit_scope_id: matrizScope.id,
    }));

  if (toUpdate.length > 0) {
    for (let i = 0; i < toUpdate.length; i += 500) {
      await base44.entities.StrategicTargetMonthlyValue.bulkUpdate(toUpdate.slice(i, i + 500));
    }
  }

  // Migrar IndicatorActualSnapshot: atribuir store_id da Matriz onde estiver null
  const snapshots = await base44.entities.IndicatorActualSnapshot.filter({
    client_account_id: cycle.client_account_id,
  }).catch(() => []);

  const snapUpdates = snapshots
    .filter(s => !s.store_id && s.scope_type !== 'COMPANY')
    .map(s => ({
      id: s.id,
      store_id: matrizScope.store_id,
      scope_type: 'STORE',
      strategic_plan_unit_scope_id: matrizScope.id,
    }));

  if (snapUpdates.length > 0) {
    for (let i = 0; i < snapUpdates.length; i += 500) {
      await base44.entities.IndicatorActualSnapshot.bulkUpdate(snapUpdates.slice(i, i + 500));
    }
  }

  await base44.entities.AuditLog.create({
    user_name: requestedBy, user_role: 'ADMINISTRADOR_PRINCIPAL',
    client_account_id: cycle.client_account_id,
    resource: 'StrategicPlanCycle', resource_id: strategicPlanCycleId,
    action: 'UNIT_MIGRATION_SINGLE',
    value_after: JSON.stringify({
      monthlyValuesMigrated: toUpdate.length,
      snapshotsMigrated: snapUpdates.length,
      storeId: matrizScope.store_id,
    }),
    origin: 'Plano Estratégico — Migração Unidade Única', environment: 'PROTOTIPO',
  }).catch(() => {});

  return {
    monthlyValuesMigrated: toUpdate.length,
    snapshotsMigrated: snapUpdates.length,
    storeId: matrizScope.store_id,
  };
}

// ─── Migração: preservar valores consolidados legados (Seção 54-55) ───────────
// Para clientes com múltiplas unidades e valores antigos apenas consolidados:
// preservar como COMPANY_LEGACY (scope_type=COMPANY), não replicar para unidades
export async function migrateLegacyConsolidatedValues({ strategicPlanCycleId, requestedBy = 'Administrador MX' }) {
  const cycle = await base44.entities.StrategicPlanCycle.get(strategicPlanCycleId);
  const scopes = await loadUnitScopes(strategicPlanCycleId);

  if (scopes.length <= 1) {
    return { skipped: true, reason: 'Cliente possui uma única unidade.' };
  }

  // Marcar valores mensais sem store_id como scope_type=COMPANY (Consolidado Legado)
  const monthlyValues = await base44.entities.StrategicTargetMonthlyValue.filter({
    strategic_plan_cycle_id: strategicPlanCycleId,
  });

  const toUpdate = monthlyValues
    .filter(mv => !mv.store_id)
    .map(mv => ({
      id: mv.id,
      scope_type: 'COMPANY',
      store_id: null,
      strategic_plan_unit_scope_id: null,
    }));

  if (toUpdate.length > 0) {
    for (let i = 0; i < toUpdate.length; i += 500) {
      await base44.entities.StrategicTargetMonthlyValue.bulkUpdate(toUpdate.slice(i, i + 500));
    }
  }

  // Mesmo para snapshots
  const snapshots = await base44.entities.IndicatorActualSnapshot.filter({
    client_account_id: cycle.client_account_id,
  }).catch(() => []);

  const snapUpdates = snapshots
    .filter(s => !s.store_id)
    .map(s => ({
      id: s.id,
      scope_type: 'COMPANY',
      store_id: null,
      strategic_plan_unit_scope_id: null,
    }));

  if (snapUpdates.length > 0) {
    for (let i = 0; i < snapUpdates.length; i += 500) {
      await base44.entities.IndicatorActualSnapshot.bulkUpdate(snapUpdates.slice(i, i + 500));
    }
  }

  await base44.entities.AuditLog.create({
    user_name: requestedBy, user_role: 'ADMINISTRADOR_PRINCIPAL',
    client_account_id: cycle.client_account_id,
    resource: 'StrategicPlanCycle', resource_id: strategicPlanCycleId,
    action: 'UNIT_MIGRATION_LEGACY',
    value_after: JSON.stringify({
      monthlyValuesPreserved: toUpdate.length,
      snapshotsPreserved: snapUpdates.length,
      unitCount: scopes.length,
    }),
    origin: 'Plano Estratégico — Migração Consolidado Legado', environment: 'PROTOTIPO',
  }).catch(() => {});

  return {
    monthlyValuesPreserved: toUpdate.length,
    snapshotsPreserved: snapUpdates.length,
    unitCount: scopes.length,
  };
}

// ─── Preparar valores mensais por unidade (bulk) ─────────────────────────────
// Cria 12 competências × N unidades × M indicadores em lote
export function buildMonthlyValuesByUnit({ targets, scopes, indicators, year, createdBy = 'Administrador MX' }) {
  const monthlyData = [];

  for (const target of targets) {
    const ind = indicators.find(i => i.id === target.indicator_definition_id);
    if (!ind) continue;

    const policy = resolveUnitPolicy(ind.code, null, null, ind);
    const entryMode = policy.unit_entry_mode || 'PER_UNIT_REQUIRED';

    if (entryMode === 'COMPANY_ONLY' || entryMode === 'SHARED_COMPANY_VALUE') {
      // Indicador empresarial: criar apenas 12 valores com scope_type=COMPANY
      for (const month of MONTHS) {
        monthlyData.push({
          strategic_target_id: target.id,
          strategic_plan_cycle_id: target.strategic_plan_cycle_id,
          client_account_id: target.client_account_id,
          indicator_definition_id: ind.id,
          indicator_code: ind.code,
          year, month,
          store_id: null,
          scope_type: 'COMPANY',
          strategic_plan_unit_scope_id: null,
          target_value: null,
          calculated_value: null,
          applied_value: null,
          is_overridden: false,
          status: 'RASCUNHO',
          version_number: '1',
          updated_by: createdBy,
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      // Indicador por unidade: criar 12 valores × N unidades
      for (const scope of scopes) {
        for (const month of MONTHS) {
          monthlyData.push({
            strategic_target_id: target.id,
            strategic_plan_cycle_id: target.strategic_plan_cycle_id,
            client_account_id: target.client_account_id,
            indicator_definition_id: ind.id,
            indicator_code: ind.code,
            year, month,
            store_id: scope.store_id,
            scope_type: 'STORE',
            strategic_plan_unit_scope_id: scope.id,
            target_value: null,
            calculated_value: null,
            applied_value: null,
            is_overridden: false,
            status: 'RASCUNHO',
            version_number: '1',
            updated_by: createdBy,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  return monthlyData;
}

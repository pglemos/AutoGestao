// Ordem Oficial dos Indicadores — fonte única de verdade
// Todos os módulos do Plano Estratégico devem usar estas funções para ordenar indicadores.

import { base44 } from '@/api/base44Client';
import { GLOBAL_DISPLAY_ORDER, DEPARTMENT_ORDER } from '@/lib/indicatorCatalog';

// Ordem padrão MX dos 45 indicadores (código → posição oficial)
export const DEFAULT_MX_ORDER = GLOBAL_DISPLAY_ORDER;

// Ordenar indicadores pelo global_display_order (fonte oficial)
export function sortByGlobalOrder(indicators) {
  return [...indicators].sort((a, b) =>
    (a.global_display_order ?? 999) - (b.global_display_order ?? 999) ||
    (a.department_display_order ?? 99) - (b.department_display_order ?? 99) ||
    (a.display_order ?? 99) - (b.display_order ?? 99)
  );
}

// Obter apenas indicadores ativos (não arquivados)
export function getActiveIndicators(indicators) {
  return indicators.filter(i => i.status !== 'ARQUIVADO');
}

// Normalizar posições para sequência contínua 1..N (apenas ativos)
export function normalizeOrderSequence(activeIndicators) {
  const sorted = sortByGlobalOrder(activeIndicators);
  return sorted.map((ind, idx) => ({
    ...ind,
    global_display_order: idx + 1,
  }));
}

// Repositionar um indicador de oldPos para newPos, deslocando os demais
// Retorna array normalizado com novas posições
export function reorderIndicator(activeIndicators, indicatorId, newPosition) {
  const sorted = sortByGlobalOrder(activeIndicators);
  const total = sorted.length;
  const clampedPos = Math.max(1, Math.min(total, Math.floor(newPosition)));

  const idx = sorted.findIndex(i => i.id === indicatorId);
  if (idx === -1) return sorted.map((ind, i) => ({ ...ind, global_display_order: i + 1 }));

  const [moved] = sorted.splice(idx, 1);
  const insertAt = clampedPos - 1;
  sorted.splice(insertAt, 0, moved);

  return sorted.map((ind, i) => ({ ...ind, global_display_order: i + 1 }));
}

// Mover indicador uma posição para cima
export function moveUp(activeIndicators, indicatorId) {
  const sorted = sortByGlobalOrder(activeIndicators);
  const idx = sorted.findIndex(i => i.id === indicatorId);
  if (idx <= 0) return sorted.map((ind, i) => ({ ...ind, global_display_order: i + 1 }));
  [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
  return sorted.map((ind, i) => ({ ...ind, global_display_order: i + 1 }));
}

// Mover indicador uma posição para baixo
export function moveDown(activeIndicators, indicatorId) {
  const sorted = sortByGlobalOrder(activeIndicators);
  const idx = sorted.findIndex(i => i.id === indicatorId);
  if (idx === -1 || idx >= sorted.length - 1) return sorted.map((ind, i) => ({ ...ind, global_display_order: i + 1 }));
  [sorted[idx + 1], sorted[idx]] = [sorted[idx], sorted[idx + 1]];
  return sorted.map((ind, i) => ({ ...ind, global_display_order: i + 1 }));
}

// Restaurar ordem padrão MX: 45 indicadores na sequência oficial + adicionais depois
export function restoreDefaultOrder(indicators) {
  const active = getActiveIndicators(indicators);
  const archived = indicators.filter(i => i.status === 'ARQUIVADO');

  const standard = [];
  const additional = [];

  for (const ind of active) {
    if (DEFAULT_MX_ORDER[ind.code] != null) {
      standard.push({ ...ind, global_display_order: DEFAULT_MX_ORDER[ind.code] });
    } else {
      additional.push(ind);
    }
  }

  // Standard na ordem oficial 1..45
  standard.sort((a, b) => a.global_display_order - b.global_display_order);

  // Additional após os 45, mantendo ordem relativa atual
  const additionalStart = standard.length;
  additional.sort((a, b) => (a.global_display_order ?? 999) - (b.global_display_order ?? 999));
  const additionalNormalized = additional.map((ind, i) => ({
    ...ind,
    global_display_order: additionalStart + i + 1,
  }));

  return [...standard, ...additionalNormalized, ...archived];
}

// Persistir nova ordem no banco com auditoria
export async function saveOrderChanges(reorderedIndicators, previousOrderMap, userName, reason, versionBefore) {
  const updates = [];
  const auditEntries = [];

  for (const ind of reorderedIndicators) {
    const prev = previousOrderMap[ind.id] ?? ind.previous_display_order;
    if (prev !== ind.global_display_order) {
      updates.push({
        id: ind.id,
        global_display_order: ind.global_display_order,
        previous_display_order: prev,
        order_updated_at: new Date().toISOString(),
        order_updated_by: userName,
        order_change_reason: reason || 'Reorganização manual',
        catalog_order_version: (versionBefore || 1) + 1,
      });
      auditEntries.push({
        indicator_id: ind.id,
        indicator_code: ind.code,
        indicator_name: ind.name,
        previous_order: prev,
        new_order: ind.global_display_order,
      });
    }
  }

  if (updates.length === 0) {
    return { saved: 0, version: versionBefore || 1, audit: [] };
  }

  // Atualizar indicadores em lote
  await base44.entities.IndicatorDefinition.bulkUpdate(updates);

  // Registrar auditoria
  const versionAfter = (versionBefore || 1) + 1;
  for (const entry of auditEntries) {
    base44.entities.AuditLog.create({
      user_name: userName,
      user_role: 'ADMINISTRADOR_PRINCIPAL',
      resource: 'IndicatorDefinition',
      resource_id: entry.indicator_id,
      action: 'onIndicatorOfficialOrderChanged',
      value_before: String(entry.previous_order),
      value_after: String(entry.new_order),
      origin: `Catálogo de Indicadores — Ordem Oficial v${versionAfter}`,
      environment: 'PROTOTIPO',
    }).catch(() => {});
  }

  return { saved: updates.length, version: versionAfter, audit: auditEntries };
}

// Restaurar ordem padrão no banco
export async function saveRestoreDefault(indicators, userName, versionBefore) {
  const restored = restoreDefaultOrder(indicators);
  const activeRestored = restored.filter(i => i.status !== 'ARQUIVADO');
  const previousOrderMap = {};
  for (const ind of indicators) { previousOrderMap[ind.id] = ind.global_display_order; }

  const updates = [];
  for (const ind of activeRestored) {
    if (previousOrderMap[ind.id] !== ind.global_display_order) {
      updates.push({
        id: ind.id,
        global_display_order: ind.global_display_order,
        previous_display_order: previousOrderMap[ind.id],
        order_updated_at: new Date().toISOString(),
        order_updated_by: userName,
        order_change_reason: 'Restauração da Ordem Padrão MX',
        catalog_order_version: (versionBefore || 1) + 1,
      });
    }
  }

  if (updates.length > 0) {
    await base44.entities.IndicatorDefinition.bulkUpdate(updates);
  }

  base44.entities.AuditLog.create({
    user_name: userName,
    user_role: 'ADMINISTRADOR_PRINCIPAL',
    resource: 'IndicatorDefinition',
    action: 'onIndicatorOfficialOrderRestored',
    value_before: `v${versionBefore || 1}`,
    value_after: `v${(versionBefore || 1) + 1}`,
    origin: 'Catálogo — Restaurar Ordem Padrão MX',
    environment: 'PROTOTIPO',
  }).catch(() => {});

  return { saved: updates.length, version: (versionBefore || 1) + 1, restored };
}

// Agrupar por departamento, ordenando cada grupo pelo global_display_order
export function groupByDeptOrdered(indicators) {
  const byDept = {};
  for (const dept of DEPARTMENT_ORDER) {
    byDept[dept] = [];
  }
  for (const ind of indicators) {
    const dept = ind.department || 'OPERACOES';
    if (!byDept[dept]) byDept[dept] = [];
    byDept[dept].push(ind);
  }
  for (const dept of Object.keys(byDept)) {
    byDept[dept] = sortByGlobalOrder(byDept[dept]);
  }
  return byDept;
}

// Obter número oficial de um indicador (posição global entre ativos)
export function getOfficialNumber(indicator, allIndicators) {
  const active = getActiveIndicators(allIndicators);
  const sorted = sortByGlobalOrder(active);
  const idx = sorted.findIndex(i => i.id === indicator.id);
  return idx >= 0 ? idx + 1 : null;
}

import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Cache reativo compartilhado: clientAccountId -> { data, loading, error, promise, subscribers }
const cache = new Map();

function getEntry(clientAccountId) {
  if (!cache.has(clientAccountId)) {
    cache.set(clientAccountId, { data: null, loading: false, error: null, promise: null, subscribers: new Set() });
  }
  return cache.get(clientAccountId);
}

function notify(clientAccountId) {
  const entry = cache.get(clientAccountId);
  if (entry) entry.subscribers.forEach(cb => cb(entry));
}

// ─── Fonte única do Plano Estratégico atual ──────────────────────────────────
// Regra de prevalência: ano atual > ano mais recente disponível.
// Nunca seleciona por status isolado, nunca pega o primeiro registro, nunca usa ano fixo.
export async function resolveCurrentStrategicPlan(clientAccountId) {
  if (!clientAccountId) return null;

  const entry = getEntry(clientAccountId);
  if (entry.promise) return entry.promise;

  entry.promise = (async () => {
    entry.loading = true;
    entry.error = null;
    notify(clientAccountId);

    try {
      const cycles = await base44.entities.StrategicPlanCycle
        .filter({ client_account_id: clientAccountId })
        .catch(() => []);

      if (!cycles || cycles.length === 0) {
        entry.data = null;
        entry.loading = false;
        notify(clientAccountId);
        return null;
      }

      const currentYear = new Date().getFullYear();
      const current =
        cycles.find(c => c.year === currentYear) ||
        cycles.sort((a, b) => b.year - a.year)[0];

      if (!current) {
        entry.data = null;
        entry.loading = false;
        notify(clientAccountId);
        return null;
      }

      const [targets, monthlyValues, indicators] = await Promise.all([
        base44.entities.StrategicTarget.filter({ strategic_plan_cycle_id: current.id }),
        base44.entities.StrategicTargetMonthlyValue.filter({ strategic_plan_cycle_id: current.id }),
        base44.entities.IndicatorDefinition.filter({ status: 'PUBLICADO' }),
      ]);

      const standardIndicators = indicators.filter(i => i.is_standard !== false);
      const manualCodes = new Set(
        standardIndicators
          .filter(i => i.input_mode === 'MANUAL' || i.target_calculation_mode === 'MANUAL')
          .map(i => i.code)
      );
      const filledManual = new Set();
      for (const mv of monthlyValues) {
        if (manualCodes.has(mv.indicator_code) && (mv.applied_value != null || mv.target_value != null)) {
          filledManual.add(mv.indicator_code);
        }
      }

      const isCyclePublished = current.status === 'PUBLICADO';
      const activeTargets = targets.filter(t => t.status !== 'ARQUIVADO');
      const publishedTargets = isCyclePublished ? activeTargets : activeTargets.filter(t => t.status === 'PUBLICADO');
      const pendingTargets = isCyclePublished ? [] : activeTargets.filter(t => t.status === 'RASCUNHO');

      entry.data = {
        strategic_plan_cycle_id: current.id,
        strategic_plan_version_id: current.version_number,
        client_account_id: current.client_account_id,
        reference_year: current.year,
        status: current.status,
        version_number: current.version_number,
        updated_at: isCyclePublished ? (current.published_at || current.updated_date) : current.updated_date,
        published_at: current.published_at,
        responsible_user_id: current.responsible_consultant_id,
        cycle_name: current.name,
        standard_indicator_count: standardIndicators.length,
        configured_manual_indicator_count: filledManual.size,
        total_manual_indicator_count: manualCodes.size || 18,
        published_indicator_count: publishedTargets.length,
        pending_indicator_count: pendingTargets.length,
        plan_indicator_count: activeTargets.length,
      };
      entry.error = null;
      entry.loading = false;
      notify(clientAccountId);
      return entry.data;
    } catch (e) {
      entry.data = null;
      entry.error = e;
      entry.loading = false;
      notify(clientAccountId);
      return null;
    } finally {
      entry.promise = null;
    }
  })();

  return entry.promise;
}

// ─── Invalidar cache e buscar novamente ─────────────────────────────────────
export function refreshCurrentStrategicPlan(clientAccountId) {
  const entry = getEntry(clientAccountId);
  entry.promise = null;
  return resolveCurrentStrategicPlan(clientAccountId);
}

// ─── Hook reativo compartilhado pelos dois cards ──────────────────────────────
export function useCurrentStrategicPlan(clientAccountId) {
  const [state, setState] = useState(() => {
    const entry = cache.get(clientAccountId);
    return entry
      ? { data: entry.data, loading: entry.loading, error: entry.error }
      : { data: null, loading: false, error: null };
  });

  useEffect(() => {
    const entry = getEntry(clientAccountId);
    const cb = (e) => setState({ data: e.data, loading: e.loading, error: e.error });
    entry.subscribers.add(cb);

    if (entry.data) {
      // Stale-while-revalidate: mostra cache imediatamente e busca em background
      setState({ data: entry.data, loading: false, error: entry.error });
      if (!entry.promise) resolveCurrentStrategicPlan(clientAccountId);
    } else if (!entry.loading && !entry.promise) {
      resolveCurrentStrategicPlan(clientAccountId);
    } else {
      setState({ data: entry.data, loading: entry.loading, error: entry.error });
    }

    return () => {
      entry.subscribers.delete(cb);
    };
  }, [clientAccountId]);

  const refresh = useCallback(() => {
    refreshCurrentStrategicPlan(clientAccountId);
  }, [clientAccountId]);

  return { ...state, refresh };
}

// ─── Handler único de abertura (valida cycleId + year antes de navegar) ──────
export async function openCurrentStrategicPlan({ navigate, plan, origin }) {
  if (!plan || !plan.strategic_plan_cycle_id || !plan.reference_year) {
    return { ok: false, error: 'Não foi possível localizar a versão atual do Plano Estratégico.' };
  }

  navigate(`/clientes/${plan.client_account_id}/plano-estrategico/${plan.reference_year}`);

  base44.entities.AuditLog.create({
    user_name: 'Administrador MX',
    user_role: 'ADMINISTRADOR_PRINCIPAL',
    client_account_id: plan.client_account_id,
    resource: 'StrategicPlanCycle',
    resource_id: plan.strategic_plan_cycle_id,
    action: 'PLAN_OPEN_NAV',
    value_after: JSON.stringify({
      cycle_id: plan.strategic_plan_cycle_id,
      version: plan.version_number,
      year: plan.reference_year,
      origin,
    }),
    origin,
    environment: 'PROTOTIPO',
  }).catch(() => {});

  return { ok: true };
}

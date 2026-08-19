import { base44 } from '@/api/base44Client';

// Horário padrão MX da Matriz
export const DEFAULT_MX_HOURS = [
  { day_of_week: 'MONDAY', is_open: true, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 'TUESDAY', is_open: true, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 'WEDNESDAY', is_open: true, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 'THURSDAY', is_open: true, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 'FRIDAY', is_open: true, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 'SATURDAY', is_open: true, opening_time: '08:00', closing_time: '14:00' },
  { day_of_week: 'SUNDAY', is_open: false, opening_time: '', closing_time: '' },
];

// Cria horário padrão apenas se não houver nenhum horário salvo. Idempotente.
export async function ensureDefaultOperatingHours(storeId, origin = 'DEFAULT_MX') {
  if (!storeId) return { created: false, reason: 'no_store_id' };
  const existing = await base44.entities.StoreOperatingHour.filter({ store_id: storeId, status: 'ATIVO' });
  if (existing.length > 0) return { created: false, reason: 'already_has_hours', count: existing.length };

  for (const d of DEFAULT_MX_HOURS) {
    await base44.entities.StoreOperatingHour.create({
      store_id: storeId,
      day_of_week: d.day_of_week,
      is_open: d.is_open,
      opening_time: d.is_open ? d.opening_time : '',
      closing_time: d.is_open ? d.closing_time : '',
      status: 'ATIVO',
      origin: 'DEFAULT_MX',
    });
  }

  await base44.entities.AuditLog.create({
    user_name: 'Administrador MX', user_role: 'ADMINISTRADOR_IMPLANTACAO',
    resource: 'StoreOperatingHour', action: 'STORE_HOURS_DEFAULT_CREATE',
    store_id: storeId,
    value_after: 'Horário padrão MX criado automaticamente',
    origin, environment: 'PRODUCTION',
  });

  return { created: true, count: 7 };
}

// Restaura horário padrão MX — arquiva o atual e cria novo padrão
export async function restoreDefaultOperatingHours(storeId, origin = 'Restaurar padrão MX') {
  if (!storeId) return;
  const existing = await base44.entities.StoreOperatingHour.filter({ store_id: storeId, status: 'ATIVO' });
  for (const e of existing) {
    await base44.entities.StoreOperatingHour.update(e.id, { status: 'INATIVO' });
  }
  for (const d of DEFAULT_MX_HOURS) {
    await base44.entities.StoreOperatingHour.create({
      store_id: storeId,
      day_of_week: d.day_of_week,
      is_open: d.is_open,
      opening_time: d.is_open ? d.opening_time : '',
      closing_time: d.is_open ? d.closing_time : '',
      status: 'ATIVO',
      origin: 'DEFAULT_MX',
    });
  }
  await base44.entities.AuditLog.create({
    user_name: 'Administrador MX', user_role: 'ADMINISTRADOR_IMPLANTACAO',
    resource: 'StoreOperatingHour', action: 'STORE_HOURS_RESTORE_DEFAULT',
    store_id: storeId,
    value_before: `${existing.length} registros anteriores arquivados`,
    value_after: 'Horário padrão MX restaurado',
    origin, environment: 'PRODUCTION',
  });
  return { restored: true };
}
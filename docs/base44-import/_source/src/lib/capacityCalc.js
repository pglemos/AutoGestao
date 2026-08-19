// Capacity calculation utilities for MX Performance
// Based on ConsultingTimeParameter (maximum_time_hours) and ConsultantWorkloadReservation

export const CAPACITY_STATUS = {
  DISPONIVEL: { label: 'Disponível', color: 'bg-green-50 text-green-700' },
  ATENCAO: { label: 'Atenção', color: 'bg-yellow-50 text-yellow-700' },
  COMPROMETIDA: { label: 'Capacidade comprometida', color: 'bg-orange-50 text-orange-700' },
  SOBRECARGA: { label: 'Sobrecarga', color: 'bg-red-50 text-red-700' },
  SEM_PARAMETRO: { label: 'Sem parâmetro', color: 'bg-gray-100 text-gray-500' },
  BASE_PARCIAL: { label: 'Base parcial', color: 'bg-yellow-50 text-yellow-700' },
  ERRO: { label: 'Erro técnico', color: 'bg-red-50 text-red-700' },
};

export function getCapacityStatus(occupancyPct, hasAvailableHours, hasPendingTime = false) {
  if (hasPendingTime) return CAPACITY_STATUS.BASE_PARCIAL;
  if (!hasAvailableHours || hasAvailableHours === 0) return CAPACITY_STATUS.SEM_PARAMETRO;
  if (occupancyPct > 100) return CAPACITY_STATUS.SOBRECARGA;
  if (occupancyPct > 95) return CAPACITY_STATUS.COMPROMETIDA;
  if (occupancyPct > 80) return CAPACITY_STATUS.ATENCAO;
  return CAPACITY_STATUS.DISPONIVEL;
}

export function calcOccupancy(plannedHours, availableHours) {
  if (!availableHours || availableHours === 0) return 0;
  return Math.round((plannedHours / availableHours) * 100);
}

// Build a time lookup map: { [product_id]: { [encounter_number]: { ONLINE: hours, PRESENCIAL: hours } } }
export function buildTimeMap(timeParams) {
  const map = {};
  for (const tp of timeParams) {
    if (tp.status !== 'ATIVO' && tp.status !== 'PUBLICADO') continue;
    if (!map[tp.consulting_product_id]) map[tp.consulting_product_id] = {};
    if (!map[tp.consulting_product_id][tp.encounter_number]) {
      map[tp.consulting_product_id][tp.encounter_number] = {};
    }
    map[tp.consulting_product_id][tp.encounter_number][tp.modality] = tp.maximum_time_hours;
  }
  return map;
}

// Get time for a specific encounter+modality, returns null if not found
export function getTimeForEncounter(timeMap, productId, encounterNumber, modality) {
  if (!timeMap[productId] || !timeMap[productId][encounterNumber]) return null;
  return timeMap[productId][encounterNumber][modality] ?? null;
}

// Get max time across modalities (for A_DEFINIR conservative calculation)
export function getMaxTimeAcrossModalities(timeMap, productId, encounterNumber) {
  if (!timeMap[productId] || !timeMap[productId][encounterNumber]) return null;
  const times = Object.values(timeMap[productId][encounterNumber]).filter(t => t != null);
  if (times.length === 0) return null;
  return Math.max(...times);
}

// Check if both modalities have times defined
export function hasBothModalities(timeMap, productId, encounterNumber) {
  if (!timeMap[productId] || !timeMap[productId][encounterNumber]) return false;
  const m = timeMap[productId][encounterNumber];
  return m.ONLINE != null && m.PRESENCIAL != null;
}

// Calculate capacity from workload reservations for a consultant in a given month
// Returns { online: {confirmed, reserved, planned, remaining, occupancy, status}, inPerson: {...}, aDefinir: {...} }
export function calculateCapacity(consultant, reservations, referenceMonth) {
  const onlineAvail = consultant.online_available_hours || 0;
  const inPersonAvail = consultant.in_person_available_hours || 0;

  let onlineConfirmed = 0, onlineReserved = 0;
  let inPersonConfirmed = 0, inPersonReserved = 0;
  let travelReserved = 0;
  let aDefinirHours = 0;
  let encountersWithoutModality = 0;
  let encountersWithoutTime = 0;
  let assignmentsWithoutMonth = 0;
  let hasPendingTime = false;

  for (const r of reservations) {
    if (r.status === 'CANCELADA' || r.status === 'TRANSFERIDA' || r.status === 'LIBERADA') continue;
    if (referenceMonth && r.reference_month && r.reference_month !== referenceMonth) continue;

    // v1.6.1: usar applied_time_hours (tempo aplicado ao cliente), com fallback para maximum_time_hours
    const time = r.applied_time_hours != null ? r.applied_time_hours : (r.maximum_time_hours || 0);

    if (r.modality === 'A_DEFINIR' || !r.modality) {
      encountersWithoutModality++;
      if (time) aDefinirHours += time;
      else encountersWithoutTime++;
      continue;
    }

    if (!time || time === 0) {
      encountersWithoutTime++;
      hasPendingTime = true;
      if (r.status === 'PENDENTE_TEMPO') continue;
    }

    if (r.reference_month !== referenceMonth && !r.planned_date) {
      assignmentsWithoutMonth++;
    }

    const isConfirmed = r.allocation_type === 'CONFIRMADA';
    const isReserved = r.allocation_type === 'RESERVADA' || r.allocation_type === 'A_DEFINIR';

    if (r.modality === 'ONLINE') {
      if (isConfirmed) onlineConfirmed += time;
      else if (isReserved) onlineReserved += time;
    } else if (r.modality === 'PRESENCIAL') {
      if (isConfirmed) inPersonConfirmed += time;
      else if (isReserved) inPersonReserved += time;
      travelReserved += r.travel_reserved_hours || 0;
    }
  }

  const onlinePlanned = onlineConfirmed + onlineReserved;
  const inPersonPlanned = inPersonConfirmed + inPersonReserved;

  const onlineOccupancy = calcOccupancy(onlinePlanned, onlineAvail);
  const inPersonOccupancy = calcOccupancy(inPersonPlanned, inPersonAvail);

  return {
    online: {
      available: onlineAvail,
      confirmed: onlineConfirmed,
      reserved: onlineReserved,
      planned: onlinePlanned,
      remaining: onlineAvail - onlinePlanned,
      occupancy: onlineOccupancy,
      status: getCapacityStatus(onlineOccupancy, onlineAvail > 0, hasPendingTime),
    },
    inPerson: {
      available: inPersonAvail,
      confirmed: inPersonConfirmed,
      reserved: inPersonReserved,
      travel: travelReserved,
      planned: inPersonPlanned,
      remaining: inPersonAvail - inPersonPlanned,
      occupancy: inPersonOccupancy,
      status: getCapacityStatus(inPersonOccupancy, inPersonAvail > 0, hasPendingTime),
    },
    aDefinir: {
      encountersWithoutModality,
      encountersWithoutTime,
      assignmentsWithoutMonth,
      hours: aDefinirHours,
    },
    hasPendingTime,
    isPartial: encountersWithoutModality > 0 || encountersWithoutTime > 0 || assignmentsWithoutMonth > 0 || hasPendingTime,
  };
}

// Get current month in YYYY-MM format
export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get month label in Portuguese
export function getMonthLabel(yyyymm) {
  if (!yyyymm) return '—';
  const [year, month] = yyyymm.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]}/${year}`;
}
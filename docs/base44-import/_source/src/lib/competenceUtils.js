// Cálculo de competência M-1 com fuso America/Sao_Paulo

export function resolveLastClosedCompetence(referenceYear) {
  const now = new Date();
  const spString = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  const spDate = new Date(spString);
  const currentMonth = spDate.getMonth() + 1;
  const currentYear = spDate.getFullYear();

  const planYear = Number(referenceYear);
  const isPlanCurrentYear = currentYear === planYear;
  const isPlanPastYear = currentYear > planYear;

  let lastClosedMonth = currentMonth - 1;
  let lastClosedYear = currentYear;
  if (lastClosedMonth === 0) {
    lastClosedMonth = 12;
    lastClosedYear = currentYear - 1;
  }

  let targetActualMonth = null;
  let actualHasNoClosedMonth = false;

  if (isPlanPastYear) {
    targetActualMonth = 12;
  } else if (isPlanCurrentYear) {
    if (currentMonth === 1) {
      actualHasNoClosedMonth = true;
    } else {
      targetActualMonth = currentMonth - 1;
    }
  }

  let previousYearMonth = null;
  if (isPlanPastYear) {
    previousYearMonth = 12;
  } else if (isPlanCurrentYear) {
    if (currentMonth === 1) {
      previousYearMonth = 12;
    } else {
      previousYearMonth = currentMonth - 1;
    }
  }

  const previousYearYear = planYear - 1;

  return {
    currentDate: spDate,
    currentMonth,
    currentYear,
    lastClosedMonth,
    lastClosedYear,
    targetActualMonth,
    targetActualYear: planYear,
    actualHasNoClosedMonth,
    previousYearMonth,
    previousYearYear,
    isPlanPastYear,
    isPlanCurrentYear,
  };
}

export function getValidMonthsForView(referenceYear, viewType, competence) {
  const { currentMonth, isPlanPastYear, isPlanCurrentYear } = competence;
  if (isPlanPastYear) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  if (isPlanCurrentYear) {
    if (viewType === 'ACTUAL') {
      if (currentMonth === 1) return [];
      return Array.from({ length: currentMonth - 1 }, (_, i) => i + 1);
    } else {
      if (currentMonth === 1) return [12];
      return Array.from({ length: currentMonth - 1 }, (_, i) => i + 1);
    }
  }
  return [];
}

export function isMonthBlocked(month, referenceYear, viewType, competence) {
  return !getValidMonthsForView(referenceYear, viewType, competence).includes(month);
}
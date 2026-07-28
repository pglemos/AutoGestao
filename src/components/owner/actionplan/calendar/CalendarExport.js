// Exportação CSV e impressão do calendário.
import { getObjectiveLabel, getPriorityLabel, getStatusLabel, DEPT_STYLES, CYCLE_INFO } from "../actionPlanConstants";
import { isLate, daysLate, parseBRDate, getRefDate, daysBetween } from "../actionPlanUtils";
import { formatMonthYear, getActionsByDate } from "./calendarUtils";

function downloadFile(filename, content) {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function actionToCSVRow(a) {
  const dept = DEPT_STYLES[a.department]?.label || a.department;
  const late = isLate(a);
  return [
    a.dueDate || "—",
    a.code,
    a.title,
    dept,
    a.responsible,
    getPriorityLabel(a.priority),
    getStatusLabel(a.status),
    `${a.progress}%`,
    late ? `${daysLate(a)} dias` : "—",
    getObjectiveLabel(a.strategicObjective),
  ];
}

export function exportCalendarCSV(actions, refDate) {
  const headers = ["Data", "Código", "Título", "Departamento", "Responsável", "Prioridade", "Status", "Progresso", "Atraso", "Objetivo"];
  const sorted = [...actions]
    .filter((a) => a.dueDate)
    .sort((a, b) => parseBRDate(a.dueDate) - parseBRDate(b.dueDate));
  const rows = sorted.map(actionToCSVRow);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const monthLabel = formatMonthYear(refDate).toLowerCase().replace(" ", "-");
  downloadFile(`calendario-plano-de-acao-${monthLabel}.csv`, csv);
}

export function exportMonthAgendaCSV(actions, refDate) {
  const headers = ["Data", "Código", "Título", "Departamento", "Responsável", "Prioridade", "Status", "Progresso", "Atraso", "Objetivo"];
  const byDate = getActionsByDate(actions);
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const rows = [];
  for (let day = 1; day <= 31; day++) {
    const date = new Date(year, month, day);
    if (date.getMonth() !== month) break;
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayActions = byDate.get(key) || [];
    for (const a of dayActions) {
      rows.push(actionToCSVRow(a));
    }
  }
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const monthLabel = formatMonthYear(refDate).toLowerCase().replace(" ", "-");
  downloadFile(`agenda-${monthLabel}.csv`, csv);
}

export function printCalendar(actions, refDate, companyName, unitName) {
  const byDate = getActionsByDate(actions);
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const weeks = [];
  let currentWeek = [];
  const first = new Date(year, month, 1);
  const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
  for (let i = 0; i < startDay; i++) currentWeek.push(null);
  for (let day = 1; day <= 31; day++) {
    const date = new Date(year, month, day);
    if (date.getMonth() !== month) break;
    currentWeek.push(date);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const weeksHTML = weeks.map((week) => `
    <tr>
      ${week.map((date) => {
        if (!date) return '<td class="empty"></td>';
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const dayActions = byDate.get(key) || [];
        const isToday = daysBetween(date, getRefDate()) === 0;
        return `<td class="${isToday ? "today" : ""}">
          <div class="day-num">${date.getDate()}</div>
          ${dayActions.map((a) => `<div class="event ${a.department}">${a.code} — ${a.title}</div>`).join("")}
        </td>`;
      }).join("")}
    </tr>
  `).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Calendário — ${formatMonthYear(refDate)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #1a1a1a; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { font-size: 12px; color: #666; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th { background: #f0f0f0; padding: 6px; font-size: 11px; text-align: center; border: 1px solid #ddd; }
    td { vertical-align: top; padding: 4px; border: 1px solid #ddd; height: 80px; }
    td.empty { background: #fafafa; }
    td.today { background: #fffde7; }
    .day-num { font-weight: bold; font-size: 12px; margin-bottom: 2px; }
    .event { font-size: 9px; padding: 1px 3px; margin: 1px 0; border-radius: 2px; background: #f5f5f5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .event.commercial { border-left: 3px solid #8b5cf6; }
    .event.marketing { border-left: 3px solid #6366F1; }
    .event.product_stock { border-left: 3px solid #3b82f6; }
    .event.financial { border-left: 3px solid #10b981; }
    .event.operations { border-left: 3px solid #f97316; }
    .event.people_hr { border-left: 3px solid #14b8a6; }
    .event.general { border-left: 3px solid #6366f1; }
    .legend { margin-top: 16px; font-size: 11px; display: flex; gap: 12px; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 4px; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
    @media print { body { margin: 10px; } }
  </style></head><body>
  <h1>Calendário do Plano de Ação — ${formatMonthYear(refDate)}</h1>
  <div class="meta">
    ${companyName ? `Empresa: ${companyName} | ` : ""}Ciclo: ${CYCLE_INFO.name} | Período: ${CYCLE_INFO.startDate} a ${CYCLE_INFO.endDate}
  </div>
  <table>
    <tr><th>Seg</th><th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th>Sáb</th><th>Dom</th></tr>
    ${weeksHTML}
  </table>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#8b5cf6"></div>Comercial</div>
    <div class="legend-item"><div class="legend-dot" style="background:#6366F1"></div>Marketing</div>
    <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>Produto e Estoque</div>
    <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>Financeiro</div>
    <div class="legend-item"><div class="legend-dot" style="background:#f97316"></div>Operações</div>
    <div class="legend-item"><div class="legend-dot" style="background:#14b8a6"></div>Pessoas — RH</div>
    <div class="legend-item"><div class="legend-dot" style="background:#6366f1"></div>Geral e Estratégia</div>
  </div>
  <script>window.onload = () => window.print();</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
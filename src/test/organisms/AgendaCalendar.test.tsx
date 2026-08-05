import { expect, test, describe, afterEach, mock } from "bun:test";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { AgendaCalendar } from "@/components/organisms/AgendaCalendar";
import type { CalendarDay, CalendarAgendaItem } from "@/components/organisms/AgendaCalendar";
import * as React from "react";
import { format } from "date-fns";

afterEach(() => {
  cleanup();
});

/**
 * Grade do mês corrente, com a quantidade real de dias.
 *
 * Era fixa em 30. Em todo dia 31 de um mês de 31 dias — 31/07/2026, por exemplo
 * — "hoje" ficava fora da grade, o evento ancorado em `today` não renderizava e
 * dois testes falhavam por motivo nenhum. Falha dependente de calendário é pior
 * que teste ausente: aparece longe da mudança que a expôs e treina a equipe a
 * ignorar vermelho.
 */
function makeCalendarDays(): CalendarDay[] {
  const days: CalendarDay[] = [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  // Dia 0 do mês seguinte é o último dia deste mês.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    days.push({ date, day: d, isCurrentMonth: true });
  }
  return days;
}

const today = new Date();
const todayKey = format(today, "yyyy-MM-dd");

/**
 * Dia auxiliar para o segundo grupo de eventos, garantidamente diferente de hoje.
 *
 * Era fixo no dia 5. Quando "hoje" caía no dia 5, a chave calculada era idêntica
 * a `todayKey` e a segunda propriedade do objeto literal sobrescrevia a primeira
 * — os eventos de hoje sumiam e o teste do chip falhava. Mesma armadilha de
 * calendário que o comentário de `makeCalendarDays` descreve.
 */
const otherDay = today.getDate() === 5 ? 6 : 5;
const otherDayKey = format(new Date(today.getFullYear(), today.getMonth(), otherDay), "yyyy-MM-dd");

const mockCalendarDays = makeCalendarDays();

const mockVisitsByDate = {
  [todayKey]: [
    {
      id: "visit-today",
      status: "agendada",
      title: "Cliente hoje",
      startsAt: today.toISOString(),
      durationHours: 1,
      kind: "visit" as const,
      subtitle: "Visita 1",
    },
    {
      id: "visit-done",
      status: "concluida",
      title: "Cliente concluido",
      startsAt: today.toISOString(),
      durationHours: 1,
      kind: "visit" as const,
    },
  ],
  [otherDayKey]: [
    {
      id: "visit-five",
      status: "cancelada",
      title: `Cliente dia ${otherDay}`,
      startsAt: new Date(today.getFullYear(), today.getMonth(), otherDay, 10).toISOString(),
      durationHours: 1,
      kind: "visit" as const,
    },
  ],
};

const getVisitDotColor = (status: string) => {
  const map: Record<string, string> = {
    agendada: "bg-brand-primary",
    concluida: "bg-status-success",
    cancelada: "bg-status-error",
  };
  return map[status] || "bg-text-tertiary";
};

const defaultProps = {
  calendarDays: mockCalendarDays,
  visitsByDate: mockVisitsByDate,
  selectedDate: null,
  onDateSelect: mock(() => {}),
  monthLabel: "Abril 2026",
  onPrevMonth: mock(() => {}),
  onNextMonth: mock(() => {}),
  onToday: mock(() => {}),
  getVisitDotColor,
};

describe("AgendaCalendar — month view", () => {
  test("renders full weekday headers (pt-BR, uppercase)", () => {
    render(<AgendaCalendar {...defaultProps} />);
    expect(screen.getByText("DOMINGO")).toBeDefined();
    expect(screen.getByText("SEGUNDA")).toBeDefined();
    expect(screen.getByText("TERÇA")).toBeDefined();
    expect(screen.getByText("QUARTA")).toBeDefined();
    expect(screen.getByText("QUINTA")).toBeDefined();
    expect(screen.getByText("SEXTA")).toBeDefined();
    expect(screen.getByText("SÁBADO")).toBeDefined();
  });

  test("renders calendar days", () => {
    render(<AgendaCalendar {...defaultProps} />);
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("15")).toBeDefined();
    expect(screen.getByText("30")).toBeDefined();
  });

  test("highlights today", () => {
    render(<AgendaCalendar {...defaultProps} />);
    const todayEl = screen.getByText(String(today.getDate()));
    const todayContainer = todayEl.closest("span")!;
    expect(todayContainer.className).toContain("bg-emerald-600");
    expect(todayContainer.className).toContain("text-white");
  });

  test("calls onDateSelect when day clicked", () => {
    const onDateSelect = mock(() => {});
    render(<AgendaCalendar {...defaultProps} onDateSelect={onDateSelect} />);
    const dayCell = screen.getByText("5").closest('[role="button"]')!;
    fireEvent.click(dayCell);
    expect(onDateSelect).toHaveBeenCalled();
  });

  test("renders month label and today button", () => {
    render(<AgendaCalendar {...defaultProps} />);
    expect(screen.getByText("Abril 2026")).toBeDefined();
    expect(screen.getByText("Hoje")).toBeDefined();
  });

  test("clicking a chip fires onEventClick without also selecting the day", () => {
    const onEventClick = mock(() => {});
    const onDateSelect = mock(() => {});
    render(<AgendaCalendar {...defaultProps} onDateSelect={onDateSelect} onEventClick={onEventClick} />);
    fireEvent.click(screen.getByText("Cliente hoje"));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onDateSelect).not.toHaveBeenCalled();
  });
});

describe("AgendaCalendar — week/day time grid", () => {
  const weekVisitsByDate = {
    [todayKey]: [
      {
        id: "visit-6h",
        status: "agendada",
        title: "Vitrine",
        startsAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9).toISOString(),
        durationHours: 6,
        kind: "visit" as const,
        subtitle: "Visita 6",
      },
      {
        id: "event-3h",
        status: "agendada",
        title: "Aula",
        startsAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9).toISOString(),
        durationHours: 3,
        kind: "event" as const,
        subtitle: "Responsável",
      },
    ],
  };

  function renderWeek(overrides: Partial<React.ComponentProps<typeof AgendaCalendar>> = {}) {
    return render(
      <AgendaCalendar
        {...defaultProps}
        calendarDays={[{ date: today, day: today.getDate(), isCurrentMonth: true }]}
        visitsByDate={weekVisitsByDate}
        viewMode="week"
        {...overrides}
      />,
    );
  }

  const HOUR_HEIGHT = 56;

  test("sizes the card height proportionally to duration (visit and event)", () => {
    renderWeek();
    const visitTitle = screen.getByText("Vitrine");
    const visitWrapper = visitTitle.closest('[style*="height"]') as HTMLElement;
    expect(visitWrapper.style.height).toBe(`${6 * HOUR_HEIGHT - 6}px`);

    const eventTitle = screen.getByText("Aula");
    const eventWrapper = eventTitle.closest('[style*="height"]') as HTMLElement;
    expect(eventWrapper.style.height).toBe(`${3 * HOUR_HEIGHT - 6}px`);
  });

  test("the colored card fills the positioned wrapper (h-full)", () => {
    renderWeek();
    const visitCard = screen.getByText("Vitrine").closest(".group\\/event") as HTMLElement;
    expect(visitCard.className).toContain("h-full");
  });

  test("falls back to 1h height when durationHours is missing/invalid", () => {
    renderWeek({
      visitsByDate: {
        [todayKey]: [
          {
            id: "visit-null-duration",
            status: "agendada",
            title: "Sem duracao",
            startsAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9).toISOString(),
            durationHours: null as unknown as number,
            kind: "visit" as const,
          },
        ],
      },
    });
    const wrapper = screen.getByText("Sem duracao").closest('[style*="height"]') as HTMLElement;
    expect(wrapper.style.height).toBe(`${1 * HOUR_HEIGHT - 6}px`);
  });

  test("two events at the same time render in separate columns (no overlap stacking)", () => {
    renderWeek();
    const visitWrapper = screen.getByText("Vitrine").closest('[style*="width"]') as HTMLElement;
    const eventWrapper = screen.getByText("Aula").closest('[style*="width"]') as HTMLElement;
    expect(visitWrapper.style.width).toBe("50%");
    expect(eventWrapper.style.width).toBe("50%");
    expect(visitWrapper.style.left).not.toBe(eventWrapper.style.left);
  });

  test("clicking an empty slot fires onSlotClick with the clicked date", () => {
    const onSlotClick = mock(() => {});
    renderWeek({ onSlotClick });
    const dayColumn = screen.getByText("Vitrine").closest('[style*="width"]')!.parentElement!;
    Object.defineProperty(dayColumn, "getBoundingClientRect", {
      value: () => ({ top: 0, left: 0, bottom: 800, right: 200, width: 200, height: 800 }),
    });
    fireEvent.click(dayColumn, { clientY: 112, clientX: 10 });
    expect(onSlotClick).toHaveBeenCalledTimes(1);
    const [clickedDate] = onSlotClick.mock.calls[0] as [Date, number, number];
    expect(clickedDate.toDateString()).toBe(today.toDateString());
  });

  test("clicking an event card opens the popover with quick actions", () => {
    render(
      <AgendaCalendar
        {...defaultProps}
        calendarDays={[{ date: today, day: today.getDate(), isCurrentMonth: true }]}
        visitsByDate={weekVisitsByDate}
        viewMode="week"
        quickActions={{ onEdit: mock(() => {}), onDelete: mock(() => {}) }}
      />,
    );
    fireEvent.click(screen.getByText("Vitrine"));
    expect(screen.getByText("Editar")).toBeDefined();
    expect(screen.getByText("Excluir")).toBeDefined();
  });

  test("popover quick action calls back with the item and closes", () => {
    const onDelete = mock(() => {});
    render(
      <AgendaCalendar
        {...defaultProps}
        calendarDays={[{ date: today, day: today.getDate(), isCurrentMonth: true }]}
        visitsByDate={weekVisitsByDate}
        viewMode="week"
        quickActions={{ onDelete }}
      />,
    );
    fireEvent.click(screen.getByText("Vitrine"));
    fireEvent.click(screen.getByText("Excluir"));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0][0]).toMatchObject({ id: "visit-6h" });
  });

  test("dragging a card's body (mouse) fires onReschedule with a shifted time", () => {
    const onReschedule = mock(() => {});
    renderWeek({ onReschedule });
    const card = screen.getByText("Vitrine").closest(".group\\/event") as HTMLElement;
    fireEvent.pointerDown(card, { clientX: 10, clientY: 100, pointerType: "mouse" });
    fireEvent.pointerMove(window, { clientX: 10, clientY: 156, pointerType: "mouse" });
    fireEvent.pointerUp(window, { clientX: 10, clientY: 156, pointerType: "mouse" });
    expect(onReschedule).toHaveBeenCalledTimes(1);
    const [item, newStartsAtISO] = onReschedule.mock.calls[0] as [CalendarAgendaItem, string];
    expect(item.id).toBe("visit-6h");
    const originalStart = new Date(weekVisitsByDate[todayKey][0].startsAt);
    const newStart = new Date(newStartsAtISO);
    expect(newStart.getTime()).toBeGreaterThan(originalStart.getTime());
  });

  test("touch pointerType does not start a drag", () => {
    const onReschedule = mock(() => {});
    renderWeek({ onReschedule });
    const card = screen.getByText("Vitrine").closest(".group\\/event") as HTMLElement;
    fireEvent.pointerDown(card, { clientX: 10, clientY: 100, pointerType: "touch" });
    fireEvent.pointerMove(window, { clientX: 10, clientY: 156, pointerType: "touch" });
    fireEvent.pointerUp(window, { clientX: 10, clientY: 156, pointerType: "touch" });
    expect(onReschedule).not.toHaveBeenCalled();
  });
});

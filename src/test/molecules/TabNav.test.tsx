import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TabNav, type TabNavItem } from "@/components/molecules/TabNav";
import * as React from "react";

afterEach(() => {
  cleanup();
});

describe("TabNav", () => {
  const tabs: TabNavItem[] = [
    { key: "overview", label: "Visão Geral" },
    { key: "visits", label: "Agenda/Visitas" },
    { key: "strategic", label: "Estratégico" },
    { key: "action", label: "Plano de Ação" },
    { key: "financial", label: "DRE/Financeiro" },
    { key: "daily", label: "Acomp. Diário" },
    { key: "monthly", label: "Fechamento" },
    { key: "roi", label: "ROI/Choque" },
    { key: "pdis", label: "Plano de Carreira (PDI)" },
    { key: "files", label: "Arquivos" },
  ];

  test("keeps the files tab rendered when the full consulting tab set is shown", () => {
    render(<TabNav tabs={tabs} activeTab="overview" onTabChange={() => {}} />);

    expect(screen.getByRole("tab", { name: "Arquivos" })).toBeDefined();
  });

  test("wraps long tab sets instead of hiding the last tab in a clipped scroller", () => {
    const { container } = render(<TabNav tabs={tabs} activeTab="overview" onTabChange={() => {}} />);
    const nav = container.querySelector("nav");

    expect(nav?.className).toContain("flex-wrap");
    expect(nav?.className).not.toContain("overflow-x-auto");
    expect(nav?.className).not.toContain("no-scrollbar");
  });

  test("notifies the selected tab", () => {
    let selected = "";
    render(<TabNav tabs={tabs} activeTab="overview" onTabChange={(tab) => { selected = tab; }} />);

    fireEvent.click(screen.getByRole("tab", { name: "Arquivos" }));

    expect(selected).toBe("files");
  });

  test("links tabs to controlled panels when panel ids are provided", () => {
    render(
      <TabNav
        tabs={[
          { key: "overview", label: "Visão Geral", controls: "overview-panel" },
          { key: "files", label: "Arquivos", controls: "files-panel" },
        ]}
        activeTab="overview"
        onTabChange={() => {}}
      />
    );

    expect(screen.getByRole("tab", { name: "Visão Geral" }).getAttribute("aria-controls")).toBe("overview-panel");
    expect(screen.getByRole("tab", { name: "Arquivos" }).getAttribute("aria-controls")).toBe("files-panel");
  });

  test("FASE J: roving tabindex — apenas a aba ativa está na ordem de tabulação", () => {
    render(<TabNav tabs={tabs} activeTab="overview" onTabChange={() => {}} />);

    expect(screen.getByRole("tab", { name: "Visão Geral" }).getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("tab", { name: "Arquivos" }).getAttribute("tabindex")).toBe("-1");
    expect(screen.getByRole("tab", { name: "Visão Geral" }).getAttribute("aria-selected")).toBe("true");
  });

  test("FASE J: setas direcionais movem a seleção entre abas (roving)", () => {
    const events: string[] = [];
    render(<TabNav tabs={tabs} activeTab="overview" onTabChange={(key) => events.push(key)} />);

    fireEvent.keyDown(screen.getByRole("tab", { name: "Visão Geral" }), { key: "ArrowRight" });
    expect(events[0]).toBe("visits");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Visão Geral" }), { key: "ArrowLeft" });
    expect(events[1]).toBe("files");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Visão Geral" }), { key: "Home" });
    expect(events[2]).toBe("overview");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Visão Geral" }), { key: "End" });
    expect(events[3]).toBe("files");
  });

  test("FASE J 10.013-b: tab disabled fica fora da tabulação e não notifica", () => {
    const events: string[] = [];
    render(
      <TabNav
        tabs={[
          { key: "a", label: "A" },
          { key: "b", label: "B", disabled: true },
          { key: "c", label: "C" },
        ]}
        activeTab="a"
        onTabChange={(key) => events.push(key)}
      />,
    );

    const b = screen.getByRole("tab", { name: "B" });
    expect(b.getAttribute("tabindex")).toBe("-1");
    expect(b.getAttribute("aria-disabled")).toBe("true");
    expect(b.hasAttribute("disabled")).toBe(true);

    fireEvent.click(b);
    expect(events).toEqual([]);
  });

  test("FASE J 10.013-b: roving pula abas disabled", () => {
    const events: string[] = [];
    render(
      <TabNav
        tabs={[
          { key: "a", label: "A" },
          { key: "b", label: "B", disabled: true },
          { key: "c", label: "C" },
        ]}
        activeTab="a"
        onTabChange={(key) => events.push(key)}
      />,
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "A" }), { key: "ArrowRight" });
    // Pula a disabled B e vai para C.
    expect(events[0]).toBe("c");
  });

  test("FASE J 10.014: scrollable troca wrap por overflow-x-auto", () => {
    const { container } = render(<TabNav tabs={tabs} activeTab="overview" onTabChange={() => {}} scrollable />);
    const nav = container.querySelector("nav");

    expect(nav?.className).toContain("overflow-x-auto");
    expect(nav?.className).not.toContain("flex-wrap");
  });
});

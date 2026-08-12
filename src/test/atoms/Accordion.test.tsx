import { expect, test, describe, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { AccordionItem, Accordion } from "@/components/atoms/Accordion";
import * as React from "react";

afterEach(() => {
  cleanup();
});

describe("AccordionItem", () => {
  test("renders summary text", () => {
    render(<AccordionItem summary="Section Title">Content</AccordionItem>);
    expect(screen.getByText("Section Title")).toBeDefined();
  });

  test("renders children", () => {
    render(<AccordionItem summary="Title">Child content here</AccordionItem>);
    expect(screen.getByText("Child content here")).toBeDefined();
  });

  test("applies default variant classes", () => {
    const { container } = render(<AccordionItem summary="T">C</AccordionItem>);
    const details = container.querySelector("details")!;
    expect(details.className).toContain("border");
    expect(details.className).toContain("border-border");
    expect(details.className).toContain("rounded-xl");
  });

  test("applies bordered variant classes", () => {
    const { container } = render(<AccordionItem variant="bordered" summary="T">C</AccordionItem>);
    const details = container.querySelector("details")!;
    expect(details.className).toContain("border-border");
    expect(details.className).toContain("shadow-sm");
  });

  test("applies ghost variant classes", () => {
    const { container } = render(<AccordionItem variant="ghost" summary="T">C</AccordionItem>);
    const details = container.querySelector("details")!;
    expect(details.className).toContain("bg-transparent");
  });

  test("supports defaultOpen prop", () => {
    const { container } = render(<AccordionItem summary="T" defaultOpen={true}>C</AccordionItem>);
    const details = container.querySelector("details")!;
    expect(details.hasAttribute("open")).toBe(true);
  });

  test("defaultOpen is false by default", () => {
    const { container } = render(<AccordionItem summary="T">C</AccordionItem>);
    const details = container.querySelector("details")!;
    expect(details.hasAttribute("open")).toBe(false);
  });
});

describe("Accordion", () => {
  test("renders children", () => {
    const { container } = render(
      <Accordion>
        <AccordionItem summary="A">Content A</AccordionItem>
        <AccordionItem summary="B">Content B</AccordionItem>
      </Accordion>
    );
    expect(screen.getByText("A")).toBeDefined();
    expect(screen.getByText("B")).toBeDefined();
  });
});

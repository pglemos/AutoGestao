import { expect, test, describe, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { StatusBadge } from "@/components/molecules/StatusBadge";
import * as React from "react";

afterEach(() => {
  cleanup();
});

describe("StatusBadge", () => {
  test("renders label", () => {
    render(<StatusBadge label="Active" />);
    expect(screen.getByText("Active")).toBeDefined();
  });

  test("applies success status variant", () => {
    const { container } = render(<StatusBadge label="Ok" status="success" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("border-status-success/20");
    expect(badge.className).toContain("bg-status-success-surface");
  });

  test("applies warning status variant", () => {
    const { container } = render(<StatusBadge label="Warn" status="warning" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("border-status-warning/20");
  });

  test("applies error status variant", () => {
    const { container } = render(<StatusBadge label="Err" status="error" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("border-status-error/20");
  });

  test("applies info status variant", () => {
    const { container } = render(<StatusBadge label="Info" status="info" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("border-status-info/20");
  });

  test("applies neutral status variant", () => {
    const { container } = render(<StatusBadge label="Neutral" status="neutral" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("border-border");
    expect(badge.className).toContain("bg-gray-50");
  });

  test("applies pending status variant", () => {
    const { container } = render(<StatusBadge label="Pending" status="pending" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("border-status-warning/20");
  });

  test("renders description", () => {
    render(<StatusBadge label="Status" description="Some detail" />);
    expect(screen.getByText("Some detail")).toBeDefined();
  });

  test("renders dot indicator", () => {
    const { container } = render(<StatusBadge label="Active" status="success" />);
    const dot = container.querySelector("[aria-hidden='true']");
    expect(dot).not.toBeNull();
    expect(dot!.className).toContain("rounded-mx-full");
  });
});

import { describe, expect, it } from "bun:test";
import {
  PAGE_TAB_VALUES,
  buildTabHref,
  normalizeTabParam,
  resolveAllowedTab,
} from "@/lib/tab-params";

describe("normalizeTabParam", () => {
  it("returns null for undefined", () => {
    expect(normalizeTabParam(undefined)).toBeNull();
  });

  it("returns null for null", () => {
    expect(normalizeTabParam(null)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(normalizeTabParam("")).toBeNull();
  });

  it("returns null for an empty quoted value", () => {
    expect(normalizeTabParam('""')).toBeNull();
  });

  it("trims whitespace and strips surrounding quotes", () => {
    expect(normalizeTabParam('  "templates"  ')).toBe("templates");
  });

  it("strips surrounding single quotes", () => {
    expect(normalizeTabParam("'history'")).toBe("history");
  });

  it("uses the first item when the param is an array", () => {
    expect(normalizeTabParam(["templates", "history"])).toBe("templates");
  });

  it("returns null for an empty array", () => {
    expect(normalizeTabParam([])).toBeNull();
  });
});

describe("resolveAllowedTab", () => {
  const emailTabs = PAGE_TAB_VALUES.emails;

  it("returns a valid tab", () => {
    expect(resolveAllowedTab("templates", emailTabs, "history")).toBe(
      "templates",
    );
  });

  it("falls back when the tab is not allowed", () => {
    expect(resolveAllowedTab("bogus", emailTabs, "history")).toBe("history");
  });

  it("falls back when the tab is empty or only quotes", () => {
    expect(resolveAllowedTab("", emailTabs, "history")).toBe("history");
    expect(resolveAllowedTab('""', emailTabs, "history")).toBe("history");
  });

  it("falls back when a permission-filtered list blocks the tab", () => {
    const allowedWithoutFelicitometro = ["list"] as const;

    expect(
      resolveAllowedTab(
        "felicitometro",
        allowedWithoutFelicitometro,
        "list",
      ),
    ).toBe("list");
  });
});

describe("buildTabHref", () => {
  it("preserves other query params", () => {
    expect(
      buildTabHref("/tasks", "delegated", {
        searchParams: "?taskId=123",
      }),
    ).toBe("/tasks?taskId=123&tab=delegated");
  });

  it("updates an existing tab while preserving other params", () => {
    expect(
      buildTabHref("/emails", "templates", {
        searchParams: "?tab=history&status=failed",
      }),
    ).toBe("/emails?tab=templates&status=failed");
  });

  it("removes the tab when it matches the default tab", () => {
    expect(
      buildTabHref("/tasks", "personal", {
        defaultTab: "personal",
        searchParams: "?tab=delegated&taskId=123",
      }),
    ).toBe("/tasks?taskId=123");
  });

  it("removes an empty tab and leaves a clean pathname", () => {
    expect(buildTabHref("/tasks", "")).toBe("/tasks");
  });

  it("returns a clean pathname when removing the default tab leaves no params", () => {
    expect(
      buildTabHref("/members", "list", {
        defaultTab: "list",
        searchParams: "?tab=list",
      }),
    ).toBe("/members");
  });

  it("accepts URLSearchParams without mutating the input", () => {
    const searchParams = new URLSearchParams("tab=history&taskId=123");

    expect(
      buildTabHref("/tasks", "personal", {
        defaultTab: "personal",
        searchParams,
      }),
    ).toBe("/tasks?taskId=123");
    expect(searchParams.get("tab")).toBe("history");
  });
});

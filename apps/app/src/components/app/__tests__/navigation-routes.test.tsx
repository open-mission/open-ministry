import { afterAll, describe, expect, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  getParentHref,
  isMobileNavRoute,
  isNavItemActive,
} from "@/components/app/nav-config";

const actualNavigation = await import("next/navigation");

let currentPathname = "/";

mock.module("next/navigation", () => ({
  ...actualNavigation,
  usePathname: () => currentPathname,
}));

const { DashboardBreadcrumb } = await import(
  "@/components/app/dashboard-breadcrumb"
);

afterAll(() => {
  mock.module("next/navigation", () => ({ ...actualNavigation }));
});

function renderBreadcrumb(pathname: string) {
  currentPathname = pathname;
  return renderToStaticMarkup(createElement(DashboardBreadcrumb));
}

describe("DashboardBreadcrumb", () => {
  it("renderiza Início em / e normaliza /dashboard", () => {
    const homeMarkup = renderBreadcrumb("/");
    const legacyMarkup = renderBreadcrumb("/dashboard");

    expect(homeMarkup).toContain(">Início<");
    expect(legacyMarkup).toContain(">Início<");
  });

  it("renderiza Início > Configurações em /settings no desktop e título mobile", () => {
    const markup = renderBreadcrumb("/settings");

    expect(markup).toContain('href="/"');
    expect(markup).toContain(">Início<");
    expect(markup).toContain(">Configurações<");
    expect(markup).toContain("lg:hidden");
  });

  it("renderiza cadeia completa com href na raiz em /songs/123", () => {
    const markup = renderBreadcrumb("/songs/123");

    expect(markup).toContain('href="/"');
    expect(markup).toContain(">Início<");
    expect(markup).toContain('href="/songs"');
    expect(markup).toContain(">Músicas<");
    expect(markup).toContain(">Detalhes da música<");
  });

  it("renderiza cadeia completa em /events/123 e Detalhes da pessoa em /members/123", () => {
    const eventMarkup = renderBreadcrumb("/events/123");
    const memberMarkup = renderBreadcrumb("/members/123");

    expect(eventMarkup).toContain('href="/"');
    expect(eventMarkup).toContain('href="/events"');
    expect(eventMarkup).toContain(">Cultos e eventos<");
    expect(eventMarkup).toContain(">Detalhes do culto<");

    expect(memberMarkup).toContain('href="/members"');
    expect(memberMarkup).toContain(">Pessoas<");
    expect(memberMarkup).toContain(">Detalhes da pessoa<");
  });
});

describe("nav-config rotas na raiz", () => {
  it("resolve getParentHref para rotas de 1 e 2 segmentos na raiz", () => {
    expect(getParentHref("/")).toBe("/");
    expect(getParentHref("/settings")).toBe("/");
    expect(getParentHref("/songs/123")).toBe("/songs");
    expect(getParentHref("/departments/123")).toBe("/departments");
    expect(getParentHref("/events/123")).toBe("/calendar");
    expect(getParentHref("/dashboard/songs/123")).toBe("/songs");
  });

  it("avalia isNavItemActive e isMobileNavRoute com URLs limpas na raiz", () => {
    expect(
      isNavItemActive({ href: "/", exact: true }, "/"),
    ).toBe(true);
    expect(
      isNavItemActive({ href: "/", exact: true }, "/settings"),
    ).toBe(false);
    expect(
      isNavItemActive({ href: "/songs", exact: false }, "/songs/123"),
    ).toBe(true);

    expect(isMobileNavRoute("/")).toBe(true);
    expect(isMobileNavRoute("/schedules")).toBe(true);
    expect(isMobileNavRoute("/calendar")).toBe(true);
    expect(isMobileNavRoute("/songs")).toBe(true);
    expect(isMobileNavRoute("/songs/123")).toBe(false);
    expect(isMobileNavRoute("/settings")).toBe(false);
  });
});

import { afterAll, describe, expect, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const actualNavigation = await import("next/navigation");
let currentPathname = "/songs";

mock.module("next/navigation", () => ({
  ...actualNavigation,
  usePathname: () => currentPathname,
}));

const { resolveHeaderScaffoldLevel } = await import(
  "../header-scaffold-config"
);
const { PageHeaderScaffold } = await import("../page-header-scaffold");
const { HeaderGlobalActionsSlot } = await import("../home-header-slot");

afterAll(() => {
  mock.module("next/navigation", () => actualNavigation);
});

describe("Header Scaffold Dinâmico", () => {
  it("resolveHeaderScaffoldLevel classifica corretamente abas raiz, explorar e detalhe", () => {
    expect(resolveHeaderScaffoldLevel("/")).toBe("root-tab");
    expect(resolveHeaderScaffoldLevel("/calendar")).toBe("root-tab");
    expect(resolveHeaderScaffoldLevel("/songs")).toBe("root-tab");
    expect(resolveHeaderScaffoldLevel("/schedules")).toBe("root-tab");
    expect(resolveHeaderScaffoldLevel("/dashboard/songs")).toBe("root-tab");

    expect(resolveHeaderScaffoldLevel("/departments")).toBe("explore");
    expect(resolveHeaderScaffoldLevel("/members")).toBe("explore");
    expect(resolveHeaderScaffoldLevel("/rehearsals")).toBe("explore");

    expect(resolveHeaderScaffoldLevel("/songs/song-123")).toBe("detail");
    expect(resolveHeaderScaffoldLevel("/events/evt-1")).toBe("detail");
    expect(resolveHeaderScaffoldLevel("/departments/dept-1")).toBe("detail");
    expect(resolveHeaderScaffoldLevel("/dashboard/songs/song-123")).toBe(
      "detail",
    );
  });

  it("PageHeaderScaffold oculta Voltar em root-tab e exibe em explore e detail", () => {
    currentPathname = "/songs";
    const rootHtml = renderToStaticMarkup(
      createElement(PageHeaderScaffold, {
        title: "Repertório",
        subtitle: "Igreja Esperança",
      }),
    );
    expect(rootHtml).not.toContain('aria-label="Voltar"');
    expect(rootHtml).toContain("pr-18 sm:pr-20.5");

    currentPathname = "/departments";
    const exploreHtml = renderToStaticMarkup(
      createElement(PageHeaderScaffold, {
        title: "Departamentos",
        subtitle: "Igreja Esperança",
      }),
    );
    expect(exploreHtml).toContain('aria-label="Voltar"');
    expect(exploreHtml).toContain("pr-18 sm:pr-20.5");

    currentPathname = "/songs/song-123";
    const detailHtml = renderToStaticMarkup(
      createElement(PageHeaderScaffold, {
        title: "Bondade de Deus",
        subtitle: "Tom G",
        mobileAction: createElement("button", null, "Ações"),
      }),
    );
    expect(detailHtml).toContain('aria-label="Voltar"');
    expect(detailHtml).not.toContain("pr-18 sm:pr-20.5");
  });

  it("HeaderGlobalActionsSlot oculta Sino e Avatar no mobile em rotas de detalhe (padrão iOS)", () => {
    currentPathname = "/songs";
    const onRoot = renderToStaticMarkup(
      createElement(
        HeaderGlobalActionsSlot,
        null,
        createElement("span", null, "GLOBAL_ACTIONS"),
      ),
    );
    expect(onRoot).not.toContain("max-md:hidden");

    currentPathname = "/songs/song-123";
    const onDetail = renderToStaticMarkup(
      createElement(
        HeaderGlobalActionsSlot,
        null,
        createElement("span", null, "GLOBAL_ACTIONS"),
      ),
    );
    expect(onDetail).toContain("max-md:hidden");
  });
});

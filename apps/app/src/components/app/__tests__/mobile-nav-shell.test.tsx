import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MobileNavShell } from "@/components/app/mobile-nav-shell";
import { mobileNavItems } from "@/components/app/nav-config";

function renderNav() {
  return renderToStaticMarkup(
    createElement(MobileNavShell, { activeHref: "/schedules" }),
  );
}

function getNavClassTokens(markup: string) {
  const navTag = markup.match(/<nav\b[^>]*>/);
  if (!navTag) throw new Error("MobileNavShell não renderizou um <nav>");

  const classAttr = navTag[0].match(/\bclass="([^"]*)"/);
  if (!classAttr) throw new Error("MobileNavShell não renderizou class no <nav>");

  return classAttr[1].split(/\s+/).filter(Boolean);
}

describe("MobileNavShell", () => {
  it("não usa backdrop-blur (evita bug de pintura do position:fixed no iOS)", () => {
    const tokens = getNavClassTokens(renderNav());

    const backdropUtilities = tokens.filter(
      (token) => token.startsWith("backdrop-") || token.includes("backdrop-blur"),
    );

    expect(backdropUtilities).toEqual([]);
  });

  it("usa fundo opaco em vez de bg-background/95", () => {
    const tokens = getNavClassTokens(renderNav());

    expect(tokens).toContain("bg-background");
    expect(tokens.some((token) => token.startsWith("bg-background/"))).toBe(
      false,
    );
  });

  it("mantém o posicionamento fixo na base com safe-area e visibilidade mobile", () => {
    const tokens = getNavClassTokens(renderNav());

    expect(tokens).toContain("fixed");
    expect(tokens).toContain("inset-x-0");
    expect(tokens).toContain("bottom-0");
    expect(tokens).toContain("z-40");
    expect(tokens).toContain("md:hidden");
    expect(tokens).toContain("pb-[env(safe-area-inset-bottom)]");
    expect(tokens).toContain("border-t");
  });

  it("continua renderizando os itens de navegação e o botão Menu", () => {
    const markup = renderNav();

    expect(markup).toContain('aria-label="Navegação principal"');
    expect(markup).toContain('aria-label="Abrir menu completo de navegação"');

    for (const item of mobileNavItems) {
      expect(markup).toContain(`href="${item.href}"`);
      expect(markup).toContain(item.label);
    }

    expect(markup).toContain("Menu");
    expect(markup).toContain("grid-cols-5");
  });
});

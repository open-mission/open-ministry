import { describe, expect, it, mock } from "bun:test";
import { createElement as h, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

type MarkerProps = { tag?: string; children?: ReactNode };

mock.module("vaul", () => {
  const Marker = ({ tag, children }: MarkerProps) =>
    h("div", { "data-marker": tag ?? "passthrough" }, children);
  const Passthrough = ({ children }: MarkerProps) => h("div", null, children);

  return {
    Drawer: {
      Root: (props: MarkerProps) => h(Marker, { tag: "root" }, props.children),
      NestedRoot: (props: MarkerProps) =>
        h(Marker, { tag: "nested" }, props.children),
      Trigger: Passthrough,
      Portal: Passthrough,
      Close: Passthrough,
      Overlay: () => null,
      Content: ({ children }: MarkerProps) =>
        h("div", { "data-marker": "content" }, children),
      Title: Passthrough,
      Description: Passthrough,
    },
  };
});

// Cache-buster: outros arquivos de teste podem já ter carregado o módulo real.
const drawerModulePath = "@/components/ui/drawer?nesting-regression";
const { Drawer, DrawerContent } = await import(drawerModulePath);

const sourceFile = new URL("../drawer.tsx", import.meta.url);

describe("drawer aninhado automático", () => {
  it("usa NestedRoot para um Drawer renderizado dentro de DrawerContent", () => {
    const markup = renderToStaticMarkup(
      h(
        Drawer,
        { open: true },
        h(
          DrawerContent,
          null,
          h(Drawer, { open: true }, h("span", null, "conteúdo interno")),
        ),
      ),
    );

    expect(markup).toContain('data-marker="root"');
    expect(markup).toContain('data-marker="nested"');
  });

  it("usa Root (normal) para um Drawer fora de qualquer DrawerContent", () => {
    const markup = renderToStaticMarkup(
      h(Drawer, { open: true }, h("span", null, "solto")),
    );

    expect(markup).toContain('data-marker="root"');
    expect(markup).not.toContain('data-marker="nested"');
  });

  it("mantém o contexto interno e o provider envolvendo os children", async () => {
    const source = await Bun.file(sourceFile).text();
    expect(source).toMatch(/createContext\(false\)/);
    expect(source).toMatch(/DrawerNestedContext\.Provider\s+value=\{true\}/);
    expect(source).toMatch(
      /DrawerPrimitive\.NestedRoot\s+data-slot="drawer-nested-root"/,
    );
  });
});

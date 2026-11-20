import { describe, expect, it, mock } from "bun:test";
import { createElement as h, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let mobile = false;

const makeLayer = (name: string) => {
  const Layer = ({ open, children }: { open?: boolean; children?: ReactNode }) =>
    h(
      "div",
      {
        "data-render-layer": name,
        "data-open": String(open),
      },
      children,
    );
  return Layer;
};

const Passthrough = ({ children }: { children?: ReactNode }) =>
  h("div", null, children);

mock.module("@/components/ui/dialog", () => ({
  Dialog: makeLayer("dialog"),
  DialogContent: Passthrough,
  DialogDescription: Passthrough,
  DialogFooter: Passthrough,
  DialogHeader: Passthrough,
  DialogTitle: Passthrough,
}));

mock.module("@/components/ui/drawer", () => ({
  Drawer: makeLayer("drawer"),
  DrawerContent: Passthrough,
  DrawerDescription: Passthrough,
  DrawerFooter: Passthrough,
  DrawerHeader: Passthrough,
  DrawerTitle: Passthrough,
}));

mock.module("@/hooks/use-stable-is-mobile", () => ({
  useStableIsMobile: () => mobile,
}));

mock.module("@/hooks/use-mounted", () => ({
  useMounted: () => true,
}));

const close = mock(() => {});

mock.module("@/lib/release-notes-store", () => ({
  releaseNotesStore: {
    checkAutoOpen: () => {},
    close,
  },
  useReleaseNotesStore: () => ({
    isOpen: false,
    activeRelease: {
      version: "1.7.0",
      title: "Novidades",
      subtitle: "Subtítulo",
      releaseDate: "20/11/2026",
      moduleGroups: [],
    },
  }),
}));

const { ReleaseNotesModal } = await import(
  "@/components/release-notes/release-notes-modal"
);

describe("ReleaseNotesModal montado mesmo quando fechado", () => {
  it("mantém o Dialog montado (open=false) em vez de retornar null", () => {
    mobile = false;
    const markup = renderToStaticMarkup(h(ReleaseNotesModal));

    expect(markup).toContain('data-render-layer="dialog"');
    expect(markup).toContain('data-open="false"');
  });

  it("mantém o Drawer montado (open=false) no mobile", () => {
    mobile = true;
    const markup = renderToStaticMarkup(h(ReleaseNotesModal));

    expect(markup).toContain('data-render-layer="drawer"');
    expect(markup).toContain('data-open="false"');
  });

  it("não possui early-return que desmonte o modal ao fechar", async () => {
    const source = await Bun.file(
      new URL("../release-notes-modal.tsx", import.meta.url),
    ).text();

    expect(source).not.toMatch(/if\s*\(\s*!isOpen\s*\)\s*return\s+null/);
    expect(source).toMatch(/if\s*\(\s*!mounted\s*\)\s*return\s+null/);
    expect(source).toMatch(/useMounted\(\)/);
    expect(source).toMatch(/useStableIsMobile\(isOpen\)/);
  });
});

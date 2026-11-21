import { describe, expect, it, mock } from "bun:test";
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const actualPathname = { value: "/members" };

mock.module("next/navigation", () => ({
  usePathname: () => actualPathname.value,
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

mock.module("@/components/ui/drawer", () => ({
  Drawer: ({ children }: { children?: ReactNode }) =>
    createElement("div", { "data-drawer-root": "true" }, children),
  DrawerContent: ({
    children,
    className,
  }: {
    children?: ReactNode;
    className?: string;
  }) =>
    createElement(
      "div",
      { "data-drawer-content": "true", className },
      children,
    ),
  DrawerHeader: ({
    children,
    className,
  }: {
    children?: ReactNode;
    className?: string;
  }) =>
    createElement("div", { "data-drawer-header": "true", className }, children),
  DrawerTitle: ({
    children,
    className,
  }: {
    children?: ReactNode;
    className?: string;
  }) => createElement("h2", { className }, children),
  DrawerDescription: ({
    children,
    className,
  }: {
    children?: ReactNode;
    className?: string;
  }) => createElement("p", { className }, children),
}));

const { SettingsModalContext } = await import(
  "@/components/settings/settings-modal-context"
);
const { MobileMenu, MobileMenuProvider, MobileMenuTrigger } = (await import(
  "@/components/app/mobile-menu"
)) as typeof import("@/components/app/mobile-menu");
const { MobileHeaderLeading } = (await import(
  "@/components/app/mobile-header-leading"
)) as typeof import("@/components/app/mobile-header-leading");

describe("MobileMenu & MobileHeaderLeading (craft-critique)", () => {
  it("mantém DrawerContent no padrão do sistema, header visível, títulos >= 11px e sem Tema/Sair duplicados", () => {
    const MobileMenuComp = MobileMenu as ComponentType<
      NonNullable<Parameters<typeof MobileMenu>[0]>
    >;
    const markup = renderToStaticMarkup(
      createElement(
        SettingsModalContext.Provider,
        {
          value: {
            open: false,
            openSettings: () => {},
            closeSettings: () => {},
          },
        },
        createElement(
          MobileMenuProvider,
          null,
          createElement(MobileMenuComp, {
            organizationName: "Igreja Esperança Central",
            activeModuleKeys: [
              "agenda",
              "schedules",
              "music",
              "announcements",
              "tasks",
              "rehearsals",
            ],
            canManageJobs: true,
            canAccessWhatsApp: true,
            canAccessEmails: true,
          }),
        ),
      ),
    );

    expect(markup).toContain("Navegação");
    expect(markup).toContain("Igreja Esperança Central");
    expect(markup).not.toContain('class="sr-only"');

    expect(markup).not.toContain("h-[90dvh]");
    expect(markup).not.toContain("rounded-t-[28px]");

    expect(markup).toContain("text-[11px]");
    expect(markup).not.toContain("text-[0.68rem]");

    expect(markup).toContain("Cultos &amp; Louvor");
    expect(markup).toContain("Comunicação &amp; Gestão");
    expect(markup).not.toContain(">Repertório<");
    expect(markup).not.toContain(">Operações<");

    expect(markup).toContain("Configurações");
    expect(markup).not.toContain("Sair da conta");
    expect(markup).not.toContain("Ativar tema");
  });

  it("mantém alvos de toque >= 44px (size-11) no trigger do menu e botão Voltar", () => {
    actualPathname.value = "/members";

    const triggerMarkup = renderToStaticMarkup(
      createElement(MobileMenuProvider, null, createElement(MobileMenuTrigger)),
    );
    const backMarkup = renderToStaticMarkup(
      createElement(MobileHeaderLeading, {
        organizationName: "Igreja Esperança Central",
      }),
    );

    expect(triggerMarkup).toContain("size-11");
    expect(backMarkup).toContain("size-11");
    expect(backMarkup).toContain('aria-label="Voltar"');
  });
});

import { describe, expect, it, mock } from "bun:test";
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarDaysIcon } from "lucide-react";

import type { MobileExploreDomainData } from "@/components/app/domain-subtabs-data";

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

const exploreDomains: MobileExploreDomainData[] = [
  { key: "/", href: "/", label: "Início", exact: true, tabs: [] },
  {
    key: "cultos",
    href: "/calendar",
    label: "Cultos & Escalas",
    exact: false,
    badge: "2",
    tabs: [
      { href: "/calendar", label: "Agenda", exact: false },
      { href: "/availability", label: "Disponibilidade", exact: false },
    ],
  },
  {
    key: "louvor",
    href: "/songs",
    label: "Louvor",
    exact: false,
    badge: "2",
    tabs: [
      { href: "/songs", label: "Músicas", exact: false },
      { href: "/rehearsals", label: "Ensaios", exact: false },
    ],
  },
  {
    key: "pessoas",
    href: "/members",
    label: "Pessoas",
    exact: false,
    badge: "3",
    tabs: [
      { href: "/members", label: "Pessoas", exact: false },
      { href: "/departments", label: "Departamentos", exact: false },
      { href: "/birthdays", label: "Aniversariantes", exact: false },
    ],
  },
  {
    key: "comunicacao",
    href: "/announcements",
    label: "Comunicação",
    exact: false,
    badge: "3",
    tabs: [
      { href: "/announcements", label: "Avisos", exact: false },
      { href: "/whatsapp", label: "WhatsApp", exact: false },
      { href: "/emails", label: "Emails", exact: false },
    ],
  },
  { key: "/bible", href: "/bible", label: "Bíblia", exact: false, tabs: [] },
];

const exploreSecondary: MobileExploreDomainData[] = [
  {
    key: "/tasks",
    href: "/tasks",
    label: "Minhas tarefas",
    exact: false,
    tabs: [],
  },
  {
    key: "/jobs",
    href: "/jobs",
    label: "Operações",
    exact: false,
    badge: "Admin",
    tabs: [],
  },
];

function renderMenu(
  overrides: Partial<NonNullable<Parameters<typeof MobileMenu>[0]>> = {},
) {
  const MobileMenuComp = MobileMenu as ComponentType<
    NonNullable<Parameters<typeof MobileMenu>[0]>
  >;

  return renderToStaticMarkup(
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
          exploreDomains,
          exploreSecondary,
          ...overrides,
        }),
      ),
    ),
  );
}

function escapeMarkup(text: string) {
  return text.replace(/&/g, "&amp;");
}

function anchorFor(markup: string, text: string) {
  const needle = `>${escapeMarkup(text)}<`;

  const anchors = markup.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) ?? [];

  return anchors.find((anchor) => anchor.includes(needle)) ?? "";
}

describe("MobileMenu — variante A+C (Explorar)", () => {
  it("mantém header visível, busca com 44px e fonte >= 16px no mobile, sem padrões legados", () => {
    const markup = renderMenu();

    expect(markup).toContain("Explorar");
    expect(markup).toContain("Igreja Esperança Central");
    expect(markup).not.toContain('class="sr-only"');
    expect(markup).not.toContain("h-[90dvh]");
    expect(markup).not.toContain("rounded-t-[28px]");

    expect(markup).toContain('aria-label="Buscar áreas e páginas"');
    expect(markup).toContain("lucide-search");
    expect(markup).toContain("h-11 pr-11 pl-10 text-base md:text-sm");
    expect(markup).toContain("text-[11px]");
  });

  it("mantém altura concreta, scroll interno e empilhamento acima da página", async () => {
    const markup = renderMenu();

    expect(markup).toContain(
      "z-60 h-[95dvh] max-h-[95dvh] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[95dvh] gap-0 overflow-hidden border-x-0 border-b-0 p-0",
    );
    expect(markup).toContain(
      'data-drawer-header="true" class="relative z-10 shrink-0 border-b border-border/60 bg-popover',
    );
    expect(markup).toContain(
      "relative z-10 shrink-0 border-t border-border/60 bg-popover",
    );

    expect(markup).toContain(
      'class="relative flex min-h-0 flex-1 flex-col overflow-hidden"',
    );
    expect(markup).toContain(
      'data-vaul-no-drag="" class="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain',
    );
    expect(markup).not.toContain('class="h-full overflow-y-auto');

    expect(markup).toContain(
      "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-5",
    );
    expect(markup).toContain(
      "pointer-events-none absolute top-1/2 left-3 z-10",
    );

    const source = await Bun.file(
      new URL("../mobile-menu.tsx", import.meta.url),
    ).text();
    expect(source).toContain(
      'className="absolute top-1/2 right-1 z-10 flex size-11',
    );
  });

  it("renderiza atalhos rápidos com pílulas de 44px e destaca o atalho ativo", () => {
    actualPathname.value = "/calendar";
    const markup = renderMenu();

    expect(markup).toContain("Atalhos rápidos");
    expect(markup).toContain("rounded-full");

    const calendarLink = anchorFor(markup, "Agenda");
    expect(calendarLink).toContain("min-h-11");
    expect(calendarLink).toContain('aria-current="page"');
  });

  it("renderiza a grade 2x3 com os 6 domínios, contagem, sub-rotas e domínio ativo", () => {
    actualPathname.value = "/members";
    const markup = renderMenu();

    expect(markup).toContain("Áreas da igreja");
    expect(markup).toContain("grid grid-cols-2 gap-2");

    for (const domain of exploreDomains) {
      expect(markup).toContain(`>${escapeMarkup(domain.label)}<`);
      expect(anchorFor(markup, domain.label)).toContain(
        `href="${domain.href}"`,
      );
    }

    expect(markup).toContain("Agenda · Disponibilidade");
    expect(markup).toContain(">2<");

    const peopleCard = anchorFor(markup, "Pessoas");
    expect(peopleCard).toContain('aria-current="page"');
    expect(peopleCard).toContain("bg-primary/6");

    const bibleCard = anchorFor(markup, "Bíblia");
    expect(bibleCard).not.toContain('aria-current="page"');
  });

  it("renderiza Minhas tarefas e Operações com badge Admin e alvos de 44px", () => {
    actualPathname.value = "/members";
    const markup = renderMenu();

    expect(anchorFor(markup, "Minhas tarefas")).toContain("min-h-11");
    const jobs = anchorFor(markup, "Operações");
    expect(jobs).toContain("min-h-11");
    expect(jobs).toContain(">Admin<");
  });

  it("mantém rodapé único com Configurações e nunca Tema ou Sair da conta", () => {
    const markup = renderMenu();

    expect(markup).toContain("Configurações");
    expect(markup).not.toContain("Sair da conta");
    expect(markup).not.toContain("Ativar tema");
    expect(markup).not.toContain("Tema e Aparência");
  });

  it("mantém compatibilidade com customGroups explícitos", () => {
    const markup = renderMenu({
      groups: [
        {
          title: "Grupo legado",
          items: [
            {
              href: "/custom",
              label: "Página legada",
              icon: CalendarDaysIcon,
              exact: false,
            },
          ],
        },
      ],
    });

    expect(markup).toContain("Grupo legado");
    expect(markup).toContain("Página legada");
    expect(markup).not.toContain("Atalhos rápidos");
    expect(markup).toContain('aria-label="Menu principal"');
  });

  it("deriva domínios e permissões automaticamente quando props serializadas são omitidas", () => {
    actualPathname.value = "/announcements";
    const markup = renderMenu({
      activeModuleKeys: ["announcements"],
      canManageJobs: false,
      canAccessWhatsApp: false,
      canAccessEmails: false,
      exploreDomains: undefined,
      exploreSecondary: undefined,
    });

    expect(markup).toContain("Comunicação");
    expect(markup).not.toContain("WhatsApp");
    expect(markup).not.toContain("Emails");
    expect(markup).not.toContain("Operações");
  });

  it("mantém alvos de toque >= 44px no trigger do menu e botão Voltar", () => {
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
    expect(triggerMarkup).toContain("lg:hidden");
    expect(triggerMarkup).toContain("lucide-compass");
    expect(backMarkup).toContain("size-11");
    expect(backMarkup).toContain("lg:hidden");
    expect(backMarkup).toContain('aria-label="Voltar"');
  });

  it("integra ícone da igreja e saudação no header da home em telas menores que lg", () => {
    actualPathname.value = "/";

    const homeMarkup = renderToStaticMarkup(
      createElement(MobileHeaderLeading, {
        organizationName: "Igreja Esperança Central",
        greeting: "Boa tarde",
        firstName: "Maria",
      }),
    );

    expect(homeMarkup).toContain("lg:hidden");
    expect(homeMarkup).toContain("size-8.5");
    expect(homeMarkup).toContain("Igreja Esperança Central");
    expect(homeMarkup).toContain("Boa tarde, Maria");
    expect(homeMarkup).toContain("bg-[#1e472f]");
  });
});

import { afterAll, describe, expect, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarDaysIcon } from "lucide-react";

import { toSerializableSubtabs } from "@/components/app/domain-subtabs-data";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { NavItem } from "@/components/app/nav-config";
import {
  buildDesktopSidebarNavigation,
  getAccessibleDomainTabs,
  type DesktopSidebarItem,
} from "@/lib/modules/nav";

const actualNavigation = await import("next/navigation");

let currentPathname = "/dashboard/events";

mock.module("next/navigation", () => ({
  ...actualNavigation,
  usePathname: () => currentPathname,
}));

const { DomainSubtabsNav } = await import("@/components/app/domain-subtabs");

afterAll(() => {
  mock.module("next/navigation", () => ({ ...actualNavigation }));
});

const ALL_MODULES = [
  "agenda",
  "schedules",
  "music",
  "announcements",
  "tasks",
  "rehearsals",
] as const;

const FULL_OPTIONS = {
  canManageJobs: true,
  canAccessWhatsApp: true,
  canAccessEmails: true,
};

function labels(items: DesktopSidebarItem[]) {
  return items.map((item) => item.label);
}

function findItem(items: DesktopSidebarItem[], label: string) {
  const item = items.find((candidate) => candidate.label === label);
  if (!item) throw new Error(`Item não encontrado: ${label}`);
  return item;
}

describe("buildDesktopSidebarNavigation", () => {
  it("returns the six primary items and both secondary items with full access", () => {
    const nav = buildDesktopSidebarNavigation([...ALL_MODULES], FULL_OPTIONS);

    expect(labels(nav.primary)).toEqual([
      "Início",
      "Cultos & Escalas",
      "Louvor",
      "Pessoas",
      "Comunicação",
      "Bíblia",
    ]);
    expect(labels(nav.secondary)).toEqual(["Minhas tarefas", "Operações"]);
  });

  it("derives domain href, matchPrefixes and count badge from accessible tabs", () => {
    const nav = buildDesktopSidebarNavigation([...ALL_MODULES], FULL_OPTIONS);

    const cultos = findItem(nav.primary, "Cultos & Escalas");
    expect(cultos.href).toBe("/calendar");
    expect(cultos.matchPrefixes).toEqual([
      "/calendar",
      "/events",
      "/schedules",
      "/availability",
    ]);
    expect(cultos.badge).toBe("4");

    const louvor = findItem(nav.primary, "Louvor");
    expect(louvor.matchPrefixes).toEqual(["/songs", "/rehearsals"]);
    expect(louvor.badge).toBe("2");

    const comunicacao = findItem(nav.primary, "Comunicação");
    expect(comunicacao.matchPrefixes).toEqual([
      "/announcements",
      "/whatsapp",
      "/emails",
    ]);
    expect(comunicacao.badge).toBe("3");
  });

  it("omits secondary items when not permitted", () => {
    const nav = buildDesktopSidebarNavigation(
      ALL_MODULES.filter((module) => module !== "tasks"),
    );

    expect(labels(nav.secondary)).toEqual([]);
  });

  it("shows only the tasks secondary item when the tasks module is active", () => {
    const nav = buildDesktopSidebarNavigation(["tasks"]);

    expect(labels(nav.secondary)).toEqual(["Minhas tarefas"]);
  });

  it("omits domains with no accessible tabs", () => {
    const nav = buildDesktopSidebarNavigation([]);

    expect(labels(nav.primary)).toEqual(["Início", "Pessoas", "Bíblia"]);
  });

  it("respects partial module access inside a domain", () => {
    const nav = buildDesktopSidebarNavigation(["agenda"]);
    const cultos = findItem(nav.primary, "Cultos & Escalas");

    expect(cultos.matchPrefixes).toEqual(["/calendar", "/events"]);
    expect(cultos.badge).toBe("2");
    expect(labels(nav.primary)).not.toContain("Louvor");
    expect(labels(nav.primary)).not.toContain("Comunicação");
  });

  it("uses the admin badge for Operações", () => {
    const nav = buildDesktopSidebarNavigation([], { canManageJobs: true });

    expect(findItem(nav.secondary, "Operações").badge).toBe("Admin");
  });
});

describe("getAccessibleDomainTabs", () => {
  it("returns the four Cultos & Escalas tabs in order", () => {
    const tabs = getAccessibleDomainTabs("cultos", [...ALL_MODULES]);

    expect(tabs.map((tab) => tab.href)).toEqual([
      "/calendar",
      "/events",
      "/schedules",
      "/availability",
    ]);
  });

  it("filters Louvor tabs by the music and rehearsals modules", () => {
    expect(
      getAccessibleDomainTabs("louvor", ["music"]).map((tab) => tab.href),
    ).toEqual(["/songs"]);
    expect(
      getAccessibleDomainTabs("louvor", ["rehearsals"]).map((tab) => tab.href),
    ).toEqual(["/rehearsals"]);
    expect(getAccessibleDomainTabs("louvor", [])).toEqual([]);
  });

  it("gates WhatsApp and Emails tabs behind their options", () => {
    expect(
      getAccessibleDomainTabs("comunicacao", ["announcements"]).map(
        (tab) => tab.href,
      ),
    ).toEqual(["/announcements"]);

    expect(
      getAccessibleDomainTabs("comunicacao", ["announcements"], {
        canAccessWhatsApp: true,
        canAccessEmails: true,
      }).map((tab) => tab.href),
    ).toEqual(["/announcements", "/whatsapp", "/emails"]);
  });

  it("keeps Pessoas tabs available regardless of modules", () => {
    expect(
      getAccessibleDomainTabs("pessoas", []).map((tab) => tab.href),
    ).toEqual(["/members", "/departments", "/birthdays"]);
  });
});

const cultosTabs: NavItem[] = [
  {
    href: "/calendar",
    label: "Agenda",
    icon: CalendarDaysIcon,
    exact: false,
  },
  {
    href: "/events",
    label: "Cultos e eventos",
    icon: CalendarDaysIcon,
    exact: false,
  },
];

describe("toSerializableSubtabs", () => {
  it("strips icon functions before tabs cross the Server/Client boundary", () => {
    const tabs = getAccessibleDomainTabs("cultos", [...ALL_MODULES]);
    const data = toSerializableSubtabs(tabs);

    expect(data).toHaveLength(4);
    expect(data.every((tab) => !("icon" in tab))).toBe(true);
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });
});

describe("DomainSubtabsNav", () => {
  it("renders icons from a client-side map for known tab hrefs", () => {
    const markup = renderToStaticMarkup(
      createElement(DomainSubtabsNav, {
        domainLabel: "Cultos & Escalas",
        tabs: toSerializableSubtabs(cultosTabs),
      }),
    );

    expect(markup).toContain("lucide-calendar-days");
  });

  it("marks the current tab with aria-current and the active classes", () => {
    currentPathname = "/dashboard/events";

    const markup = renderToStaticMarkup(
      createElement(DomainSubtabsNav, {
        domainLabel: "Cultos & Escalas",
        tabs: cultosTabs,
      }),
    );

    expect(markup).toContain('aria-label="Sub-abas de Cultos &amp; Escalas"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("Cultos e eventos");
    expect(markup).toContain("bg-card");
    expect(markup).toContain("shadow-2xs");
  });

  it("é visível no mobile com rolagem horizontal e alvos de 44px", () => {
    const markup = renderToStaticMarkup(
      createElement(DomainSubtabsNav, {
        domainLabel: "Cultos & Escalas",
        tabs: cultosTabs,
      }),
    );

    expect(markup).not.toContain("hidden md:flex");
    expect(markup).toContain(
      "flex w-full md:w-fit max-w-full items-center gap-1 overflow-x-auto scrollbar-none",
    );
    expect(markup).toContain("min-h-11 md:min-h-9");
    expect(markup).toContain('aria-label="Sub-abas de Cultos &amp; Escalas"');
  });

  it("renders nothing when there is a single tab", () => {
    currentPathname = "/calendar";

    const markup = renderToStaticMarkup(
      createElement(DomainSubtabsNav, {
        domainLabel: "Cultos & Escalas",
        tabs: [cultosTabs[0]!],
      }),
    );

    expect(markup).toBe("");
  });
});

describe("desktop sidebar configuration", () => {
  it("uses a 56px collapsed rail in the UI package", async () => {
    const source = await Bun.file(
      new URL(
        "../../../../../../packages/ui/src/components/sidebar.tsx",
        import.meta.url,
      ),
    ).text();

    expect(source).toContain('SIDEBAR_WIDTH_ICON = "3.5rem"');
  });

  it("collapses to icon mode without the standalone settings button", async () => {
    const source = await Bun.file(
      new URL("../app-sidebar.tsx", import.meta.url),
    ).text();

    expect(source).toContain('collapsible="icon"');
    expect(source).not.toContain("SidebarSettingsButton");
  });

  it("scans @openministry/ui in Tailwind CSS and keeps @ui-sdk below Tailwind layers", async () => {
    const globalsCss = await Bun.file(
      new URL("../../../app/globals.css", import.meta.url),
    ).text();

    expect(globalsCss).toContain('@source "../../../../packages/ui/src";');
    expect(globalsCss).toContain('@import "@ui-sdk/core/web.css";');
    expect(globalsCss).not.toContain('layer(components)');
  });

  it("alinhamento e respiro do desktop sidebar acompanham o header do logo", () => {
    currentPathname = "/";
    const markup = renderToStaticMarkup(
      createElement(
        SidebarProvider,
        null,
        createElement(SidebarNav, {
          activeModuleKeys: [...ALL_MODULES],
          canManageJobs: true,
          canAccessWhatsApp: true,
          canAccessEmails: true,
        }),
      ),
    );

    expect(markup).toContain("px-3 py-1 group-data-[collapsible=icon]:px-2");
    expect(markup).toContain("gap-1.5");
    expect(markup).toContain("h-9 gap-2.5 rounded-lg px-2.5 text-[13px] group-data-[collapsible=icon]:mx-auto");
    expect(markup).toContain("peer-data-[size=default]/menu-button:top-1/2 right-2.5 -translate-y-1/2");
    expect(markup).toContain("text-[11px]");
    expect(markup).not.toContain("text-[10px]");
  });

  it("applies matching px-3 header/footer breathing room in AppSidebar and NavUser", async () => {
    const appSidebar = await Bun.file(
      new URL("../app-sidebar.tsx", import.meta.url),
    ).text();
    const navUser = await Bun.file(
      new URL("../nav-user.tsx", import.meta.url),
    ).text();

    expect(appSidebar).toContain("px-3 pt-4 pb-2 group-data-[collapsible=icon]:px-2");
    expect(appSidebar).toContain("px-3 pt-2 pb-3.5 group-data-[collapsible=icon]:px-2");
    expect(appSidebar).toContain("px-1.5 py-1 group-data-[collapsible=icon]:mx-auto");
    expect(navUser).toContain("border border-sidebar-border bg-background px-2 py-1.5");
  });
});

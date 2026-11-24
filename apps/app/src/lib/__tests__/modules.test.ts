import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

import {
  AVAILABLE_MODULES,
  getSystemModule,
  SYSTEM_MODULES,
} from "@/lib/modules";
import {
  buildAccessibleMobileMenuGroups,
  buildAccessibleMobileNavItems,
  buildAccessibleNavGroups,
  buildMobileExploreQuickLinks,
  filterMobileExploreRoutes,
} from "@/lib/modules/nav";

describe("Modules System Foundation", () => {
  it("registers system modules properly", () => {
    expect(AVAILABLE_MODULES.length).toBeGreaterThan(0);
    expect(SYSTEM_MODULES.music).toBeDefined();
    expect(SYSTEM_MODULES.music.key).toBe("music");
    expect(SYSTEM_MODULES.music.name).toBe("Música & Repertório");
  });

  it("retrieves module definition by key", () => {
    const musicMod = getSystemModule("music");
    expect(musicMod).not.toBeNull();
    expect(musicMod?.shortName).toBe("Música");
    expect(musicMod?.navGroups[0]?.title).toBe("Repertório");
    expect(musicMod?.navGroups[0]?.items[0]?.href).toBe("/songs");

    const invalidMod = getSystemModule("invalid_key");
    expect(invalidMod).toBeNull();
  });

  it("builds navigation groups with active modules", () => {
    const defaultNav = buildAccessibleNavGroups([
      "agenda",
      "schedules",
      "announcements",
    ]);
    const titles = defaultNav.map((g) => g.title);
    expect(titles).toContain("Principal");
    expect(titles).toContain("Cultos & Escalas");
    expect(titles).not.toContain("Repertório");
  });

  it("registers the Ensaios navigation entry for the rehearsals module", () => {
    const rehearsalsMod = getSystemModule("rehearsals");
    expect(rehearsalsMod).not.toBeNull();
    expect(rehearsalsMod?.navGroups[0]?.title).toBe("Ensaios");
    expect(
      rehearsalsMod?.navGroups.some((group) =>
        group.items.some(
          (item) => item.href === "/rehearsals" && item.label === "Ensaios",
        ),
      ),
    ).toBe(true);

    const activeNav = buildAccessibleNavGroups(["rehearsals"]);
    const activeHrefs = activeNav.flatMap((group) =>
      group.items.map((item) => item.href),
    );
    expect(activeHrefs).toContain("/rehearsals");

    const inactiveNav = buildAccessibleNavGroups([]);
    const inactiveHrefs = inactiveNav.flatMap((group) =>
      group.items.map((item) => item.href),
    );
    expect(inactiveHrefs).not.toContain("/rehearsals");
  });

  it("injects module nav groups dynamically when module is active", () => {
    const activeNav = buildAccessibleNavGroups([
      "agenda",
      "schedules",
      "announcements",
      "music",
    ]);
    const titles = activeNav.map((g) => g.title);

    expect(titles).toContain("Repertório");

    const repertoGroup = activeNav.find((g) => g.title === "Repertório");
    expect(repertoGroup).toBeDefined();
    expect(repertoGroup?.items.some((i) => i.href === "/songs")).toBe(true);

    // Deve posicionar "Repertório" de forma elegante logo após "Cultos & Escalas"
    const cultosIdx = titles.indexOf("Cultos & Escalas");
    const repertoIdx = titles.indexOf("Repertório");
    expect(repertoIdx).toBe(cultosIdx + 1);
  });

  it("safely handles repeated or invalid module keys in navigation builder", () => {
    const activeNav = buildAccessibleNavGroups([
      "music",
      // @ts-expect-error testing runtime resilience
      "nonexistent_key",
    ]);
    const repertoGroup = activeNav.filter((g) => g.title === "Repertório");
    expect(repertoGroup.length).toBe(1);
    expect(
      repertoGroup[0]?.items.filter((i) => i.href === "/songs").length,
    ).toBe(1);
  });

  it("injects operations nav group when canManageJobs option is true", () => {
    const adminNav = buildAccessibleNavGroups([], { canManageJobs: true });
    const titles = adminNav.map((g) => g.title);
    expect(titles).toContain("Operações");

    const opsGroup = adminNav.find((g) => g.title === "Operações");
    expect(opsGroup?.items.some((i) => i.href === "/jobs")).toBe(true);
  });

  it("injects WhatsApp and Emails nav items in Comunicação group when permitted", () => {
    const defaultNav = buildAccessibleNavGroups(["announcements"], {
      canAccessWhatsApp: false,
      canAccessEmails: false,
    });
    const defaultCom = defaultNav.find((g) => g.title === "Comunicação");
    expect(
      defaultCom?.items.some((i) => i.href === "/whatsapp") ?? false,
    ).toBe(false);
    expect(
      defaultCom?.items.some((i) => i.href === "/emails") ?? false,
    ).toBe(false);

    const leaderNav = buildAccessibleNavGroups(["announcements"], {
      canAccessWhatsApp: true,
      canAccessEmails: true,
    });
    const leaderCom = leaderNav.find((g) => g.title === "Comunicação");
    expect(leaderCom?.items.some((i) => i.href === "/whatsapp")).toBe(true);
    expect(leaderCom?.items.some((i) => i.href === "/emails")).toBe(true);
  });

  it("hidesRoutesForUnavailableModules", () => {
    // Only agenda is active
    const nav = buildAccessibleNavGroups(["agenda"]);
    const allHrefs = nav.flatMap((g) => g.items.map((i) => i.href));

    expect(allHrefs).toContain("/calendar");
    expect(allHrefs).toContain("/events");
    expect(allHrefs).not.toContain("/schedules");
    expect(allHrefs).not.toContain("/availability");
    expect(allHrefs).not.toContain("/songs");
    expect(allHrefs).not.toContain("/announcements");
    expect(allHrefs).not.toContain("/tasks");
  });

  it("includes tasks route when tasks module is active", () => {
    const nav = buildAccessibleNavGroups(["tasks"]);
    const allHrefs = nav.flatMap((g) => g.items.map((i) => i.href));
    expect(allHrefs).toContain("/tasks");
  });

  it("keepsSettingsAccessibleWhenModuleIsOff", () => {
    // Even with 0 modules active, core pages (Visão geral, Pessoas, Departamentos) stay accessible
    const nav = buildAccessibleNavGroups([]);
    const allHrefs = nav.flatMap((g) => g.items.map((i) => i.href));

    expect(allHrefs).toContain("/");
    expect(allHrefs).toContain("/members");
    expect(allHrefs).toContain("/departments");
  });

  it("mobileNavigationUsesSameAccessProjection", () => {
    // With only agenda active, mobile nav keeps Início and Agenda, hides Escalas
    const items = buildAccessibleMobileNavItems(["agenda"]);
    const hrefs = items.map((i) => i.href);

    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/calendar");
    expect(hrefs).not.toContain("/schedules");
  });

  it("consolida grupos no menu mobile em até 4 seções sem grupos de 1 item", () => {
    const groups = buildAccessibleMobileMenuGroups(
      ["agenda", "schedules", "music", "announcements", "tasks", "rehearsals"],
      {
        canManageJobs: true,
        canAccessWhatsApp: true,
        canAccessEmails: true,
      },
    );

    expect(groups.map((g) => g.title)).toEqual([
      "Principal",
      "Cultos & Louvor",
      "Pessoas & Equipes",
      "Comunicação & Gestão",
    ]);
    for (const group of groups) {
      expect(group.items.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("Menu Explorar (variante A+C)", () => {
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

  it("prioriza atalhos úteis no mobile e nunca inclui WhatsApp ou Emails", () => {
    const links = buildMobileExploreQuickLinks([...ALL_MODULES], FULL_OPTIONS);

    expect(links.map((link) => link.href)).toEqual([
      "/schedules",
      "/availability",
      "/announcements",
      "/calendar",
      "/songs",
    ]);
    expect(
      links.some(
        (link) => link.href === "/whatsapp" || link.href === "/emails",
      ),
    ).toBe(false);
  });

  it("filtra atalhos por módulos desativados", () => {
    const links = buildMobileExploreQuickLinks(["agenda"]);

    expect(links.map((link) => link.href)).toEqual(["/calendar"]);
  });

  it("normaliza acentos e caixa na busca", () => {
    const routes = filterMobileExploreRoutes(
      "musicas",
      [...ALL_MODULES],
      FULL_OPTIONS,
    );
    expect(routes.map((route) => route.href)).toContain("/songs");
    expect(
      filterMobileExploreRoutes("DISPONIBILIDADE", [...ALL_MODULES]).map(
        (route) => route.href,
      ),
    ).toContain("/availability");
    const cultosRoutes = filterMobileExploreRoutes("cultos", [
      ...ALL_MODULES,
    ]).map((route) => route.href);
    expect(cultosRoutes).toContain("/calendar");
    expect(cultosRoutes).toContain("/schedules");
    expect(cultosRoutes).not.toContain("/events");
  });

  it("não vaza rotas bloqueadas por módulo ou permissão", () => {
    expect(
      filterMobileExploreRoutes("whatsapp", ["announcements"], {
        canAccessWhatsApp: false,
        canAccessEmails: false,
      }),
    ).toEqual([]);

    expect(
      filterMobileExploreRoutes("whatsapp", ["announcements"], FULL_OPTIONS).map(
        (route) => route.href,
      ),
    ).toEqual(["/whatsapp"]);

    expect(
      filterMobileExploreRoutes("emails", ["announcements"], {
        canAccessWhatsApp: true,
        canAccessEmails: false,
      }),
    ).toEqual([]);
  });

  it("inclui Início, Bíblia e ações secundárias sem funções RSC", () => {
    const routes = filterMobileExploreRoutes("", [...ALL_MODULES], FULL_OPTIONS);

    expect(routes.map((route) => route.href)).toEqual(
      expect.arrayContaining(["/", "/bible", "/tasks", "/jobs"]),
    );
    expect(routes.every((route) => !("icon" in route))).toBe(true);
    expect(JSON.parse(JSON.stringify(routes))).toEqual(routes);
  });
});

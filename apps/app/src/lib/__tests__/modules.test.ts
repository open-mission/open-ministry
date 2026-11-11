import { describe, expect, it } from "bun:test";

import {
  AVAILABLE_MODULES,
  getSystemModule,
  SYSTEM_MODULES,
} from "@/lib/modules";
import {
  buildAccessibleMobileNavItems,
  buildAccessibleNavGroups,
} from "@/lib/modules/service";

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
    expect(musicMod?.navGroups[0]?.items[0]?.href).toBe("/dashboard/songs");

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
    expect(repertoGroup?.items.some((i) => i.href === "/dashboard/songs")).toBe(
      true,
    );

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
      repertoGroup[0]?.items.filter((i) => i.href === "/dashboard/songs").length,
    ).toBe(1);
  });

  it("injects operations nav group when canManageJobs option is true", () => {
    const adminNav = buildAccessibleNavGroups([], { canManageJobs: true });
    const titles = adminNav.map((g) => g.title);
    expect(titles).toContain("Operações");

    const opsGroup = adminNav.find((g) => g.title === "Operações");
    expect(opsGroup?.items.some((i) => i.href === "/dashboard/jobs")).toBe(true);
  });

  it("injects WhatsApp and Emails nav items in Comunicação group when permitted", () => {
    const defaultNav = buildAccessibleNavGroups(["announcements"], {
      canAccessWhatsApp: false,
      canAccessEmails: false,
    });
    const defaultCom = defaultNav.find((g) => g.title === "Comunicação");
    expect(
      defaultCom?.items.some((i) => i.href === "/dashboard/whatsapp") ?? false,
    ).toBe(false);
    expect(
      defaultCom?.items.some((i) => i.href === "/dashboard/emails") ?? false,
    ).toBe(false);

    const leaderNav = buildAccessibleNavGroups(["announcements"], {
      canAccessWhatsApp: true,
      canAccessEmails: true,
    });
    const leaderCom = leaderNav.find((g) => g.title === "Comunicação");
    expect(leaderCom?.items.some((i) => i.href === "/dashboard/whatsapp")).toBe(
      true,
    );
    expect(leaderCom?.items.some((i) => i.href === "/dashboard/emails")).toBe(
      true,
    );
  });

  it("hidesRoutesForUnavailableModules", () => {
    // Only agenda is active
    const nav = buildAccessibleNavGroups(["agenda"]);
    const allHrefs = nav.flatMap((g) => g.items.map((i) => i.href));

    expect(allHrefs).toContain("/dashboard/calendar");
    expect(allHrefs).toContain("/dashboard/events");
    expect(allHrefs).not.toContain("/dashboard/schedules");
    expect(allHrefs).not.toContain("/dashboard/availability");
    expect(allHrefs).not.toContain("/dashboard/songs");
    expect(allHrefs).not.toContain("/dashboard/announcements");
  });

  it("keepsSettingsAccessibleWhenModuleIsOff", () => {
    // Even with 0 modules active, core pages (Visão geral, Pessoas, Departamentos) stay accessible
    const nav = buildAccessibleNavGroups([]);
    const allHrefs = nav.flatMap((g) => g.items.map((i) => i.href));

    expect(allHrefs).toContain("/");
    expect(allHrefs).toContain("/dashboard/members");
    expect(allHrefs).toContain("/dashboard/departments");
  });

  it("mobileNavigationUsesSameAccessProjection", () => {
    // With only agenda active, mobile nav keeps Início and Agenda, hides Escalas
    const items = buildAccessibleMobileNavItems(["agenda"]);
    const hrefs = items.map((i) => i.href);

    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/dashboard/calendar");
    expect(hrefs).not.toContain("/dashboard/schedules");
  });
});

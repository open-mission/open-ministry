import { describe, expect, it } from "bun:test";

import {
  AVAILABLE_MODULES,
  getSystemModule,
  SYSTEM_MODULES,
} from "@/lib/modules";
import { buildAccessibleNavGroups } from "@/lib/modules/service";

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

  it("builds navigation groups without active modules", () => {
    const defaultNav = buildAccessibleNavGroups([]);
    const titles = defaultNav.map((g) => g.title);
    expect(titles).toContain("Principal");
    expect(titles).toContain("Cultos & Escalas");
    expect(titles).not.toContain("Repertório");
  });

  it("injects module nav groups dynamically when module is active", () => {
    const activeNav = buildAccessibleNavGroups(["music"]);
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

  it("injects WhatsApp nav item in Comunicação group when canAccessWhatsApp is true", () => {
    const defaultNav = buildAccessibleNavGroups([], { canAccessWhatsApp: false });
    const defaultCom = defaultNav.find((g) => g.title === "Comunicação");
    expect(
      defaultCom?.items.some((i) => i.href === "/dashboard/whatsapp"),
    ).toBe(false);

    const leaderNav = buildAccessibleNavGroups([], { canAccessWhatsApp: true });
    const leaderCom = leaderNav.find((g) => g.title === "Comunicação");
    expect(leaderCom?.items.some((i) => i.href === "/dashboard/whatsapp")).toBe(
      true,
    );
  });
});

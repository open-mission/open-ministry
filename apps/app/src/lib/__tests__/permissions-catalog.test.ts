import { describe, expect, it } from "bun:test";

import { AVAILABLE_MODULES, SYSTEM_MODULES } from "@/lib/modules/registry";
import type { ModuleKey } from "@/lib/modules/types";
import {
  isActionDelegable,
  isValidModuleAction,
  MODULE_KEYS,
  PERMISSION_CATALOG,
} from "@/lib/permissions/catalog";
import {
  buildDefaultOrganizationPermissionRows,
  DEFAULT_PERMISSION_POLICY,
} from "@/lib/permissions/defaults";

describe("Permissions and Module Catalog", () => {
  it("registersAllInitialModules", () => {
    const expectedKeys: ModuleKey[] = [
      "agenda",
      "schedules",
      "music",
      "announcements",
      "tasks",
      "rehearsals",
    ];

    expect(MODULE_KEYS).toHaveLength(6);
    expect([...MODULE_KEYS].sort()).toEqual([...expectedKeys].sort());

    const registeredKeys = Object.keys(SYSTEM_MODULES);
    expect(registeredKeys.sort()).toEqual([...expectedKeys].sort());

    const availableKeys = AVAILABLE_MODULES.map((m) => m.key);
    expect(availableKeys.sort()).toEqual([...expectedKeys].sort());

    // Verify routePrefixes on each system module
    expect(SYSTEM_MODULES.agenda.routePrefixes).toContain("/calendar");
    expect(SYSTEM_MODULES.agenda.routePrefixes).toContain("/events");
    expect(SYSTEM_MODULES.schedules.routePrefixes).toContain("/schedules");
    expect(SYSTEM_MODULES.schedules.routePrefixes).toContain("/availability");
    expect(SYSTEM_MODULES.music.routePrefixes).toContain("/songs");
    expect(SYSTEM_MODULES.announcements.routePrefixes).toContain("/announcements");
    expect(SYSTEM_MODULES.tasks.routePrefixes).toContain("/tasks");
    expect(SYSTEM_MODULES.rehearsals.routePrefixes).toContain("/rehearsals");
    expect(SYSTEM_MODULES.rehearsals.routePrefixes).toContain(
      "/rehearsals",
    );
    expect(SYSTEM_MODULES.rehearsals.name).toBe("Ensaios");
    expect(SYSTEM_MODULES.rehearsals.navGroups).toHaveLength(1);
    expect(SYSTEM_MODULES.rehearsals.navGroups[0]?.title).toBe("Ensaios");
    expect(SYSTEM_MODULES.rehearsals.navGroups[0]?.items).toEqual([
      expect.objectContaining({
        href: "/rehearsals",
        label: "Ensaios",
        exact: false,
      }),
    ]);
  });

  it("rejectsUnknownActions", () => {
    expect(isValidModuleAction("agenda", "read")).toBe(true);
    expect(isValidModuleAction("agenda", "createEvent")).toBe(true);
    expect(isValidModuleAction("agenda", "unknownAction" as any)).toBe(false);
    expect(isValidModuleAction("unknownModule" as any, "read" as any)).toBe(false);
  });

  it("memberDefaultsToReadModulesAndOwnAvailability", () => {
    const memberPolicy = DEFAULT_PERMISSION_POLICY.member;

    // Member has read on all modules
    expect(memberPolicy.agenda.read).toBe(true);
    expect(memberPolicy.schedules.read).toBe(true);
    expect(memberPolicy.music.read).toBe(true);
    expect(memberPolicy.announcements.read).toBe(true);
    expect(memberPolicy.tasks.read).toBe(true);
    expect(memberPolicy.tasks.createPersonal).toBe(true);
    expect(memberPolicy.tasks.createDepartment).toBe(false);
    expect(memberPolicy.tasks.createOrganization).toBe(false);
    expect(memberPolicy.rehearsals.read).toBe(true);
    expect(memberPolicy.rehearsals.createRehearsal).toBe(false);
    expect(memberPolicy.rehearsals.updateRehearsal).toBe(false);
    expect(memberPolicy.rehearsals.deleteRehearsal).toBe(false);
    expect(memberPolicy.rehearsals.manageAlerts).toBe(false);

    // Member has manageOwnAvailability in schedules
    expect(memberPolicy.schedules.manageOwnAvailability).toBe(true);

    // Member does not have write actions
    expect(memberPolicy.agenda.createEvent).toBe(false);
    expect(memberPolicy.agenda.updateEvent).toBe(false);
    expect(memberPolicy.agenda.deleteEvent).toBe(false);
    expect(memberPolicy.schedules.assign).toBe(false);
    expect(memberPolicy.schedules.editPlan).toBe(false);
    expect(memberPolicy.schedules.manageTemplates).toBe(false);
    expect(memberPolicy.music.createSong).toBe(false);
    expect(memberPolicy.music.updateSong).toBe(false);
    expect(memberPolicy.music.deleteSong).toBe(false);
    expect(memberPolicy.announcements.sendDepartment).toBe(false);
    expect(memberPolicy.announcements.sendPerson).toBe(false);
    expect(memberPolicy.announcements.sendAll).toBe(false);
    expect(memberPolicy.announcements.retryDelivery).toBe(false);
  });

  it("leaderMusicCreateDoesNotImplyOtherWrites", () => {
    const leaderPolicy = DEFAULT_PERMISSION_POLICY.leader;

    // Leader in music has createSong, but not updateSong or deleteSong
    expect(leaderPolicy.music.read).toBe(true);
    expect(leaderPolicy.music.createSong).toBe(true);
    expect(leaderPolicy.music.updateSong).toBe(false);
    expect(leaderPolicy.music.deleteSong).toBe(false);
  });

  it("onlyDepartmentActionsAreDelegable", () => {
    // Delegable actions: agenda CRUD, schedules assign/editPlan, announcements sendDepartment/sendPerson
    expect(isActionDelegable("agenda", "createEvent")).toBe(true);
    expect(isActionDelegable("agenda", "updateEvent")).toBe(true);
    expect(isActionDelegable("agenda", "deleteEvent")).toBe(true);
    expect(isActionDelegable("schedules", "assign")).toBe(true);
    expect(isActionDelegable("schedules", "editPlan")).toBe(true);
    expect(isActionDelegable("announcements", "sendDepartment")).toBe(true);
    expect(isActionDelegable("announcements", "sendPerson")).toBe(true);
    expect(isActionDelegable("tasks", "createDepartment")).toBe(true);
    expect(isActionDelegable("tasks", "update")).toBe(true);
    expect(isActionDelegable("tasks", "delete")).toBe(true);
    expect(isActionDelegable("rehearsals", "createRehearsal")).toBe(true);
    expect(isActionDelegable("rehearsals", "updateRehearsal")).toBe(true);
    expect(isActionDelegable("rehearsals", "deleteRehearsal")).toBe(true);
    expect(isActionDelegable("rehearsals", "manageAlerts")).toBe(true);

    // Non-delegable: church-wide, self, and music actions
    expect(isActionDelegable("agenda", "read")).toBe(false);
    expect(isActionDelegable("schedules", "read")).toBe(false);
    expect(isActionDelegable("schedules", "manageTemplates")).toBe(false);
    expect(isActionDelegable("schedules", "manageOwnAvailability")).toBe(false);
    expect(isActionDelegable("music", "read")).toBe(false);
    expect(isActionDelegable("music", "createSong")).toBe(false);
    expect(isActionDelegable("music", "updateSong")).toBe(false);
    expect(isActionDelegable("music", "deleteSong")).toBe(false);
    expect(isActionDelegable("announcements", "read")).toBe(false);
    expect(isActionDelegable("announcements", "sendAll")).toBe(false);
    expect(isActionDelegable("announcements", "retryDelivery")).toBe(false);
    expect(isActionDelegable("tasks", "read")).toBe(false);
    expect(isActionDelegable("tasks", "createPersonal")).toBe(false);
    expect(isActionDelegable("tasks", "createOrganization")).toBe(false);
    expect(isActionDelegable("rehearsals", "read")).toBe(false);
  });

  it("buildDefaultOrganizationPermissionRows creates repeatable policy rows", () => {
    const rows = buildDefaultOrganizationPermissionRows("org-123");
    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      expect(row.organizationId).toBe("org-123");
      expect(["admin", "leader", "member"]).toContain(row.role);
      expect(MODULE_KEYS).toContain(row.moduleKey);
      expect(typeof row.enabled).toBe("boolean");
    }

    const adminRows = rows.filter((r) => r.role === "admin");
    expect(adminRows.every((r) => r.enabled)).toBe(true);
  });
});

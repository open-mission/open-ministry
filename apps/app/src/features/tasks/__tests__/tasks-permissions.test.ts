import { describe, expect, it } from "bun:test";

import {
  isActionDelegable,
  isValidModuleAction,
  PERMISSION_CATALOG,
} from "@/lib/permissions/catalog";
import { DEFAULT_PERMISSION_POLICY } from "@/lib/permissions/defaults";

describe("Tasks Module Permissions & Governance", () => {
  it("defines all required tasks actions in catalog", () => {
    const actions = PERMISSION_CATALOG.tasks.actions;
    expect(actions.read).toBeDefined();
    expect(actions.createPersonal).toBeDefined();
    expect(actions.createDepartment).toBeDefined();
    expect(actions.createOrganization).toBeDefined();
    expect(actions.update).toBeDefined();
    expect(actions.delete).toBeDefined();

    expect(isValidModuleAction("tasks", "createPersonal")).toBe(true);
    expect(isValidModuleAction("tasks", "createDepartment")).toBe(true);
    expect(isValidModuleAction("tasks", "createOrganization")).toBe(true);
    expect(isValidModuleAction("tasks", "invalidAction" as any)).toBe(false);
  });

  it("enforces default role policy boundaries", () => {
    const adminPolicy = DEFAULT_PERMISSION_POLICY.admin.tasks;
    const leaderPolicy = DEFAULT_PERMISSION_POLICY.leader.tasks;
    const memberPolicy = DEFAULT_PERMISSION_POLICY.member.tasks;

    // Admin has full control
    expect(adminPolicy.read).toBe(true);
    expect(adminPolicy.createPersonal).toBe(true);
    expect(adminPolicy.createDepartment).toBe(true);
    expect(adminPolicy.createOrganization).toBe(true);
    expect(adminPolicy.update).toBe(true);
    expect(adminPolicy.delete).toBe(true);

    // Leader can create personal & department tasks, but not church-wide
    expect(leaderPolicy.read).toBe(true);
    expect(leaderPolicy.createPersonal).toBe(true);
    expect(leaderPolicy.createDepartment).toBe(true);
    expect(leaderPolicy.createOrganization).toBe(false);
    expect(leaderPolicy.update).toBe(true);
    expect(leaderPolicy.delete).toBe(true);

    // Member can create personal tasks, but cannot delegate to department or church
    expect(memberPolicy.read).toBe(true);
    expect(memberPolicy.createPersonal).toBe(true);
    expect(memberPolicy.createDepartment).toBe(false);
    expect(memberPolicy.createOrganization).toBe(false);
    expect(memberPolicy.update).toBe(true);
    expect(memberPolicy.delete).toBe(true);
  });

  it("marks only department actions as delegable", () => {
    expect(isActionDelegable("tasks", "createDepartment")).toBe(true);
    expect(isActionDelegable("tasks", "update")).toBe(true);
    expect(isActionDelegable("tasks", "delete")).toBe(true);

    expect(isActionDelegable("tasks", "read")).toBe(false);
    expect(isActionDelegable("tasks", "createPersonal")).toBe(false);
    expect(isActionDelegable("tasks", "createOrganization")).toBe(false);
  });
});

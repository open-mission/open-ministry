import { describe, expect, test } from "bun:test";
import { resolveTaskCapabilities } from "../lib/task-permissions";

describe("Tasks Module Per-Task Capabilities", () => {
  test("blocks admins from viewing or managing another user's private personal task", () => {
    const caps = resolveTaskCapabilities(
      {
        scope: "personal",
        createdById: "user-maria",
        assigneeId: "user-maria",
      },
      {
        userId: "user-admin",
        isAdmin: true,
        ledDepartmentIds: [],
        memberDepartmentIds: [],
        canCreateOrganization: true,
      },
    );

    expect(caps).toEqual({
      canView: false,
      canUpdateStatus: false,
      canEdit: false,
      canDelete: false,
      canPin: false,
      canReorder: false,
    });
  });

  test("allows delegated personal assignee to update status/pin/reorder, while keeping edit/delete with creator", () => {
    const assigneeCaps = resolveTaskCapabilities(
      {
        scope: "personal",
        createdById: "leader-1",
        assigneeId: "member-2",
      },
      {
        userId: "member-2",
        isAdmin: false,
      },
    );

    expect(assigneeCaps.canView).toBe(true);
    expect(assigneeCaps.canUpdateStatus).toBe(true);
    expect(assigneeCaps.canPin).toBe(true);
    expect(assigneeCaps.canReorder).toBe(true);
    expect(assigneeCaps.canEdit).toBe(false);
    expect(assigneeCaps.canDelete).toBe(false);
  });

  test("restricts shared department task edit/delete to creator or department leader, while members can complete", () => {
    const task = {
      scope: "department",
      departmentId: "dept-louvor",
      delegationType: "shared",
      createdById: "leader-1",
    };

    const memberCaps = resolveTaskCapabilities(task, {
      userId: "member-2",
      isAdmin: false,
      ledDepartmentIds: [],
      memberDepartmentIds: ["dept-louvor"],
    });

    expect(memberCaps.canView).toBe(true);
    expect(memberCaps.canUpdateStatus).toBe(true);
    expect(memberCaps.canEdit).toBe(false);
    expect(memberCaps.canDelete).toBe(false);

    const leaderCaps = resolveTaskCapabilities(task, {
      userId: "leader-other",
      isAdmin: false,
      ledDepartmentIds: ["dept-louvor"],
      memberDepartmentIds: ["dept-louvor"],
    });

    expect(leaderCaps.canEdit).toBe(true);
    expect(leaderCaps.canDelete).toBe(true);
  });

  test("isolates individual department child tasks from peer department members", () => {
    const childTask = {
      scope: "department",
      departmentId: "dept-louvor",
      delegationType: "individual",
      createdById: "leader-1",
      assigneeId: "member-target",
    };

    const peerCaps = resolveTaskCapabilities(childTask, {
      userId: "member-peer",
      isAdmin: false,
      ledDepartmentIds: [],
      memberDepartmentIds: ["dept-louvor"],
    });

    expect(peerCaps.canView).toBe(false);
    expect(peerCaps.canUpdateStatus).toBe(false);

    const targetCaps = resolveTaskCapabilities(childTask, {
      userId: "member-target",
      isAdmin: false,
      ledDepartmentIds: [],
      memberDepartmentIds: ["dept-louvor"],
    });

    expect(targetCaps.canView).toBe(true);
    expect(targetCaps.canUpdateStatus).toBe(true);
    expect(targetCaps.canDelete).toBe(false);
  });

  test("prevents non-admin members from mutating organization-wide tasks", () => {
    const orgTask = {
      scope: "organization",
      createdById: "admin-1",
    };

    const memberCaps = resolveTaskCapabilities(orgTask, {
      userId: "member-1",
      isAdmin: false,
      canCreateOrganization: false,
    });

    expect(memberCaps.canView).toBe(true);
    expect(memberCaps.canUpdateStatus).toBe(false);
    expect(memberCaps.canEdit).toBe(false);
    expect(memberCaps.canDelete).toBe(false);
  });
});

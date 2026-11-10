import { describe, expect, it } from "bun:test";

import { DEFAULT_PERMISSION_POLICY } from "@/lib/permissions/defaults";
import {
  evaluatePermission,
  type PermissionSnapshot,
} from "@/lib/permissions/evaluator";

describe("Server-Side Permission Evaluator (RBAC/ABAC)", () => {
  const baseAdminSnapshot: PermissionSnapshot = {
    moduleKey: "agenda",
    action: "createEvent",
    isOrganizationModuleEnabled: true,
    userRole: "admin",
    userId: "admin-user-1",
    userPersonId: "admin-person-1",
    policy: DEFAULT_PERMISSION_POLICY,
    scope: { departmentId: "dept-1" },
    departmentContext: {
      departmentId: "dept-1",
      departmentBelongsToOrganization: true,
      isModuleActiveInDepartment: true,
      isUserMember: true,
      isUserLeader: true,
      hasActiveGrant: false,
    },
  };

  const baseMemberSnapshot: PermissionSnapshot = {
    moduleKey: "agenda",
    action: "read",
    isOrganizationModuleEnabled: true,
    userRole: "member",
    userId: "member-user-1",
    userPersonId: "member-person-1",
    policy: DEFAULT_PERMISSION_POLICY,
    scope: { departmentId: "dept-1" },
    departmentContext: {
      departmentId: "dept-1",
      departmentBelongsToOrganization: true,
      isModuleActiveInDepartment: true,
      isUserMember: true,
      isUserLeader: false,
      hasActiveGrant: false,
    },
    userHasAnyActiveDepartmentForModule: true,
  };

  it("deniesGloballyDisabledModule", () => {
    // Disabled globally blocks everyone: admin, leader, member, and grants
    const adminCheck = evaluatePermission({
      ...baseAdminSnapshot,
      isOrganizationModuleEnabled: false,
    });
    expect(adminCheck).toBe(false);

    const leaderCheck = evaluatePermission({
      ...baseMemberSnapshot,
      action: "createEvent",
      isOrganizationModuleEnabled: false,
      departmentContext: {
        ...baseMemberSnapshot.departmentContext!,
        isUserLeader: true,
      },
    });
    expect(leaderCheck).toBe(false);

    const grantCheck = evaluatePermission({
      ...baseMemberSnapshot,
      action: "createEvent",
      isOrganizationModuleEnabled: false,
      departmentContext: {
        ...baseMemberSnapshot.departmentContext!,
        hasActiveGrant: true,
      },
    });
    expect(grantCheck).toBe(false);
  });

  it("requiresDepartmentMembershipAndLocalActivation", () => {
    // Denied if department module is locally inactive
    const locallyInactive = evaluatePermission({
      ...baseMemberSnapshot,
      action: "createEvent",
      departmentContext: {
        ...baseMemberSnapshot.departmentContext!,
        isModuleActiveInDepartment: false,
        isUserLeader: true,
      },
    });
    expect(locallyInactive).toBe(false);

    // Admin is also blocked if module is locally disabled for that department
    const adminLocallyInactive = evaluatePermission({
      ...baseAdminSnapshot,
      departmentContext: {
        ...baseAdminSnapshot.departmentContext!,
        isModuleActiveInDepartment: false,
      },
    });
    expect(adminLocallyInactive).toBe(false);

    // Non-admin who is not a member of the department is denied
    const nonMember = evaluatePermission({
      ...baseMemberSnapshot,
      action: "read",
      departmentContext: {
        ...baseMemberSnapshot.departmentContext!,
        isUserMember: false,
      },
    });
    expect(nonMember).toBe(false);
  });

  it("leaderIsScopedPerDepartment", () => {
    // User is leader in Department A -> can createEvent
    const inDeptA = evaluatePermission({
      ...baseMemberSnapshot,
      action: "createEvent",
      scope: { departmentId: "dept-A" },
      departmentContext: {
        departmentId: "dept-A",
        departmentBelongsToOrganization: true,
        isModuleActiveInDepartment: true,
        isUserMember: true,
        isUserLeader: true,
        hasActiveGrant: false,
      },
    });
    expect(inDeptA).toBe(true);

    // Same user is only a member in Department B -> CANNOT createEvent
    const inDeptB = evaluatePermission({
      ...baseMemberSnapshot,
      action: "createEvent",
      scope: { departmentId: "dept-B" },
      departmentContext: {
        departmentId: "dept-B",
        departmentBelongsToOrganization: true,
        isModuleActiveInDepartment: true,
        isUserMember: true,
        isUserLeader: false,
        hasActiveGrant: false,
      },
    });
    expect(inDeptB).toBe(false);
  });

  it("memberCanReadMusicButCannotCreate", () => {
    // Regular member can read music
    const canRead = evaluatePermission({
      ...baseMemberSnapshot,
      moduleKey: "music",
      action: "read",
      scope: undefined,
      departmentContext: undefined,
    });
    expect(canRead).toBe(true);

    // Regular member cannot create songs
    const canCreate = evaluatePermission({
      ...baseMemberSnapshot,
      moduleKey: "music",
      action: "createSong",
      scope: undefined,
      departmentContext: undefined,
      userHasActiveLedMusicDepartment: false,
    });
    expect(canCreate).toBe(false);
  });

  it("leaderCanCreateMusicOnlyInActiveLedDepartment", () => {
    // Leader with active led music department can create songs
    const leaderWithActiveMusicDept = evaluatePermission({
      ...baseMemberSnapshot,
      moduleKey: "music",
      action: "createSong",
      scope: undefined,
      departmentContext: undefined,
      userHasActiveLedMusicDepartment: true,
    });
    expect(leaderWithActiveMusicDept).toBe(true);

    // Leader of department where music is inactive cannot create songs
    const leaderWithoutActiveMusicDept = evaluatePermission({
      ...baseMemberSnapshot,
      moduleKey: "music",
      action: "createSong",
      scope: undefined,
      departmentContext: undefined,
      userHasActiveLedMusicDepartment: false,
    });
    expect(leaderWithoutActiveMusicDept).toBe(false);
  });

  it("grantCannotOverrideDisabledModule", () => {
    // Active grant cannot override globally disabled module
    const globalDisabled = evaluatePermission({
      ...baseMemberSnapshot,
      action: "createEvent",
      isOrganizationModuleEnabled: false,
      departmentContext: {
        ...baseMemberSnapshot.departmentContext!,
        hasActiveGrant: true,
      },
    });
    expect(globalDisabled).toBe(false);

    // Active grant cannot override locally disabled module
    const localDisabled = evaluatePermission({
      ...baseMemberSnapshot,
      action: "createEvent",
      isOrganizationModuleEnabled: true,
      departmentContext: {
        ...baseMemberSnapshot.departmentContext!,
        isModuleActiveInDepartment: false,
        hasActiveGrant: true,
      },
    });
    expect(localDisabled).toBe(false);

    // Active grant in an enabled module & department DOES grant permission
    const validGrant = evaluatePermission({
      ...baseMemberSnapshot,
      action: "createEvent",
      isOrganizationModuleEnabled: true,
      departmentContext: {
        ...baseMemberSnapshot.departmentContext!,
        isModuleActiveInDepartment: true,
        hasActiveGrant: true,
      },
    });
    expect(validGrant).toBe(true);
  });

  it("departmentlessEventDoesNotUseLeaderDefault", () => {
    // Event without department does not grant leader privileges
    const leaderOnDepartmentlessEvent = evaluatePermission({
      ...baseMemberSnapshot,
      moduleKey: "agenda",
      action: "updateEvent",
      scope: { eventId: "event-unlinked" },
      departmentContext: undefined,
      eventContext: {
        eventBelongsToOrganization: true,
        departmentIds: [],
        departments: [],
      },
    });
    // Non-admin member cannot update departmentless event
    expect(leaderOnDepartmentlessEvent).toBe(false);

    // But admin can update departmentless event
    const adminOnDepartmentlessEvent = evaluatePermission({
      ...baseAdminSnapshot,
      moduleKey: "agenda",
      action: "updateEvent",
      scope: { eventId: "event-unlinked" },
      departmentContext: undefined,
      eventContext: {
        eventBelongsToOrganization: true,
        departmentIds: [],
        departments: [],
      },
    });
    expect(adminOnDepartmentlessEvent).toBe(true);
  });

  it("unknownActionIsDenied", () => {
    const unknownAction = evaluatePermission({
      ...baseAdminSnapshot,
      action: "arbitraryNonExistentAction",
    });
    expect(unknownAction).toBe(false);
  });
});

import {
  MODULE_KEYS,
  PERMISSION_CATALOG,
  type ModuleActionMap,
  type ModuleKey,
  type PermissionRole,
} from "./catalog";

export type RoleModulePolicy<M extends ModuleKey> = Record<
  ModuleActionMap[M],
  boolean
>;

export type RolePermissionPolicy = {
  [M in ModuleKey]: RoleModulePolicy<M>;
};

export type FullPermissionPolicy = Record<
  PermissionRole,
  RolePermissionPolicy
>;

export const DEFAULT_PERMISSION_POLICY: FullPermissionPolicy = {
  admin: {
    agenda: {
      read: true,
      createEvent: true,
      updateEvent: true,
      deleteEvent: true,
    },
    schedules: {
      read: true,
      assign: true,
      editPlan: true,
      manageTemplates: true,
      manageOwnAvailability: true,
    },
    music: {
      read: true,
      createSong: true,
      updateSong: true,
      deleteSong: true,
    },
    announcements: {
      read: true,
      sendDepartment: true,
      sendPerson: true,
      sendAll: true,
      retryDelivery: true,
    },
    tasks: {
      read: true,
      createPersonal: true,
      createDepartment: true,
      createOrganization: true,
      update: true,
      delete: true,
    },
  },
  leader: {
    agenda: {
      read: true,
      createEvent: true,
      updateEvent: true,
      deleteEvent: true,
    },
    schedules: {
      read: true,
      assign: true,
      editPlan: true,
      manageTemplates: false,
      manageOwnAvailability: true,
    },
    music: {
      read: true,
      createSong: true,
      updateSong: false,
      deleteSong: false,
    },
    announcements: {
      read: true,
      sendDepartment: true,
      sendPerson: true,
      sendAll: false,
      retryDelivery: false,
    },
    tasks: {
      read: true,
      createPersonal: true,
      createDepartment: true,
      createOrganization: false,
      update: true,
      delete: true,
    },
  },
  member: {
    agenda: {
      read: true,
      createEvent: false,
      updateEvent: false,
      deleteEvent: false,
    },
    schedules: {
      read: true,
      assign: false,
      editPlan: false,
      manageTemplates: false,
      manageOwnAvailability: true,
    },
    music: {
      read: true,
      createSong: false,
      updateSong: false,
      deleteSong: false,
    },
    announcements: {
      read: true,
      sendDepartment: false,
      sendPerson: false,
      sendAll: false,
      retryDelivery: false,
    },
    tasks: {
      read: true,
      createPersonal: true,
      createDepartment: false,
      createOrganization: false,
      update: true,
      delete: true,
    },
  },
};

export type OrganizationRolePermissionSeedRow = {
  organizationId: string;
  role: PermissionRole;
  moduleKey: ModuleKey;
  action: string;
  enabled: boolean;
};

export function buildDefaultOrganizationPermissionRows(
  organizationId: string,
): OrganizationRolePermissionSeedRow[] {
  const rows: OrganizationRolePermissionSeedRow[] = [];
  const roles: PermissionRole[] = ["admin", "leader", "member"];

  for (const role of roles) {
    const policy = DEFAULT_PERMISSION_POLICY[role];
    for (const moduleKey of MODULE_KEYS) {
      const moduleActions = PERMISSION_CATALOG[moduleKey].actions;
      for (const actionKey of Object.keys(moduleActions)) {
        const enabled =
          (policy[moduleKey] as Record<string, boolean>)[actionKey] ?? false;
        rows.push({
          organizationId,
          role,
          moduleKey,
          action: actionKey,
          enabled,
        });
      }
    }
  }

  return rows;
}

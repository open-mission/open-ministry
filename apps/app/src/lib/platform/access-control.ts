import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

/** Permissões nativas do plugin admin + permissões exclusivas da plataforma. */
export const platformStatements = {
  ...defaultStatements,
  platform: [
    "access",
    "manage-integrations",
    "manage-plans",
    "manage-organizations",
    "manage-operators",
    "read-audit",
  ],
} as const;

export const platformAc = createAccessControl(platformStatements);

export const platformRoles = {
  /** Dono do SaaS: todas as permissões de admin e da plataforma. */
  super_admin: platformAc.newRole({
    user: [...defaultStatements.user],
    session: [...defaultStatements.session],
    platform: [...platformStatements.platform],
  }),
  /**
   * Admin de igreja (papel técnico usado apenas para impersonação de membro).
   * Nenhuma permissão de plataforma.
   */
  admin: platformAc.newRole({
    user: ["impersonate", "impersonate-admins"],
    session: [],
    platform: [],
  }),
  user: platformAc.newRole({
    user: [],
    session: [],
    platform: [],
  }),
};

export type PlatformPermission =
  (typeof platformStatements.platform)[number];

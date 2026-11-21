import { DomainSubtabsNav } from "@/components/app/domain-subtabs";
import { toSerializableSubtabs } from "@/components/app/domain-subtabs-data";
import { isUserLeaderInAnyDepartment } from "@/lib/departments";
import {
  getAccessibleDomainTabs,
  type DesktopDomainKey,
} from "@/lib/modules/nav";
import { getUserAccessibleModuleKeys } from "@/lib/modules/service";
import { requireOrganizationContext } from "@/lib/organizations";

const domainLabels: Record<DesktopDomainKey, string> = {
  cultos: "Cultos & Escalas",
  louvor: "Louvor",
  pessoas: "Pessoas",
  comunicacao: "Comunicação",
};

type DomainSubtabsContext = {
  organizationId: string;
  userId: string;
  isAdmin: boolean;
};

async function resolveContext(
  context?: DomainSubtabsContext,
): Promise<DomainSubtabsContext> {
  if (context) return context;

  const { organization, session, isAdmin } = await requireOrganizationContext();
  return {
    organizationId: organization.id,
    userId: session.user.id,
    isAdmin,
  };
}

export async function DomainSubtabs({
  domain,
  context,
}: {
  domain: DesktopDomainKey;
  context?: DomainSubtabsContext;
}) {
  const { organizationId, userId, isAdmin } = await resolveContext(context);

  const [activeModuleKeys, isLeader] = await Promise.all([
    getUserAccessibleModuleKeys(organizationId, userId, isAdmin),
    isAdmin
      ? Promise.resolve(false)
      : isUserLeaderInAnyDepartment(organizationId, userId),
  ]);

  const isAdminOrLeader = isAdmin || isLeader;

  const tabs = getAccessibleDomainTabs(domain, activeModuleKeys, {
    canAccessWhatsApp: isAdminOrLeader,
    canAccessEmails: isAdminOrLeader,
  });

  return (
    <DomainSubtabsNav
      domainLabel={domainLabels[domain]}
      tabs={toSerializableSubtabs(tabs)}
    />
  );
}

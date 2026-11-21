import type { NavItem } from "@/components/app/nav-config";
import type { DesktopSidebarItem } from "@/lib/modules/nav";

/** Dados serializáveis enviados do Server Component para o Client Component. */
export type DomainSubtabData = Pick<NavItem, "href" | "label" | "exact">;

/** LucideIcon é uma função: removida antes de cruzar o limite RSC. */
export function toSerializableSubtabs(tabs: NavItem[]): DomainSubtabData[] {
  return tabs.map(({ href, label, exact }) => ({ href, label, exact }));
}

/** Card serializável de domínio/ação do menu Explorar. */
export type MobileExploreDomainData = {
  key: string;
  href: string;
  label: string;
  exact: boolean;
  tabs: DomainSubtabData[];
  badge?: string;
};

/** Remove `icon` (função) e `matchPrefixes` dos itens antes do limite RSC. */
export function toSerializableExploreDomains(
  items: DesktopSidebarItem[],
): MobileExploreDomainData[] {
  return items.map((item) => ({
    key: item.domain ?? item.href,
    href: item.href,
    label: item.label,
    exact: item.exact,
    tabs: toSerializableSubtabs(item.tabs ?? []),
    ...(item.badge ? { badge: item.badge } : {}),
  }));
}

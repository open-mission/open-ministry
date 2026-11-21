import type { NavItem } from "@/components/app/nav-config";

/** Dados serializáveis enviados do Server Component para o Client Component. */
export type DomainSubtabData = Pick<NavItem, "href" | "label" | "exact">;

/** LucideIcon é uma função: removida antes de cruzar o limite RSC. */
export function toSerializableSubtabs(tabs: NavItem[]): DomainSubtabData[] {
  return tabs.map(({ href, label, exact }) => ({ href, label, exact }));
}

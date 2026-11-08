import { navGroups, type NavGroup } from "@/components/app/nav-config";
import { SYSTEM_MODULES } from "./registry";
import type { ModuleKey } from "./types";

/**
 * Constrói a lista combinada de grupos de navegação (Sidebar e MobileMenu)
 * injetando os itens/grupos dos módulos ativos.
 * Executa de forma segura no cliente ou no servidor.
 */
export function buildAccessibleNavGroups(
  activeModuleKeys: ModuleKey[] = [],
): NavGroup[] {
  // Copia os grupos base
  const result: NavGroup[] = navGroups.map((group) => ({
    title: group.title,
    items: [...group.items],
  }));

  for (const key of activeModuleKeys) {
    const mod = SYSTEM_MODULES[key];
    if (!mod) continue;

    for (const modGroup of mod.navGroups) {
      const existingGroup = result.find((g) => g.title === modGroup.title);
      if (existingGroup) {
        for (const item of modGroup.items) {
          if (!existingGroup.items.some((i) => i.href === item.href)) {
            existingGroup.items.push(item);
          }
        }
      } else {
        // Encontra uma posição elegante para novos grupos de módulos:
        // Se for "Repertório", posiciona logo após "Cultos & Escalas" (índice 2)
        const cultosIndex = result.findIndex(
          (g) => g.title === "Cultos & Escalas",
        );
        if (cultosIndex !== -1) {
          result.splice(cultosIndex + 1, 0, {
            title: modGroup.title,
            items: [...modGroup.items],
          });
        } else {
          result.push({
            title: modGroup.title,
            items: [...modGroup.items],
          });
        }
      }
    }
  }

  return result;
}

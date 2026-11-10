import {
  jobsNavGroup,
  mobileNavItems,
  navGroups,
  whatsappNavItem,
  type NavGroup,
  type NavItem,
} from "@/components/app/nav-config";
import { SYSTEM_MODULES } from "./registry";
import type { ModuleKey, SystemModule } from "./types";

/**
 * Determina se um item de navegação é liberado com base nas chaves de módulos ativos.
 * Rotas que não pertencem a nenhum prefixo de módulo são sempre permitidas.
 */
function isItemAllowed(
  itemHref: string,
  activeModuleKeys: ModuleKey[],
): boolean {
  for (const [modKey, modDef] of Object.entries(SYSTEM_MODULES) as [
    ModuleKey,
    SystemModule,
  ][]) {
    for (const prefix of modDef.routePrefixes) {
      if (itemHref === prefix || itemHref.startsWith(`${prefix}/`)) {
        return activeModuleKeys.includes(modKey);
      }
    }
  }
  return true;
}

/**
 * Constrói a lista combinada de grupos de navegação (Sidebar e MobileMenu)
 * filtrando itens conforme módulos ativos e injetando itens adicionais autorizados.
 */
export function buildAccessibleNavGroups(
  activeModuleKeys: ModuleKey[] = [],
  options?: {
    canManageJobs?: boolean;
    canAccessWhatsApp?: boolean;
  },
): NavGroup[] {
  // Filtra os itens dos grupos base segundo os módulos ativos
  const result: NavGroup[] = navGroups
    .map((group) => ({
      title: group.title,
      items: group.items.filter((item) =>
        isItemAllowed(item.href, activeModuleKeys),
      ),
    }))
    .filter((group) => group.items.length > 0);

  // Injeta grupos e itens dos módulos ativos adicionais (ex: repertório)
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

  // Se o usuário puder acessar WhatsApp (Admin ou Líder de departamento), adiciona no grupo Comunicação
  if (options?.canAccessWhatsApp) {
    const comGroup = result.find((g) => g.title === "Comunicação");
    if (comGroup) {
      if (!comGroup.items.some((i) => i.href === whatsappNavItem.href)) {
        comGroup.items.push(whatsappNavItem);
      }
    } else {
      result.push({
        title: "Comunicação",
        items: [whatsappNavItem],
      });
    }
  }

  // Se o usuário puder gerenciar tarefas (Admin ou Líder de departamento), adiciona a seção de Operações
  if (options?.canManageJobs) {
    result.push({
      title: jobsNavGroup.title,
      items: [...jobsNavGroup.items],
    });
  }

  return result;
}

/**
 * Constrói a lista de itens da barra de navegação móvel inferior,
 * filtrando rotas cujos módulos não estejam liberados.
 */
export function buildAccessibleMobileNavItems(
  activeModuleKeys: ModuleKey[] = [],
): NavItem[] {
  return mobileNavItems.filter((item) =>
    isItemAllowed(item.href, activeModuleKeys),
  );
}

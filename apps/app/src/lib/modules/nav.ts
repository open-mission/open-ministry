import {
  emailsNavItem,
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
    canAccessEmails?: boolean;
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

  // Se o usuário puder acessar Emails (Admin ou Líder de departamento), adiciona no grupo Comunicação
  if (options?.canAccessEmails ?? options?.canAccessWhatsApp) {
    const comGroup = result.find((g) => g.title === "Comunicação");
    if (comGroup) {
      if (!comGroup.items.some((i) => i.href === emailsNavItem.href)) {
        comGroup.items.push(emailsNavItem);
      }
    } else {
      result.push({
        title: "Comunicação",
        items: [emailsNavItem],
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
 * Consolida os grupos acessíveis para o menu mobile em até 4 seções,
 * evitando grupos de 1 único item e excesso de rolagem na gaveta.
 */
export function buildAccessibleMobileMenuGroups(
  activeModuleKeys: ModuleKey[] = [],
  options?: {
    canManageJobs?: boolean;
    canAccessWhatsApp?: boolean;
    canAccessEmails?: boolean;
  },
): NavGroup[] {
  const rawGroups = buildAccessibleNavGroups(activeModuleKeys, options);
  const groupOrder: Array<{
    title: string;
    match: Set<string>;
  }> = [
    { title: "Principal", match: new Set(["Principal"]) },
    {
      title: "Cultos & Louvor",
      match: new Set(["Cultos & Escalas", "Repertório", "Ensaios"]),
    },
    {
      title: "Pessoas & Equipes",
      match: new Set(["Pessoas & Equipes"]),
    },
    {
      title: "Comunicação & Gestão",
      match: new Set(["Comunicação", "Operações"]),
    },
  ];

  const consolidated: NavGroup[] = [];
  const consumed = new Set<string>();

  for (const bucket of groupOrder) {
    const items = rawGroups
      .filter((group) => bucket.match.has(group.title))
      .flatMap((group) => {
        consumed.add(group.title);
        return group.items;
      });
    if (items.length > 0) {
      consolidated.push({ title: bucket.title, items });
    }
  }

  for (const group of rawGroups) {
    if (!consumed.has(group.title) && group.items.length > 0) {
      consolidated.push({ title: group.title, items: [...group.items] });
    }
  }

  return consolidated;
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

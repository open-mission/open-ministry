import {
  BookOpenIcon,
  CakeIcon,
  CalendarDaysIcon,
  CheckSquare2Icon,
  HandHeartIcon,
  LayersIcon,
  LayoutDashboardIcon,
  MailIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  Music2Icon,
  Music4Icon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

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

/** Domínios exibidos como item único na navegação desktop. */
export type DesktopDomainKey = "cultos" | "louvor" | "pessoas" | "comunicacao";

export type DesktopSidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
  domain?: DesktopDomainKey;
  tabs?: NavItem[];
  matchPrefixes?: string[];
  badge?: string;
};

export type DesktopSidebarNavigation = {
  primary: DesktopSidebarItem[];
  secondary: DesktopSidebarItem[];
};

export type DesktopSidebarOptions = {
  canManageJobs?: boolean;
  canAccessWhatsApp?: boolean;
  canAccessEmails?: boolean;
};

const desktopDomainTabs: Record<DesktopDomainKey, NavItem[]> = {
  cultos: [
    {
      href: "/calendar",
      label: "Agenda",
      icon: CalendarDaysIcon,
      exact: false,
    },
  ],
  louvor: [
    { href: "/songs", label: "Músicas", icon: Music2Icon, exact: false },
    {
      href: "/rehearsals",
      label: "Ensaios",
      icon: Music4Icon,
      exact: false,
    },
  ],
  pessoas: [
    { href: "/members", label: "Pessoas", icon: UsersIcon, exact: false },
    {
      href: "/birthdays",
      label: "Aniversariantes",
      icon: CakeIcon,
      exact: false,
    },
  ],
  comunicacao: [
    {
      href: "/announcements",
      label: "Avisos",
      icon: MegaphoneIcon,
      exact: false,
    },
    {
      href: "/whatsapp",
      label: "WhatsApp",
      icon: MessageSquareIcon,
      exact: false,
    },
    { href: "/emails", label: "Emails", icon: MailIcon, exact: false },
  ],
};

const desktopDomainConfig: {
  key: DesktopDomainKey;
  label: string;
  icon: LucideIcon;
  /**
   * Rotas legadas do domínio que deixaram de ser sub-abas mas continuam
   * válidas por deep link; mantêm o domínio destacado na navegação.
   */
  matchAliases?: string[];
}[] = [
  {
    key: "cultos",
    label: "Cultos & Escalas",
    icon: CalendarDaysIcon,
    matchAliases: ["/events", "/schedules"],
  },
  { key: "louvor", label: "Louvor", icon: Music2Icon },
  { key: "pessoas", label: "Pessoas", icon: UsersIcon },
  { key: "comunicacao", label: "Comunicação", icon: MegaphoneIcon },
];

/**
 * Abas acessíveis de um domínio desktop. WhatsApp e Emails não são módulos do
 * sistema: são liberados por permissão e, por isso, dependem das options.
 */
export function getAccessibleDomainTabs(
  domain: DesktopDomainKey,
  activeModuleKeys: ModuleKey[] = [],
  options?: DesktopSidebarOptions,
): NavItem[] {
  return desktopDomainTabs[domain].filter((item) => {
    if (item.href === "/whatsapp") return options?.canAccessWhatsApp === true;
    if (item.href === "/emails") return options?.canAccessEmails === true;
    return isItemAllowed(item.href, activeModuleKeys);
  });
}

/** Navegação desktop em dois níveis: itens primários e ações secundárias. */
export function buildDesktopSidebarNavigation(
  activeModuleKeys: ModuleKey[] = [],
  options?: DesktopSidebarOptions,
): DesktopSidebarNavigation {
  const domains: DesktopSidebarItem[] = [];

  for (const config of desktopDomainConfig) {
    const tabs = getAccessibleDomainTabs(
      config.key,
      activeModuleKeys,
      options,
    );
    if (tabs.length === 0) continue;

    const aliasPrefixes = (config.matchAliases ?? []).filter((href) =>
      isItemAllowed(href, activeModuleKeys),
    );

    domains.push({
      href: tabs[0]!.href,
      label: config.label,
      icon: config.icon,
      exact: false,
      domain: config.key,
      tabs,
      matchPrefixes: [
        ...tabs.map((tab) => tab.href),
        ...aliasPrefixes.filter(
          (href) => !tabs.some((tab) => tab.href === href),
        ),
      ],
      ...(tabs.length > 1 ? { badge: String(tabs.length) } : {}),
    });
  }

  const departmentsItem: DesktopSidebarItem = {
    href: "/departments",
    label: "Departamentos",
    icon: HandHeartIcon,
    exact: false,
    matchPrefixes: activeModuleKeys.includes("schedules")
      ? ["/departments", "/availability"]
      : ["/departments"],
  };

  const cultosIndex = domains.findIndex((item) => item.domain === "cultos");
  const primaryDomains = [...domains];
  primaryDomains.splice(cultosIndex >= 0 ? cultosIndex + 1 : 0, 0, departmentsItem);

  const primary: DesktopSidebarItem[] = [
    { href: "/", label: "Início", icon: LayoutDashboardIcon, exact: true },
    ...primaryDomains,
    { href: "/bible", label: "Bíblia", icon: BookOpenIcon, exact: false },
  ];

  const secondary: DesktopSidebarItem[] = [];
  if (activeModuleKeys.includes("tasks")) {
    secondary.push({
      href: "/tasks",
      label: "Minhas tarefas",
      icon: CheckSquare2Icon,
      exact: false,
    });
  }
  if (options?.canManageJobs) {
    secondary.push({
      href: "/jobs",
      label: "Operações",
      icon: LayersIcon,
      exact: false,
      badge: "Admin",
    });
  }

  return { primary, secondary };
}

/** Rota plana usada pela busca e pelos atalhos do menu Explorar (mobile). */
export type MobileExploreRoute = {
  href: string;
  label: string;
  domainLabel: string;
  exact: boolean;
};

/** Prioridade dos atalhos rápidos exibidos no topo do menu Explorar. */
const mobileExploreQuickLinkHrefs = [
  "/schedules",
  "/availability",
  "/announcements",
  "/calendar",
  "/songs",
];

/**
 * Escalas saiu das sub-abas de Cultos e Disponibilidade passou para
 * Departamentos (em Sheet/Drawer), mas ambas as rotas continuam válidas e
 * pesquisáveis no menu Explorar quando o módulo de escalas está ativo.
 */
function withExploreSyntheticRoutes(
  routes: MobileExploreRoute[],
  activeModuleKeys: ModuleKey[],
): MobileExploreRoute[] {
  if (!activeModuleKeys.includes("schedules")) {
    return routes;
  }

  const additions: MobileExploreRoute[] = [];
  if (!routes.some((route) => route.href === "/schedules")) {
    additions.push({
      href: "/schedules",
      label: "Escalas",
      domainLabel: "Cultos & Escalas",
      exact: false,
    });
  }
  if (!routes.some((route) => route.href === "/availability")) {
    additions.push({
      href: "/availability",
      label: "Disponibilidade",
      domainLabel: "Departamentos",
      exact: false,
    });
  }

  return additions.length > 0 ? [...routes, ...additions] : routes;
}

function normalizeExploreText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Achata domínios e ações secundários em rotas serializáveis e sem ícones. */
function flattenExploreRoutes(
  navigation: DesktopSidebarNavigation,
): MobileExploreRoute[] {
  const routes: MobileExploreRoute[] = [];

  for (const item of navigation.primary) {
    if (item.tabs && item.tabs.length > 0) {
      for (const tab of item.tabs) {
        routes.push({
          href: tab.href,
          label: tab.label,
          domainLabel: item.label,
          exact: tab.exact,
        });
      }
      continue;
    }

    routes.push({
      href: item.href,
      label: item.label,
      domainLabel: item.label,
      exact: item.exact,
    });
  }

  for (const item of navigation.secondary) {
    routes.push({
      href: item.href,
      label: item.label,
      domainLabel: item.label,
      exact: item.exact,
    });
  }

  return routes;
}

/** Atalhos rápidos acessíveis, ordenados por utilidade no mobile. */
export function buildMobileExploreQuickLinks(
  activeModuleKeys: ModuleKey[] = [],
  options?: DesktopSidebarOptions,
): MobileExploreRoute[] {
  const byHref = new Map(
    withExploreSyntheticRoutes(
      flattenExploreRoutes(
        buildDesktopSidebarNavigation(activeModuleKeys, options),
      ),
      activeModuleKeys,
    ).map((route) => [route.href, route]),
  );

  return mobileExploreQuickLinkHrefs.flatMap((href) => {
    const route = byHref.get(href);
    return route ? [route] : [];
  });
}

/** Busca por label, domínio ou href, normalizando acentos e caixa. */
export function filterMobileExploreRoutes(
  query: string,
  activeModuleKeys: ModuleKey[] = [],
  options?: DesktopSidebarOptions,
): MobileExploreRoute[] {
  const routes = withExploreSyntheticRoutes(
    flattenExploreRoutes(
      buildDesktopSidebarNavigation(activeModuleKeys, options),
    ),
    activeModuleKeys,
  );
  const term = normalizeExploreText(query);

  if (!term) return routes;

  return routes.filter((route) =>
    [route.label, route.domainLabel, route.href].some((value) =>
      normalizeExploreText(value).includes(term),
    ),
  );
}

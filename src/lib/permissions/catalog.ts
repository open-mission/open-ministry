import type { ModuleKey } from "@/lib/modules/types";

export type { ModuleKey };

export const MODULE_KEYS: readonly ModuleKey[] = [
  "agenda",
  "schedules",
  "music",
  "announcements",
] as const;

export type PermissionRole = "admin" | "leader" | "member";

export type ActionScope = "organization" | "department" | "self";

export type ActionDefinition = {
  key: string;
  label: string;
  description: string;
  scope: ActionScope;
  delegable: boolean;
};

export type ModuleActionMap = {
  agenda: "read" | "createEvent" | "updateEvent" | "deleteEvent";
  schedules:
    | "read"
    | "assign"
    | "editPlan"
    | "manageTemplates"
    | "manageOwnAvailability";
  music: "read" | "createSong" | "updateSong" | "deleteSong";
  announcements:
    | "read"
    | "sendDepartment"
    | "sendPerson"
    | "sendAll"
    | "retryDelivery";
};

export type PermissionAction<M extends ModuleKey = ModuleKey> =
  ModuleActionMap[M];

export type ModuleDefinition<M extends ModuleKey = ModuleKey> = {
  key: M;
  name: string;
  description: string;
  actions: Record<ModuleActionMap[M], ActionDefinition>;
};

export const PERMISSION_CATALOG: {
  [M in ModuleKey]: ModuleDefinition<M>;
} = {
  agenda: {
    key: "agenda",
    name: "Agenda & Eventos",
    description: "Gestão do calendário, cultos, ensaios e programações da igreja.",
    actions: {
      read: {
        key: "read",
        label: "Visualizar agenda",
        description: "Permite visualizar cultos e eventos agendados.",
        scope: "organization",
        delegable: false,
      },
      createEvent: {
        key: "createEvent",
        label: "Criar eventos",
        description: "Permite agendar novos cultos e eventos.",
        scope: "department",
        delegable: true,
      },
      updateEvent: {
        key: "updateEvent",
        label: "Editar eventos",
        description: "Permite alterar datas, horários e detalhes de eventos.",
        scope: "department",
        delegable: true,
      },
      deleteEvent: {
        key: "deleteEvent",
        label: "Excluir eventos",
        description: "Permite remover eventos agendados.",
        scope: "department",
        delegable: true,
      },
    },
  },
  schedules: {
    key: "schedules",
    name: "Escalas & Liturgia",
    description: "Gestão de escalas de voluntários, planos de culto e disponibilidade.",
    actions: {
      read: {
        key: "read",
        label: "Visualizar escalas",
        description: "Permite consultar escalas e planos de culto.",
        scope: "organization",
        delegable: false,
      },
      assign: {
        key: "assign",
        label: "Escalar voluntários",
        description: "Permite alocar ou remover voluntários nas escalas.",
        scope: "department",
        delegable: true,
      },
      editPlan: {
        key: "editPlan",
        label: "Editar plano de culto",
        description: "Permite criar e alterar a ordem do culto e momentos.",
        scope: "department",
        delegable: true,
      },
      manageTemplates: {
        key: "manageTemplates",
        label: "Gerenciar modelos de plano",
        description: "Permite salvar e excluir modelos globais de plano de culto.",
        scope: "organization",
        delegable: false,
      },
      manageOwnAvailability: {
        key: "manageOwnAvailability",
        label: "Gerenciar própria disponibilidade",
        description: "Permite cadastrar suas próprias datas de indisponibilidade.",
        scope: "self",
        delegable: false,
      },
    },
  },
  music: {
    key: "music",
    name: "Música & Repertório",
    description: "Banco de canções, cifras, letras e arranjos da igreja.",
    actions: {
      read: {
        key: "read",
        label: "Visualizar repertório",
        description: "Permite consultar canções, cifras e letras.",
        scope: "organization",
        delegable: false,
      },
      createSong: {
        key: "createSong",
        label: "Cadastrar músicas",
        description: "Permite adicionar novas músicas ao repertório da igreja.",
        scope: "organization",
        delegable: false,
      },
      updateSong: {
        key: "updateSong",
        label: "Editar músicas",
        description: "Permite editar tom, cifra, letra e links de músicas.",
        scope: "organization",
        delegable: false,
      },
      deleteSong: {
        key: "deleteSong",
        label: "Excluir músicas",
        description: "Permite remover músicas do repertório.",
        scope: "organization",
        delegable: false,
      },
    },
  },
  announcements: {
    key: "announcements",
    name: "Avisos & Notificações",
    description: "Envio de comunicados em massa e notificações individuais.",
    actions: {
      read: {
        key: "read",
        label: "Visualizar avisos",
        description: "Permite acessar o console e histórico de avisos.",
        scope: "organization",
        delegable: false,
      },
      sendDepartment: {
        key: "sendDepartment",
        label: "Enviar aviso para departamento",
        description: "Permite enviar notificações para departamentos liderados.",
        scope: "department",
        delegable: true,
      },
      sendPerson: {
        key: "sendPerson",
        label: "Enviar aviso individual",
        description: "Permite enviar notificação para membros do departamento.",
        scope: "department",
        delegable: true,
      },
      sendAll: {
        key: "sendAll",
        label: "Enviar aviso para toda a igreja",
        description: "Permite disparar avisos para todos os membros da igreja.",
        scope: "organization",
        delegable: false,
      },
      retryDelivery: {
        key: "retryDelivery",
        label: "Reenviar mensagens com falha",
        description: "Permite reprocessar envios pendentes ou com falha.",
        scope: "organization",
        delegable: false,
      },
    },
  },
};

export function isValidModule(key: string): key is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(key);
}

export function isValidModuleAction<M extends ModuleKey>(
  moduleKey: string,
  action: string,
): action is PermissionAction<M> {
  if (!isValidModule(moduleKey)) return false;
  const mod = PERMISSION_CATALOG[moduleKey];
  return Boolean(mod && action in mod.actions);
}

export function isActionDelegable(
  moduleKey: ModuleKey,
  action: string,
): boolean {
  if (!isValidModule(moduleKey)) return false;
  const mod = PERMISSION_CATALOG[moduleKey];
  const act = (mod.actions as Record<string, ActionDefinition>)[action];
  return Boolean(act?.delegable);
}

export function getActionScope(
  moduleKey: ModuleKey,
  action: string,
): ActionScope | null {
  if (!isValidModule(moduleKey)) return null;
  const mod = PERMISSION_CATALOG[moduleKey];
  const act = (mod.actions as Record<string, ActionDefinition>)[action];
  return act ? act.scope : null;
}

export interface ReleaseFeature {
  title: string;
  description: string;
  iconName:
    | "CheckSquare2Icon"
    | "LayoutDashboardIcon"
    | "KanbanIcon"
    | "SmartphoneIcon"
    | "BellIcon"
    | "SparklesIcon"
    | "MusicIcon"
    | "CalendarDaysIcon"
    | "UsersIcon"
    | "ShieldCheckIcon"
    | "HeartHandshakeIcon";
  badge?: string;
}

export interface ReleaseModuleGroup {
  moduleName: string;
  badge?: string;
  features: ReleaseFeature[];
}

export interface ReleaseNote {
  version: string;
  title: string;
  subtitle: string;
  releaseDate: string;
  isLatest?: boolean;
  moduleGroups: ReleaseModuleGroup[];
}

export const CURRENT_APP_VERSION = "1.1.0";

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.1.0",
    title: "Módulo de Tarefas & Gestão de Produtividade",
    subtitle: "Organize seus afazeres pessoais, rotinas de estudo e delegue demandas ministeriais para equipes e departamentos.",
    releaseDate: "12 de novembro de 2026",
    isLatest: true,
    moduleGroups: [
      {
        moduleName: "Módulo de Tarefas & Demandas",
        badge: "Novo Módulo",
        features: [
          {
            title: "Nova Gestão de Afazeres",
            description:
              "Crie tarefas pessoais ou delegue para departamentos e membros da igreja, com prioridades, prazos, datas e links anexos.",
            iconName: "CheckSquare2Icon",
            badge: "Novo",
          },
          {
            title: "Widget de Tarefas na Home",
            description:
              "Acompanhe suas tarefas do dia e conclua afazeres com checkbox interativo em tempo real diretamente da tela inicial.",
            iconName: "LayoutDashboardIcon",
            badge: "Destaque",
          },
          {
            title: "Múltiplas Visualizações",
            description:
              "Alterne dinamicamente entre Lista focada de afazeres, Quadro Kanban por status e Tabela completa para acompanhar seu fluxo.",
            iconName: "KanbanIcon",
          },
          {
            title: "Experiência Mobile com Gaveta (Drawer)",
            description:
              "Formulários e detalhes adaptados em gavetas inferiores fluidas e quadro Kanban com rolagem horizontal suave no celular.",
            iconName: "SmartphoneIcon",
            badge: "Mobile",
          },
          {
            title: "Notificações & Histórico de Auditoria",
            description:
              "Receba notificações push instantâneas quando uma tarefa for atribuída a você e consulte o histórico transparente de cada alteração.",
            iconName: "BellIcon",
          },
        ],
      },
      {
        moduleName: "Módulo de Músicas & Repertório",
        badge: "Aprimorado",
        features: [
          {
            title: "Transposer de Tons e Cifras",
            description:
              "Transposição automática de tom e cifras musicais com suporte a acordes invertidos, notas de baixo e capotraste.",
            iconName: "MusicIcon",
          },
          {
            title: "Streaming e Links de Ensaio",
            description:
              "Acesso rápido a links de busca no YouTube, YouTube Music e Spotify para preparação da equipe de louvor.",
            iconName: "SparklesIcon",
          },
        ],
      },
      {
        moduleName: "Cuidado Pastoral & Plataforma",
        badge: "Geral",
        features: [
          {
            title: "Termômetro Pastoral & Felicitômetro",
            description:
              "Visão consolidada do bem-estar emocional e espiritual da liderança e voluntários da igreja.",
            iconName: "HeartHandshakeIcon",
          },
          {
            title: "Navegação Rápida & PWA",
            description:
              "Navegação fluida sem recarregar a página e suporte completo a instalação como aplicativo no celular ou computador.",
            iconName: "ShieldCheckIcon",
          },
        ],
      },
    ],
  },
];

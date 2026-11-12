export interface ReleaseFeature {
  title: string;
  description: string;
  iconName: "CheckSquare2Icon" | "LayoutDashboardIcon" | "KanbanIcon" | "SmartphoneIcon" | "BellIcon" | "SparklesIcon";
  badge?: string;
}

export interface ReleaseNote {
  version: string;
  title: string;
  subtitle: string;
  releaseDate: string;
  isLatest?: boolean;
  features: ReleaseFeature[];
}

export const CURRENT_APP_VERSION = "1.1.0";

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.1.0",
    title: "Módulo de Tarefas & Produtividade Ministerial",
    subtitle: "Organize seus afazeres pessoais, rotinas de estudo e delegue demandas ministeriais para equipes e departamentos.",
    releaseDate: "12 de novembro de 2026",
    isLatest: true,
    features: [
      {
        title: "Gestão Completa de Tarefas",
        description:
          "Crie afazeres pessoais ou delegue para departamentos e membros da igreja, com prioridades, prazos, datas e links anexos.",
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
          "Alterne dinamicamente entre Lista focada (estilo Things 3), Quadro Kanban e Tabela completa para acompanhar seu fluxo.",
        iconName: "KanbanIcon",
      },
      {
        title: "Experiência Mobile Otimizada",
        description:
          "Formulários e detalhes adaptados em bottom-sheets fluidas (Drawer) e board Kanban com rolagem horizontal nos smartphones.",
        iconName: "SmartphoneIcon",
        badge: "Mobile",
      },
      {
        title: "Notificações & Histórico de Auditoria",
        description:
          "Receba notificações push quando uma tarefa for atribuída a você e consulte o histórico transparente de todas as alterações.",
        iconName: "BellIcon",
      },
    ],
  },
  {
    version: "1.0.3",
    title: "Cuidado Pastoral & Felicitômetro",
    subtitle: "Acompanhamento emocional e espiritual da equipe ministerial e membros voluntários.",
    releaseDate: "28 de outubro de 2026",
    features: [
      {
        title: "Check-in Diário de Humor",
        description:
          "Registro rápido do humor da liderança com notas de reflexão e oração.",
        iconName: "SparklesIcon",
      },
    ],
  },
];

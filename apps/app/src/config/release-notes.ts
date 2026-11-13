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

export const CURRENT_APP_VERSION = "1.1.4";

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.1.4",
    title: "Personalização de Funções por Evento e Escalas Sob Medida",
    subtitle:
      "Defina exatamente quais funções de cada departamento atuam em cada culto ou evento, com suporte a séries recorrentes e ajustes independentes.",
    releaseDate: "13 de novembro de 2026",
    isLatest: true,
    moduleGroups: [
      {
        moduleName: "Módulo de Cultos, Eventos & Escalas",
        badge: "Novidade",
        features: [
          {
            title: "Funções Personalizadas por Evento",
            description:
              "Agora você pode escolher exatamente quais funções de cada departamento serão necessárias para cada culto. Por exemplo, no ministério de Mídia, é possível ativar apenas Projeção e Transmissão ao vivo em um culto, sem exigir funções não utilizadas.",
            iconName: "CalendarDaysIcon",
            badge: "Novo",
          },
          {
            title: "Séries Recorrentes Flexíveis",
            description:
              "Ao criar cultos recorrentes, as funções escolhidas são aplicadas a todas as ocorrências. Se um culto específico precisar de uma formação diferente, você pode editar apenas aquele encontro sem afetar os outros.",
            iconName: "UsersIcon",
          },
          {
            title: "Escalas e Cobertura Inteligentes",
            description:
              "O editor de escalas agora exibe apenas as funções ativas do evento. Os indicadores de cobertura calculam o preenchimento sem cobrar vagas desnecessárias, e funções desmarcadas são limpas com segurança.",
            iconName: "CheckSquare2Icon",
          },
        ],
      },
    ],
  },
  {
    version: "1.1.1",
    title: "Aprimoramentos de Usabilidade Mobile e Escalas",
    subtitle: "Melhorias de navegação em dispositivos móveis no módulo de Tarefas, menus em gaveta e ajustes visuais nas Escalas.",
    releaseDate: "12 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Módulo de Tarefas & Demandas",
        badge: "Melhorias Mobile",
        features: [
          {
            title: "Ações em Gaveta no Celular",
            description:
              "Ao tocar nas opções de qualquer tarefa no celular, as ações agora abrem em uma gaveta inferior espaçosa e fácil de usar, em vez de pequenos menus flutuantes.",
            iconName: "SmartphoneIcon",
            badge: "Mobile",
          },
          {
            title: "Reordenação com Toque Longo",
            description:
              "Reorganize suas tarefas com facilidade tocando e segurando no próprio item, com uma experiência de arrastar e soltar muito mais intuitiva e sem botões confusos.",
            iconName: "CheckSquare2Icon",
          },
          {
            title: "Histórico de Auditoria Responsivo",
            description:
              "O histórico completo de alterações das tarefas agora conta com visualização adaptada para telas móveis, garantindo transparência em qualquer dispositivo.",
            iconName: "ShieldCheckIcon",
          },
        ],
      },
      {
        moduleName: "Módulo de Escalas & Voluntários",
        badge: "Ajuste Visual",
        features: [
          {
            title: "Visualização Fluida de Cobertura",
            description:
              "Os cartões de cobertura por departamento foram aprimorados para evitar qualquer corte ou vazamento lateral na tela do celular, com quebra harmoniosa de datas e funções.",
            iconName: "CalendarDaysIcon",
          },
        ],
      },
    ],
  },
  {
    version: "1.1.0",
    title: "Módulo de Tarefas & Gestão de Produtividade",
    subtitle: "Organize seus afazeres pessoais, rotinas de estudo e delegue demandas ministeriais para equipes e departamentos.",
    releaseDate: "12 de novembro de 2026",
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

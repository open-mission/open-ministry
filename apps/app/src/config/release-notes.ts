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

export const CURRENT_APP_VERSION = "1.2.1";

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.2.1",
    title: "Escalas Mais Fluidas no Celular, Gestão de Cultos e Modelos de Liturgia",
    subtitle:
      "Gavetas deslizantes para escalação rápida e compartilhamento em smartphones, modelos reutilizáveis de liturgia e piso tipográfico aprimorado.",
    releaseDate: "15 de novembro de 2026",
    isLatest: true,
    moduleGroups: [
      {
        moduleName: "Módulo de Escalas, Cultos & Cronograma",
        badge: "Usabilidade & Mobile",
        features: [
          {
            title: "Escalação Rápida e Diálogos em Gaveta (Drawer)",
            description:
              "Modais de escalação rápida de voluntários, compartilhamento público do plano de culto e exclusão segura agora abrem como gavetas deslizantes no celular, ideais para o manuseio rápido no templo.",
            iconName: "CalendarDaysIcon",
            badge: "Mobile",
          },
          {
            title: "Modelos Reutilizáveis de Liturgia",
            description:
              "Salve e aplique ordens de culto completas com diálogos adaptados e confirmações seguras, agilizando o planejamento semanal da equipe ministerial.",
            iconName: "SparklesIcon",
          },
          {
            title: "Legibilidade e Piso Tipográfico Refinado",
            description:
              "Fontes ajustadas para no mínimo 11px em badges de sobretempo, cifras musicais, tons e blocos de calendário, garantindo clareza para equipes técnicas e pastorais.",
            iconName: "SmartphoneIcon",
          },
          {
            title: "Arquitetura Centralizada e Mais Rápida",
            description:
              "Eliminação de código redundante e centralização dos componentes de eventos, garantindo transições mais fluidas e carregamento ágil.",
            iconName: "ShieldCheckIcon",
          },
        ],
      },
    ],
  },
  {
    version: "1.2.0",
    title: "Experiência Mobile, Acessibilidade e Integração WhatsApp",
    subtitle:
      "Gavetas deslizantes e diálogos responsivos em smartphones, tipografia aprimorada, tela sempre ativa no louvor, máscaras de telefone e integração com WhatsApp.",
    releaseDate: "15 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Músicas & Repertório de Louvor",
        badge: "Novo",
        features: [
          {
            title: "Tela Sempre Ativa no Louvor (Wake Lock)",
            description:
              "A tela do dispositivo não bloqueia nem apaga durante os ensaios e cultos, garantindo leitura ininterrupta das letras e cifras.",
            iconName: "MusicIcon",
            badge: "Palco & Ensaio",
          },
          {
            title: "Tamanho de Fonte Dinâmico e Atalhos",
            description:
              "Ajuste rápido do tamanho do texto das cifras na barra superior e atalhos práticos de teclado para navegação veloz entre canções.",
            iconName: "MusicIcon",
          },
          {
            title: "Indicador de Recência de Músicas",
            description:
              "Destaque visual para canções tocadas recentemente no repertório, auxiliando a equipe a diversificar as seleções musicais.",
            iconName: "SparklesIcon",
          },
        ],
      },
      {
        moduleName: "Departamentos & Ministérios",
        badge: "Acessibilidade",
        features: [
          {
            title: "Diálogos e Confirmações Responsivas",
            description:
              "Modais de edição, liderança e confirmações de exclusão adaptam-se automaticamente como gavetas inferiores deslizantes no celular e caixas elegantes no computador.",
            iconName: "UsersIcon",
          },
          {
            title: "Permissões e Papéis Humanizados",
            description:
              "Linguagem pastoral clara para entender e atribuir responsabilidades e permissões de acesso aos líderes de cada ministério.",
            iconName: "ShieldCheckIcon",
          },
        ],
      },
      {
        moduleName: "Painel Inicial & Membros",
        badge: "Cuidado Pastoral",
        features: [
          {
            title: "Parabéns por WhatsApp com 1 Toque",
            description:
              "Envio de mensagens calorosas de aniversário diretamente para o WhatsApp do aniversariante com sanitização automática do número.",
            iconName: "HeartHandshakeIcon",
          },
          {
            title: "Versículo do Dia Adaptativo",
            description:
              "Reflexão bíblica diária com leitura responsiva e confortável em qualquer tamanho de tela.",
            iconName: "SparklesIcon",
          },
        ],
      },
      {
        moduleName: "Autenticação, Convites & Onboarding",
        badge: "Usabilidade",
        features: [
          {
            title: "Anel de Conclusão de Cadastro em SVG",
            description:
              "Indicador de progresso ministerial 100% suave e contínuo, sem cortes ou imperfeições de renderização.",
            iconName: "SparklesIcon",
          },
          {
            title: "Máscara Dinâmica de Telefone e Acessibilidade",
            description:
              "Formatação automática de telefone padrão brasileiro (DD) 99999-9999 nos convites, botão acessível de exibir senha e alvos de toque confortáveis.",
            iconName: "SmartphoneIcon",
          },
        ],
      },
      {
        moduleName: "Avisos, Notificações & WhatsApp",
        badge: "Comunicação",
        features: [
          {
            title: "Detalhes de Mensagens e Logs em Gaveta Mobile",
            description:
              "Consulta completa dos detalhes de avisos e mensagens de WhatsApp em gavetas deslizantes nos smartphones.",
            iconName: "BellIcon",
          },
          {
            title: "Comunicação Humanizada e Prevenção de Falhas",
            description:
              "Substituição de termos técnicos por identificadores intuitivos, trava preventiva contra envios sem canais selecionados e confirmação de leitura ao vivo.",
            iconName: "SmartphoneIcon",
          },
        ],
      },
    ],
  },
  {
    version: "1.1.5",
    title: "Tarefas Mais Seguras, Rápidas e Adaptadas para Todo Dispositivo",
    subtitle:
      "Reforço de privacidade nas tarefas pessoais, criação rápida com prazos práticos, lembretes no horário exato e navegação mais estável.",
    releaseDate: "13 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Módulo de Tarefas & Demandas",
        badge: "Aprimoramento",
        features: [
          {
            title: "Privacidade e Permissões Mais Seguras",
            description:
              "Tarefas pessoais agora permanecem estritamente privadas entre quem criou e quem recebeu a tarefa, sem aparecer para terceiros. Atividades de departamentos e da igreja também respeitam o papel de líderes e membros.",
            iconName: "ShieldCheckIcon",
            badge: "Segurança",
          },
          {
            title: "Criação Rápida, Datas e Prazos Precisos",
            description:
              "Adicione tarefas em segundos com a nova barra rápida, escolha prazos com um toque (Hoje, Amanhã ou Próximo domingo), veja repetições em português claro e tenha horários sempre fiéis ao seu fuso horário.",
            iconName: "CheckSquare2Icon",
          },
          {
            title: "Visualizações Mais Claras e Responsivas",
            description:
              "Lista, quadro de status e tabela agora trazem progresso resumido das entregas individuais da equipe, cartões dedicados no celular, alteração direta de status nos detalhes e confirmação segura antes de excluir.",
            iconName: "KanbanIcon",
          },
          {
            title: "Lembretes Pontuais e Atalhos Diretos",
            description:
              "Os lembretes respeitam o horário configurado nas recorrências e levam diretamente para a tarefa ao abrir a notificação, além de exibir o histórico de alterações com nomes legíveis de pessoas e departamentos.",
            iconName: "BellIcon",
          },
        ],
      },
      {
        moduleName: "Estabilidade & Navegação",
        badge: "Plataforma",
        features: [
          {
            title: "Navegação Protegida contra Extensões",
            description:
              "Falhas isoladas causadas por extensões externas do navegador (como gerenciadores de senhas) deixam de interromper a tela enquanto você usa o sistema.",
            iconName: "SparklesIcon",
          },
          {
            title: "Caminhos de Navegação Completos",
            description:
              "Os indicadores de localização no topo da tela agora exibem nomes claros em português para Tarefas, Avisos, Calendário e Processos em segundo plano.",
            iconName: "LayoutDashboardIcon",
          },
        ],
      },
    ],
  },
  {
    version: "1.1.4",
    title: "Personalização de Funções por Evento e Escalas Sob Medida",
    subtitle:
      "Defina exatamente quais funções de cada departamento atuam em cada culto ou evento, com suporte a séries recorrentes e ajustes independentes.",
    releaseDate: "13 de novembro de 2026",
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

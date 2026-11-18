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

export const CURRENT_APP_VERSION = "1.3.2";

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.3.2",
    title: "Abas de Departamento Mais Limpas no Mobile",
    subtitle:
      "Barra de navegação dos departamentos simplificada apenas com ícone e rótulo para economizar espaço na tela.",
    releaseDate: "18 de novembro de 2026",
    isLatest: true,
    moduleGroups: [
      {
        moduleName: "Departamentos & Navegação Mobile",
        badge: "Usabilidade & UI",
        features: [
          {
            title: "Navegação Sem Badges Redundantes",
            description:
              "As abas do departamento agora exibem apenas ícone e nome (Equipe & Funções, Configurações & Acesso e Ensaios), ganhando espaço horizontal no celular enquanto as contagens seguem visíveis na lista e dentro de cada aba.",
            iconName: "SmartphoneIcon",
            badge: "Mobile",
          },
        ],
      },
    ],
  },
  {
    version: "1.3.1",
    title: "Ajustes de Navegação Mobile e Legendas nos Departamentos",
    subtitle:
      "Rolagem horizontal suave nas abas dos departamentos em telas mobile e legendas descritivas nos contadores de membros, funções e ensaios.",
    releaseDate: "18 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Departamentos & Navegação Mobile",
        badge: "Usabilidade & UI",
        features: [
          {
            title: "Abas Adaptadas para Telas Pequenas",
            description:
              "A barra de abas do departamento agora conta com rolagem horizontal suave no celular, garantindo que a aba de Ensaios e outras abas não fiquem cortadas na tela.",
            iconName: "SmartphoneIcon",
            badge: "Mobile",
          },
          {
            title: "Contadores Autodescritivos",
            description:
              "Os indicadores das abas agora exibem legendas completas com contagem no singular e plural (ex.: 7 pessoas · 5 funções, 6 recursos, 0 ensaios).",
            iconName: "UsersIcon",
            badge: "Acessibilidade",
          },
        ],
      },
    ],
  },
  {
    version: "1.3.0",
    title: "Módulo de Ensaios por Departamento",
    subtitle:
      "Planeje ensaios dentro dos departamentos com setlist organizado, vínculo opcional a eventos do calendário e lembretes automáticos para a equipe.",
    releaseDate: "18 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Ensaios por Departamento",
        badge: "Novo Módulo",
        features: [
          {
            title: "Ensaios Opt-in no Departamento",
            description:
              "Ative o módulo de Ensaios em cada departamento para gerenciar datas, horários, local e observações sem poluir a agenda geral.",
            iconName: "CalendarDaysIcon",
            badge: "Novo",
          },
          {
            title: "Repertório e Setlist do Ensaio",
            description:
              "Selecione e ordene as músicas que serão passadas no ensaio com busca por tom, BPM e tags, além de notas por faixa.",
            iconName: "MusicIcon",
            badge: "Setlist",
          },
          {
            title: "Alertas Configuráveis e Lembretes Push",
            description:
              "Defina regras de antecedência por departamento (ex.: 2 dias antes e 2 horas antes) para avisar automaticamente os membros via notificação no app e Push.",
            iconName: "BellIcon",
            badge: "Lembretes",
          },
          {
            title: "Integração com Eventos e Calendário",
            description:
              "Vincule ensaios a eventos específicos, acompanhe badges de ensaio nas visões do calendário e acesse permissões granulares por perfil.",
            iconName: "ShieldCheckIcon",
          },
        ],
      },
    ],
  },
  {
    version: "1.2.4",
    title: "Push do PWA Sincronizado e Lembrete Diário do Felicitômetro",
    subtitle:
      "Diagnóstico e re-sincronização automática das notificações push no PWA, junto com o lembrete diário do Felicitômetro às 08:00.",
    releaseDate: "17 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Notificações Push & Felicitômetro",
        badge: "PWA & Lembretes",
        features: [
          {
            title: "Diagnóstico e Sincronização Automática no PWA",
            description:
              "Diagnóstico de notificações push nas configurações e re-sincronização automática do aparelho com o servidor quando a chave de envio mudar ou a inscrição se perder.",
            iconName: "BellIcon",
            badge: "Push",
          },
          {
            title: "Lembrete Diário do Felicitômetro às 08:00",
            description:
              "Aviso no app para ativar o lembrete diário das 08:00 do Felicitômetro no PWA e envio diário ajustado ao horário de Brasília sem repetições.",
            iconName: "HeartHandshakeIcon",
          },
        ],
      },
    ],
  },
  {
    version: "1.2.3",
    title: "Login Mais Seguro e Conta Protegida",
    subtitle:
      "Melhorias na proteção do acesso à sua conta, com reconhecimento mais preciso do aparelho e do navegador usados no login.",
    releaseDate: "16 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Segurança & Autenticação",
        badge: "Plataforma & Acesso",
        features: [
          {
            title: "Acesso Protegido em Todos os Aparelhos",
            description:
              "O sistema agora reconhece com mais precisão o aparelho e o navegador usados no seu login, reforçando a proteção da conta contra acessos indevidos.",
            iconName: "ShieldCheckIcon",
            badge: "Segurança",
          },
          {
            title: "Entrada na Conta Sem Interrupções",
            description:
              "Entrar na sua conta funciona de forma consistente no celular e no computador, com a proteção de acesso sempre ativa.",
            iconName: "ShieldCheckIcon",
          },
        ],
      },
    ],
  },
  {
    version: "1.2.2",
    title: "Tarefas Mais Fluidas no Celular, Privacidade Reforçada e Estabilidade",
    subtitle:
      "Correção da rolagem e organização dos botões nas gavetas de tarefas no celular, além de melhorias de privacidade, segurança e estabilidade.",
    releaseDate: "16 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Módulo de Tarefas & Demandas",
        badge: "Mobile & Usabilidade",
        features: [
          {
            title: "Rolagem Livre nos Detalhes e Formulários no Celular",
            description:
              "Corrigida a rolagem interna das gavetas de tarefas no celular para ler toda a descrição, prazos e responsáveis com conforto, sem o toque arrastar a janela por engano.",
            iconName: "SmartphoneIcon",
            badge: "Mobile",
          },
          {
            title: "Botões Organizados Sem Apertar o Conteúdo",
            description:
              "Ações secundárias (Histórico e Excluir) passaram para o final da rolagem da tarefa no celular, mantendo o rodapé limpo com as ações principais sempre acessíveis.",
            iconName: "CheckSquare2Icon",
          },
        ],
      },
      {
        moduleName: "Privacidade, Segurança & Estabilidade",
        badge: "Infra & Qualidade",
        features: [
          {
            title: "Proteção de Dados Pessoais na Telemetria",
            description:
              "Registros de diagnóstico e gravações de sessão agora mascaram automaticamente textos, e-mails e dados sensíveis antes de qualquer envio.",
            iconName: "ShieldCheckIcon",
          },
          {
            title: "Carregamento Mais Limpo e Rotas Estáveis",
            description:
              "Imagens do tutorial inicial ajustadas para diferentes tamanhos de tela e aprimoramentos internos de roteamento e autenticação.",
            iconName: "SparklesIcon",
          },
        ],
      },
    ],
  },
  {
    version: "1.2.1",
    title: "Escalas Mais Fluidas no Celular, Gestão de Cultos e Modelos de Liturgia",
    subtitle:
      "Gavetas deslizantes para escalação rápida e compartilhamento em smartphones, modelos reutilizáveis de liturgia e piso tipográfico aprimorado.",
    releaseDate: "15 de novembro de 2026",
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

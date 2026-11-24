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

export const CURRENT_APP_VERSION = "1.9.0";

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.9.0",
    title: "Agenda em Tela Cheia e Sua Semana Mais Organizada",
    subtitle:
      "A agenda agora aproveita toda a tela, a configuração da sua disponibilidade ficou mais simples e o guia de boas-vindas respeita o seu tempo.",
    releaseDate: "23 de novembro de 2026",
    isLatest: true,
    moduleGroups: [
      {
        moduleName: "Agenda",
        badge: "Novidade",
        features: [
          {
            title: "A agenda ocupa a tela toda",
            description:
              "No computador, mês, semana, dia e ano preenchem o espaço disponível sem rolagem da página. Cada seção tem sua própria rolagem, e o dia de hoje fica sempre destacado.",
            iconName: "CalendarDaysIcon",
            badge: "Desktop",
          },
          {
            title: "Cabeçalho mais enxuto no celular",
            description:
              "Setas e botão Hoje na primeira linha, seguidos de Escalas e Novo; as visões ficam na segunda linha com o filtro em ícone.",
            iconName: "SmartphoneIcon",
            badge: "Mobile",
          },
        ],
      },
      {
        moduleName: "Departamentos & Disponibilidade",
        badge: "Melhorias",
        features: [
          {
            title: "Configure sua disponibilidade",
            description:
              "Acesse pelo aviso da Home ou pela página de Departamentos. O editor semanal abre em um painel lateral no computador e em uma gaveta no celular, sem atrapalhar o que você estava fazendo.",
            iconName: "UsersIcon",
            badge: "Escala",
          },
          {
            title: "Guia de boas-vindas em 3 capítulos",
            description:
              "Um tour mais curto e sem formulários obrigatórios: você navega pela Home, entende suas escalas e descobre o app no celular no seu ritmo.",
            iconName: "SparklesIcon",
            badge: "Boas-vindas",
          },
        ],
      },
    ],
  },
  {
    version: "1.8.0",
    title: "Uma Nova Experiência para Organizar Sua Igreja",
    subtitle:
      "Deixamos o OpenMinistry ainda mais leve, organizado e fácil de usar — tanto no computador quanto no celular, para você encontrar tudo com poucos toques.",
    releaseDate: "22 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Navegação e Visual",
        badge: "Novidade",
        features: [
          {
            title: "Menu organizado por áreas da igreja",
            description:
              "Agora tudo fica agrupado de forma simples: Início, Cultos e Escalas, Louvor, Pessoas, Comunicação e Bíblia. No computador, você também pode recolher o menu lateral para ganhar mais espaço na tela.",
            iconName: "LayoutDashboardIcon",
            badge: "Computador",
          },
          {
            title: "Novo botão Explorar no celular",
            description:
              "Ficou muito mais rápido encontrar qualquer área da igreja pelo celular. Toque em Explorar para pesquisar o que precisa ou acessar os atalhos mais usados.",
            iconName: "SmartphoneIcon",
            badge: "Celular",
          },
          {
            title: "Visual mais limpo e sua conta sempre à mão",
            description:
              "Tiramos linhas e caixas desnecessárias para deixar a leitura mais calma e agradável. No computador, basta clicar na sua foto no canto superior para ver seu perfil, trocar de tema ou sair.",
            iconName: "SparklesIcon",
            badge: "Visual",
          },
        ],
      },
      {
        moduleName: "Agenda e Escalas",
        badge: "Melhorado",
        features: [
          {
            title: "Nova Agenda da igreja",
            description:
              "Acompanhe toda a programação por mês, semana, dia, ano ou em lista. Filtrar por tipo de culto ou departamento ficou mais simples, e você identifica rapidamente onde vai servir.",
            iconName: "CalendarDaysIcon",
            badge: "Agenda",
          },
          {
            title: "Equipe separada por departamento",
            description:
              "Ao tocar em um culto ou ensaio na agenda, você vê quem está escalado separado por departamento — como Louvor, Mídia ou Recepção — e quantas vagas ainda faltam preencher.",
            iconName: "UsersIcon",
            badge: "Escalas",
          },
          {
            title: "Escalas, Cultos e Disponibilidade mais claros",
            description:
              "Os filtros de escalas e cultos e a tela de disponibilidade ficaram mais limpos e alinhados, facilitando o planejamento da semana.",
            iconName: "CheckSquare2Icon",
            badge: "Organização",
          },
        ],
      },
      {
        moduleName: "Início e Configurações",
        badge: "Melhorado",
        features: [
          {
            title: "Versículo em destaque ao abrir no celular",
            description:
              "Logo ao abrir o aplicativo no celular, o versículo do dia aparece primeiro para abençoar sua rotina, seguido dos seus próximos compromissos e avisos da igreja.",
            iconName: "HeartHandshakeIcon",
            badge: "Início",
          },
          {
            title: "Configurações reunidas em um só lugar",
            description:
              "Juntamos todas as opções da sua conta e da igreja em uma única tela organizada por temas — perfil, notificações, agenda, equipes e permissões.",
            iconName: "ShieldCheckIcon",
            badge: "Conta e Igreja",
          },
        ],
      },
    ],
  },
  {
    version: "1.7.2",
    title: "Navegação Mais Ágil e Cliques Confiáveis",
    subtitle:
      "Corrigimos a lentidão ao navegar e o travamento de cliques em escalas, músicas e cronogramas, inclusive no app instalado.",
    releaseDate: "20 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Correções",
        badge: "Hotfix",
        features: [
          {
            title: "Navegação mais rápida",
            description:
              "O cabeçalho não executa mais consultas e loaders duplicados a cada navegação. A troca de páginas e as atualizações ficam mais leves.",
            iconName: "SparklesIcon",
            badge: "Performance",
          },
          {
            title: "Cliques confiáveis em escalas e músicas",
            description:
              "Abrir e fechar janelas de escala, música ou cronograma não deixa mais a tela travada — os modais agora usam a mesma camada e respeitam a animação de fechamento.",
            iconName: "CheckSquare2Icon",
            badge: "Interatividade",
          },
        ],
      },
    ],
  },
  {
    version: "1.7.1",
    title: "Correção de Interatividade",
    subtitle:
      "Corrigimos o travamento dos cliques depois de fechar janelas e a troca de abas no formulário de músicas.",
    releaseDate: "20 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Correções",
        badge: "Hotfix",
        features: [
          {
            title: "Cliques voltam a responder",
            description:
              "Ao fechar janelas de avisos, cronograma ou músicas, a tela volta a aceitar cliques na hora — sem precisar recarregar a página.",
            iconName: "CheckSquare2Icon",
            badge: "Interatividade",
          },
          {
            title: "Abas de música funcionando",
            description:
              "Depois de adicionar uma música vinda da internet, as abas de configuração voltam a responder a clique e teclado.",
            iconName: "MusicIcon",
            badge: "Músicas",
          },
        ],
      },
    ],
  },
  {
    version: "1.7.0",
    title: "Uma Home Mais Focada no Seu Dia",
    subtitle:
      "A página inicial agora se organiza em Hoje e Minha Igreja, com o essencial à mão e um header que acompanha você sem roubar espaço.",
    releaseDate: "19 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Início",
        badge: "Novidade",
        features: [
          {
            title: "Abas Hoje e Minha Igreja",
            description:
              "Separe o que precisa de atenção agora do que é da igreja: versículo, próximo evento, avisos, tarefas e aniversariantes de um lado; dados da congregação, eventos e departamentos do outro. Seções sem conteúdo simplesmente não aparecem.",
            iconName: "LayoutDashboardIcon",
            badge: "Home",
          },
          {
            title: "Header que acompanha",
            description:
              "As abas ficam junto das notificações e do avatar no cabeçalho fixo. O indicador preenche a aba ativa e a borda inferior só aparece quando você rola a página.",
            iconName: "BellIcon",
            badge: "Navegação",
          },
          {
            title: "Detalhes da tarefa a um clique",
            description:
              "Clique em uma tarefa na Home para abrir os detalhes, editar, mudar o status ou excluir — sempre de acordo com a sua permissão.",
            iconName: "CheckSquare2Icon",
            badge: "Tarefas",
          },
        ],
      },
      {
        moduleName: "Minha Igreja",
        badge: "Melhorias",
        features: [
          {
            title: "Versículo e avisos em destaque",
            description:
              "O versículo do dia voltou com o gradiente colorido e traz copiar, compartilhar e abrir na Bíblia. Os avisos ficam logo abaixo do próximo evento.",
            iconName: "SparklesIcon",
            badge: "Hoje",
          },
          {
            title: "Departamentos que você serve",
            description:
              "Os cards recuperaram o desenho original, com funções, avatares, contagem de pessoas e líderes. Aniversariantes do mês aparecem apenas quando existe alguém com aniversário no período.",
            iconName: "UsersIcon",
            badge: "Comunidade",
          },
        ],
      },
    ],
  },
  {
    version: "1.6.0",
    title: "Sua agenda no seu calendário",
    subtitle:
      "Assine cultos, ensaios, eventos e escalas com um link que atualiza sozinho no Apple Calendário, Google Agenda ou Outlook.",
    releaseDate: "19 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Agenda & Calendário",
        badge: "Novidade",
        features: [
          {
            title: "Sincronizar com meu calendário",
            description:
              "Em Configurações, gere um link de assinatura e cole no seu aplicativo de calendário. Você escolhe o que entra: cultos, ensaios do seu departamento, eventos e escalas.",
            iconName: "CalendarDaysIcon",
            badge: "Assinatura",
          },
          {
            title: "Atualização automática, sem tempo real",
            description:
              "O calendário consulta o link periodicamente e traz as alterações na próxima consulta. O link pode ser rotacionado ou revogado quando quiser.",
            iconName: "ShieldCheckIcon",
            badge: "Controle",
          },
          {
            title: "Atalho na página da agenda",
            description:
              "O novo grupo de ações reúne criar culto ou evento, criar ensaio, conectar seu calendário e exportar um arquivo .ics.",
            iconName: "SparklesIcon",
            badge: "Agenda",
          },
        ],
      },
    ],
  },
  {
    version: "1.5.0",
    title: "Notas por Seção, Formação da Banda e E-mail de Ensaio Repaginado",
    subtitle:
      "Anote cada trecho da música por departamento, monte a formação da banda e receba lembretes de ensaio com o repertório organizado e o logo da sua igreja.",
    releaseDate: "19 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Músicas & Repertório",
        badge: "Novidade",
        features: [
          {
            title: "Notas por Seção na Cifra e na Letra",
            description:
              "Adicione observações em cada parte da música (introdução, verso, refrão) por departamento. As notas aparecem junto da cifra e da letra e continuam no lugar certo mesmo ao transpor ou editar a música.",
            iconName: "MusicIcon",
            badge: "Notas",
          },
          {
            title: "Formação da Banda por Departamento",
            description:
              "Marque quais funções do departamento a música pede e escolha o departamento direto no painel da música, no formulário e dentro do ensaio.",
            iconName: "UsersIcon",
            badge: "Banda",
          },
        ],
      },
      {
        moduleName: "E-mails & Ensaios",
        badge: "Melhorias",
        features: [
          {
            title: "Lembrete de Ensaio com Repertório Organizado",
            description:
              "O e-mail de lembrete de ensaio agora tem modelo próprio: data, horário e local em linhas separadas e o repertório em lista numerada, uma música por linha.",
            iconName: "BellIcon",
            badge: "E-mail",
          },
          {
            title: "Logo da Igreja nos E-mails",
            description:
              "Quando a igreja tem logo cadastrado, ele aparece no cabeçalho dos e-mails. Sem logo, permanece o selo do OpenMinistry.",
            iconName: "SparklesIcon",
            badge: "Marca",
          },
          {
            title: "Todos os Modelos em E-mails",
            description:
              "A tela de e-mails lista todos os modelos disponíveis, incluindo o Lembrete de Ensaio, com filtro no histórico e envio de teste.",
            iconName: "CheckSquare2Icon",
            badge: "Modelos",
          },
        ],
      },
      {
        moduleName: "Correções",
        badge: "Estabilidade",
        features: [
          {
            title: "Upload de Imagens Funcionando",
            description:
              "A política de segurança do app bloqueava o envio direto ao serviço de arquivos. Logo da igreja, cifras e avatares voltam a subir, com mensagem clara em português quando a rede falhar.",
            iconName: "ShieldCheckIcon",
            badge: "Upload",
          },
          {
            title: "Lembretes de Ensaio Agendados de Verdade",
            description:
              "Correção no agendamento dos lembretes, que podiam ficar pendentes por causa do identificador de deduplicação recusado pelo serviço de filas.",
            iconName: "CalendarDaysIcon",
            badge: "Ensaios",
          },
        ],
      },
    ],
  },
  {
    version: "1.4.0",
    title: "Visão Global de Ensaios, Detalhes no Repertório e Correção Mobile",
    subtitle:
      "Acesso direto a todos os ensaios pelo menu, detalhes completos com Cifra e Letra dentro do ensaio, remoção rápida de músicas e ajustes de navegação no celular.",
    releaseDate: "18 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Ensaios & Repertório",
        badge: "Novidade",
        features: [
          {
            title: "Aba Global de Ensaios no Menu",
            description:
              "Acesse todos os ensaios dos seus departamentos em um único lugar pelo menu lateral ou mobile, com filtro por departamento e separação entre próximos e realizados.",
            iconName: "CalendarDaysIcon",
            badge: "Ensaios",
          },
          {
            title: "Detalhes da Música + Cifra e Letra no Ensaio",
            description:
              "Ao tocar em uma música do repertório do ensaio, veja tom, capo, coleção, tags, BPM e alterne entre Cifra e Letra sem sair da tela, além de remover músicas direto da lista.",
            iconName: "MusicIcon",
            badge: "Repertório",
          },
        ],
      },
      {
        moduleName: "Agenda & Navegação Mobile",
        badge: "Melhorias",
        features: [
          {
            title: "Navegação Inferior Estável e Rótulos Padronizados",
            description:
              "Correção do posicionamento da barra inferior no celular (iOS) e padronização do botão da agenda para Mais detalhes.",
            iconName: "SmartphoneIcon",
            badge: "Mobile",
          },
        ],
      },
    ],
  },
  {
    version: "1.3.3",
    title: "Cifra Direta no Ensaio e Tela Cheia Enxuta",
    subtitle:
      "Abra a cifra de qualquer música direto do repertório do ensaio e leia com mais espaço no modo tela cheia no celular.",
    releaseDate: "18 de novembro de 2026",
    moduleGroups: [
      {
        moduleName: "Ensaios & Visualizador de Cifras",
        badge: "Usabilidade & Mobile",
        features: [
          {
            title: "Cifra Acessível Pelo Ensaio",
            description:
              "Clicar em uma música do setlist do ensaio abre a cifra em painel lateral no desktop ou gaveta em tela cheia no celular, mantendo o contexto do ensaio.",
            iconName: "MusicIcon",
            badge: "Ensaios",
          },
          {
            title: "Barra Limpa no Modo Tela Cheia",
            description:
              "O modo tela cheia do visualizador de cifras agora mantém apenas tom, zoom e layout, escondendo botões secundários para dar mais espaço à letra e às cifras.",
            iconName: "SmartphoneIcon",
            badge: "Mobile",
          },
        ],
      },
    ],
  },
  {
    version: "1.3.2",
    title: "Abas de Departamento Mais Limpas no Mobile",
    subtitle:
      "Barra de navegação dos departamentos simplificada apenas com ícone e rótulo para economizar espaço na tela.",
    releaseDate: "18 de novembro de 2026",
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

# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [0.4.0] - 2026-11-07

### Adicionado
- **Agenda & Calendário Completo (`/dashboard/calendar`)**:
  - Implementada interface de calendário completa inspirada na arquitetura de `dninomiya/full-calendar-for-shadcn-ui`.
  - **5 Modos de Visualização**:
    - **Mês (`month`)**: Grade mensal completa com indicadores de dias, eventos da igreja, escalas de serviço e dias bloqueados.
    - **Semana (`week`)**: Visão de 7 dias com linha para eventos de dia inteiro e grade horária de 07:00 às 22:00.
    - **Dia (`day`)**: Linha do tempo individual detalhada com alerta superior caso o usuário tenha registrado indisponibilidade na data.
    - **Ano (`year`)**: 12 mini-calendários com marcadores pontuais coloridos para navegação rápida entre datas.
    - **Agenda (`agenda`)**: Linha do tempo linear agrupada cronologicamente por data.
  - **Filtros por Chips**: Filtros dinâmicos no topo para *Todos*, *Cultos & Eventos*, *Minhas Escalas* e *Indisponibilidades*.
  - **Diálogo de Detalhes (`EventDetailDialog`)**: Modal ao clicar em qualquer ocorrência com atalhos de acesso direto ao evento ou gerenciamento de ausências.
  - **Preferências de Calendário**: Opção para configurar o início da semana (Domingo ou Segunda-feira) e fuso horário (`timezone`), acessível tanto pelo cabeçalho da agenda quanto pela tela de configurações.
  - **Navegação Integrada**: Item "Agenda" adicionado à barra de navegação lateral e ao menu inferior mobile.

- **Disponibilidade & Indisponibilidade de Voluntários**:
  - Nova rota `/dashboard/availability` com interface impecável para voluntários e líderes.
  - **Grade Semanal**: Configuração de dias da semana e períodos de disponibilidade (Manhã: 06h-12h, Tarde: 12h-18h, Noite: 18h-23h).
  - **Bloqueio Pontual de Datas**: Modelo `person_unavailability` com suporte a marcar dias específicos de ausência (ex.: viagens, plantões ou compromissos), motivo descritivo e seleção entre dia todo ou períodos.
  - **Alerta Inteligente nas Escalas**: Detecção em tempo real e aviso visual no diálogo de escalar voluntários (`AddAssignmentDialog`) alertando a liderança caso a pessoa selecionada tenha registrado indisponibilidade para a data do culto.

- **WhatsApp & Notificações (Evolution API Go)**:
  - Integração com o servidor **Evolution API Go (evogo)** com suporte a autenticação em modo duplo:
    - **Global API Key**: Detecção e resolução automática do token da instância através do endpoint `/instance/all`.
    - **Token da Instância**: Autenticação direta através do endpoint `/instance/status`.
  - Envio de mensagens de texto via WhatsApp através do endpoint nativo `/send/text` com sanitização E.164.
  - Fila assíncrona com **Upstash Redis & QStash** (`enqueueNotificationJob`) e rota de webhook com validação de assinatura HMAC.
  - Job agendado `/api/jobs/monthly-availability` para envio de lembretes mensais de disponibilidade.
  - Notificação automática de boas-vindas ao concluir o onboarding da igreja e notificação instantânea no WhatsApp ao escalar voluntários na equipe.
  - Card de gerenciamento e testes em `/dashboard/settings` com status online em tempo real, visualização do número conectado e envio de mensagem de teste.
  - Campo de telefone coletado no formulário de onboarding e sincronizado com o perfil do membro.

- **Cronograma de Cultos & Eventos (Order of Service)**:
  - Adicionadas abas "Cronograma do Culto" e "Escala & Equipes" na página do evento (`/dashboard/events/[id]`).
  - Cadastro de momentos, seções de cabeçalho, louvores/itens musicais e responsáveis vinculados por membro ou nome manual.
  - Cálculo dinâmico do horário de início de cada momento com base no horário de abertura do culto e duração estimada.
  - **Drag and Drop (`@dnd-kit`)**: Reordenação por arraste com cursor dinâmico, acessibilidade via teclado e atualização instantânea dos horários.
  - **Modelos de Cronograma (`plan_template`)**:
    - Salvar cronograma atual como modelo da igreja com nome e descrição.
    - Diálogo de gerenciamento e aplicação de modelos com alerta de confirmação em caso de sobrescrita.
    - Limpeza completa do cronograma com confirmação.
    - Exportação e importação de cronogramas em formato estruturado `.json`.

- **Configurações & Experiência Mobile iOS**:
  - Redesenho completo da página de configurações no mobile (`< md`) inspirado no aplicativo **Ajustes / Settings do iOS**:
    - Cabeçalho de perfil estilo Apple ID com avatar, identificador e igreja ativa.
    - Seções agrupadas com cantos arredondados, bordas sutis e ícones squircle coloridos.
    - Navegação em drill-down com barra superior e botão de retorno.
  - Suporte completo aos plugins do **Better Auth**:
    - Passkeys (WebAuthn / biometria Face ID e Touch ID).
    - Multi-sessão com visualização de dispositivos ativos e encerramento remoto.
    - Nome de usuário único com prefixo `@`.
    - Registro do último método de login utilizado.

---

## [0.3.0] - 2026-11-06

### Adicionado
- Perfil de usuário com edição de foto de perfil via UploadThing.
- Gestão de identidade e branding da igreja com atualização de nome e logo.
- Impersonação de contas para administradores com banner fixo e reversão segura.
- Suporte a Progressive Web App (PWA) com manifesto, ícones e service worker offline.
- Suporte a temas visual Claro, Escuro e Sistema (via `next-themes`).
- Gestão de cultos, departamentos, funções e pessoas da igreja.

---

## [0.2.3] - 2026-11-06

### Corrigido
- Ajustes de hidratação na barra de navegação lateral e carregamento assíncrono de contexto.

---

## [0.2.0] - 2026-11-06

### Adicionado
- Gestão de departamentos e funções ministeriais.
- Convites para membros por link seguro e e-mail.
- Controle de acesso baseado em papéis (owner, admin, member).

---

## [0.1.0] - 2026-11-06

### Adicionado
- Inicialização do projeto OpenMinistry com Next.js 16 (Turbopack), Bun, TypeScript e Tailwind CSS.
- Configuração do NeonDB PostgreSQL com Drizzle ORM e Row-Level Security (RLS).
- Autenticação com Better Auth e Drizzle adapter.
- Documentação interativa da API com Scalar OpenAPI Reference em `/api/docs`.
- Componentes base do design system com shadcn/ui.

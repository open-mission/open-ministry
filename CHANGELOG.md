# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.0.2] - 2026-11-12

### Adicionado
- **Drawer de Pré-definições de Disponibilidade no Mobile**:
  - Novo botão de pré-definições substitui os atalhos inline no mobile, abrindo um Drawer inferior com opções rápidas: Fins de semana, Noites nos dias úteis, Fins de semana e noites úteis, Semana inteira e Limpar tudo.
  - Feedback visual imediato com notificação (*toast*) e fechamento automático para visualizar o calendário atualizado.
- **Overhaul do Módulo de Músicas & Repertório**:
  - Ordenação manual e alfabética de músicas nos cultos e eventos.
  - Links de streaming para busca rápida no YouTube, YouTube Music e Spotify.
  - Transposição harmônica de cifras com suporte a acordes invertidos e capo.

### Alterado
- **Navegação Móvel Otimizada**:
  - Remoção do ícone de disponibilidade da barra inferior no mobile, liberando espaço e alinhando perfeitamente os 5 itens principais (Início, Escalas, Agenda, Músicas e Menu).
  - Disponibilidade continua acessível diretamente pelo Menu de navegação.

---

## [1.0.1] - 2026-11-11

### Corrigido
- **Desempenho de carregamento das páginas**:
  - Permissões passaram a ser carregadas em bundles cacheados por organização e usuário, com deduplicação por requisição e verificação conjunta de departamentos. A página de evento deixou de executar dezenas de consultas ao banco por render.
  - Home, calendário e página de evento agora carregam projeções enxutas de pessoas, departamentos e eventos, em paralelo, sem buscar relacionamentos que não são exibidos.
  - O versículo do dia é renderizado em um limite de Suspense próprio e não bloqueia mais o carregamento inicial da home.
  - O registro do usuário é consultado uma única vez por requisição e compartilhado entre os loaders do dashboard.
  - Requisições simultâneas para a mesma chave de cache são agrupadas (single-flight), reduzindo idas ao Neon e ao Upstash Redis.
  - O bundle offline deixou de ser sincronizado automaticamente em todas as páginas; a sincronização inicial fica restrita às telas que exibem esses dados e a ações explícitas.
  - A API do YouVersion agora tem timeout curto (2,5s), evitando que uma falha externa segure o render.

---

## [1.0.0] - 2026-11-11

### Adicionado
- **Lançamento Oficial da Versão 1.0.0**:
  - Reorganização em Monorepo Turborepo multi-domínio:
    - `apps/site`: Site institucional oficial servindo `openministry.online`, com a landing page original restaurada, iluminação ambiental esmeralda e mockup de dashboard inclinado.
    - `apps/app`: Aplicação central servindo `app.openministry.online`, concentrando o painel administrativo, gestão de equipes, escalas ministeriais, cifras e cultos.
    - `apps/docs`: Fundação da plataforma de documentação servindo `docs.openministry.online`.
  - **Experiência de Onboarding Ministerial com Arte 3D**:
    - Três ilustrações 3D minimalistas geradas via Nano Banana 2 (`hero.jpg`, `scheduling.jpg`, `worship.jpg`) integradas com estética glassmorphism e iluminação calorosa.
    - Layout split-screen responsivo em desktop (`max-w-5xl`) e fluxo fullpage multi-step em mobile (`100dvh`).
    - Sandboxes interativos em tempo real: preview e teste de confirmação WhatsApp, transposição harmônica ao vivo (`G -> A -> D`), alternador de status de voluntário e medidor de progresso.
    - Coleta de WhatsApp formatado com validação e data de nascimento, persistindo no banco de dados Neon e sincronizando usuário e membro.
    - Suporte a instalação facilitada como PWA em smartphones.
  - **Confirmação de Logout Adaptativa**:
    - No Desktop: `AlertDialog` do Shadcn UI com confirmação e estado de carregamento `isPending`.
    - No Mobile: `Drawer` na base da tela com botões ergonômicos para a zona do polegar.
  - **Observabilidade Full-Stack com Sentry**:
    - Monitoramento unificado de erros, breadcrumbs de console e session replays.
    - Rastreamento de latência e spans de APIs externas via `trackApiCall`.
    - Métricas distribuídas customizadas (`telemetryMetrics`).
    - Atribuição automática de usuário autenticado (`SentryUserLoader`).

### Removido
- **Desativação Completa do Datadog**:
  - Remoção de todos os pacotes `@datadog/browser-rum`, `@datadog/browser-rum-nextjs`, `@vercel/otel` e `@opentelemetry/*`.
  - Limpeza de variáveis de ambiente do Datadog e desativação de instrumentação legada.

---

## [0.9.10] - 2026-11-10

### Corrigido
- **Compatibilidade do Build Vercel com Turborepo Strict Mode**:
  - Configuração de `globalPassThroughEnv` no `turbo.json` para repassar todas as 24 variáveis de ambiente da plataforma Vercel (`DATABASE_URL`, `BETTER_AUTH_*`, `GOOGLE_*`, `UPSTASH_*`, `QSTASH_*`, `DD_*`, `BREVO_*`, etc.) para as tarefas de build.
  - Alteração do modo de UI do Turborepo para `"stream"` em vez de `"tui"`, otimizando a saída de logs para ambientes de CI/CD.
  - Adição de fallback resiliente em `packages/db/src/index.ts` durante a avaliação de módulo em tempo de compilação, permitindo que a coleta estática de dados do Next.js (como `/_not-found`) execute com segurança mesmo em builds sem conexão ao banco ativo.

---

## [0.9.9] - 2026-11-10

### Adicionado
- **Reorganização em Monorepo Turborepo e Arquitetura Feature-Based**:
  - Migração de projeto monolítico para monorepo moderno com **Turborepo** (`turbo.json`) e workspaces do **Bun** (`apps/*`, `packages/*`).
  - Extração de pacotes compartilhados:
    - `@openministry/db`: Modelos Drizzle ORM, conexão Neon e migrações SQL.
    - `@openministry/ui`: Mais de 60 componentes primitivos Shadcn UI / Radix.
    - `@openministry/typescript-config`: Configurações compartilhadas de TypeScript (`base`, `nextjs`, `react-library`).
    - `@openministry/eslint-config`: Configurações compartilhadas de ESLint.
  - Reorganização do código frontend em `apps/web/src/features/*` cobrindo 10 domínios: `songs`, `events`, `departments`, `people`, `notifications`, `jobs`, `felicitometro`, `organization`, `auth` e `offline`.
  - Configuração do `turbo.json` com inteligência artificial (`ai` guide) e documentação declarativa de tarefas.
- **Better Auth `@better-auth/infra` & Suporte a Multi-Session**:
  - Instalação e integração de `@better-auth/infra` no servidor com `dash()` consumindo `BETTER_AUTH_API_KEY`.
  - Integração de `sentinelClient()` no cliente Better Auth para proteção contra abusos e segurança automatizada.
  - Habilitação completa de Multi-Session (`maximumSessions: 5`) permitindo múltiplas contas ativas no mesmo navegador.
  - Hook reativo `useDeviceSessions` com `@tanstack/react-query` para listar e cachear sessões do dispositivo.
  - Seção de alternância rápida de contas ("Alternar Conta") e conexão de novas contas ("Conectar outra conta") integradas no menu desktop (`NavUser`) e na gaveta mobile (`UserMenuDrawer`).
- **Melhorias de Design & Notificações no Dashboard**:
  - Notificações transformadas em banner fixo sticky (`sticky top-[calc(3.5rem+env(safe-area-inset-top))]`) com blur de fundo e sombra sutil.
  - Disparo automático de toasts Sonner no Shadcn UI ao receber avisos ou notificações em tempo real.
  - Grupos de navegação colapsáveis no menu lateral (`SidebarNav`) com `Collapsible` e animação suave do chevron.
  - Limpeza visual no cabeçalho da página de membros (`/dashboard/members/[personId]`), eliminando faixa cortada.

---

## [0.9.8] - 2026-11-10

### Adicionado
- **Emails Transacionais com Brevo API (Sendinblue)**:
  - Integração oficial com a API v3 do Brevo (`https://api.brevo.com/v3/smtp/email`) para envio de emails transacionais e notificações.
  - Tabela `email_message_log` no Neon PostgreSQL para auditoria, histórico de envios, rastreamento de IDs de mensagem do Brevo e registro de tentativas e falhas.
  - Funções de envio transacional e reenvio unitário de emails com feedback em tempo real.
- **Modelos de Email Padronizados em React Email (`@react-email/components`)**:
  - `WelcomeEmail`: Boas-vindas para novos membros cadastrados no OpenMinistry.
  - `ScheduleAssignedEmail`: Notificação detalhada de voluntário escalado para culto/evento (ministério, data, horário, notas e link direto).
  - `AnnouncementEmail`: Comunicados e avisos oficiais da igreja enviados pela liderança.
  - `ResetPasswordEmail`: Redefinição segura de senha com link temporário de expiração.
  - `MagicLinkEmail`: Link de acesso direto seguro e descartável.
  - `EmailVerificationEmail`: Confirmação do endereço de email cadastrado.
- **Aba de Gestão de Emails no Sidebar e Painel Completo (`/dashboard/emails`)**:
  - Novo item de navegação "Emails" sob o grupo "Comunicação" acessível para administradores e líderes de ministério.
  - Visão geral com métricas (Total de disparos, Entregues, Falhas e Taxa de sucesso).
  - Aba de **Histórico de Envios** com busca em tempo real por destinatário ou assunto, filtros por status e tipo de email, visualização em sandbox iframe do conteúdo renderizado e botão de reenvio.
  - Aba de **Modelos de Email** com catálogo interativo de templates, prévia com alternador Desktop/Mobile e modal para envio de email de teste real para qualquer endereço via Brevo.
- **Autenticação & Avisos Multicanal com E-mail**:
  - Vinculação com o Better Auth para envio automático de emails em eventos de criação de conta (`user.create.after`), recuperação de senha (`sendResetPassword`), magic link e confirmação de email.
  - Adição do canal de E-mail nos formulários de criação de Avisos (`AnnouncementDialog` e `AnnouncementsConsole`).
  - Notificação por email disparada automaticamente ao escalar voluntários na criação ou edição de escalas de culto.
- **Documentação de API OpenAPI 3.1.0 (Scalar)**:
  - Atualização da versão da API para `0.9.8`.

---

## [0.9.7] - 2026-11-10

### Adicionado
- **Otimização Global com React Query e Router Cache**:
  - Integração do `@tanstack/react-query` v5 para cache client-side, consultas em background e deduplicação de requisições.
  - Habilitação do Next.js Router Cache dinâmico (`staleTimes: { dynamic: 30, static: 180 }`).
  - Navegação instantânea com prefetch proativo em menus laterais, gaveta de usuário e atalhos rápidos do dashboard.
- **Módulo de Músicas com Estado Otimista (0ms)**:
  - Migração para endpoints REST dedicados (`/api/songs`, `/api/songs/[songId]`).
  - Atualizações otimistas imediatas ao salvar cifras, tom e tags, eliminando atrasos visuais e skeletons repetitivos ao navegar entre páginas.
- **Módulos de Cultos, Escalas, Pessoas e Departamentos Otimizados**:
  - Criação de hooks especializados (`useEventsQuery`, `usePeopleQuery`, `useDepartmentsQuery`).
  - Eliminação de carregamentos redundantes e navegação fluida entre listagens e páginas de detalhes.
- **Módulo de WhatsApp (Evolution API)**:
  - Criação de endpoint REST `/api/whatsapp/logs` e hook reativo `useWhatsAppLogsQuery`.
  - Polling inteligente que roda apenas enquanto houver mensagens com status `sending` ou `pending` (desliga automaticamente quando ociosas).
  - Reenvio otimista de mensagens unitárias e em lote com feedback visual imediato em 0ms.
  - Manutenção do histórico anterior visível (`keepPreviousData`) durante filtros e pesquisas.
- **Módulo de Avisos e Notificações**:
  - Marcação de todas as notificações como lidas com atualização visual imediata a 0ms em toda a interface.
  - Reenvio de mensagens do WhatsApp no modal de confirmação de avisos com atualização local instantânea.
  - Otimização do intervalo de verificação de notificações em background de 45s para 5 minutos com pausa quando a aba estiver inativa.
- **Documentação de API Interativa (Scalar)**:
  - Atualização do `@scalar/nextjs-api-reference` para a versão mais recente (`0.12.17`).
  - Especificação OpenAPI 3.1.0 completa cobrindo todos os endpoints REST de Músicas, Cultos, Voluntários, Departamentos, WhatsApp e Notificações.

---

## [0.9.2] - 2026-11-09

### Adicionado
- **Fila Persistente e Controle de Envio do WhatsApp (`whatsapp_message_log`)**:
  - Nova tabela no banco de dados para registrar e gerenciar o ciclo de vida completo de cada mensagem enviada via WhatsApp (`pending`, `sending`, `sent`, `delivered`, `read`, `failed`).
  - Tratamento resiliente contra instabilidades na Evolution API: caso a API oscile ou falhe, as mensagens não são perdidas, permanecendo na fila para reprocessamento manual ou automático com 1 clique.
  - Funções de reenvio unitário (`retryWhatsAppMessage`) e em lote (`retryFailedWhatsAppMessages`).
- **Webhook da Evolution GO (`/api/webhooks/evolution`)**:
  - Endpoint dedicado para escutar eventos em tempo real do Evolution Go (`MESSAGES_UPDATE`, `messages.update`, `MESSAGES_UPSERT`, `messages.upsert`, `SEND_MESSAGE`).
  - Atualização automática dos status do WhatsApp:
    - `SERVER_ACK` / `SENT` ➔ **Enviado** (`sent`)
    - `DELIVERY_ACK` / `RECEIVED` ➔ **Entregue** (`delivered`) + timestamp de entrega
    - `READ` / `PLAYED` ➔ **Lido** (`read`) + timestamp de confirmação de leitura
  - Token de autenticação seguro gerado automaticamente por igreja (`webhookSecret`).
  - Botão **"Configurar Webhook no Evolution GO Automaticamente"** nas configurações para registrar a URL diretamente no servidor Evolution Go via API.
- **Tabela de Registros e Logs do Evolution**:
  - Novo card de histórico em *Configurações > WhatsApp (Evolution API Go)* com busca por destinatário/telefone, filtros por status e contexto (Avisos, Escalas, Boas-vindas, Testes).
  - Modal com prévia completa do texto, timestamps e ID retornado pelo Evolution.
  - Ação de reenvio individual e botão global *"Reenviar pendentes/falhas"*.
- **Aba de Avisos com Métricas Multicanal**:
  - Indicadores de entrega no WhatsApp no card de cada aviso enviado.
  - Modal de detalhes aprimorado com filtros dedicados (*Lidos no App*, *WhatsApp OK*, *WhatsApp Fila/Falhas*), status individual de cada membro e botão para reenviar mensagens com falha no WhatsApp.
- **Blindagem contra Disparos Acidentais**:
  - Banner visual explícito antes de submeter comunicados informando exatamente quem receberá (*"Destinatário confirmado: 1 pessoa: Fulano"* vs *"Departamento: Louvor (X membros)"*).
  - Diálogo de aviso na página do membro (`/dashboard/members/[personId]`) travado no membro selecionado com `defaultAudienceType="person"`.

### Corrigido
- Alinhamento de botões de fechar em modais e sheets.
- Ajuste de z-index no calendário para prevenir sobreposição em cabeçalhos fixos.
- Drawer de configurações no mobile e prevenção de overflow no card de membros.
- Scroll suave na visualização de cifras em tela cheia.

---

## [0.9.1] - 2026-11-08

### Adicionado
- Atualizações otimistas no gerenciamento de músicas e escalas ministeriais, eliminando latência na interface.
- Desvinculação do disparo síncrono de notificações para melhorar a responsividade ao salvar escalas.

### Corrigido
- Ajuste de contraste no estado hover dos atalhos de acesso rápido no dashboard.
- Remoção de bordas e raio redundantes no modal de configurações.
- Aumento da largura do sheet de histórico de encontros para 75%.
- Ajustes de layout no Felicitômetro no dashboard e experiência nativa PWA sem zoom em inputs.

---

## [0.9.0] - 2026-11-08

### Adicionado
- **Módulo de Músicas & Repertório**:
  - Cadastro completo de músicas com tom, BPM, compasso e links para YouTube e Spotify.
  - Transpositor inteligente de tonalidades com suporte a acordes invertidos e notas de baixo.
  - Importador automático de cifras a partir de arquivos `.txt` (Cifra Club).
  - Coleções musicais personalizadas para organização do repertório da igreja.
  - Seletor de músicas integrado ao cronograma de cultos com busca em tempo real.

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

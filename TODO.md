# OpenMinistry

O Projeto é o OpenMinistry inspirado em aplicativos com PlanningCenter e Voluts. Esse app tente a ser uma solução para ajudar igrejas a se organizarem.

A principio teremos a tela do admin e dos membros. Vamos começar com a tela Admin que consegue ver os usuários cadastrados convidar novos membros.

## TODO

Atualizar a task nos status abaixo de acordo com que for trabalhando, sempre commitando de forma organizada e seguindo o git flow os ajustes.

### Backlog

### Doing

### Done

- [x] Design Feedback: Badge de Informações (`PageInfo`) com Drawer/Dialog e Ganho de Espaço nos Cabeçalhos
  - [x] Criar componente reutilizável `PageInfo` (`src/components/app/page-info.tsx`) com disparador via badge/botão (`InfoIcon` + "Info"), renderizando Drawer responsivo no mobile e Dialog no desktop
  - [x] Ocultar parágrafos extensos de descrição nos cabeçalhos das páginas para ganho de espaço vertical (~50px), concentrando as informações contextuais no `PageInfo`
  - [x] Implementado em todas as páginas do painel com descrição:
    - `/dashboard/events` (Cultos e eventos)
    - `/dashboard/schedules` (Escalas)
    - `/dashboard/members` (Sua equipe / Pessoas)
    - `/dashboard/departments` (Departamentos)
    - `/dashboard/birthdays` (Aniversariantes)
    - `/dashboard/church` (Sua igreja)
    - `/dashboard/notifications` (Notificações)
    - `/dashboard/profile` (Seu perfil)
    - `/dashboard/settings` (Configurações)

- [x] PWA & Mobile UX: Ativação de Notificações Push para App Instalado e Identidade Visual no Cabeçalho
  - [x] Verificação de notificações ativas ao instalar o PWA ou abrir em modo standalone (`PwaNotificationPrompt` e `push-client.ts`)
  - [x] Prompt flutuante moderno acima da barra de navegação móvel solicitando ativação de notificações push com disparo de permissão nativa, registro VAPID e feedback visual
  - [x] Substituição do botão hambúrguer no cabeçalho mobile (`header.sticky.top-0`) pela logo e nome da igreja (`MobileHeaderLeadingLoader`), evitando redundância com o botão "Mais" da barra de navegação inferior
  - [x] Remoção da borda divisora (`border-b`) dos cabeçalhos mensais em listagens de cultos e escalas
  - [x] Modo de segurança e confirmação de descarte de alterações não salvas no drawer de edição de cronograma

- [x] Design Feedback: Refinamentos Mobile em Detalhes do Culto (`/dashboard/events/[id]`) e Agrupamento no Calendário (`/dashboard/calendar`)
  - [x] Ocultar bloco 80x80 de data no cabeçalho do culto em telas móveis (`hidden sm:flex`) para ganho de espaço vertical e horizontal
  - [x] Remover link redundante de retorno "Cultos e eventos" no corpo da página no mobile (`hidden sm:block`)
  - [x] Otimizar botão de voltar no cabeçalho mobile (`MobileHeaderLeading`) com ícone maior (`size-5`) e área de toque confortável
  - [x] Simplificar breadcrumb no mobile (`DashboardBreadcrumb`): exibe apenas o título da página atual ("Detalhes do culto") sem wrapping ou corte de tela
  - [x] Unificar altura e alinhamento das abas (`TabsList` e `TabsTrigger`) com altura consistente (`h-10`/`h-8`) e badges perfeitamente alinhadas
  - [x] Modo de Leitura/Apresentação no Cronograma do Culto (`PlanReadView`): visualização limpa estilo itinerário, sem botões de arrastar ou ações inline que poluíam a tela no celular
  - [x] Formatação explícita de minutos na duração dos momentos (ex: `5 min`, `20 min`) eliminando a confusão de parecer dois horários consecutivos
  - [x] Modo de Edição em Drawer tela cheia (`Drawer` de 92dvh): botão primário "Editar Cronograma" abrindo drawer com DndContext, botões de ação e toolbar
  - [x] Card de momento reordenável redesenhado para toque (`SortablePlanRow`) com linha superior compacta e hierarquia clara
  - [x] Agrupamento inteligente de escalas do mesmo evento no Calendário (`/dashboard/calendar` e `CalendarAgendaView`): quando um membro tem múltiplas funções no mesmo culto (ex: Cameraman e Livestream), elas são exibidas em um único card unificado (`Escalado: Cameraman, Livestream`), evitando cartões duplicados para o mesmo evento

- [x] UI Otimista, Notificações Reativas (0ms de latência percebida) e Otimização de Cache e Queries
  - [x] Implementar store de notificações reativa no cliente (`src/lib/notification-store.ts`) com `useSyncExternalStore`, janela de cache de 30s e sincronização em tempo real
  - [x] Hidratação inicial dos itens recentes no `NotificationBellLoader` para zero loading na primeira abertura do sino
  - [x] Fechamento instantâneo (0ms) e otimista da barra superior de notificações (`DismissNotificationButton` e `NotificationBar`) sem aguardar roundtrips de rede ou refresh de página
  - [x] Marcação otimista como lida no sino e na lista de notificações com atualização imediata do badge e rollback em caso de falha
  - [x] Cache em memória do JWKS (`getJwks`) com TTL de 15 minutos evitando queries repetitivas ao NeonDB em operações tenant
  - [x] Pipeline no Upstash Redis (`redis.pipeline()`) reduzindo múltiplos roundtrips HTTP sequenciais para uma única chamada batched
  - [x] Cache L1/L2 do contexto da organização no modo tenant com invalidação por tag
  - [x] Testes unitários cobrindo store reativa, descarte otimista e controle de expiração de cache (TTL)

- [x] Recorrência de eventos e cultos por dia da semana no mês (ex: todo 2º domingo do mês, toda 3ª segunda-feira, último domingo).
  - [x] Adicionar opção `monthly_nth_weekday` em `RECURRENCE_OPTIONS` com cálculo dinâmico da posição (1º, 2º, 3º, 4º e último) e do dia da semana
  - [x] Criar módulo de utilitários isolado (`src/lib/recurrence-utils.ts`) com funções puras para geração e cálculo das ocorrências mensais
  - [x] Atualizar schema de validação (`createEventSchema`) para suportar `recurrenceInterval` entre -1 (último) e 12
  - [x] No diálogo de criação de cultos/eventos (`CreateEventDialog`), exibir rótulo contextual no dropdown de acordo com a data selecionada (ex: "Todo 2º domingo do mês")
  - [x] Painel de configuração com seletor de semana do mês e prévia visual das próximas 4 datas geradas com badges informativas
  - [x] Atualizar formatação de rótulos de recorrência com respeito ao gênero gramatical em português e suporte a `startsAt` na lista e detalhes de eventos
  - [x] Cobertura de testes unitários automatizados para cálculos de dia da semana, labels e geração de ocorrências

- [x] Otimização de Performance, Redução do Tempo de Skeleton e Cache Multi-Camadas (Redis + Memória)
  - [x] Implementar camada de cache de alta performance (`src/lib/cache.ts`) com Upstash Redis e fallback em memória LRU L1/L2
  - [x] Caching inteligente com TTL e tags de invalidação nas consultas mais pesadas: departamentos, pessoas, cultos, visão geral do felicitômetro e contagem de notificações
  - [x] Otimizar consultas do Dashboard: substituir carga de 500 eventos por busca eficiente de próximos cultos (`listUpcomingEvents`)
  - [x] Eliminar cascatas (waterfalls) em Server Components rodando consultas paralelas via `Promise.all`
  - [x] Invalidação atômica de cache nas Server Actions ao criar, editar ou excluir registros

- [x] Corrigir erro de exportação de objeto em Server Action (`src/app/actions/events.ts`): removido `export` de `const STARTER_PLAN_TEMPLATE` que violava a diretiva `"use server"` causando `Error: A "use server" file can only export async functions, found object` ao escalar pessoas em produção.

- [x] Funcionalidade offline inteligente com segregação por nível de acesso (Membro, Líder e Admin)
  - [x] Estratégia de cache avançada no Service Worker (`public/sw.js`): pre-caching de manifest e ícones, e interceptação de `/api/offline-data` com Network-First e Cache-Fallback
  - [x] Bundle de dados offline inteligente por nível de usuário (`src/lib/offline-service.ts` e `/api/offline-data`):
    - **Membro:** Minhas Escalas (`/dashboard/schedules`) com datas, funções e ministérios, próximos cultos e perfil pessoal
    - **Líder de Ministério:** Escalas da equipe liderada, cronogramas de culto detalhados (ordem do culto com momentos e tempos para uso no templo sem Wi-Fi) e contatos rápidos
    - **Pastor / Administrador:** Acesso irrestrito a todas as ordens de culto com minutagem, escalas completas de todos os ministérios e telefones de emergência de toda a liderança
  - [x] Interface standalone interativa em `public/offline.html`: mesmo sem conexão inicial, permite navegar por abas (Minhas Escalas, Cronograma do Culto, Equipes e Contatos com links `tel:` diretos)
  - [x] Banner discreto no topo do aplicativo (`OfflineBanner`) com detecção de queda e retomada de sinal com aviso de sincronização
  - [x] Diálogo completo no app (`OfflineViewerDialog`) para consulta rápida de dados em cache
  - [x] Card de gerenciamento e sincronização manual em Configurações (`OfflineCacheCard`), disponível tanto no desktop quanto no menu mobile estilo iOS

- [x] Nova Home da Plataforma (Dashboard Admin e Membro) com Acessos Rápidos, Carrosséis Mobile e Navegação Nativa
  - [x] Seção de Acessos Rápidos no Dashboard com scroll horizontal e snap no mobile (Novo culto, Enviar aviso, Nova pessoa, Escala, Agenda, Ministérios e Cuidado pastoral)
  - [x] Próximo Culto em Destaque com contagem regressiva/proximidade (Hoje, Amanhã, Em X dias), horário, ministérios e status de preenchimento da escala com avatares
  - [x] Carrossel horizontal de Próximos Cultos e Eventos com snap touch para experiência nativa de app móvel
  - [x] Integração completa com Felicitômetro: check-in pessoal diário do líder e resumo de Cuidado Pastoral com média de sentimentos e lista de pedidos de oração/conversa com atalho direto de WhatsApp
  - [x] Carrossel horizontal de Pessoas Recentes cadastradas com acesso direto ao perfil do membro
  - [x] Barra inferior mobile (Bottom Navigation) com botão "Menu" (3 barras horizontais / `MenuIcon`) acionando o Drawer/Sidebar completo de navegação do sistema
  - [x] Quick Actions adaptadas para visão de membros (Minhas Escalas, Agenda, Ministérios, Pessoas, Avisos e Meu Perfil)
  - [x] Interface com shape impecável: Fraunces, cartões com bordas suaves, visual acolhedor e alta ergonomia de toque

- [x] Funcionalidade de Felicitômetro (check-in diário de sentimentos, oração e conversa) e Página Completa do Membro.
  - [x] Modelo de dados `person_mood` no Drizzle/Neon com score (1-5), pedidos de oração, necessidade de conversa com liderança, notas e unicidade por dia
  - [x] Card interativo do Felicitômetro com 5 níveis ilustrados, feedback de estado, edição diária e integração na home do membro
  - [x] Painel de Cuidado Pastoral com gráficos shadcn/ui (`ChartContainer`, `AreaChart`, `BarChart`) exibindo evolução temporal e distribuição de sentimentos
  - [x] Página completa de perfil do membro (`/dashboard/members/[personId]`) com dados cadastrais, cultos servidos, próximas escalas, histórico de sentimentos e indisponibilidades
  - [x] Controle de acesso e confidencialidade: visível apenas por líderes dos departamentos do membro ou administradores da igreja
  - [x] Links integrados na tabela de pessoas (`PeopleTable`) e atalhos diretos para WhatsApp e avisos direcionados

- [x] PWA notificações com push usando nativo (VAPID / Web Push) e suporte a OneSignal.
  - [x] Schema `push_subscription` para armazenar endpoints, chaves VAPID (`p256dh`, `auth`) e metadados de dispositivo
  - [x] Listeners de evento `push` e `notificationclick` no Service Worker (`public/sw.js`) com foco em janela aberta ou abertura de URL
  - [x] Serviço de envio de Web Push nativo (`src/lib/push-notifications.ts`) com fallback transparente para OneSignal
  - [x] Card de gerenciamento de Push Notifications em Configurações (`/dashboard/settings`), solicitação de permissão do navegador e botão de disparo de teste
  - [x] Integração ativa do canal "push" no despachador unificado `dispatchNotification` e no diálogo de avisos multicanal (`AnnouncementDialog`)
  - [x] Configurações de credenciais e tokens VAPID/OneSignal documentadas em `.env.example`

- [x] Popup e tutorial de instalação como PWA no celular (iOS / Android).
  - [x] Detecção inteligente de ambiente (iOS Safari, Android Chromium, modo standalone instalado)
  - [x] Suporte ao evento nativo `beforeinstallprompt` para instalação com 1 toque no Android/Chrome
  - [x] Tutorial passo a passo ilustrado para iOS (Compartilhar &gt; Adicionar à Tela de Início) e Android
  - [x] Banner flutuante no mobile com animação fluida e descarte persistente (`localStorage`)
  - [x] Card dedicado de PWA nas Configurações (`/dashboard/settings`), disponível tanto no desktop quanto no menu mobile estilo iOS

- [x] Possibilidade de notificar (via sistema e WhatsApp) um usuário do departamento que sou líder, ou usuário da igreja se for admin ou owner, com seleção multicanal.
  - [x] Suporte a líderes de departamento enviarem avisos para seus departamentos e membros liderados com autorização estrita
  - [x] Seleção ergonômica de destinatário: Toda a igreja (admin/owner), Por Departamento, ou Pessoa específica
  - [x] Painel de seleção de canais: No aplicativo (ativo por padrão), WhatsApp (disparo direto via Evolution API), E-mail (reserva futura), Push (reserva futura)
  - [x] Envio multicanal inteligente: disparo em lote in-app e despacho assíncrono para WhatsApp dos membros com telefone cadastrado
  - [x] Atalho de envio de avisos integrado diretamente na página do departamento (`/dashboard/departments/[id]`) e na central (`/dashboard/notifications`)

- [x] Tela de Agenda e Calendário Completo (`/dashboard/calendar`).
  - [x] Baseado no padrão de arquitetura headless do dninomiya/full-calendar-for-shadcn-ui integrado ao design system
  - [x] Cinco modos de visualização totalmente responsivos: Mês (`month`), Semana (`week`), Dia (`day`), Ano (`year`) e Agenda linear (`agenda`)
  - [x] Integração completa de dados: Cultos &amp; Eventos da igreja, Minhas Escalas de serviço com função/departamento e Bloqueios de Indisponibilidade
  - [x] Filtros interativos por chips: Todos, Cultos &amp; Eventos, Minhas Escalas e Indisponibilidades
  - [x] Navegação temporal fluida com botões Anterior/Próximo e atalho "Hoje"
  - [x] Diálogo de detalhes ao clicar em qualquer item da agenda com ações rápidas (ir ao culto ou gerenciar ausências)
  - [x] Configurações de início da semana (Domingo ou Segunda-feira) e fuso horário do usuário
  - [x] Preferências de calendário configuráveis tanto pelo cabeçalho da agenda quanto pela tela de Configurações (`/dashboard/settings`), tanto no Desktop quanto no menu mobile estilo iOS
  - [x] Item "Agenda" adicionado à barra de navegação lateral (Cultos &amp; Escalas) e menu inferior mobile para acesso de administradores e membros

- [x] Bloqueio pontual de datas de indisponibilidade com motivo/observação e períodos.
  - [x] Modelo de dados `person_unavailability` no Drizzle ORM com RLS policies e migration aplicada ao NeonDB
  - [x] Diálogo e formulário para marcar dia específico de ausência com data, motivo descritivo e seleção de dia todo ou períodos (Manhã, Tarde, Noite)
  - [x] Card de gerenciamento de indisponibilidades pontuais integrado em `/dashboard/availability`
  - [x] Detecção inteligente em tempo real e aviso visual na tela de escalas ao selecionar um membro indisponível para o culto (`AddAssignmentDialog`)
  - [x] Server actions para listar, salvar e remover bloqueios pontuais com revalidação instantânea de rotas

- [x] Disponibilidade dos usuários para servir nos cultos (dias da semana e períodos manhã, tarde e noite).
  - [x] Modelo de dados `person_availability` no Drizzle ORM com RLS e migration aplicada
  - [x] Rota `/dashboard/availability` com interface impecável e cartões responsivos por dia da semana
  - [x] Seleção independente de períodos: Manhã (06h-12h), Tarde (12h-18h) e Noite (18h-23h)
  - [x] Atalhos rápidos por dia (marcar dia todo ou limpar dia) e observações/restrições gerais
  - [x] Server actions de consulta e persistência atômica da disponibilidade
  - [x] Link direto "Disponibilidade" adicionado na navegação lateral (Cultos &amp; Escalas)

- [x] Integração com Evolution API Go (WhatsApp), Multi-canal de Notificações, Upstash Redis &amp; QStash e Onboarding com Telefone.
  - [x] Modelo de dados `organization_notification_channel` no Drizzle ORM com RLS e migration aplicada
  - [x] Campo `phone` no usuário e sincronização com o modelo `person`
  - [x] Coleta de WhatsApp/telefone no formulário de onboarding e edição na tela de Minha Conta
  - [x] Cliente HTTP da Evolution API Go (`checkEvolutionConnection`, `sendEvolutionTextMessage` e sanitização de telefones E.164)
  - [x] Card de configuração e testes da Evolution API em `/dashboard/settings` com status online em tempo real e envio de mensagem teste
  - [x] Despachador de notificações multi-canal (`dispatchNotification`) com modelos formatados para WhatsApp (boas-vindas, escalas e avisos)
  - [x] Notificação de boas-vindas disparada automaticamente ao criar a igreja/completar onboarding
  - [x] Notificação de escala disparada via WhatsApp para a pessoa escalada ao adicionar na equipe do culto
  - [x] Suporte à mensageria assíncrona com Upstash Redis &amp; QStash (`enqueueNotificationJob` e rota de webhook `/api/webhooks/qstash/notification` com verificação de assinatura)
  - [x] Endpoint de job agendado `/api/jobs/monthly-availability` para lembretes de disponibilidade mensal

- [x] Salvar cronograma como modelo, importação, limpeza e exportação de cronogramas de culto.
  - [x] Tabela `plan_template` no Drizzle ORM com RLS e migration aplicada
  - [x] Salvar qualquer cronograma como modelo personalizado com nome, descrição e contagem de itens
  - [x] Listagem e aplicação de modelos (modelo padrão do sistema e modelos da igreja)
  - [x] Alerta de confirmação seguro ao aplicar modelo ou importar caso o evento já possua momentos cadastrados
  - [x] Limpeza completa do cronograma com diálogo de confirmação
  - [x] Exportação de cronograma para arquivo estruturado `.json`
  - [x] Importação de cronograma via upload de arquivo `.json` com validação de esquema

- [x] Drag and Drop nos cronogramas de cultos e eventos.
  - [x] Integração completa com `@dnd-kit/core` e `@dnd-kit/sortable`
  - [x] Handle de arraste tátil com `GripVerticalIcon`, cursor dinâmico e feedback visual de elevação
  - [x] Reordenação em tempo real com atualização instantânea dos horários de início calculados
  - [x] Suporte a acessibilidade via teclado (`sortableKeyboardCoordinates`) e sensores de toque/ponteiro
  - [x] Persistência assíncrona com reversão otimista em caso de erro

- [x] Implementação da Funcionalidade de Cronograma: a ideia poder cadastrar o cronograma de um culto e evento. Podendo Add secoes, item, Horario e Tempo estimado podendo registrar quem será responsavel por aquela area (seja um usuario, ou registro manual com o nome da pessoa).
  - [x] Modelo de dados `event_plan_item` no Drizzle com RLS policies e migration aplicada
  - [x] Abas "Cronograma do Culto" e "Escala &amp; Equipes" integradas na página do evento
  - [x] Adicionar, editar e excluir seções (cabeçalhos) e momentos com descrição e louvores
  - [x] Cálculo dinâmico do horário de início de cada item a partir do horário do culto
  - [x] Duração estimada em MM:SS ou minutos, com totalizador e comparativo com o tempo previsto
  - [x] Vínculo do responsável por pessoa cadastrada (com avatar) ou nome manual
  - [x] Reordenação sequencial (subir / descer) dos momentos
  - [x] Modelo padrão de culto (starter template) para início rápido

- [x] Implementação da Tela de Configurações tanto para o admin como para o membro. O admin terá acesso a configurações mais avançadas. O membro terá acesso a configurações acerca do seu perfil, notificações, troca de senha,  passkey e etc.
  - [x] Tela `/dashboard/settings` com abas responsivas e design impecável
  - [x] Gestão de conta: nome, foto, aniversário e nome de usuário (@username)
  - [x] Segurança: alteração de senha com opção de revogar outras sessões
  - [x] Passkeys: cadastro de biometria/chave de segurança WebAuthn, listagem e remoção
  - [x] Multi-session: visualização de dispositivos/sessões ativas e encerramento remoto
  - [x] Preferências de notificações e atalho para a central
  - [x] Seletor de tema visual (Claro, Escuro, Sistema)
  - [x] Configurações avançadas para admin: identidade oficial da igreja e links de governança

- [x] Configurar no Better Auth:  
  - [x] [https://better-auth.com/docs/plugins/last-login-method](https://better-auth.com/docs/plugins/last-login-method)   
  - [x] [https://better-auth.com/docs/plugins/passkey](https://better-auth.com/docs/plugins/passkey)  
  - [x] [https://better-auth.com/docs/plugins/multi-session](https://better-auth.com/docs/plugins/multi-session)  
  - [x] [https://better-auth.com/docs/plugins/username](https://better-auth.com/docs/plugins/username)

- [x] Configurar deploy na Vercel (repositório GitHub, variáveis de ambiente e domínio).
  - [x] Repositório público criado em `open-mission/open-ministry`
  - [x] Variáveis de ambiente configuradas na Vercel (incluindo `DATABASE_AUTHENTICATED_URL`)
  - [ ] Domínio configurado — pendente de acesso ao DNS/domínio

- [x] Perfil, identidade da igreja, acesso como membro e tema.
  - [x] Perfil em modo somente leitura, com edição ao clicar em “Editar perfil”
  - [x] Upload de foto de perfil pelo UploadThing
  - [x] Admin/owner atualiza nome e logo da igreja; logo no painel
  - [x] Impersonação para admin/owner, com aviso fixo e retorno à conta original
  - [x] Schema do plugin admin do Better Auth e sincronização do papel global
  - [x] Tema claro, escuro e sistema no painel, login e site

- [x] Configuração do Ambiente: NextJs (ultima versão), NeonDB com Drizzle ORM, ShadnUI UI (Instale todos os componentes), Bun, Better Auth. Os Itens de configuração deixar em .env. Inicializar o Git. Configurar o Scalar API já desde de inicio para que possamos ter a documentação da api.
  - [x] Next.js 16 + Bun + TypeScript + Tailwind CSS
  - [x] Todos os componentes do shadcn/ui instalados
  - [x] Better Auth configurado com Drizzle adapter e OpenAPI
  - [x] Scalar API Reference em `/api/docs`
  - [x] Git inicializado com `main` e `develop`
  - [x] Migration inicial aplicada no NeonDB
  - [x] Cadastro, login e sessão validados no banco real
- [x] Configurar o Better Auth para Organizations se for o primeiro usuário deve ser o Administrador ou Owner, mas se for link de invite ele entra na igreja. Configurar permissões iniciais básicas como member e admin. Depois vamos implementando outras. Por enquanto vamos usar o invite por link.
  - [x] Primeiro usuário cria a igreja no onboarding e vira `owner`
  - [x] Permissões iniciais configuradas: `owner`, `admin` e `member`
  - [x] Convite por link com validade de 7 dias e aceite pelo email convidado
  - [x] Dashboard com lista de membros, convites pendentes, cancelamento e cópia do link
  - [x] Fluxos de cadastro, onboarding, convite e aceite validados no banco real
- [x] Configurar o Better Auth para funcionar com o OAuth2 do Google inicialmente. Usando como dados de usuários iniciais: Nome, Email, Profile Avatar, Data de Aniversário.
  - [x] Provider Google configurado com PKCE e escopos `email`, `profile` e `openid`
  - [x] Botões de cadastro e login com Google
  - [x] Nome, email e avatar preenchidos automaticamente pelo Google
  - [x] Campo `birthday` no usuário, coletado no cadastro, onboarding e aceite de convite
  - [x] URL de autorização e persistência do aniversário validadas no banco real
- [x] Configurar RLS no Neon com role dedicado e JWT para manter isolamento por igreja.
  - [x] Role `app_authenticated` com `LOGIN`, sem `BYPASSRLS`, separado do owner
  - [x] Better Auth JWT com `sub`/`org_id` e verificação no servidor (`jose`)
  - [x] Claims injetados por transação em `request.jwt.claims`
  - [x] Policies RLS para `organization`, `member`, `invitation` e `user`
  - [x] Leituras do dashboard/membros usando a conexão autenticada
  - [x] Smoke test de isolamento entre duas igrejas
  - [x] Role, migrations e `DATABASE_AUTHENTICATED_URL` aplicados no banco/Vercel de produção
- [x] Implementar o CRUD de Cadastro de Departamentos. A ideia é que possamos ter Nome, Descrição, Pessoas (podendo definir pessoas que fazem parte do Departamentos), tbm podemos definir as funcoes desse departamento, por exemplo Departamento de Midia tem as funcoes: Projeção, Stories, Fotografia e etc. Cada Função precisa ter um campo opcional de Descrição da funçao,a onde podemos explicar o que essa função faz. Cada Pessoa do departmanto podemos defiir quais areas elas podem atuar e qual nivel elas estao de experiencia nessa area (mais isso só visivel para os administradotes do departamento (ou Lider).
  - [x] Cadastro, edição e exclusão de departamentos (owner/admin)
  - [x] Funções com descrição opcional e contagem de pessoas atribuídas
  - [x] Pessoas do departamento, com líderes definidos pelo admin
  - [x] Funções por pessoa e nível de experiência visível só para admin/líder
  - [x] Policies de leitura RLS e navegação própria no painel
- [x] Implementar a funcionalidade de Aniversáriantes aonde mostra As datas de aniversáriantes da equipe, e qual o proximo aniversariante. Tbm é interessante ter um component que se tiver um aniversáriante hoje mostrar, tanto se for hoje, como também se for amanhã, por exemplo imagine que o lider entra no painel e ele pode ver que amanha é aniversário de um liderado.
  - [x] Lista completa do ano, ordenada a partir do mês atual
  - [x] Destaque de hoje e amanhã no painel e na página
  - [x] Próximo aniversariante em evidência
  - [x] Privacidade: dia/mês para todos; ano e idade só para admin
  - [x] Cada pessoa pode completar a própria data de nascimento
- [x] Desenvolver barra de notificacao que será usado para notificar quando um usuario for escalado, quando tiver notificacoes, os admin podem enviar notificacoes para a sua equipe e assim por diante.
  - [x] Notificações in-app por pessoa, com leitura e histórico
  - [x] Sino com badge e barra da notificação não lida no painel
  - [x] Notificação automática ao escalar e ao remover da escala
  - [x] Avisos da administração para toda a igreja ou para um departamento
  - [x] Central com marcar como lida e marcar todas como lidas
  - [x] Policies RLS e API de contagem para o sino
- [x] Desenvolver o Mobile que permitira os admin gerenciar as partes, mas tbm permitira os membros veres os eventos em que eles estaram escalados, informacoes sobre a agenda em que o seu departamento está vinculado. Desenvolver o seu perfil page tbm.
  - [x] PWA instalável com manifest, ícones, service worker e página offline
  - [x] Navegação inferior no celular
  - [x] Home do membro com escalas pessoais e agenda do departamento
  - [x] Página de perfil com nome, aniversário e avatar
  - [x] Aba Escalas pessoal para membros, com próximas e passadas
  - [x] Ajustes de responsividade nas telas de gestão e lista de pessoas em cartões no celular
- [x] Permitir cadastrar pessoas que ainda nao tem um usuario e depois poder vincular eles com um usuario cadastrado e/ou poder enviar um link de cadastro para essa pessoa.
  - [x] Modelo de pessoa com vínculo opcional a usuário
  - [x] Migrar departamentos e escalas para referenciar pessoas
  - [x] Cadastro, edição, exclusão e convite de pessoas
  - [x] Vínculo automático pelo email e vínculo manual pelo admin
  - [x] Aniversariantes e painel usando pessoas
- [x] Implementar a funcionalidade de Cultos e Eventos para cadastrar dados do Evento e Definir os Departamentos e Equipes que estaram atuando nesse evento, a ideia é começarmos simples e depois vamos aperfeiçoando. Entao ao cadastrar um evento ou Culto podemos definir Quais departamentos estaram atuando nesse evento. Com isso teremos uma aba chamado Escala que nos permite definir as pessoas que irao atuar nessa evento/culto, ele nao precisa configurar tudo na mesma hora, ele pode começar e depois terminar de ajustar. Com essa funcionalidade tbm teremos uma nova secao chamado Escalas, aonde poderemos ver todas as escalas criadas, as quejá passaram e as que virão. Assim Escala é um tipo de dados que pode estar vinculado a um evento ou culto. Ponto importante Quando cadastramos um evento podemos definri um evento recorreente (semanal, mensal, quinzenal ou customizado) mas precisamos de instancias separadas desse culto, pois a escala de um culto X recorrente que aconteceu por exemoplo nesse domingo, nao será a mesma que da semana que vem por exemplo. Mas quando for ajustarmos informacoes do evento precisamos da opcao de salvar esse ajusta apenas para esse evento ou para todos as ocorrencias.
  - [x] Cadastro de cultos e eventos com tipo, local, descrição, data, horário e duração
  - [x] Recorrência semanal, quinzenal, mensal e personalizada, com ocorrências separadas
  - [x] Edição e exclusão apenas desta ocorrência ou de toda a série
  - [x] Departamentos atuando em cada evento
  - [x] Escala por função do departamento, com pessoas do próprio departamento
  - [x] Seção Escalas com os encontros futuros e o histórico
  - [x] Admin gerencia eventos; líder do departamento monta a escala da sua equipe
  - [x] Policies de leitura RLS para eventos, departamentos atuantes e escalas

## Comentários ao Usuário (Para agentes deixar mensagens para os seres humanos)

- **05/11/2026:** Ambiente base configurado e validado (Next.js 16, Bun, shadcn/ui, Drizzle + Neon, Better Auth e Scalar). Migration aplicada no NeonDB e fluxo de cadastro/login/sessão testado com sucesso. Pronto para iniciar a task de Organizations.
- **06/11/2026:** Organizations concluído. O cadastro leva ao onboarding, onde o primeiro usuário cria a igreja e se torna `owner`; convidados entram por link com validade de 7 dias e papel `member` ou `admin`. O dashboard lista membros e convites pendentes. Todos os fluxos foram exercitados contra o NeonDB, incluindo a server action de convite. Próxima task: OAuth2 do Google.
- **06/11/2026:** OAuth2 do Google concluído. Nome, email e avatar vêm do perfil Google; a data de aniversário é opcional e coletada no cadastro, no onboarding e no aceite de convite. A URL de autorização foi validada (PKCE, escopos e redirect `http://localhost:3000/api/auth/callback/google`) e a persistência do aniversário foi confirmada no NeonDB. Próxima task: deploy na Vercel.
- **06/11/2026:** Repositório público criado em `open-mission/open-ministry` sob a **Sustainable Use License** (modelo fair-code, similar ao n8n): permite ver o código e fazer self-host, mas restringe uso comercial por terceiros e exige preservar a identidade visual da Open Mission. Faltam as variáveis de ambiente e o domínio na Vercel.
- **06/11/2026:** RLS concluído. A aplicação passou a usar duas conexões: `neondb_owner` para migrations/Better Auth e `app_authenticated` (sem `BYPASSRLS`) para leituras por igreja. O JWT do Better Auth carrega `sub`/`org_id`, os claims são injetados por transação e as policies isolam `organization`, `member`, `invitation` e `user`. O Neon MCP foi ativado via OAuth. O role e as migrations foram aplicados também no banco de produção; `DATABASE_AUTHENTICATED_URL` está configurada na Vercel (Production e Preview/develop). Próxima pendência: domínio na Vercel.
- **06/11/2026:** Departamentos concluído. Administradores criam e excluem ministérios e definem líderes; líderes editam o próprio departamento. Cada departamento tem funções com descrição opcional e pessoas com funções e nível de experiência, visível apenas para admin/líder. As novas tabelas têm policies de leitura RLS e grants para `app_authenticated`. Próxima task: aniversariantes.
- **06/11/2026:** Aniversariantes concluído. O painel mostra hoje, amanhã e os próximos aniversários; a página dedicada lista os 12 meses a partir do mês atual, com o próximo aniversariante em destaque. O dia e o mês são visíveis para a igreja; ano e idade só para owner/admin. A própria pessoa pode completar a data de nascimento em `/dashboard/birthdays`. Próxima task: cultos, eventos e escalas.
- **06/11/2026:** Cultos, eventos e escalas concluídos. Eventos têm tipo, local, descrição, duração e recorrência (semanal, quinzenal, mensal ou a cada N semanas), gerando ocorrências independentes com escala própria. A edição e a exclusão podem valer só para a ocorrência ou para toda a série. Cada evento define os departamentos atuantes e a escala é montada por função, com pessoas do próprio departamento; admin gerencia eventos e líderes montam a escala da sua equipe. A seção Escalas mostra os encontros futuros e o histórico.
- **06/11/2026:** Validação final concluída. As novas páginas e diálogos foram revisados no navegador em 1440px e 390px; os fluxos reais de criar/editar/excluir série recorrente, criar departamento e função, adicionar/remover pessoa, definir liderança, atribuir função com experiência, escalar e remover da escala foram exercitados contra o NeonDB. As permissões foram conferidas com uma conta de líder de departamento (vê apenas a própria equipe e não gerencia eventos). Os dados de teste foram removidos. Pendência restante: domínio na Vercel.
- **06/11/2026:** Pessoas pré-cadastradas concluído. Departamentos, escalas e aniversariantes passaram a referenciar `person`, que pode existir sem usuário; a migração fez o backfill das igrejas existentes. É possível criar, editar, excluir e convidar pessoas, vincular manualmente a uma conta e o vínculo automático acontece ao aceitar um convite pelo email. A tela de Pessoas mostra contas e pessoas sem conta, com departamentos e funções, e o mobile usa cartões em vez de tabela. Fluxos testados no navegador (criar, convidar, vincular, escalar sem conta, editar e excluir) e aceite de convite validado com vínculo automático e igreja ativa.
- **06/11/2026:** Mobile/PWA concluído. O app é instalável (manifest, ícones, service worker e página offline), tem navegação inferior no celular e uma home própria para membros com próximas escalas, agenda dos departamentos, aniversários e estatísticas pessoais. A aba Escalas mostra apenas as escalas do membro, com próximas e passadas. O perfil permite editar nome, aniversário e avatar, lista departamentos/funções e as próximas escalas. Tudo revisado em 390px e 1440px; atualização de perfil, service worker, cache offline e manifesto validados.
- **06/11/2026:** Notificações concluído. A central in-app tem sino com badge, barra da notificação não lida, leitura individual e em lote. Escalar ou remover uma pessoa gera notificação para a pessoa vinculada; a administração pode enviar avisos para toda a igreja ou para um departamento. Contagem do sino é atualizada por polling. Testado com criação real de escala e aviso, leitura, marcar todas, barra e contador sumindo, API de contagem e RLS.
- **06/11/2026:** Perfil, identidade da igreja, acesso como membro e tema concluídos. O perfil agora abre somente leitura e entra em edição por um botão; nome, aniversário e foto são salvos juntos, com upload pelo UploadThing. Admin/owner pode atualizar nome e logo da igreja em `/dashboard/church`, e o logo aparece no topo do painel. O plugin admin do Better Auth permite entrar como uma pessoa da igreja, com aviso fixo e retorno à conta original; a autorização é por igreja e os endpoints HTTP administrativos ficam bloqueados. O tema claro/escuro/sistema foi adicionado no painel, login e site. Fluxos de upload, edição de perfil, identidade da igreja, impersonação e alternância de tema validados no navegador em 1440px e 390px; schema e migration do admin plugin aplicados no Neon.
- **06/11/2026:** Plugins do Better Auth concluídos. Foram ativados os plugins `last-login-method`, `passkey`, `multi-session` e `username` no servidor e no cliente, com schema gerado e migration aplicada no NeonDB. A tela de login passou a suportar autenticação com Passkey (WebAuthn/biometria), entrada com email ou @username, e badge indicador do último método de login utilizado; o cadastro permite registrar opcionalmente o nome de usuário.
- **06/11/2026:** Tela de Configurações concluída. Foi implementada a rota `/dashboard/settings` com suporte completo para membros e administradores. O membro pode gerenciar seus dados de conta e @username, cadastrar chaves de acesso biométricas (passkeys), trocar de senha, inspecionar e revogar sessões e dispositivos ativos (multi-session), alternar temas e ajustar preferências de notificações. Administradores têm acesso adicional à identidade oficial da igreja e governança. O menu lateral e o perfil ganharam atalhos diretos.
- **06/11/2026:** Cronograma de Culto e Evento concluído. O painel do evento ganhou visualização em abas com a Ordem do Culto (Cronograma) inspirada no Planning Center/Voluts e as Equipes/Escala. É possível criar seções em destaque, itens com duração estimada em MM:SS, notas e louvores, e definir o responsável (por membro com avatar ou texto livre). O sistema calcula os horários de início de cada momento em tempo real a partir do início do culto e compara o tempo total planejado com a duração prevista do evento. Permite carregar um modelo padrão de culto com 1 clique e reordenar qualquer momento.
- **07/11/2026:** Ajustes de design e refinamentos de UI (Design Feedback) concluídos:
  - Diálogo de momentos do cronograma atualizado: modal largo (`sm:max-w-2xl`) no desktop e `Drawer` (shadcn) em tela cheia no mobile para melhor ergonomia de toque.
  - Formulários de criação e edição de eventos atualizados: substituição do campo numérico de duração por "Horário de término aproximado" (`type="time"`), com cálculo automático da duração para a API.
  - Navegação lateral reestruturada por categorias semânticas (*Principal*, *Cultos &amp; Escalas*, *Pessoas &amp; Equipes*, *Configurações* no final).
  - Rodapé da barra lateral atualizado com `NavUser` (dropdown shadcn contendo avatar, nome, email, papel, links para perfil, configurações, notificações e logout).
  - Cabeçalho limpo: texto repetido "OpenMinistry" removido, separador vertical alinhado e substituído o texto estático "Painel" por `DashboardBreadcrumb` dinâmico integrado ao shadcn.
  - Sino de notificações com Popover interativo: prévia das últimas notificações com indicador de não lida, botão de marcar todas como lidas e link direto para a central completa.
  - Removidas bordas duplicadas nos avatares da igreja em `/dashboard/church` e no formulário de identidade visual.
- **07/11/2026:** Drag and drop no cronograma concluído. Os momentos e seções do culto agora podem ser reordenados diretamente arrastando pelo handle vertical com animação suave, feedback de elevação e suporte tanto a mouse/toque quanto teclado. Os horários recalculam em tempo real e a persistência é sincronizada no banco com atualização otimista.
- **07/11/2026:** Modelos e gestão de cronograma concluídos. Agora é possível salvar o cronograma de qualquer culto como modelo reutilizável da igreja, aplicar modelos salvos ou o modelo padrão do sistema (com alerta inteligente caso já existam itens para evitar perdas acidentais), limpar o cronograma por completo com confirmação e exportar/importar cronogramas em formato `.json`.
- **07/11/2026:** Notificações via Evolution API Go (WhatsApp) e Upstash Redis/QStash concluídas. Cada igreja pode configurar sua própria instância da Evolution API em Configurações &gt; Notificações, testar a conexão com status online e disparar mensagens de teste. O onboarding agora coleta WhatsApp/telefone do usuário, sincronizando com a pessoa e enviando notificação de boas-vindas. Ao escalar pessoas para eventos, notificações personalizadas são enviadas por WhatsApp além do in-app. Toda a mensageria suporta a fila assíncrona do Upstash Redis e QStash com fallback transparente.
- **07/11/2026:** Disponibilidade para servir concluída. Foi criada a rota `/dashboard/availability` onde voluntários e membros podem definir seus dias e períodos disponíveis (manhã, tarde e noite) para servir nos cultos da igreja, além de registrar observações e preferências para a liderança. A navegação lateral agora conta com o atalho "Disponibilidade" e o modelo conta com RLS e persistência atômica.
- **07/11/2026:** Design Feedback das Configurações no Mobile concluído. A tela `/dashboard/settings` ganhou layout inspirado nas configurações do iPhone/iOS em telas móveis: cabeçalho de perfil estilo Apple ID, seções agrupadas em cartões com cantos arredondados, ícones em squircle coloridos, navegação fluida em drill-down com botão de retorno ("‹ Configurações") e subtítulos informativos. No desktop, a navegação clássica por abas é mantida com total responsividade.
- **07/11/2026:** Notificações multicanal e avisos para líderes de departamento concluídos. Líderes de departamentos agora podem enviar avisos para suas equipes e membros de forma direcionada, enquanto administradores podem notificar toda a igreja, departamentos ou membros individuais. O novo modal de avisos conta com seleção de canais (App, WhatsApp via Evolution API, além de slots para Email e Push), feedback em tempo real e integração direta na central de notificações e na página de detalhes do departamento.
- **07/11/2026:** Tutorial e pop-up de instalação PWA concluídos. Foi desenvolvido um sistema completo de instalação como aplicativo com detecção automática de sistema operacional (iOS e Android), suporte ao prompt nativo do navegador para instalação em um toque no Chromium/Android, guia passo a passo ilustrado com ícones para Safari no iOS (Compartilhar > Adicionar à Tela de Início), banner flutuante no mobile com descarte persistente (`localStorage`) e card dedicado nas Configurações (`/dashboard/settings`).
- **07/11/2026:** PWA Push Notifications concluído. Foi implementado o suporte a notificações push nativas via VAPID/Web Push e OneSignal com persistência de subscrições (`push_subscription` no Drizzle/NeonDB), eventos de recebimento e clique no Service Worker (`public/sw.js`), card de ativação e disparo de teste em `/dashboard/settings` e integração direta com o canal push em avisos e escalas.
- **07/11/2026:** Felicitômetro e Página do Membro concluídos. Os membros agora podem registrar diariamente seu estado emocional em uma escala de 5 níveis ilustrados, com opção de solicitar oração e conversa com a liderança. A central de pessoas ganhou uma nova aba de Cuidado Pastoral com gráficos shadcn/ui (`AreaChart` de evolução temporal e `BarChart` de distribuição), além de alertas de solicitações de oração. Foi criada a página dedicada do membro (`/dashboard/members/[personId]`) exibindo histórico completo de escalas, cultos servidos, gráficos do felicitômetro, indisponibilidades e atalhos rápidos de contato.
- **07/11/2026:** Recorrência por dia da semana no mês concluída. Foi implementada a opção de recorrência mensal baseada no dia da semana (ex: "Todo 2º domingo do mês", "Toda 3ª segunda-feira do mês", "Todo último domingo do mês"). No formulário de criação de cultos/eventos (`CreateEventDialog`), o select adapta dinamicamente seu rótulo de acordo com a data escolhida. O usuário tem à disposição um seletor para ajustar a semana (1ª, 2ª, 3ª, 4ª ou última) e um card com feedback imediato das próximas ocorrências estimadas. A geração no banco e os rótulos respeitam o gênero gramatical e o fuso horário da igreja, com suite completa de testes unitários.
- **07/11/2026:** UI Otimista, Notificações Reativas e Otimizações de Cache concluídas:
  - Eliminação de loading e queries repetitivas no sino de notificações (`NotificationBell`): agora os dados são hidratados diretamente do servidor na primeira carga e gerenciados por uma store reativa no cliente (`useSyncExternalStore`), evitando requisições de rede ao abrir/fechar repetidamente.
  - Fechamento imediato (0ms de latência percebida) da barra superior de notificação (`NotificationBar` / `DismissNotificationButton`): a notificação desaparece instantaneamente da tela ao clicar em fechar e atualiza o badge do sino, enviando a persistência no banco em segundo plano sem bloquear a interface nem forçar recarga da página.
  - Marcação de lida otimista na central de notificações (`/dashboard/notifications`) e no sino com rollback automático se houver erro de rede.
  - Cache em memória do conjunto de chaves JWKS (`schema.jwks`) em `src/db/tenant.ts` com TTL de 15 minutos, eliminando queries SQL desnecessárias ao NeonDB a cada operação tenant autenticada.
  - Pipelining de comandos Upstash Redis (`redis.pipeline()`) em `src/lib/cache.ts`: operações de gravação e invalidação de tags agora são despachadas em um único roundtrip HTTP batched em vez de N chamadas sequenciais.
  - Caching L1/L2 com tag da organização em `withTenantDb`.
  - Cobertura de testes unitários para a store de notificações reativa (`src/lib/__tests__/notification-store.test.ts`).
- **07/11/2026:** Refinamentos de UI/UX Mobile em Eventos e Calendário concluídos:
  - Header de Detalhes do Culto (`/dashboard/events/[id]`): caixa grande de data 80x80 ocultada no mobile para liberar espaço; link repetido de voltar removido; ícone de voltar no cabeçalho ampliado para toque com `size-5`; breadcrumb adaptado para exibir apenas o título da página ("Detalhes do culto") sem corte ou quebra de linha.
  - Abas ("Cronograma do Culto" e "Escala & Equipes"): altura padronizada (`h-10` container, `h-8` triggers) com badges alinhadas e largura preenchendo a tela do celular sem truncamentos.
  - Cronograma do Culto no Mobile: dividido em Modo Leitura (itinerário limpo, sem botões de arrastar ou ações poluidoras) e Modo Edição em Drawer (`92dvh`) acionado por botão destacado "Editar Cronograma".
  - Duração dos Momentos: adicionada a unidade "min" (ex: `5 min`, `20 min`) no badge de duração, eliminando a confusão de parecer dois horários lado a lado.
  - Calendário e Agenda (`/dashboard/calendar`): escalas com múltiplas funções para o mesmo evento (ex: Cameraman e Livestream) agora são agrupadas em um único card (`Escalado: Cameraman, Livestream`), e na visualização geral o card de escala substitui o card genérico do evento, eliminando itens duplicados para o mesmo culto.


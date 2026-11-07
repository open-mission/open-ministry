# OpenMinistry

O Projeto é o OpenMinistry inspirado em aplicativos com PlanningCenter e Voluts. Esse app tente a ser uma solução para ajudar igrejas a se organizarem.

A principio teremos a tela do admin e dos membros. Vamos começar com a tela Admin que consegue ver os usuários cadastrados convidar novos membros.

## TODO

Atualizar a task nos status abaixo de acordo com que for trabalhando, sempre commitando de forma organizada e seguindo o git flow os ajustes.

### Backlog

- [ ] Implementar a opção do usuário selecionar datas específicas de indisponibilidade (bloqueio de data pontual com motivo/observação e período).
- [ ] Implementar tela de agenda e calendário completo baseado no repositório dninomiya/full-calendar-for-shadcn-ui (views: dia, semana, mês, ano e agenda; exibição de cultos, escalas do usuário e dias indisponíveis; configurações de início da semana e fuso horário).

### Doing

### Done

- [x] Disponibilidade dos usuários para servir nos cultos (dias da semana e períodos manhã, tarde e noite).
  - [x] Modelo de dados `person_availability` no Drizzle ORM com RLS e migration aplicada
  - [x] Rota `/dashboard/availability` com interface impecável e cartões responsivos por dia da semana
  - [x] Seleção independente de períodos: Manhã (06h-12h), Tarde (12h-18h) e Noite (18h-23h)
  - [x] Atalhos rápidos por dia (marcar dia todo ou limpar dia) e observações/restrições gerais
  - [x] Server actions de consulta e persistência atômica da disponibilidade
  - [x] Link direto "Disponibilidade" adicionado na navegação lateral (Cultos & Escalas)

- [x] Integração com Evolution API Go (WhatsApp), Multi-canal de Notificações, Upstash Redis & QStash e Onboarding com Telefone.
  - [x] Modelo de dados `organization_notification_channel` no Drizzle ORM com RLS e migration aplicada
  - [x] Campo `phone` no usuário e sincronização com o modelo `person`
  - [x] Coleta de WhatsApp/telefone no formulário de onboarding e edição na tela de Minha Conta
  - [x] Cliente HTTP da Evolution API Go (`checkEvolutionConnection`, `sendEvolutionTextMessage` e sanitização de telefones E.164)
  - [x] Card de configuração e testes da Evolution API em `/dashboard/settings` com status online em tempo real e envio de mensagem teste
  - [x] Despachador de notificações multi-canal (`dispatchNotification`) com modelos formatados para WhatsApp (boas-vindas, escalas e avisos)
  - [x] Notificação de boas-vindas disparada automaticamente ao criar a igreja/completar onboarding
  - [x] Notificação de escala disparada via WhatsApp para a pessoa escalada ao adicionar na equipe do culto
  - [x] Suporte à mensageria assíncrona com Upstash Redis & QStash (`enqueueNotificationJob` e rota de webhook `/api/webhooks/qstash/notification` com verificação de assinatura)
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
- **07/11/2026:** Notificações via Evolution API Go (WhatsApp) e Upstash Redis/QStash concluídas. Cada igreja pode configurar sua própria instância da Evolution API em Configurações > Notificações, testar a conexão com status online e disparar mensagens de teste. O onboarding agora coleta WhatsApp/telefone do usuário, sincronizando com a pessoa e enviando notificação de boas-vindas. Ao escalar pessoas para eventos, notificações personalizadas são enviadas por WhatsApp além do in-app. Toda a mensageria suporta a fila assíncrona do Upstash Redis e QStash com fallback transparente.
- **07/11/2026:** Disponibilidade para servir concluída. Foi criada a rota `/dashboard/availability` onde voluntários e membros podem definir seus dias e períodos disponíveis (manhã, tarde e noite) para servir nos cultos da igreja, além de registrar observações e preferências para a liderança. A navegação lateral agora conta com o atalho "Disponibilidade" e o modelo conta com RLS e persistência atômica.
- **07/11/2026:** Design Feedback das Configurações no Mobile concluído. A tela `/dashboard/settings` ganhou layout inspirado nas configurações do iPhone/iOS em telas móveis: cabeçalho de perfil estilo Apple ID, seções agrupadas em cartões com cantos arredondados, ícones em squircle coloridos, navegação fluida em drill-down com botão de retorno ("‹ Configurações") e subtítulos informativos. No desktop, a navegação clássica por abas é mantida com total responsividade.


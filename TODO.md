# OpenMinistry

O Projeto é o OpenMinistry inspirado em aplicativos com PlanningCenter e Voluts. Esse app tente a ser uma solução para ajudar igrejas a se organizarem.

A principio teremos a tela do admin e dos membros. Vamos começar com a tela Admin que consegue ver os usuários cadastrados convidar novos membros.

## TODO

Atualizar a task nos status abaixo de acordo com que for trabalhando, sempre commitando de forma organizada e seguindo o git flow os ajustes.

### Backlog

- [ ] Configurar deploy na Vercel (repositório GitHub, variáveis de ambiente e domínio).
  - [x] Repositório público criado em `open-mission/open-ministry`
  - [x] Variáveis de ambiente configuradas na Vercel (incluindo `DATABASE_AUTHENTICATED_URL`)
  - [ ] Domínio configurado — pendente de acesso ao DNS/domínio
- [ ] Desenvolver o Mobile que permitira os admin gerenciar as partes, mas tbm permitira os membros veres os eventos em que eles estaram escalados, informacoes sobre a agenda em que o seu departamento está vinculado. Desenvolver o seu perfil page tbm.

- [ ] Desenvolver barra de notificacao que será usado para notificar quando um usuario for escalado, quando tiver notificacoes, os admin podem enviar notificacoes para a sua equipe e assim por diante.

### Doing

- [ ] Permitir cadastrar pessoas que ainda nao tem um usuario e depois poder vincular eles com um usuario cadastrado e/ou poder enviar um link de cadastro para essa pessoa.
  - [ ] Modelo de pessoa com vínculo opcional a usuário
  - [ ] Migrar departamentos e escalas para referenciar pessoas
  - [ ] Cadastro, edição, exclusão e convite de pessoas
  - [ ] Vínculo automático pelo email e vínculo manual pelo admin
  - [ ] Aniversariantes e painel usando pessoas

### Done

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
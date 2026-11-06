# OpenMinistry

O Projeto é o OpenMinistry inspirado em aplicativos com PlanningCenter e Voluts. Esse app tente a ser uma solução para ajudar igrejas a se organizarem.

A principio teremos a tela do admin e dos membros. Vamos começar com a tela Admin que consegue ver os usuários cadastrados convidar novos membros.

## TODO



Atualizar a task nos status abaixo de acordo com que for trabalhando, sempre commitando de forma organizada e seguindo o git flow os ajustes.

### Backlog

- [ ] Configurar deploy na Vercel (repositório GitHub, variáveis de ambiente e domínio).

### Doing



### Done

- [x]  Configuração do Ambiente: NextJs (ultima versão), NeonDB com Drizzle ORM, ShadnUI UI (Instale todos os componentes), Bun, Better Auth. Os Itens de configuração deixar em .env. Inicializar o Git. Configurar o Scalar API já desde de inicio para que possamos ter a documentação da api.
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

## Comentários ao Usuário (Para agentes deixar mensagens para os seres humanos)

- **05/11/2026:** Ambiente base configurado e validado (Next.js 16, Bun, shadcn/ui, Drizzle + Neon, Better Auth e Scalar). Migration aplicada no NeonDB e fluxo de cadastro/login/sessão testado com sucesso. Pronto para iniciar a task de Organizations.
- **06/11/2026:** Organizations concluído. O cadastro leva ao onboarding, onde o primeiro usuário cria a igreja e se torna `owner`; convidados entram por link com validade de 7 dias e papel `member` ou `admin`. O dashboard lista membros e convites pendentes. Todos os fluxos foram exercitados contra o NeonDB, incluindo a server action de convite. Próxima task: OAuth2 do Google.
- **06/11/2026:** OAuth2 do Google concluído. Nome, email e avatar vêm do perfil Google; a data de aniversário é opcional e coletada no cadastro, no onboarding e no aceite de convite. A URL de autorização foi validada (PKCE, escopos e redirect `http://localhost:3000/api/auth/callback/google`) e a persistência do aniversário foi confirmada no NeonDB. Próxima task: deploy na Vercel.
# OpenMinistry

O Projeto é o OpenMinistry inspirado em aplicativos com PlanningCenter e Voluts. Esse app tente a ser uma solução para ajudar igrejas a se organizarem.

A principio teremos a tela do admin e dos membros. Vamos começar com a tela Admin que consegue ver os usuários cadastrados convidar novos membros.

## TODO



Atualizar a task nos status abaixo de acordo com que for trabalhando, sempre commitando de forma organizada e seguindo o git flow os ajustes.

### Backlog

- [ ] Configurar deploy na Vercel (repositório GitHub, variáveis de ambiente e domínio).
- [ ] Configurar o Better Auth para Organizations se for o primeiro usuário deve ser o Administrador ou Owner, mas se for link de invite ele entra na igreja. Configurar permissões iniciais básicas como member e admin. Depois vamos implementando outras. Por enquanto vamos usar o invite por link.
- [ ] Configurar o Better Auth para funcionar com o OAuth2 do Google inicialmente. Usando como dados de usuários iniciais: Nome, Email, Profile Avatar, Data de Aniversário.

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



## Comentários ao Usuário (Para agentes deixar mensagens para os seres humanos)

- **05/11/2026:** Ambiente base configurado e validado (Next.js 16, Bun, shadcn/ui, Drizzle + Neon, Better Auth e Scalar). Migration aplicada no NeonDB e fluxo de cadastro/login/sessão testado com sucesso. Pronto para iniciar a task de Organizations.
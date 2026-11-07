# OpenMinistry

Uma solução para ajudar igrejas a se organizarem, cuidarem das pessoas e
crescerem em comunidade. Inspirado em ferramentas como Planning Center e
Voluts.

O painel reúne as pessoas da igreja, os departamentos e suas funções, os
aniversariantes, os cultos e eventos recorrentes, as escalas de cada ocorrência e
as notificações. O **admin** cuida da estrutura e das permissões; líderes de
departamento montam a escala da própria equipe; membros acompanham a vida da
igreja pelo celular. O app é instalável como PWA e tem uma home própria para
quem serve.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack e Cache Components)
- [React 19](https://react.dev/)
- [Bun](https://bun.sh/) como runtime e gerenciador de pacotes
- [NeonDB](https://neon.tech/) + [Drizzle ORM](https://orm.drizzle.team/)
- [Better Auth](https://www.better-auth.com/)
- [UploadThing](https://uploadthing.com/) para foto de perfil e logo da igreja
- [shadcn/ui](https://ui.shadcn.com/) (todos os componentes instalados)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [date-fns](https://date-fns.org/) + `date-fns-tz` para datas e recorrências
- [Scalar](https://scalar.com/) para documentação da API

## Pré-requisitos

- Bun 1.3+
- Uma conta no [Neon](https://neon.tech/) com um projeto criado

## Configuração

1. Instale as dependências:

   ```bash
   bun install
   ```

2. Crie o arquivo de ambiente:

   ```bash
   cp .env.example .env
   ```

3. Preencha o `.env`:

   | Variável | Descrição |
   | --- | --- |
   | `DATABASE_URL` | Connection string do Neon (use a versão _pooled_) |
   | `DATABASE_AUTHENTICATED_URL` | Conexão do role `app_authenticated`, usada para leituras com RLS. Gerada pelo script de setup |
   | `BETTER_AUTH_SECRET` | Segredo do Better Auth. Gere com `openssl rand -base64 32` |
   | `BETTER_AUTH_URL` | URL base da aplicação (`http://localhost:3000` em dev) |
   | `NEXT_PUBLIC_APP_URL` | URL pública usada pelo cliente |
   | `GOOGLE_CLIENT_ID` | Client ID do Google OAuth |
   | `GOOGLE_CLIENT_SECRET` | Client Secret do Google OAuth |
   | `UPLOADTHING_TOKEN` | Token do app no UploadThing, usado para foto de perfil e logo da igreja |

4. Aplique as migrations no banco:

   ```bash
   bun run db:migrate
   ```

5. Crie o role restrito de RLS e gere a URL autenticada:

   ```bash
   node scripts/setup-app-role.mjs
   ```

   O script cria/atualiza `app_authenticated` e adiciona
   `DATABASE_AUTHENTICATED_URL` ao `.env`.

6. Inicie o servidor de desenvolvimento:

   ```bash
   bun run dev
   ```

7. Acesse [http://localhost:3000](http://localhost:3000).

## URLs úteis

| URL | Descrição |
| --- | --- |
| `/` | Página inicial |
| `/dashboard` | Visão geral da igreja |
| `/dashboard/members` | Pessoas, convites e vínculos com contas |
| `/dashboard/departments` | Departamentos, funções e níveis de experiência |
| `/dashboard/birthdays` | Aniversariantes e próxima celebração |
| `/dashboard/church` | Nome e logo da igreja (edição para admin/owner) |
| `/dashboard/events` | Cultos e eventos, com recorrência |
| `/dashboard/schedules` | Escalas: todas para admin, pessoais para membros |
| `/dashboard/profile` | Perfil, departamentos e próximas escalas |
| `/dashboard/notifications` | Central de notificações e avisos |
| `/api/docs` | Documentação da API (Scalar) |
| `/api/auth/reference` | Referência dos endpoints do Better Auth (Scalar) |
| `/api/openapi` | OpenAPI da aplicação |
| `/api/auth/open-api/generate-schema` | OpenAPI gerado pelo Better Auth |
| `/api/health` | Health check da API |
| `/api/notifications/unread-count` | Contagem de notificações não lidas do sino |
| `/manifest.webmanifest` | Manifest PWA |
| `/offline.html` | Página de fallback quando o app está sem conexão |

## Scripts

| Comando | Descrição |
| --- | --- |
| `bun run dev` | Inicia o servidor de desenvolvimento |
| `bun run build` | Gera o build de produção |
| `bun run vercel-build` | Build da Vercel: roda as migrations em Production e depois o build |
| `bun run start` | Inicia o build de produção |
| `bun run lint` | Executa o ESLint |
| `bun run typecheck` | Gera os tipos de rota e verifica o TypeScript |
| `bun run db:generate` | Gera uma migration a partir do schema Drizzle |
| `bun run db:migrate` | Aplica as migrations no banco |
| `bun run db:push` | Sincroniza o schema diretamente no banco (uso local) |
| `bun run db:studio` | Abre o Drizzle Studio |
| `bun run auth:generate` | Gera o schema Drizzle a partir da configuração do Better Auth |
| `node scripts/setup-app-role.mjs` | Cria/atualiza o role `app_authenticated` e a URL de RLS |
| `node scripts/rls-smoke-test.mjs` | Valida o isolamento por igreja (requer `bun run dev`) |

## Funcionalidades

- **Pessoas e convites:** owner/admin convidam por link; o convite expira em 7 dias. Pessoas podem ser cadastradas antes de terem conta, entram em departamentos e escalas, e são vinculadas automaticamente pelo email ao aceitar o convite ou manualmente pelo admin.
- **Departamentos:** nome, descrição, funções com descrição opcional, pessoas e líderes. Cada pessoa pode atuar em várias funções, com nível de experiência visível apenas para admin e líderes do departamento.
- **Aniversariantes:** dia e mês para toda a igreja; ano e idade só para owner/admin. O painel destaca hoje, amanhã e o próximo aniversariante; cada pessoa pode completar a própria data, inclusive quem ainda não tem conta.
- **Cultos e eventos:** tipo, local, descrição e duração; recorrência semanal, quinzenal, mensal ou a cada N semanas, gerando ocorrências independentes. A edição e a exclusão podem valer só para a ocorrência ou para toda a série.
- **Escalas:** cada evento define os departamentos atuantes; a escala é montada por função, com as pessoas do próprio departamento, tenham conta ou não. Admin gerencia eventos; admin e líder do departamento montam a escala da equipe. Membros veem apenas as próprias escalas.
- **Mobile/PWA:** manifest, ícones, service worker e página offline; navegação inferior no celular; home do membro com escalas, agenda dos departamentos e aniversários; perfil com nome, aniversário e avatar.
- **Perfil e identidade:** o perfil abre em modo somente leitura e entra em edição ao clicar em “Editar perfil”; nome, aniversário e foto são salvos juntos. A foto é enviada pelo UploadThing. Admin/owner também atualiza o nome e o logo da igreja em `/dashboard/church`; o logo aparece no topo do painel.
- **Acesso como membro:** admin/owner pode entrar como uma pessoa da igreja para conferir a experiência dela. Um aviso fixo no topo mostra a sessão impersonada e permite voltar para a própria conta. A autorização é verificada por igreja na server action e os endpoints HTTP do plugin admin do Better Auth ficam bloqueados.
- **Tema:** claro, escuro ou sistema. A alternância fica no painel, no login e no site; a preferência é lembrada no navegador.
- **Notificações:** sino com badge e barra da notificação não lida; notificação ao ser escalado ou removido de uma escala; avisos da administração para toda a igreja ou para um departamento; leitura individual e em lote.

## Estrutura

```txt
src/
├── app/
│   ├── (app)/dashboard/             # Painel, pessoas, departamentos, eventos, escalas, perfil e notificações
│   ├── (auth)/                      # Login, cadastro, onboarding e convite
│   ├── api/
│   │   ├── auth/[...all]/route.ts   # Handler do Better Auth
│   │   ├── docs/route.ts            # Scalar API Reference
│   │   ├── health/route.ts          # Health check
│   │   ├── notifications/           # Contagem de notificações não lidas
│   │   ├── openapi/route.ts         # OpenAPI da aplicação
│   │   └── uploadthing/             # File router de perfil e logo
│   ├── actions/                     # Server actions
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── app/
│   ├── auth/
│   ├── birthdays/
│   ├── church/
│   ├── departments/
│   ├── events/
│   ├── members/
│   ├── notifications/
│   ├── people/
│   ├── profile/
│   ├── uploads/
│   └── ui/                          # Componentes do shadcn/ui
├── db/
│   ├── migrations/                  # Migrations geradas pelo Drizzle Kit
│   ├── schema/
│   │   ├── auth.ts                  # Tabelas geradas pelo Better Auth
│   │   ├── departments.ts           # Departamentos, funções e experiência
│   │   ├── events.ts                # Cultos, eventos, departamentos atuantes e escalas
│   │   ├── notifications.ts         # Notificações por pessoa
│   │   ├── people.ts                # Pessoas e vínculo opcional com usuário
│   │   └── index.ts
│   ├── index.ts                     # Cliente Drizzle + Neon (owner)
│   └── tenant.ts                    # Cliente Drizzle + RLS (app_authenticated)
├── hooks/
└── lib/
    ├── admin-role.ts                # Papel global do plugin admin por igreja
    ├── agenda.ts                    # Escalas pessoais e agenda dos departamentos
    ├── auth.ts                      # Configuração do Better Auth
    ├── auth-client.ts               # Cliente do Better Auth
    ├── birthdays.ts                 # Cálculo dos aniversariantes
    ├── departments.ts               # Consultas e permissões de departamentos
    ├── event-options.ts             # Tipos e rótulos de cultos e eventos
    ├── events.ts                    # Recorrência, consultas e formatação de eventos
    ├── experience.ts                # Níveis de experiência por função
    ├── notifications.ts             # Consultas, leitura e criação de notificações
    ├── organizations.ts             # Contexto da igreja ativa
    ├── people.ts                    # Consultas e vínculo de pessoas
    ├── person-format.ts             # Helpers puros de exibição de pessoas
    ├── request-origin.ts            # Origem segura para links de convite
    ├── session.ts                   # Sessão autenticada
    ├── uploadthing.ts               # Hook tipado do UploadThing
    └── utils.ts

public/
├── icons/                           # Ícones do PWA
├── offline.html                     # Fallback offline autocontido
└── sw.js                            # Service worker (network-first em navegação)

scripts/
├── auth-generate.mjs                # Gera o schema do Better Auth sem o server-only
├── setup-app-role.mjs               # Cria o role e a URL de RLS
└── rls-smoke-test.mjs               # Testa o isolamento por igreja
```

## Git Flow

- `main`: releases estáveis.
- `develop`: integração do desenvolvimento em andamento.
- `feature/<nome>`, `fix/<nome>` e `chore/<nome>`: branches de trabalho criadas a partir da `develop`.

Commits seguem [Conventional Commits](https://www.conventionalcommits.org/).

## Deploy na Vercel

O projeto está publicado na Vercel em `openmission/openministry`. O comando de
build `vercel-build` aplica as migrations do Drizzle antes do build:

- **Production** (`VERCEL_ENV=production`): executa `drizzle-kit migrate` e
  depois `next build`.
- **Preview** e desenvolvimento: executa apenas `next build`, para não alterar o
  banco usado em produção.

O `DATABASE_URL` precisa estar configurado no ambiente de Production da Vercel.
O `DATABASE_AUTHENTICATED_URL` também precisa existir em Production e Preview,
apontando para o role `app_authenticated` do banco de produção.

Em **Preview**, `src/lib/app-url.ts` deriva a URL pública de `VERCEL_URL`, então
cada deploy usa o próprio host para Better Auth/JWKS. O branch de preview do
Neon precisa das migrations e do role `app_authenticated`; o
`DATABASE_AUTHENTICATED_URL` do Preview/develop deve apontar para esse branch.
Login com Google em preview exige um redirect URI adicional no Google Cloud
(email/senha funciona normalmente).

As variáveis de banco de Production/Preview foram recriadas como **Sensitive**.
Se a integração Neon recriar `DATABASE_URL`/`DATABASE_URL_UNPOOLED`, os avisos de
`readable-secret` podem voltar; verifique a página de Environment Variables após
re-sincronizar a integração.

Para preparar um banco de produção novo:

```bash
DATABASE_URL=<unpooled-admin-url> bun run db:migrate
DATABASE_URL=<unpooled-admin-url> node scripts/setup-app-role.mjs --url-out /tmp/app-url.txt
```

O primeiro comando cria tabelas, o role (sem login) e as policies; o segundo
habilita o login, define a senha e gera a URL. Cadastre o conteúdo do arquivo
como `DATABASE_AUTHENTICATED_URL` (Sensitive) na Vercel.

As migrations são idempotentes: o Drizzle registra o que já foi aplicado, então
deploys repetidos não recriam tabelas. Para desativar temporariamente as
migrations do build, altere o Build Command no dashboard da Vercel para
`bun run build`.

## Segurança e RLS

A aplicação usa duas conexões com o Neon:

- `DATABASE_URL` (`neondb_owner`): migrations, Better Auth (login/sessão) e
  mutações administrativas.
- `DATABASE_AUTHENTICATED_URL` (`app_authenticated`, `NOBYPASSRLS`): leituras de
  igreja, membros, convites, pessoas, departamentos, eventos e notificações.

O Better Auth emite um JWT de 15 minutos com `sub` e `org_id`. Em cada leitura,
`src/db/tenant.ts` verifica o JWT, abre uma transação e grava os claims em
`request.jwt.claims`. As policies RLS usam esse claim para filtrar as linhas por
igreja.

As helpers de RLS são `SECURITY DEFINER` para evitar recursão, mas leem o claim
`sub` diretamente (`current_setting('request.jwt.claims')`): a extensão
`pg_session_jwt` reseta as claims quando `auth.user_id()` é chamado dentro de
uma função `SECURITY DEFINER`.

As mutações do Better Auth (criar/cancelar/aceitar convite e criar igreja)
continuam usando o role owner e a autorização da aplicação; as policies de
escrita já estão prontas para uma migração futura. As tabelas de departamentos,
pessoas, eventos, departamentos atuantes, escalas e notificações também têm
policies de leitura e grants para `app_authenticated`; as notificações são
filtradas por pessoa e pela igreja ativa. As mutações continuam na conexão
owner, com a autorização conferida nas server actions. A página pública de
convite usa o owner apenas para localizar o convite por ID aleatório.

O plugin admin do Better Auth é usado para impersonação. O papel global
`user.role` é sincronizado com os papéis da igreja apenas para o plugin; a
autorização de acesso como membro é feita na server action, que exige
`owner`/`admin` na igreja ativa e confirma que a pessoa-alvo pertence a ela. Os
endpoints HTTP `/api/auth/admin/*` ficam bloqueados (404) para impedir operações
administrativas fora do escopo da igreja.

Para validar o isolamento com o servidor de desenvolvimento rodando:

```bash
node scripts/rls-smoke-test.mjs
```

## Licença

Este projeto é **source-available**, não open source. O código pode ser visto,
auto-hospedado e modificado para uso interno ou não comercial, mas a revenda, a
prestação de serviço comercial a terceiros e a remoção da identidade visual
dependem de autorização da Open Mission.

A marca, o nome e a identidade visual da Open Ministry/OpenMinistry são
propriedade da Open Mission e devem ser preservados em qualquer deploy. Veja o
arquivo [LICENSE](./LICENSE) para os termos completos.

## Próximas etapas

Veja o [TODO.md](./TODO.md) para o roadmap atualizado.

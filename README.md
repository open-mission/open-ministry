# OpenMinistry

Uma solução para ajudar igrejas a se organizarem, cuidarem das pessoas e
crescerem em comunidade. Inspirado em ferramentas como Planning Center e
Voluts.

O projeto começa com a experiência do **admin**, que poderá ver os membros
cadastrados e convidar novas pessoas para a igreja.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack e Cache Components)
- [React 19](https://react.dev/)
- [Bun](https://bun.sh/) como runtime e gerenciador de pacotes
- [NeonDB](https://neon.tech/) + [Drizzle ORM](https://orm.drizzle.team/)
- [Better Auth](https://www.better-auth.com/)
- [shadcn/ui](https://ui.shadcn.com/) (todos os componentes instalados)
- [Tailwind CSS 4](https://tailwindcss.com/)
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
| `/api/docs` | Documentação da API (Scalar) |
| `/api/auth/reference` | Referência dos endpoints do Better Auth (Scalar) |
| `/api/openapi` | OpenAPI da aplicação |
| `/api/auth/open-api/generate-schema` | OpenAPI gerado pelo Better Auth |
| `/api/health` | Health check da API |

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

## Estrutura

```txt
src/
├── app/
│   ├── (app)/dashboard/             # Painel e membros
│   ├── (auth)/                      # Login, cadastro, onboarding e convite
│   ├── api/
│   │   ├── auth/[...all]/route.ts   # Handler do Better Auth
│   │   ├── docs/route.ts            # Scalar API Reference
│   │   ├── health/route.ts          # Health check
│   │   └── openapi/route.ts         # OpenAPI da aplicação
│   ├── actions/                     # Server actions
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── app/
│   ├── auth/
│   ├── members/
│   └── ui/                          # Componentes do shadcn/ui
├── db/
│   ├── migrations/                  # Migrations geradas pelo Drizzle Kit
│   ├── schema/
│   │   ├── auth.ts                  # Tabelas geradas pelo Better Auth
│   │   └── index.ts
│   ├── index.ts                     # Cliente Drizzle + Neon (owner)
│   └── tenant.ts                    # Cliente Drizzle + RLS (app_authenticated)
├── hooks/
└── lib/
    ├── auth.ts                      # Configuração do Better Auth
    ├── auth-client.ts               # Cliente do Better Auth
    ├── organizations.ts             # Contexto da igreja ativa
    ├── session.ts                   # Sessão autenticada
    └── utils.ts

scripts/
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
  igreja, membros, convites e pessoas.

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
escrita já estão prontas para uma migração futura. A página pública de convite
usa o owner apenas para localizar o convite por ID aleatório.

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

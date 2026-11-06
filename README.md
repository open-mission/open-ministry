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
   | `BETTER_AUTH_SECRET` | Segredo do Better Auth. Gere com `openssl rand -base64 32` |
   | `BETTER_AUTH_URL` | URL base da aplicação (`http://localhost:3000` em dev) |
   | `NEXT_PUBLIC_APP_URL` | URL pública usada pelo cliente |
   | `GOOGLE_CLIENT_ID` | Client ID do Google OAuth |
   | `GOOGLE_CLIENT_SECRET` | Client Secret do Google OAuth |

4. Aplique as migrations no banco:

   ```bash
   bun run db:migrate
   ```

5. Inicie o servidor de desenvolvimento:

   ```bash
   bun run dev
   ```

6. Acesse [http://localhost:3000](http://localhost:3000).

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
| `bun run start` | Inicia o build de produção |
| `bun run lint` | Executa o ESLint |
| `bun run typecheck` | Gera os tipos de rota e verifica o TypeScript |
| `bun run db:generate` | Gera uma migration a partir do schema Drizzle |
| `bun run db:migrate` | Aplica as migrations no banco |
| `bun run db:push` | Sincroniza o schema diretamente no banco (uso local) |
| `bun run db:studio` | Abre o Drizzle Studio |
| `bun run auth:generate` | Gera o schema Drizzle a partir da configuração do Better Auth |

## Estrutura

```txt
src/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/route.ts   # Handler do Better Auth
│   │   ├── docs/route.ts            # Scalar API Reference
│   │   ├── health/route.ts          # Health check
│   │   └── openapi/route.ts         # OpenAPI da aplicação
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/                          # Componentes do shadcn/ui
├── db/
│   ├── migrations/                  # Migrations geradas pelo Drizzle Kit
│   ├── schema/
│   │   ├── auth.ts                  # Tabelas geradas pelo Better Auth
│   │   └── index.ts
│   └── index.ts                     # Cliente Drizzle + Neon
├── hooks/
└── lib/
    ├── auth.ts                      # Configuração do Better Auth
    ├── auth-client.ts               # Cliente do Better Auth
    ├── openapi.ts                   # Documento OpenAPI da aplicação
    └── utils.ts
```

## Git Flow

- `main`: código estável.
- `develop`: integração das funcionalidades.
- `feature/<nome>`: uma branch por tarefa, criada a partir de `develop`.

Commits seguem [Conventional Commits](https://www.conventionalcommits.org/).

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

# Suíte E2E (`@openministry/app`)

Testes de ponta a ponta com Playwright cobrindo rotas públicas, layout desktop/mobile, redirecionamentos de autenticação, endpoints de saúde/feed e fluxos críticos autenticados.

## Pré-requisitos

- Dependências instaladas na raiz (`bun install`).
- Localmente (fora de CI), o Playwright usa o **Google Chrome** instalado (`/Applications/Google Chrome.app` no macOS) via `channel: "chrome"` sem precisar baixar binários extras do Chromium.
- Build de produção gerado antes de rodar contra `next start`:

```bash
bun run build
```

## Execução padrão (rotas públicas e guards sem login)

Na raiz do monorepo:

```bash
bun run test:e2e
```

Por padrão, `apps/app/playwright.config.ts` usa `http://127.0.0.1:3100` e sobe `bun run start -- -p 3100` caso nenhum servidor já esteja respondendo em `/api/health`. Se quiser apontar para outra URL em execução, defina `PLAYWRIGHT_BASE_URL`.

## Execução com usuário de teste (fluxos autenticados)

Os testes em `critical-authenticated-flows.spec.ts` são ignorados automaticamente quando `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` não estão definidos:

```bash
E2E_USER_EMAIL="usuario@igreja.com" E2E_USER_PASSWORD="sua-senha-de-teste" bun run test:e2e
```

## Separação dos testes unitários

O comando `bun --filter @openministry/app test` executa exclusivamente `bun test ./src --preload ./src/test/setup.ts` e não inclui `apps/app/e2e/`.

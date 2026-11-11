<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

## Git Flow

Este projeto segue o Git Flow. Respeite estas regras em qualquer alteração:

- **`main` é a branch de releases.** Recebe apenas código estável, por merge da
  `develop` com `--no-ff`. Não desenvolva nem faça commits diretos nela.
- **`develop` é a branch de integração.** É onde o desenvolvimento em andamento
  vive e de onde as branches de trabalho partem.
- **Crie uma branch separada para cada tarefa**, sempre a partir da `develop`:
  - `feature/<nome>` para novas funcionalidades;
  - `fix/<nome>` para correções;
  - `chore/<nome>` para manutenção, ferramentas e documentação.
- Ao terminar, faça merge da branch na `develop` com `--no-ff` e remova a branch
  de trabalho.
- **Commits seguem Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:` etc.).
- **Antes de finalizar**, rode `bun run lint`, `bun run typecheck` e
  `bun run build`.
- **Para publicar uma release:** faça merge da `develop` na `main` com `--no-ff`
  e, se possível, crie uma tag de versão (`vX.Y.Z`).

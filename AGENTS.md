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

## Skills de Design (craft)

O projeto usa o pacote de skills `diego3g/craft`, instalado em `.agents/skills/` na raiz do repositório. `.agents/` e `skills-lock.json` estão no `.gitignore`: as skills são locais da máquina, não entram em commit e não aparecem em `git status`.

| Skill | Quando usar |
| :--- | :--- |
| `craft` | Criar, desenhar ou redesenhar página, tela, fluxo ou elemento de UI. É a porta de entrada — aciona as demais nos pontos certos. |
| `craft-setup` | Projeto sem `DESIGN.md` na raiz: definir marca, estilo e diretrizes antes de desenhar. |
| `craft-explore` | Quando a direção está aberta: gerar 2+ opções de layout/abordagem para escolha. |
| `craft-critique` | Revisar e polir uma tela existente ("parece carregada", "não está bom ainda") antes de mostrar ou entregar para código. |
| `craft-states` | Garantir todos os estados: loading, erro, vazio, dados longos, mobile, permissões diferentes. |
| `craft-system` | Design system, tokens e componentes — criar, alterar ou auditar consistência. |
| `craft-sync` | Sincronizar o design system que já existe em código (`packages/ui`, tokens) com a ferramenta de design. |
| `using-craft` | Orquestrador: consultar no início de qualquer tarefa que mexa em UI. |

Regras:
- **Antes de desenhar uma tela nova**, verifique se existe `DESIGN.md` na raiz; se não houver, use `craft-setup` em vez de inventar estilo.
- **Sempre cobrir estados** com `craft-states` antes de considerar a tela pronta — o padrão de diálogos responsivos desta seção continua valendo.
- **Respeite o design system existente**: componentes de `packages/ui` e tokens são a fonte da verdade; `craft-sync` é o caminho para trazê-los, não recriar estilos soltos.
- **Worktrees novas não herdam `.agents/skills/`** (é gitignored). Antes de trabalhar em UI numa worktree, rode na raiz dela:
  ```bash
  npx skills add diego3g/craft
  ```
- **Skills rodam com permissões totais do agente.** Leia o `SKILL.md` da skill antes de usá-la em tarefa que escreva ou apague arquivos — o scanner da CLI já sinalizou `craft-system` como risco médio.

## Padrão de Diálogos e Formulários (Desktop vs Mobile)

Todo modal de formulário (criação/edição), confirmação ou visualização de detalhes deve ser responsivo, seguindo o **Padrão Híbrido com visual unificado**:
- **No Desktop (`>= 768px`)**: renderize `Dialog` / `DialogContent` centralizado com largura proporcional (`sm:max-w-lg` ou `sm:max-w-2xl`) e overflow vertical contido (`max-h-[85vh] overflow-y-auto`).
- **No Mobile (`< 768px`)**: o padrão é `Drawer` / `DrawerContent` (bottom-sheet via `vaul`) ancorado na parte inferior, com área de toque mínima de 44px (`min-h-[44px]`), header com `!text-left` e container de rolagem suave (`max-h-[85vh] overflow-y-auto [-webkit-overflow-scrolling:touch]`). Drawers aninhados são suportados de forma limpa: um `Drawer` renderizado dentro de outro `DrawerContent` vira automaticamente um `NestedRoot`, sem desmontar o pai.
- **Exceção — handoffs encadeados**: quando um modal abre outro modal em sequência (ex.: `ImportSongDialog` -> `SongFormDialog`), use `Sheet` com `side="bottom"` em vez de `Drawer`. O `Sheet` compartilha o mesmo visual de bottom-sheet (`rounded-t-xl` e `max-h-[85dvh]`, definidos em `@openministry/ui`) e oferece transições de foco/desmontagem do Radix sem gesto de arrastar, evitando conflitos entre o swipe do `vaul` e a troca de foco entre os dois modais.
- **Fonte dos componentes**: `@/components/ui/*` são apenas re-exports finos de `@openministry/ui`; a implementação (e a fonte da verdade visual) vive em `packages/ui`.
- **Detecção de Dispositivo**: utilize o hook `useIsMobile()` de `@/hooks/use-mobile` (re-export de `@openministry/ui/hooks/use-mobile`).

## Notas de Versão e Modal de Novidades (Changelog)

Sempre que uma nova release for preparada ou publicada:
- **Atualize `apps/app/src/config/release-notes.ts`**:
  - Incremente `CURRENT_APP_VERSION` correspondente à versão da release (ex: `1.2.0`).
  - Adicione a nova entrada em `RELEASE_NOTES` no topo da lista.
  - **Agrupe as novidades por módulo** (ex: *Módulo de Tarefas & Demandas*, *Módulo de Músicas & Repertório*, *Cuidado Pastoral & Plataforma* etc.).
  - **Linguagem acessível e sem jargões**: NUNCA utilize referências a aplicativos ou termos obscuros de terceiros (como "estilo Things 3" ou termos internos de tecnologia). Descreva claramente o benefício prático e a funcionalidade para os membros e líderes da igreja.
  - No Desktop, o modal exibe layout horizontal de 2 colunas se houver múltiplos módulos/itens, e no Mobile mantém o Drawer fluido com bottom-sheet.
- **Atualize a versão** no `package.json` da raiz e no `apps/app/package.json`.

## ui-sdk

Antes de usar `ui-sdk`, siga a skill `ui-sdk` se ela estiver instalada e leia
`node_modules/@ui-sdk/react/docs/llms.txt`. Para criar um novo componente,
pesquise em `node_modules/@ui-sdk/react/docs/core.md` por título (heading) e
leia também `rendering.md`, que fica ao lado dele.



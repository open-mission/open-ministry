# Regras e Diretrizes do Projeto (OpenMinistry)

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

## Padrão de Diálogos e Formulários (Desktop vs Mobile)

Todo modal de formulário (criação/edição), confirmação ou visualização de detalhes deve ser responsivo:
- **No Desktop (`>= 768px`)**: renderize `Dialog` / `DialogContent` centralizado com largura proporcional (`sm:max-w-lg` ou `sm:max-w-2xl`) e overflow vertical contido (`max-h-[85vh] overflow-y-auto`).
- **No Mobile (`< 768px`)**: renderize `Drawer` / `DrawerContent` (bottom-sheet via `vaul`) ancorado na parte inferior com área de toque mínima de 44px (`min-h-[44px]`), header com `!text-left`, e container de rolagem suave (`max-h-[85vh] overflow-y-auto [-webkit-overflow-scrolling:touch]`).
- **Detecção de Dispositivo**: utilize o hook `useIsMobile()` de `@/hooks/use-mobile`.

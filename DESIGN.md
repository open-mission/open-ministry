# DESIGN.md · OpenMinistry

> If this file and the code disagree, the code wins until the person decides. Note the conflict under Open questions.

## Product
Web app e PWA mobile-first (`pt-BR`) para organizar igrejas locais e cuidar das pessoas (`PRODUCT.md`). Líderes e administradores usam no desktop durante o planejamento semanal (pessoas, departamentos, funções, cultos recorrentes, escalas, músicas e ensaios); membros usam no celular (PWA) nos dias de culto para ver suas escalas, a agenda do departamento, aniversários e notificações.

Trabalho nº 1 da tela mais usada (Home): responder em uma dobra **"o que eu preciso fazer agora?"** — a próxima ação real (hoje ou o próximo compromisso em que a pessoa está escalada, com ensaio/evento) e uma ação primária óbvia. No desktop, funciona como panorama semanal da liderança com o que está pendente; no celular, como o "Hoje" do membro (complementado pela aba `Minha Igreja`). Nunca deve virar um dashboard de métricas nem uma lista de atalhos *(definido com Robsom; aguardando confirmação final do membro)*.

## Audience and voice
Líderes, administradores e membros de igreja de todas as idades e níveis técnicos (`PRODUCT.md`). Voz calorosa, próxima, clara e em português do Brasil simples — zero jargões técnicos ou termos de ERP (`AGENTS.md`, `PRODUCT.md`).

Formatos locais `(assumed)`: datas `14/11` (ou dia da semana curto + dia/mês) e horários `19h30` / `19:30` no fuso local da igreja.

## Mood
Words: **calmo, pastoral e organizado** *(definido com Robsom; aguardando confirmação final do membro)*.
Never like: **planilha pesada, rede social barulhenta ou dashboard genérico** *(definido com Robsom; aguardando confirmação final do membro)*.

## Brand
- **Design system source:** `packages/ui/src/components` (`63` componentes exportados via `@openministry/ui`; the `OpenMinistry.pen` guide mirrors it; ver conflito com `apps/app/src/components/ui` em *Open questions*).
- **Paleta e tokens (`apps/app/src/app/globals.css`, `apps/app/src/app/brand/page.tsx`):**
  - Primária: verde-floresta profundo (`--primary: oklch(0.36 0.062 156)` = `#1e472f` no claro; `oklch(0.78 0.07 150)` = `#98c5a0` no escuro; hex `#264A3A` em `brand/page.tsx` é apenas descritivo).
  - Fundo e superfícies: papel creme quente (`--background: oklch(0.982 0.008 85)` = `#fcf9f3`; `#FBF7EF` descritivo) e cartões brancos (`--card: oklch(0.995 0.004 85)` = `#fffdfa`; `#FFFFFF` descritivo) no claro; floresta noturno (`--background: oklch(0.18 0.018 155)` = `#0b140e`, `--card: oklch(0.22 0.02 155)` = `#131d17`; `#0A0A0A` descritivo) no escuro.
  - Secundária e acentos: verde sálvia (`#3D735A`), acento dourado quente (`--accent: oklch(0.915 0.035 70)` / `--chart-2: oklch(0.62 0.11 55)`), cinza zinco para textos secundários e bordas (`#71717A`), raio base `--radius: 0.75rem`.
- **Tipografia (`apps/app/src/app/layout.tsx`, `globals.css`):** títulos em **Fraunces** (`--font-display` / `--font-heading`); corpo e controles em **Geist** (`--font-sans`).
- **Logo e identidade da igreja (`apps/app/public/brand/`, `brand/page.tsx`, `PRODUCT.md`):** símbolo do livro sagrado com cruz central, variações minimal e completa (*"ORGANIZE. PLANEJE. SIRVA."*), além do nome e logo da própria igreja no topo do painel quando configurados.
- **Arquivo de design (`pen.dev`):** `OpenMinistry.pen` (`DS OpenMinistry — Fundamentos`, `DS OpenMinistry — Componentes`, `DS OpenMinistry — Padrões`; sincronizado em `2026-11-21` com `globals.css` + `61` componentes em `design-sync.json`).

## References
- **Planning Center** (`PRODUCT.md`) — aproveitar: o modelo de culto recorrente com escala por função e a leitura rápida de "quem serve quando"; evitar: densidade de tabelas, jargão de ERP e cara de painel corporativo.
- **Voluts** (`PRODUCT.md`) — aproveitar: leveza, linguagem próxima e foco no membro pelo celular; evitar: excesso de decoração de marca, feed/curtidas e qualquer ruído de rede social.
- **Google / Apple Calendar (assumed)** — aproveitar: legibilidade imediata de data, horário e recorrência; evitar: densidade das telas de configuração.

## Constraints
- **Plataformas:** PWA mobile-first (`< 768px`, `viewportFit: cover`) e desktop web (`>= 768px`; auditado em `1024×768` e `1440×900`).
- **Temas e acessibilidade:** modos Claro, Escuro e Sistema (`next-themes`), contraste WCAG AA, navegação completa por teclado (`Tab`, `Escape`, setas) e suporte a `prefers-reduced-motion` (`globals.css`).
- **Alvos e tipografia:** piso de `>= 11px` no texto de interface, `>= 24×24px` em alvos desktop (`>= 44px` em ações e bottom-sheets mobile) e inputs `>= 16px` abaixo de `768px` para evitar zoom no iOS Safari (`globals.css`).
- **Padrão de modais:** `Dialog` centralizado no desktop (`>= 768px`); bottom-sheet (`Sheet side="bottom"` em fluxos encadeados / `Drawer` Vaul em sheets independentes) no mobile (`< 768px`), estabilizando o breakpoint enquanto aberto.
- **Ícones e movimento:** conjunto único em `lucide-react` (`246` usos em `apps/app/src`; ver item de limpeza em *Open questions*). Movimento contido para confirmações e abertura/fechamento de sobreposições (`tw-animate-css`), sem animações decorativas pesadas.

## Decisions log
- `2026-11-21` — Definido `packages/ui/src/components` como `Design system source` oficial do projeto (resposta à pergunta 1 do `craft-setup`).
- `2026-11-21` — Rascunho inicial de `DESIGN.md` redigido a partir de `PRODUCT.md`, `globals.css`, `brand/page.tsx`, `AGENTS.md` e do alinhamento de clima, referências e trabalho principal da Home com Robsom (sem rodar `craft-sync` até aprovação do membro).
- `2026-11-21` — Conteúdo de `DESIGN.md` aprovado pelo membro (incluindo Mood *calmo, pastoral e organizado*, trabalho nº 1 da Home *"o que eu preciso fazer agora?"* e Referências).
- `2026-11-21` — `craft-sync` (importação `code → OpenMinistry.pen`, lote 1) concluído com decisões do Robsom: (1) `globals.css` OKLCH é canônico em Light e Dark (`#1e472f`/`#fcf9f3` vencem os hex descritivos de `brand/page.tsx`); `om-*` atuam como aliases (`om-danger` espelha `--destructive`); `h:--*` seguem como variáveis read-only do kit `shadcn.lib.pen` sobrescritas por instância; `om-amber` (`#fe9a00`) e `om-info` (`#2b7fff`) ficam registrados como **legado** (proibido uso em componentes novos). (2) Reconciliados os 3 frames `DS OpenMinistry — *` existentes com Light/Dark, SVGs oficiais da marca, `rounded-lg` (`12px`) em botões, `destructive` tonal e variante `link`. (3) Desenhados os 5 componentes iniciais (`Button`, `Card`, `Badge`, `Input`, `Tabs`); `Sheet` e `Drawer` seguem fora até fechamento em *Open questions*. (4) Registrado `design-sync.json` na raiz (`docs/design-md`).
- `2026-11-21` — `craft-sync` (lote 2 no `OpenMinistry.pen`) concluído com **6 componentes** em Light e Dark (`Avatar`, `Select`, `Dialog`, `Alert`, `Calendar`, `Skeleton`), totalizando `11` desenhados e `52` `in code only` em `design-sync.json` (`Sheet`/`Drawer` mantidos de fora).
- `2026-11-21` — `craft-sync` (lote 3 no `OpenMinistry.pen`) concluído com **6 componentes** em Light e Dark (`Checkbox`, `Switch`, `RadioGroup`, `Textarea`, `Tooltip`, `DropdownMenu`), totalizando `17` desenhados e `46` `in code only` em `design-sync.json` (`Sheet`/`Drawer` mantidos de fora).
- `2026-11-21` — `craft-sync` (lote 4 — conclusão dos demais componentes não bloqueados no `OpenMinistry.pen`) concluído com **44 componentes** em Light e Dark (`ButtonGroup`, `Toggle`, `ToggleGroup`, `Combobox`, `Field`, `InputGroup`, `InputOTP`, `Label`, `NativeSelect`, `Questionnaire`, `Slider`, `AlertDialog`, `Empty`, `Progress`, `Sonner`, `Spinner`, `Command`, `ContextMenu`, `HoverCard`, `Popover`, `Breadcrumb`, `Menubar`, `NavigationMenu`, `Pagination`, `Sidebar`, `Accordion`, `AspectRatio`, `Collapsible`, `Direction`, `Item`, `Resizable`, `ScrollArea`, `Separator`, `Attachment`, `Bubble`, `Carousel`, `Chart`, `CodeBlock`, `Kbd`, `Marker`, `Message`, `MessageScroller`, `Table`, `Trace`), totalizando **`61` desenhados** e apenas **`2` `in code only`** (`Sheet` e `Drawer`, mantidos fora até fechamento em *Open questions*).

## Open questions
- **Divergência entre código e fonte oficial de UI:** `packages/ui/src/components` (`63` arquivos) foi escolhido como fonte oficial do Design System, mas `apps/app` hoje importa `268` vezes de `apps/app/src/components/ui` (`63` arquivos, incluindo correções recentes como `DrawerNestedContext` em `drawer.tsx`). Definir quando e como convergir os overrides locais de `apps/app/src/components/ui` de volta para `packages/ui`.
- **Padrão mobile `Sheet` vs `Drawer` (`AGENTS.md` vs `v1.7.2`):** `AGENTS.md` cita Vaul `Drawer` para modais mobile, enquanto os hotfixes recentes adotaram `Sheet side="bottom"` em fluxos encadeados para evitar travamentos com `vaul`. Alinhar a redação no `AGENTS.md` caso o padrão híbrido seja definitivo.
- **Padronização de ícones `(assumed)`:** substituir 1 uso restante de `@tabler/icons-react` em `apps/app/src` por `lucide-react`.
- **Formatos locais `(assumed)`:** confirmar eventual ajuste de formatação de datas (`14/11`) e horários (`19h30`).
- **Sincronização restante com `OpenMinistry.pen` (`craft-sync`):** tokens e `61` de `63` componentes sincronizados em `2026-11-21`; restam apenas `2` componentes `in code only` (`Sheet` e `Drawer`, dependentes da *Open question* mobile) e o alinhamento dos frames mobile antigos ao estilo minimal.

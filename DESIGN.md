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
- **Arquivo de design (`pen.dev`):** `OpenMinistry.pen` (`DS OpenMinistry — Fundamentos`, `DS OpenMinistry — Componentes`, `DS OpenMinistry — Padrões`; sincronizado em `2026-11-21` com `globals.css` + **`63` de `63` componentes** em `design-sync.json`).

## References
- **Planning Center** (`PRODUCT.md`) — aproveitar: o modelo de culto recorrente com escala por função e a leitura rápida de "quem serve quando"; evitar: densidade de tabelas, jargão de ERP e cara de painel corporativo.
- **Voluts** (`PRODUCT.md`) — aproveitar: leveza, linguagem próxima e foco no membro pelo celular; evitar: excesso de decoração de marca, feed/curtidas e qualquer ruído de rede social.
- **Google / Apple Calendar (assumed)** — aproveitar: legibilidade imediata de data, horário e recorrência; evitar: densidade das telas de configuração.

## Constraints
- **Plataformas:** PWA mobile-first (`< 768px`, `viewportFit: cover`) e desktop web (`>= 768px`; auditado em `1024×768` e `1440×900`).
- **Temas e acessibilidade:** modos Claro, Escuro e Sistema (`next-themes`), contraste WCAG AA, navegação completa por teclado (`Tab`, `Escape`, setas) e suporte a `prefers-reduced-motion` (`globals.css`).
- **Alvos e tipografia:** piso de `>= 11px` no texto de interface, `>= 24×24px` em alvos desktop (`>= 44px` em ações e bottom-sheets mobile) e inputs `>= 16px` abaixo de `768px` para evitar zoom no iOS Safari (`globals.css`).
- **Padrão de modais:** `Dialog` centralizado no desktop (`>= 768px`); no mobile (`< 768px`), padrão **híbrido com visual unificado**: `Drawer` (Vaul, com alça `100×4px`, `rounded-t-xl` e `max-h-[85dvh]`) para sheets independentes e `Sheet side="bottom"` (Radix `Dialog`, também estilizado com `rounded-t-xl` e `max-h-[85dvh]`) exclusivamente para fluxos encadeados onde há troca de modal, estabilizando o breakpoint enquanto aberto.
- **Ícones e movimento:** conjunto único em `lucide-react` (`246` usos em `apps/app/src`; ver item de limpeza em *Open questions*). Movimento contido para confirmações e abertura/fechamento de sobreposições (`tw-animate-css`), sem animações decorativas pesadas.

## Decisions log
- `2026-11-21` — Definido `packages/ui/src/components` como `Design system source` oficial do projeto (resposta à pergunta 1 do `craft-setup`).
- `2026-11-21` — Rascunho inicial de `DESIGN.md` redigido a partir de `PRODUCT.md`, `globals.css`, `brand/page.tsx`, `AGENTS.md` e do alinhamento de clima, referências e trabalho principal da Home com Robsom (sem rodar `craft-sync` até aprovação do membro).
- `2026-11-21` — Conteúdo de `DESIGN.md` aprovado pelo membro (incluindo Mood *calmo, pastoral e organizado*, trabalho nº 1 da Home *"o que eu preciso fazer agora?"* e Referências).
- `2026-11-21` — `craft-sync` (importação `code → OpenMinistry.pen`, lote 1) concluído com decisões do Robsom: (1) `globals.css` OKLCH é canônico em Light e Dark (`#1e472f`/`#fcf9f3` vencem os hex descritivos de `brand/page.tsx`); `om-*` atuam como aliases (`om-danger` espelha `--destructive`); `h:--*` seguem como variáveis read-only do kit `shadcn.lib.pen` sobrescritas por instância; `om-amber` (`#fe9a00`) e `om-info` (`#2b7fff`) ficam registrados como **legado** (proibido uso em componentes novos). (2) Reconciliados os 3 frames `DS OpenMinistry — *` existentes com Light/Dark, SVGs oficiais da marca, `rounded-lg` (`12px`) em botões, `destructive` tonal e variante `link`. (3) Desenhados os 5 componentes iniciais (`Button`, `Card`, `Badge`, `Input`, `Tabs`); `Sheet` e `Drawer` seguem fora até fechamento em *Open questions*. (4) Registrado `design-sync.json` na raiz (`docs/design-md`).
- `2026-11-21` — `craft-sync` (lote 2 no `OpenMinistry.pen`) concluído com **6 componentes** em Light e Dark (`Avatar`, `Select`, `Dialog`, `Alert`, `Calendar`, `Skeleton`), totalizando `11` desenhados e `52` `in code only` em `design-sync.json` (`Sheet`/`Drawer` mantidos de fora).
- `2026-11-21` — `craft-sync` (lote 3 no `OpenMinistry.pen`) concluído com **6 componentes** em Light e Dark (`Checkbox`, `Switch`, `RadioGroup`, `Textarea`, `Tooltip`, `DropdownMenu`), totalizando `17` desenhados e `46` `in code only` em `design-sync.json` (`Sheet`/`Drawer` mantidos de fora).
- `2026-11-21` — `craft-sync` (lote 4 — conclusão dos demais componentes não bloqueados no `OpenMinistry.pen`) concluído com **44 componentes** em Light e Dark (`ButtonGroup`, `Toggle`, `ToggleGroup`, `Combobox`, `Field`, `InputGroup`, `InputOTP`, `Label`, `NativeSelect`, `Questionnaire`, `Slider`, `AlertDialog`, `Empty`, `Progress`, `Sonner`, `Spinner`, `Command`, `ContextMenu`, `HoverCard`, `Popover`, `Breadcrumb`, `Menubar`, `NavigationMenu`, `Pagination`, `Sidebar`, `Accordion`, `AspectRatio`, `Collapsible`, `Direction`, `Item`, `Resizable`, `ScrollArea`, `Separator`, `Attachment`, `Bubble`, `Carousel`, `Chart`, `CodeBlock`, `Kbd`, `Marker`, `Message`, `MessageScroller`, `Table`, `Trace`), totalizando **`61` desenhados** e apenas **`2` `in code only`** (`Sheet` e `Drawer`, mantidos fora até fechamento em *Open questions*).
- `2026-11-21` — Fechada a decisão do padrão mobile (**opção 1: híbrido com visual unificado** — `Drawer` como padrão em modais independentes e `Sheet side="bottom"` com `rounded-t-xl`/`max-h-[85dvh]` apenas em fluxos encadeados); desenhados `Drawer` e `Sheet` no `OpenMinistry.pen`, completando **`63` de `63` componentes sincronizados** (`0 in code only`).
- `2026-11-21` — Aprovada e aplicada a **Opção A** para o sidebar desktop no `OpenMinistry.pen` e em `apps/app`: 6 domínios primários + seção secundária (`Minhas tarefas`, `Operações`), trilho recolhido de `56px` (`collapsible="icon"`), rodapé único (`NavUser`) e faixa de sub-abas contextuais (`DomainSubtabs`) nas 12 páginas de domínio.
- `2026-11-21` — Aprovada e aplicada a **variante A+C** para a navegação mobile: barra inferior mantém `Início`, `Escalas`, `Agenda`, `Músicas` e troca `Menu` por **Explorar** (`CompassIcon`); o drawer `Explorar` reúne busca rápida (normaliza acentos e filtra só rotas acessíveis), pílulas de `ATALHOS RAPIDOS`, grade `grid-cols-2` com os 6 domínios (sub-rotas, contagem e destaque do domínio ativo), bloco `Minhas tarefas`/`Operações [Admin]` e rodapé único com `Configurações` (sem `Tema` ou `Sair da conta`). O drawer abre em `h-[95dvh]`/`max-h-[95dvh]` (com `data-[vaul-drawer-direction=bottom]:mt-0` e `data-[vaul-drawer-direction=bottom]:max-h-[95dvh]` sobrescrevendo o padrão do `packages/ui`), mantendo a alça/peek superior de `5%`, em `z-[60]` com scroll interno marcado por `data-vaul-no-drag`. `DomainSubtabs` passa a ser visível também no mobile, com rolagem horizontal e alvos `>= 44px` (`min-h-11 md:min-h-9`).
- `2026-11-22` — Agenda (`/calendar` / `/dashboard/calendar`) mantém o **container padrão** (`max-w-6xl` + card `rounded-xl border bg-card shadow-xs`), **filtros unificados no botão `Filtrar`** (`Popover` no desktop / `Drawer` no mobile), prévia rápida em leitura (`Sheet`/`Drawer`) e **sem o header global da página** (preservando apenas o ícone de notificações e o alternador da barra lateral no desktop para ganhar espaço vertical).

## Open questions
- **Convergência entre cópias de UI (`packages/ui` vs `apps/app/src/components/ui` vs `apps/site`):** `packages/ui/src/components` (`63` arquivos) é a fonte oficial, mas `apps/app` hoje faz `774` imports em `257` arquivos de `apps/app/src/components/ui` (onde já existe `drawer.tsx` com `DrawerNestedContext` e `max-h-[85dvh]`). Falta executar a convergência em branch de código: sincronizar `drawer.tsx` + visual de `sheet.tsx` para `packages/ui`, trocar imports internos `@/components/ui/*` de `packages/ui` por relativos e escolher entre ponte (`re-export`) ou migração direta dos imports nos apps (e alinhar a redação da seção de modais no `AGENTS.md`).
- **Padronização de ícones `(assumed)`:** substituir 1 uso restante de `@tabler/icons-react` em `apps/app/src` por `lucide-react`.
- **Formatos locais `(assumed)`:** confirmar eventual ajuste de formatação de datas (`14/11`) e horários (`19h30`).
- **Alinhamento de telas legadas no `OpenMinistry.pen`:** `63` de `63` componentes e tokens do `globals.css` já estão sincronizados no guia; resta apenas alinhar os frames mobile antigos ao estilo minimal quando formos evoluí-los no `/craft`.

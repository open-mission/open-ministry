# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Líderes e administradores de igrejas locais, e os membros dessas igrejas. O
administrador entra no painel para cuidar das pessoas, organizar departamentos e
montar as escalas de cultos e eventos. O membro entra para ver a equipe, os
aniversários e as escalas em que foi designado.

## Product Purpose

O OpenMinistry ajuda igrejas a se organizarem e cuidarem das pessoas. Reúne
pessoas, departamentos, funções e escalas em um só painel, para que a liderança
gaste menos tempo em planilhas e mais tempo cuidando da comunidade.

## Positioning

Inspirado em Planning Center e Voluts, o OpenMinistry parte da estrutura real de
uma igreja local: departamentos com funções próprias (Projeção, Stories,
Fotografia) e escalas ligadas a cada ocorrência de um culto — inclusive quando o
culto se repete — em vez de uma agenda genérica de eventos.

## Operating Context

- O painel é usado principalmente em desktop, durante o planejamento semanal e
  nos dias de culto; precisa funcionar bem também no celular.
- A igreja cadastra pessoas por convite por link e organiza o trabalho em
  departamentos com líderes.
- Cultos e eventos podem ser recorrentes (semanal, quinzenal, mensal ou
  customizado) e cada ocorrência tem sua própria escala.
- Toda a interface é em português do Brasil.

## Capabilities and Constraints

- Autenticação por email/senha e Google; organizações (igrejas) com papéis
  `owner`, `admin` e `member`; convites por link com validade de 7 dias.
- Departamentos com nome, descrição, funções e pessoas; níveis de experiência
  por função são visíveis apenas para administradores da igreja e líderes do
  departamento.
- Aniversariantes: dia e mês visíveis para todos os membros; ano (idade) apenas
  para `owner`/`admin`.
- Cultos e eventos com recorrência gerando ocorrências independentes; edição de
  uma ocorrência ou de todas; departamentos atuantes e escala por função do
  departamento.
- Leituras de dados da igreja usam a conexão `app_authenticated` com RLS;
  mutações usam a conexão owner com autorização na aplicação.
- Stack: Next.js 16 (App Router, Cache Components), React 19, Bun, Neon +
  Drizzle, Better Auth, shadcn/ui e Tailwind CSS 4.

## Brand Commitments

- Nome OpenMinistry / Open Mission preservado.
- Interface e documentação em português do Brasil.
- Identidade visual já existente no produto: papel creme quente, verde-floresta
  profundo, acento dourado, títulos em Fraunces e corpo em Geist.

## Evidence on Hand

- Não há depoimentos, clientes ou métricas reais no repositório; nada disso deve
  ser inventado.
- O produto é publicado pela Open Mission sob licença source-available (veja
  `LICENSE`).

## Product Principles

1. Cuidar de pessoas é o centro; a ferramenta organiza para liberar tempo de
   relacionamento.
2. A estrutura da igreja (departamentos, funções, líderes) é o modelo, não uma
   camada genérica de times.
3. Planejamento e execução vivem juntos: o culto recorrente e a escala daquela
   ocorrência são coisas distintas.
4. Privacidade por padrão: dados sensíveis, como idade e experiência, ficam com
   quem lidera.

## Accessibility & Inclusion

- Interface em pt-BR, contraste de texto conforme WCAG AA e navegação por
  teclado nos fluxos principais.

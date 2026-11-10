import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  DownloadIcon,
  SparklesIcon,
  XCircleIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  OpenMinistryAppIcon,
  OpenMinistryLogo,
  OpenMinistrySymbol,
} from "@/components/brand/openministry-logo";
import {
  AssetActionButtons,
  CopyColorButton,
} from "@/components/brand/brand-interactive";

export const metadata: Metadata = {
  title: "Brand & Identidade Visual",
  description:
    "Guia oficial da marca OpenMinistry: logotipos oficiais, variações minimal, full, dark e white, paleta de cores, tipografia e download do kit de marca.",
};

const COLOR_PALETTE = [
  {
    name: "Verde Primário",
    role: "Cor Institucional / Marca",
    hex: "#264A3A",
    rgb: "rgb(38, 74, 58)",
    textColor: "text-white",
    bgClass: "bg-[#264A3A]",
    description: "Transmite serenidade, acolhimento pastoral e compromisso sólido.",
  },
  {
    name: "Creme Suave",
    role: "Fundo Quente / Papel",
    hex: "#FBF7EF",
    rgb: "rgb(251, 247, 239)",
    textColor: "text-[#264A3A]",
    border: true,
    bgClass: "bg-[#FBF7EF]",
    description: "Inspirado em papel bíblico e luz natural matinal.",
  },
  {
    name: "Grafite Noturno",
    role: "Superfície Escura / Contraste",
    hex: "#0A0A0A",
    rgb: "rgb(10, 10, 10)",
    textColor: "text-white",
    bgClass: "bg-[#0A0A0A]",
    description: "Uso no logotipo minimal preto, textos principais e modo escuro.",
  },
  {
    name: "Branco Puro",
    role: "Superfície Limpa / Cartões",
    hex: "#FFFFFF",
    rgb: "rgb(255, 255, 255)",
    textColor: "text-zinc-900",
    border: true,
    bgClass: "bg-white",
    description: "Base de cartões, fundos claros e versão invertida dos logotipos.",
  },
  {
    name: "Verde Sálvia Acento",
    role: "Destaques / Ações",
    hex: "#3D735A",
    rgb: "rgb(61, 115, 90)",
    textColor: "text-white",
    bgClass: "bg-[#3D735A]",
    description: "Botões de ação secundária, badges e estados interativos.",
  },
  {
    name: "Cinza Zinco",
    role: "Texto Secundário / Bordas",
    hex: "#71717A",
    rgb: "rgb(113, 113, 122)",
    textColor: "text-white",
    bgClass: "bg-[#71717A]",
    description: "Subtítulos, ícones neutros e divisórias de interface.",
  },
];

export default function BrandPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Background ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(75%_55%_at_50%_-10%,var(--color-secondary),transparent_72%)]"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeftIcon className="size-4" />
              <span>Voltar</span>
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <Link href="/" className="flex items-center gap-2 font-heading text-lg tracking-tight">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                <OpenMinistrySymbol className="size-3.5" />
              </span>
              <span>OpenMinistry</span>
            </Link>
            <Badge variant="secondary" className="hidden sm:inline-flex text-[0.7rem] uppercase tracking-wider font-medium">
              Brand Guide
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
              <a href="#logos" className="transition-colors hover:text-foreground">
                Logotipos
              </a>
              <a href="#respiro" className="transition-colors hover:text-foreground">
                Respiro & Tamanhos
              </a>
              <a href="#cores" className="transition-colors hover:text-foreground">
                Cores
              </a>
              <a href="#tipografia" className="transition-colors hover:text-foreground">
                Tipografia
              </a>
            </nav>

            <ThemeToggle />

            <Button asChild size="sm" className="gap-2">
              <a href="/brand/openministry-brand-assets.zip" download>
                <DownloadIcon className="size-4" />
                <span className="hidden sm:inline">Baixar Kit (.zip)</span>
                <span className="sm:hidden">Kit</span>
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-12 sm:px-8 sm:pt-20">
        <div className="max-w-3xl space-y-5">
          <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs">
            <SparklesIcon className="size-3.5 text-primary" />
            Identidade Visual Oficial
          </Badge>
          <h1 className="font-heading text-4xl tracking-tight sm:text-5xl lg:text-6xl text-balance">
            Diretrizes de Marca & Ativos Oficiais
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
            O OpenMinistry existe para que a liderança da igreja dedique menos tempo a planilhas
            e mais presença às pessoas. Nossa identidade une a tradição da fé cristã à clareza
            moderna de um software profissional: <strong>Organize. Planeje. Sirva.</strong>
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg" className="gap-2">
              <a href="/brand/openministry-brand-assets.zip" download>
                <DownloadIcon className="size-4" />
                Baixar Kit de Ativos (.zip)
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#logos">Ver Variações do Logo</a>
            </Button>
          </div>
        </div>

        {/* Hero Visual Card */}
        <div className="mt-12 overflow-hidden rounded-2xl border bg-card p-2 sm:p-3 shadow-sm">
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl bg-zinc-950">
            <Image
              src="/brand/showcase-hero.jpg"
              alt="OpenMinistry Brand Showcase"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex flex-col justify-between gap-2 text-white sm:flex-row sm:items-end">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-300">
                  Identidade Visual Oficial
                </p>
                <h2 className="font-heading text-2xl sm:text-3xl">OpenMinistry</h2>
                <p className="text-xs sm:text-sm text-zinc-300 tracking-wider uppercase mt-1">
                  ORGANIZE. PLANEJE. SIRVA.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/10 text-white backdrop-blur-md">
                  Vetor SVG + PNG 4K
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Logo Variations Grid */}
      <section id="logos" className="mx-auto max-w-6xl px-5 py-12 sm:px-8 border-t">
        <div className="mb-10 space-y-2">
          <Badge variant="outline">Variações Oficiais</Badge>
          <h2 className="font-heading text-3xl tracking-tight sm:text-4xl">
            Logotipos & Símbolos
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            Todas as variações foram meticulosamente alinhadas respeitando a geometria
            do livro sagrado e da cruz central. Use o formato correto para cada contexto.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Card 1: Logo Minimal (Claro) */}
          <Card className="flex flex-col justify-between overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Logo Minimal (Fundo Claro)</CardTitle>
                <Badge variant="outline">Padrão</Badge>
              </div>
              <CardDescription>
                Versão horizontal primária para cabeçalhos e páginas em modo claro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex h-36 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-6">
                <OpenMinistryLogo
                  variant="minimal"
                  colorScheme="dark"
                  className="h-10 w-auto max-w-full"
                />
              </div>
              <AssetActionButtons
                name="Logo Minimal (Preto)"
                svgPath="/brand/openministry-logo-black.svg"
                pngPath="/brand/openministry-logo-black.png"
              />
            </CardContent>
          </Card>

          {/* Card 2: Logo Minimal (Escuro) */}
          <Card className="flex flex-col justify-between overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Logo Minimal (Invertido)</CardTitle>
                <Badge variant="outline">Modo Noturno</Badge>
              </div>
              <CardDescription>
                Versão horizontal monocromática branca para fundos escuros e fotográficos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex h-36 items-center justify-center rounded-xl bg-[#0A0A0A] p-6 shadow-inner">
                <OpenMinistryLogo
                  variant="minimal"
                  colorScheme="light"
                  className="h-10 w-auto max-w-full"
                />
              </div>
              <AssetActionButtons
                name="Logo Minimal (Branco)"
                svgPath="/brand/openministry-logo-white.svg"
                pngPath="/brand/openministry-logo-white.png"
              />
            </CardContent>
          </Card>

          {/* Card 3: Logo Completo (com Tagline) */}
          <Card className="flex flex-col justify-between overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Logo Completo com Tagline</CardTitle>
                <Badge variant="secondary">Institucional</Badge>
              </div>
              <CardDescription>
                Inclui a assinatura oficial &ldquo;ORGANIZE. PLANEJE. SIRVA.&rdquo; alinhada à tipografia.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex h-36 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-6">
                <OpenMinistryLogo
                  variant="full"
                  colorScheme="dark"
                  className="h-12 w-auto max-w-full"
                />
              </div>
              <AssetActionButtons
                name="Logo Completo (Preto)"
                svgPath="/brand/openministry-logo-full-black.svg"
                pngPath="/brand/openministry-logo-full-black.png"
              />
            </CardContent>
          </Card>

          {/* Card 4: Logo Completo Invertido */}
          <Card className="flex flex-col justify-between overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Logo Completo (Invertido)</CardTitle>
                <Badge variant="secondary">Institucional Dark</Badge>
              </div>
              <CardDescription>
                Ideal para capas de apresentações, banners de mídia social e materiais solenes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex h-36 items-center justify-center rounded-xl bg-[#0A0A0A] p-6 shadow-inner">
                <OpenMinistryLogo
                  variant="full"
                  colorScheme="light"
                  className="h-12 w-auto max-w-full"
                />
              </div>
              <AssetActionButtons
                name="Logo Completo (Branco)"
                svgPath="/brand/openministry-logo-full-white.svg"
                pngPath="/brand/openministry-logo-full-white.png"
              />
            </CardContent>
          </Card>

          {/* Card 5: Ícone Minimal / Símbolo */}
          <Card className="flex flex-col justify-between overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Ícone Minimal (Símbolo)</CardTitle>
                <Badge variant="outline">Símbolo</Badge>
              </div>
              <CardDescription>
                Abertura das páginas e cruz central. Para avatares, favicons e marca d&apos;água.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex h-36 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4">
                  <OpenMinistrySymbol colorScheme="dark" className="size-16" />
                </div>
                <div className="flex h-36 items-center justify-center rounded-xl bg-[#0A0A0A] p-4 shadow-inner">
                  <OpenMinistrySymbol colorScheme="light" className="size-16" />
                </div>
              </div>
              <AssetActionButtons
                name="Símbolo Minimal"
                svgPath="/brand/openministry-symbol-black.svg"
                pngPath="/brand/openministry-symbol-black.png"
              />
            </CardContent>
          </Card>

          {/* Card 6: App Icons */}
          <Card className="flex flex-col justify-between overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">App Icons (PWA & Mobile)</CardTitle>
                <Badge variant="outline">iOS / Android</Badge>
              </div>
              <CardDescription>
                Ícones com cantos arredondados contínuos (squircle) para telas de celulares e tablets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex h-36 items-center justify-center gap-6 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4">
                <OpenMinistryAppIcon theme="dark" className="size-16 drop-shadow-md" />
                <OpenMinistryAppIcon theme="light" className="size-16 drop-shadow-sm" />
                <OpenMinistryAppIcon theme="primary" className="size-16 drop-shadow-md" />
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button size="sm" variant="outline" asChild className="h-8 text-xs">
                  <a href="/brand/openministry-app-icon-dark.png" download>
                    <DownloadIcon className="size-3.5" />
                    App Icon (Dark PNG)
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild className="h-8 text-xs">
                  <a href="/brand/openministry-app-icon-light.png" download>
                    <DownloadIcon className="size-3.5" />
                    App Icon (Light PNG)
                  </a>
                </Button>
                <Button size="sm" variant="secondary" asChild className="h-8 text-xs">
                  <a href="/icons/icon.svg" download>
                    <DownloadIcon className="size-3.5" />
                    Ícone PWA (SVG)
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Clear Space & Minimum Sizes Section */}
      <section id="respiro" className="mx-auto max-w-6xl px-5 py-12 sm:px-8 border-t">
        <div className="mb-10 space-y-2">
          <Badge variant="outline">Geometria & Grid</Badge>
          <h2 className="font-heading text-3xl tracking-tight sm:text-4xl">
            Área de Respiro & Tamanhos Mínimos
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            Para manter o impacto visual e a clareza da marca, preserve sempre o espaço de segurança
            e respeite os limites mínimos de legibilidade.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Clear Space Visualizer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Área de Respiro (1x)</CardTitle>
              <CardDescription>
                O valor &ldquo;1x&rdquo; corresponde à proporção do elemento central do símbolo.
                Nenhum outro texto ou imagem deve invadir este perímetro.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative flex items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-8">
                {/* 1x boundary box with dashed stroke */}
                <div className="relative rounded-lg border-2 border-dashed border-primary/40 p-8 sm:p-10">
                  {/* Indicators for 1x */}
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-xs text-primary font-semibold">
                    1x
                  </span>
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs text-primary font-semibold">
                    1x
                  </span>
                  <span className="absolute -left-6 top-1/2 -translate-y-1/2 font-mono text-xs text-primary font-semibold">
                    1x
                  </span>
                  <span className="absolute -right-6 top-1/2 -translate-y-1/2 font-mono text-xs text-primary font-semibold">
                    1x
                  </span>

                  <OpenMinistryLogo
                    variant="minimal"
                    colorScheme="dark"
                    className="h-10 sm:h-12 w-auto"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                A área de respiro garante que o logotipo mantenha seu destaque mesmo quando
                cercado por fotos, gráficos ou outros elementos de interface.
              </p>
            </CardContent>
          </Card>

          {/* Minimum Sizes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Tamanhos Mínimos de Aplicação</CardTitle>
              <CardDescription>
                Tamanhos calculados para garantir nitidez em telas digitais de alta e baixa densidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 32px */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-1">
                  <span className="font-mono text-xs font-semibold text-primary">32px de altura</span>
                  <p className="text-xs text-muted-foreground">
                    Barra superior desktop, cabeçalhos de relatórios e faturas.
                  </p>
                </div>
                <div className="flex items-center justify-end">
                  <OpenMinistryLogo
                    variant="minimal"
                    colorScheme="dark"
                    className="h-8 w-auto"
                  />
                </div>
              </div>

              {/* 24px */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-1">
                  <span className="font-mono text-xs font-semibold text-primary">24px de altura</span>
                  <p className="text-xs text-muted-foreground">
                    Navegação mobile e itens condensados da barra lateral.
                  </p>
                </div>
                <div className="flex items-center justify-end">
                  <OpenMinistryLogo
                    variant="minimal"
                    colorScheme="dark"
                    className="h-6 w-auto"
                  />
                </div>
              </div>

              {/* 16px */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="font-mono text-xs font-semibold text-primary">16px de altura</span>
                  <p className="text-xs text-muted-foreground">
                    Favicons, breadcrumbs e indicadores de status. Prefira o símbolo isolado.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <OpenMinistrySymbol colorScheme="dark" className="size-4" />
                  <OpenMinistryLogo
                    variant="minimal"
                    colorScheme="dark"
                    className="h-4 w-auto hidden sm:block"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Colors Section */}
      <section id="cores" className="mx-auto max-w-6xl px-5 py-12 sm:px-8 border-t">
        <div className="mb-10 space-y-2">
          <Badge variant="outline">Paleta Cromática</Badge>
          <h2 className="font-heading text-3xl tracking-tight sm:text-4xl">
            Cores Institucionais
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            A paleta do OpenMinistry equilibra o verde floresta nobre com a luminosidade
            suave do creme acolhedor, contrastado com superfícies escuras puras.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_PALETTE.map((color) => (
            <div
              key={color.hex}
              className="flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-4 shadow-2xs"
            >
              <div
                className={`h-24 w-full rounded-lg ${color.bgClass} ${
                  color.border ? "border border-zinc-200" : ""
                } p-3 flex flex-col justify-between`}
              >
                <span className={`text-xs font-medium ${color.textColor}`}>
                  {color.role}
                </span>
                <span className={`font-mono text-xs font-bold tracking-wider ${color.textColor}`}>
                  {color.hex}
                </span>
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{color.name}</span>
                  <CopyColorButton hex={color.hex} label={color.name} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {color.description}
                </p>
                <p className="font-mono text-[0.7rem] text-muted-foreground/70">
                  {color.rgb}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography Section */}
      <section id="tipografia" className="mx-auto max-w-6xl px-5 py-12 sm:px-8 border-t">
        <div className="mb-10 space-y-2">
          <Badge variant="outline">Sistema Tipográfico</Badge>
          <h2 className="font-heading text-3xl tracking-tight sm:text-4xl">
            Tipografia Oficial
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            Duas famílias que se complementam harmoniosamente: uma serifada acolhedora
            para títulos e momentos editoriais, e uma sans-serif neutra para a interface.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Fraunces Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-heading">Fraunces</CardTitle>
                <Badge variant="outline">Títulos & Editorial</Badge>
              </div>
              <CardDescription>
                Serifada expressiva e acolhedora inspirada no artesanato e tipografia clássica.
                Utilizada nos títulos principais, números destacados e elementos de identidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border bg-muted/40 p-5 space-y-2">
                <p className="font-heading text-3xl sm:text-4xl tracking-tight">
                  Cuidado que se organiza.
                </p>
                <p className="font-heading text-xl text-muted-foreground">
                  Menos planilhas. Mais presença pastoral.
                </p>
              </div>

              <div className="space-y-2 font-heading">
                <div className="text-sm text-muted-foreground">Alfabeto Completo</div>
                <div className="text-xl tracking-tight leading-relaxed break-all">
                  Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz
                </div>
                <div className="font-mono text-xs text-muted-foreground pt-1">
                  0 1 2 3 4 5 6 7 8 9 &bull; Variável (--font-display)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Geist Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-sans font-semibold">Geist</CardTitle>
                <Badge variant="outline">Interface & Conteúdo</Badge>
              </div>
              <CardDescription>
                Sans-serif de precisão geométrica para alta legibilidade em listas de voluntários,
                escalas de louvor, relatórios e formulários dinâmicos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border bg-muted/40 p-5 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Culto de Celebração &bull; Domingo às 19h00
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Escala de Ministros: 4 confirmados, 1 pendente. Notificações enviadas via WhatsApp.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Alfabeto Completo</div>
                <div className="text-lg tracking-normal leading-relaxed break-all font-sans">
                  Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz
                </div>
                <div className="font-mono text-xs text-muted-foreground pt-1">
                  0 1 2 3 4 5 6 7 8 9 &bull; Sans-Serif (--font-sans)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tagline Typography Spec */}
        <div className="mt-8 rounded-xl border bg-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Assinatura Oficial
              </span>
              <h3 className="text-xl font-bold tracking-tight mt-1">
                ORGANIZE. PLANEJE. SIRVA.
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Composição em caixa alta com espaçamento entre letras de 0.18em (tracking expandido)
                e pontos delimitadores entre os três pilares da missão.
              </p>
            </div>
            <Badge variant="secondary" className="w-fit font-mono text-xs">
              letter-spacing: 0.18em
            </Badge>
          </div>
        </div>
      </section>

      {/* Dos & Don'ts */}
      <section id="regras" className="mx-auto max-w-6xl px-5 py-12 sm:px-8 border-t">
        <div className="mb-10 space-y-2">
          <Badge variant="outline">Integridade da Marca</Badge>
          <h2 className="font-heading text-3xl tracking-tight sm:text-4xl">
            Boas Práticas & Regras de Uso
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            A consistência na aplicação é fundamental para preservar o reconhecimento e o valor
            institucional do OpenMinistry.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* O que fazer */}
          <Card className="border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2Icon className="size-5" />
                <CardTitle className="text-base font-semibold">O que FAZER</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <span className="mt-1 size-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  <strong>Preserve as proporções originais:</strong> Sempre redimensione mantendo o aspecto original restrito.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-1 size-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  <strong>Use as versões monocromáticas:</strong> Em fundos escuros use o logo branco; em fundos claros, o preto.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-1 size-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  <strong>Respeite a área de respiro:</strong> Garanta distância mínima de 1x de margem em torno do logo.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-1 size-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  <strong>Prefira o formato SVG:</strong> Sempre que possível, utilize vetor SVG para máxima nitidez em telas Retina.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* O que não fazer */}
          <Card className="border-rose-500/30 bg-rose-50/20 dark:bg-rose-950/10">
            <CardHeader>
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <XCircleIcon className="size-5" />
                <CardTitle className="text-base font-semibold">O que NÃO FAZER</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <span className="mt-1 size-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>
                  <strong>Não distorça ou estique:</strong> Nunca altere a proporção horizontal e vertical.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-1 size-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>
                  <strong>Não adicione sombras ou efeitos:</strong> Não use chanfros, gradientes internos ou contornos espessos.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-1 size-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>
                  <strong>Não rotacione:</strong> O logotipo deve ser sempre aplicado em posição horizontal perfeitamente nivelada.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-1 size-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>
                  <strong>Não troque a tipografia:</strong> Não substitua a fonte do wordmark por outras fontes genéricas.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Visual Showcase Gallery */}
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 border-t">
        <div className="mb-10 space-y-2">
          <Badge variant="outline">Aplicações Reais</Badge>
          <h2 className="font-heading text-3xl tracking-tight sm:text-4xl">
            Galeria & Demonstrações Visuais
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            Aplicações editoriais e conceituais do ecossistema de marca do OpenMinistry.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-xs group">
            <div className="relative aspect-[16/10] w-full overflow-hidden">
              <Image
                src="/brand/showcase-dark.jpg"
                alt="OpenMinistry Editorial Dark Theme"
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-5">
              <h3 className="font-heading text-lg">Guia Editorial Floresta Noturno</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Harmonia do tom verde floresta (#264A3A) com tipografia dourada solene e sombras orgânicas.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-card shadow-xs group">
            <div className="relative aspect-[16/10] w-full overflow-hidden">
              <Image
                src="/brand/showcase-banner.jpg"
                alt="OpenMinistry Workspace Showcase"
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-5">
              <h3 className="font-heading text-lg">Ambiente Pastoral de Gestão</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Software desenvolvido para a rotina diária de liderança, cultos e ministérios.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Download Kit Footer CTA */}
      <section id="downloads" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-background p-8 sm:p-12 text-center space-y-6">
          <span className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <OpenMinistrySymbol className="size-7" />
          </span>

          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="font-heading text-3xl tracking-tight sm:text-4xl">
              Pronto para aplicar a marca?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Baixe o pacote completo com todos os arquivos vetoriais em SVG, PNGs transparentes em alta definição e ícones de app.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="gap-2">
              <a href="/brand/openministry-brand-assets.zip" download>
                <DownloadIcon className="size-4" />
                Baixar Pacote Completo (.zip)
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">Voltar ao Início</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-5 py-10 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <OpenMinistrySymbol className="size-4" />
            </span>
            <span className="font-heading text-lg tracking-tight">OpenMinistry</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Início
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Criar conta
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Entrar
            </Link>
            <Link href="/api/docs" className="hover:text-foreground">
              Documentação
            </Link>
            <span className="inline-flex items-center gap-1.5">
              Feito para igrejas &bull; Organize. Planeje. Sirva.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

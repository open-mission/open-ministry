import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CalendarCheckIcon,
  CheckCircle2Icon,
  FileMusicIcon,
  MessageCircleIcon,
  SmartphoneIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.openministry.online";
const DOCS_URL =
  process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.openministry.online";

export default function SiteHomePage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-300">
      {/* Background radial atmosphere */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[40%] left-1/2 h-[800px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-100/40 via-emerald-50/10 to-transparent blur-3xl dark:from-emerald-950/20 dark:via-emerald-950/5" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-serif font-bold text-lg shadow-sm transition-transform group-hover:scale-105">
              ✝
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg font-bold tracking-tight text-foreground">
                OpenMinistry
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground -mt-1">
                Eclesiástica
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a
              href="#recursos"
              className="transition-colors hover:text-foreground"
            >
              Recursos
            </a>
            <a
              href="#diferenciais"
              className="transition-colors hover:text-foreground"
            >
              Diferenciais
            </a>
            <a
              href="#como-funciona"
              className="transition-colors hover:text-foreground"
            >
              Como Funciona
            </a>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground inline-flex items-center gap-1"
            >
              Documentação
              <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                Docs
              </span>
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={`${APP_URL}/login`}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg"
            >
              Entrar
            </a>
            <a
              href={`${APP_URL}/register`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow active:scale-[0.98]"
            >
              Começar Agora
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-8 backdrop-blur-sm">
              <SparklesIcon className="h-3.5 w-3.5" />
              <span>A plataforma moderna para seu ministério e igreja</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.12]">
              Liderança ministerial em harmonia.{" "}
              <span className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">
                Sem planilhas, sem atritos.
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Organize voluntários, escalas inteligentes com confirmação no
              WhatsApp, repertório de músicas com cifras e dados da comunidade em
              um só lugar.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={`${APP_URL}/register`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/95 hover:shadow-lg active:scale-[0.98]"
              >
                Criar Igreja Gratuitamente
                <ArrowRightIcon className="h-4 w-4" />
              </a>
              <a
                href={`${APP_URL}/login`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-7 py-3.5 text-base font-semibold text-foreground shadow-sm transition-all hover:bg-muted/70 active:scale-[0.98]"
              >
                Acessar Plataforma
              </a>
            </div>

            <p className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-4">
              <span className="flex items-center gap-1.5">
                <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Gratuito para começar
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Sem cartão de crédito
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Instale no celular (PWA)
              </span>
            </p>

            {/* Dashboard Mockup Showcase */}
            <div className="mt-16 sm:mt-20 relative mx-auto max-w-5xl rounded-2xl border border-border/80 bg-card/60 p-2 sm:p-4 shadow-2xl backdrop-blur-md">
              <div className="overflow-hidden rounded-xl border border-border/60 bg-background shadow-inner">
                {/* Mock Window Bar */}
                <div className="flex h-10 items-center justify-between border-b border-border/40 bg-muted/40 px-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground/80">
                    <span className="rounded bg-background px-2 py-0.5 border border-border/60">
                      app.openministry.online
                    </span>
                  </div>
                  <div className="w-8" />
                </div>

                {/* Mock Dashboard Content */}
                <div className="p-4 sm:p-6 text-left grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Escala do Domingo */}
                  <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <CalendarCheckIcon className="h-4 w-4" />
                        <span>Próximo Culto • Domingo 19h</span>
                      </div>
                      <span className="text-[10px] rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium px-2 py-0.5">
                        92% Confirmado
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px]">
                            G
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">Gabriel Silva</p>
                            <p className="text-[10px] text-muted-foreground">Teclado • Ministério Louvor</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2Icon className="h-3 w-3" /> WhatsApp OK
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-[10px]">
                            A
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">Ana Beatriz</p>
                            <p className="text-[10px] text-muted-foreground">Vocal Principal</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2Icon className="h-3 w-3" /> WhatsApp OK
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Repertório & Músicas */}
                  <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <FileMusicIcon className="h-4 w-4 text-emerald-600" />
                        <span>Repertório do Culto</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">4 músicas</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between rounded-lg border border-border/50 p-2">
                        <div>
                          <p className="font-medium text-foreground">Graça Infalível</p>
                          <p className="text-[10px] text-muted-foreground">Adoração • BPM 72</p>
                        </div>
                        <span className="font-mono text-xs font-bold rounded bg-primary/10 text-primary px-1.5 py-0.5">
                          Tom: G
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border/50 p-2">
                        <div>
                          <p className="font-medium text-foreground">Bondade de Deus</p>
                          <p className="text-[10px] text-muted-foreground">Louvor • BPM 68</p>
                        </div>
                        <span className="font-mono text-xs font-bold rounded bg-primary/10 text-primary px-1.5 py-0.5">
                          Tom: E
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: WhatsApp & Avisos */}
                  <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                        <MessageCircleIcon className="h-4 w-4" />
                        <span>WhatsApp Multi-canal</span>
                      </div>
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-xs border border-emerald-200/50 dark:border-emerald-800/30">
                      <p className="font-semibold text-emerald-900 dark:text-emerald-200 text-[11px]">
                        Lembrete Automático Enviado
                      </p>
                      <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 mt-1">
                        &ldquo;Olá Gabriel! Você está escalado para o teclado no culto deste Domingo às 19h. Clique para confirmar sua presença.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section id="recursos" className="py-20 md:py-28 bg-muted/30 border-y border-border/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs uppercase tracking-widest font-bold text-primary mb-3">
                Recursos Essenciais
              </h2>
              <p className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Tudo o que sua equipe precisa para servir com excelência
              </p>
              <p className="mt-4 text-base text-muted-foreground">
                Projetado especialmente para os desafios reais da rotina de ministérios e igrejas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                  <CalendarCheckIcon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Escalas Inteligentes & Equipes
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Evite sobrecargas e conflitos de datas. Controle disponibilidade, monte escalas de voluntários e saiba exatamente quem estará em cada culto.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
                  <MessageCircleIcon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Confirmação no WhatsApp
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Envie avisos de escalas diretamente no WhatsApp de cada voluntário. Eles confirmam presença com um toque, sem precisar instalar nada extra.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5">
                  <FileMusicIcon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Repertório & Cifras Musicais
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Mantenha a lista de louvores com tom, cifra dinâmica, links do YouTube e Spotify, organizados por culto, evento e tema.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
                <div className="h-11 w-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-5">
                  <UsersIcon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Membros & Aniversariantes
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Diretório vivo de membros, aniversariantes do mês com cálculo automático de idade e felicitações personalizadas para valorizar cada pessoa.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
                  <BookOpenIcon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Bíblia Digital Integrada
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Consulte passagens bíblicas, capítulos e versões diretamente na plataforma para preparação de ministrações, estudos e cultos.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
                <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-5">
                  <SmartphoneIcon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  App PWA Mobile & Offline
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Instalação instantânea na tela inicial do celular com carregamento rápido e suporte offline para consultar escalas em qualquer lugar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="como-funciona" className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-xs uppercase tracking-widest font-bold text-primary mb-3">
                Simplicidade
              </h2>
              <p className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Comece em 3 minutos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="rounded-xl border border-border bg-card p-6 text-center relative">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-4 text-base">
                  1
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  Crie a conta da sua Igreja
                </h3>
                <p className="text-sm text-muted-foreground">
                  Cadastre o nome da igreja e configure os primeiros departamentos e ministérios em minutos.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 text-center relative">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-4 text-base">
                  2
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  Convide líderes e voluntários
                </h3>
                <p className="text-sm text-muted-foreground">
                  Envie links de convite por email ou WhatsApp para que os voluntários entrem na equipe.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 text-center relative">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-4 text-base">
                  3
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  Escale e acompanhe
                </h3>
                <p className="text-sm text-muted-foreground">
                  Gere escalas com 1 clique e receba as confirmações de presença direto na sua tela.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 via-primary/10 to-transparent border-t border-border/60">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              Pronto para transformar a gestão do seu ministério?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              Junte-se às igrejas que já simplificaram suas escalas, comunicação e organização.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={`${APP_URL}/register`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/95 hover:shadow-lg active:scale-[0.98]"
              >
                Começar Gratuitamente
                <ArrowRightIcon className="h-4 w-4" />
              </a>
              <a
                href={`${APP_URL}/login`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 py-4 text-base font-semibold text-foreground shadow-sm transition-all hover:bg-muted/60"
              >
                Acessar Plataforma
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card py-12 text-sm text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-serif font-bold text-sm">
              ✝
            </div>
            <span className="font-serif font-semibold text-foreground">
              OpenMinistry
            </span>
            <span className="text-xs text-muted-foreground">
              • Um projeto OpenMission
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <a
              href={`${APP_URL}/login`}
              className="hover:text-foreground transition-colors"
            >
              App Login
            </a>
            <a
              href={`${APP_URL}/register`}
              className="hover:text-foreground transition-colors"
            >
              Criar Conta
            </a>
            <a
              href={DOCS_URL}
              className="hover:text-foreground transition-colors"
            >
              Documentação
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            © 2026 OpenMinistry. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

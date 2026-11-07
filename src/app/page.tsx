import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  ChurchIcon,
  HeartHandshakeIcon,
  MailIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OpenMinistrySymbol } from "@/components/brand/openministry-logo";

const features = [
  {
    icon: UsersIcon,
    title: "Pessoas em primeiro lugar",
    description:
      "Uma lista viva da sua equipe, com papéis claros e acesso no tempo certo. Sem planilhas paralelas.",
  },
  {
    icon: MailIcon,
    title: "Convites sem atrito",
    description:
      "Gere um link seguro, envie para o email da pessoa e acompanhe quem já aceitou o convite.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Permissões que protegem",
    description:
      "Proprietários administram a igreja. Administradores cuidam das pessoas. Membros participam com segurança.",
  },
];

const steps = [
  {
    number: "01",
    title: "Crie sua conta",
    description:
      "Um cadastro simples com nome, email e senha. Em menos de um minuto você já está dentro.",
  },
  {
    number: "02",
    title: "Dê nome à sua igreja",
    description:
      "Seu espaço é criado na hora. Você se torna o proprietário e pode convidar sua liderança.",
  },
  {
    number: "03",
    title: "Convide sua equipe",
    description:
      "Compartilhe links individuais por email e acompanhe cada pessoa que entra na igreja.",
  },
];

const mockMembers = [
  {
    name: "Ana Ribeiro",
    email: "ana@comunidade.org",
    role: "Administradora",
    initials: "AR",
    color: "bg-[oklch(0.9_0.05_145)] text-[oklch(0.32_0.06_155)]",
  },
  {
    name: "Daniel Souza",
    email: "daniel@comunidade.org",
    role: "Membro",
    initials: "DS",
    color: "bg-[oklch(0.92_0.04_70)] text-[oklch(0.36_0.06_55)]",
  },
  {
    name: "Marina Alves",
    email: "marina@comunidade.org",
    role: "Membro",
    initials: "MA",
    color: "bg-[oklch(0.9_0.03_250)] text-[oklch(0.34_0.05_250)]",
  },
];

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem] bg-[radial-gradient(70%_60%_at_50%_-10%,var(--color-secondary),transparent_72%)]"
      />

      <header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <OpenMinistrySymbol className="size-5" />
          </span>
          <span className="font-heading text-xl tracking-tight">
            OpenMinistry
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link
            href="#recursos"
            className="transition-colors hover:text-foreground"
          >
            Recursos
          </Link>
          <Link
            href="#como-funciona"
            className="transition-colors hover:text-foreground"
          >
            Como funciona
          </Link>
          <Link
            href="/brand"
            className="transition-colors hover:text-foreground"
          >
            Marca
          </Link>
          <Link
            href="/api/docs"
            className="transition-colors hover:text-foreground"
          >
            API
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <Button asChild variant="ghost" size="lg">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/signup">Criar conta</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-16 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:pt-16 lg:pb-28">
        <div className="space-y-8">
          <Badge
            variant="outline"
            className="h-6 gap-1.5 border-primary/20 bg-background/70 px-2.5 text-primary"
          >
            <SparklesIcon />
            Feito para igrejas que cuidam de pessoas
          </Badge>

          <div className="space-y-5">
            <h1 className="font-heading text-5xl leading-[0.96] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Sua igreja organizada.
              <br />
              Seu povo{" "}
              <span className="text-primary italic">cuidado.</span>
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              O OpenMinistry reúne pessoas, convites e permissões em um só
              lugar — para que sua equipe gaste menos tempo com planilhas e
              mais tempo com gente.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 px-5 text-sm">
              <Link href="/signup">
                Criar minha igreja
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 px-5 text-sm"
            >
              <Link href="/login">Já tenho conta</Link>
            </Button>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {mockMembers.map((member) => (
                <span
                  key={member.name}
                  className={`flex size-8 items-center justify-center rounded-full border-2 border-background text-[0.65rem] font-semibold ${member.color}`}
                >
                  {member.initials}
                </span>
              ))}
            </div>
            <p>
              Comece em minutos. Convide sua equipe quando quiser.
            </p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div
            aria-hidden
            className="absolute -inset-6 -z-10 rounded-[2.75rem] bg-accent/60 blur-2xl"
          />

          <div className="rotate-1 rounded-[2rem] border bg-card p-2 shadow-2xl shadow-primary/10">
            <div className="overflow-hidden rounded-[1.6rem] border bg-background">
              <div className="flex items-center justify-between border-b px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <ChurchIcon className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-medium">
                      Comunidade da Graça
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground">
                      Painel da igreja
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="font-normal">
                  Ao vivo
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 p-5">
                <div className="rounded-xl border bg-card p-3.5">
                  <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                    Pessoas
                  </p>
                  <p className="mt-1 font-heading text-3xl leading-none">128</p>
                  <p className="mt-1 text-[0.65rem] text-primary">
                    +6 este mês
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-3.5">
                  <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                    Convites
                  </p>
                  <p className="mt-1 font-heading text-3xl leading-none">4</p>
                  <p className="mt-1 text-[0.65rem] text-muted-foreground">
                    aguardando resposta
                  </p>
                </div>
              </div>

              <div className="border-t px-5 py-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Equipe recente</span>
                  <span className="text-muted-foreground">Ver todas</span>
                </div>
                <div className="mt-3 space-y-2.5">
                  {mockMembers.map((member) => (
                    <div
                      key={member.email}
                      className="flex items-center gap-2.5"
                    >
                      <span
                        className={`flex size-8 items-center justify-center rounded-full text-[0.6rem] font-semibold ${member.color}`}
                      >
                        {member.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {member.name}
                        </p>
                        <p className="truncate text-[0.65rem] text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                      <span className="rounded-full border px-2 py-0.5 text-[0.6rem] text-muted-foreground">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-6 -left-4 hidden w-56 rotate-[-3deg] rounded-2xl border bg-card p-3 shadow-xl sm:block">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <CheckIcon className="size-4" />
              </span>
              <div>
                <p className="text-xs font-medium">Convite aceito</p>
                <p className="text-[0.65rem] text-muted-foreground">
                  Ana entrou na equipe
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="recursos"
        className="border-y bg-card/60 px-5 py-20 sm:px-8"
      >
        <div className="mx-auto w-full max-w-6xl space-y-12">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
              Recursos
            </p>
            <h2 className="font-heading text-4xl leading-[1.02] tracking-tight text-balance sm:text-5xl">
              Uma base simples. Um ministério mais presente.
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              A organização certa libera a equipe para o que ela faz de melhor:
              acolher, servir e caminhar junto.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="group border-border/80 bg-background transition-colors hover:border-primary/25"
              >
                <CardContent className="space-y-4 p-6">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:-translate-y-0.5">
                    <Icon className="size-5" />
                  </span>
                  <div className="space-y-2">
                    <h3 className="font-heading text-xl tracking-tight">
                      {title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section
        id="como-funciona"
        className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8"
      >
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="space-y-4">
            <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
              Como funciona
            </p>
            <h2 className="font-heading text-4xl leading-[1.02] tracking-tight text-balance sm:text-5xl">
              Do primeiro acesso à equipe completa.
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Sem configurações complicadas. A igreja começa pequena e cresce
              no seu ritmo, com clareza em cada passo.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">
              <HeartHandshakeIcon className="size-3.5 text-primary" />
              Feito para a realidade da igreja local
            </div>
          </div>

          <ol className="space-y-0">
            {steps.map((step, index) => (
              <li key={step.number} className="relative flex gap-5 pb-8">
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute top-11 left-[1.375rem] h-[calc(100%-2.75rem)] w-px bg-border"
                  />
                ) : null}
                <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full border bg-card font-heading text-sm text-primary">
                  {step.number}
                </span>
                <div className="space-y-1.5 pt-1">
                  <h3 className="font-heading text-xl tracking-tight">
                    {step.title}
                  </h3>
                  <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8">
        <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl bg-primary px-6 py-12 text-primary-foreground sm:px-10 sm:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full border border-primary-foreground/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full border border-primary-foreground/10"
          />

          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl space-y-3">
              <p className="text-xs font-medium tracking-[0.18em] text-primary-foreground/60 uppercase">
                Comece hoje
              </p>
              <h2 className="font-heading text-4xl leading-[1.02] tracking-tight text-balance sm:text-5xl">
                Pronto para cuidar melhor da sua equipe?
              </h2>
              <p className="text-sm leading-relaxed text-primary-foreground/70">
                Crie o espaço da sua igreja, convide sua liderança e mantenha
                todos na mesma página.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary" className="h-11">
                <Link href="/signup">
                  Criar minha igreja
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-11 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link href="/login">Entrar</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t px-5 py-10 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <OpenMinistrySymbol className="size-4" />
            </span>
            <span className="font-heading text-lg tracking-tight">
              OpenMinistry
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/brand" className="hover:text-foreground">
              Brand Kit
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
              Feito para igrejas
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

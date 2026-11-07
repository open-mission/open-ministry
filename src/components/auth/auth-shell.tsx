import Link from "next/link";
import {
  HeartHandshakeIcon,
  QuoteIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";

import { OpenMinistrySymbol } from "@/components/brand/openministry-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: React.ReactNode;
  contentClassName?: string;
};

const highlights = [
  { icon: UsersIcon, label: "Pessoas organizadas" },
  { icon: ShieldCheckIcon, label: "Papéis claros" },
  { icon: HeartHandshakeIcon, label: "Cuidado em comunidade" },
];

export function AuthShell({ children, contentClassName }: AuthShellProps) {
  return (
    <main className="grid min-h-svh lg:grid-cols-[1.08fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-24 size-[28rem] rounded-full border border-primary-foreground/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-24 -right-40 size-[32rem] rounded-full border border-primary-foreground/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-44 left-10 size-[26rem] rounded-full bg-primary-foreground/5 blur-3xl"
        />

        <Link
          href="/"
          className="relative flex w-fit items-center gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/30"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
            <OpenMinistrySymbol className="size-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-heading text-xl tracking-tight">
              OpenMinistry
            </span>
            <span className="mt-1 text-[0.65rem] tracking-[0.18em] text-primary-foreground/60 uppercase">
              Cuidado que se organiza
            </span>
          </span>
        </Link>

        <div className="relative my-auto max-w-md space-y-7 py-16">
          <QuoteIcon className="size-8 text-primary-foreground/35" />
          <p className="font-heading text-4xl leading-[1.06] tracking-tight text-balance xl:text-5xl">
            Menos planilhas.
            <br />
            Mais presença.
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-primary-foreground/70">
            Reúna pessoas, convites e permissões em um só lugar para que sua
            equipe possa dedicar tempo ao que realmente importa.
          </p>
        </div>

        <div className="relative flex flex-wrap gap-x-6 gap-y-3 text-xs text-primary-foreground/60">
          {highlights.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <Icon className="size-3.5" />
              {label}
            </span>
          ))}
        </div>
      </aside>

      <section className="relative flex min-h-svh flex-col bg-background">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <OpenMinistrySymbol className="size-4" />
            </span>
            <span className="font-heading text-lg tracking-tight">
              OpenMinistry
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Voltar ao site
            </Link>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
          <div className={cn("w-full max-w-sm", contentClassName)}>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}

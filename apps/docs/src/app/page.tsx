import {
  BookOpenIcon,
  Code2Icon,
  MessageCircleIcon,
} from "lucide-react";

export default function DocsHomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-serif font-bold text-sm">
              ✝
            </div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-base text-foreground">
                OpenMinistry
              </span>
              <span className="rounded bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5">
                Docs
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <a
              href="https://openministry.online"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Site
            </a>
            <a
              href="https://app.openministry.online"
              className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground font-semibold"
            >
              Acessar App
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl px-4 py-12 sm:px-6 w-full">
        <div className="max-w-3xl mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Documentação OpenMinistry
          </h1>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Guias completos para administradores, líderes ministeriais, músicos e voluntários. Aprenda a configurar sua igreja, organizar escalas, integrar o WhatsApp e utilizar todos os recursos da plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
              <BookOpenIcon className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-foreground text-lg mb-2">Primeiros Passos</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Como criar sua igreja, convidar a primeira liderança e definir os departamentos fundamentais.
            </p>
            <span className="text-xs font-semibold text-primary">Em breve</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-4">
              <MessageCircleIcon className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-foreground text-lg mb-2">WhatsApp & Avisos</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Configuração da Evolution API para envio de lembretes e confirmações automáticas de escala.
            </p>
            <span className="text-xs font-semibold text-primary">Em breve</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4">
              <Code2Icon className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-foreground text-lg mb-2">API Reference</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Documentação interativa OpenAPI/Scalar para integrações de desenvolvedores e automações externas.
            </p>
            <span className="text-xs font-semibold text-primary">Em breve</span>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        © 2026 OpenMinistry Docs • openministry.online
      </footer>
    </div>
  );
}

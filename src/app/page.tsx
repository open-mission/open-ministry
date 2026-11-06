import Link from "next/link";
import { ArrowUpRightIcon, BookOpenIcon, ChurchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stack = [
  "Next.js 16",
  "Bun",
  "NeonDB",
  "Drizzle ORM",
  "Better Auth",
  "shadcn/ui",
  "Scalar",
];

export default function Home() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--color-muted),transparent_60%)]"
      />

      <div className="flex w-full max-w-2xl flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border bg-background shadow-sm">
            <ChurchIcon className="size-8" />
          </div>

          <div className="flex flex-col gap-3">
            <Badge variant="secondary" className="mx-auto">
              Ambiente configurado
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              OpenMinistry
            </h1>
            <p className="max-w-md text-balance text-muted-foreground">
              Uma solução para ajudar igrejas a se organizarem, cuidarem das
              pessoas e crescerem em comunidade.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/api/docs">
                <BookOpenIcon data-icon="inline-start" />
                Documentação da API
                <ArrowUpRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/api/auth/reference">
                Referência de autenticação
                <ArrowUpRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Stack do projeto</CardTitle>
            <CardDescription>
              Base técnica preparada para as próximas etapas do OpenMinistry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {stack.map((item) => (
                <li key={item}>
                  <Badge variant="outline">{item}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

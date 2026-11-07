import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChurchIcon, UsersIcon } from "lucide-react";

import { ChurchBrandingForm } from "@/components/church/church-branding-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOrganizationContext } from "@/lib/organizations";
import { listPeople } from "@/lib/people";

export const metadata: Metadata = {
  title: "Igreja",
};

export default function ChurchPage() {
  return (
    <Suspense fallback={<ChurchSkeleton />}>
      <ChurchContent />
    </Suspense>
  );
}

async function ChurchContent() {
  await connection();

  const { organization, isAdmin } = await requireOrganizationContext();
  const people = await listPeople(organization.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="space-y-2">
        <h1 className="font-heading text-4xl leading-none tracking-tight">
          Sua igreja
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          O nome e o logo que a equipe vê no painel, nos convites e no
          diretório.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="h-fit">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            {organization.logo ? (
              <Avatar className="size-24 rounded-2xl ring-1 ring-foreground/10">
                <AvatarImage
                  src={organization.logo}
                  alt={`Logo de ${organization.name}`}
                />
                <AvatarFallback className="rounded-2xl bg-primary/10 text-primary">
                  <ChurchIcon className="size-10" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <span className="flex size-24 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ChurchIcon className="size-10" />
              </span>
            )}
            <div className="space-y-1">
              <p className="font-heading text-2xl leading-tight tracking-tight">
                {organization.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {people.length === 1
                  ? "1 pessoa na igreja"
                  : `${people.length} pessoas na igreja`}
              </p>
            </div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <UsersIcon className="size-3.5" />
              OpenMinistry
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl tracking-tight">
              Identidade
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? "Atualize o nome e o logo da igreja."
                : "Apenas administradores podem alterar o nome e o logo."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <ChurchBrandingForm
                name={organization.name}
                logo={organization.logo}
              />
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-6 text-sm leading-relaxed text-muted-foreground">
                O nome e o logo são definidos pela administração da igreja.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChurchSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

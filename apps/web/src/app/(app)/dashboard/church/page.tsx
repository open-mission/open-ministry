import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { SettingsIcon } from "lucide-react";

import { PageInfo } from "@/components/app/page-info";
import { ChurchInfoCard } from "@/components/settings/church-info-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listDepartments } from "@/lib/departments";
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
  const [people, departments] = await Promise.all([
    listPeople(organization.id),
    listDepartments(organization.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 sm:gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl sm:text-4xl leading-none tracking-tight">
            Informações da Igreja
          </h1>
          <PageInfo
            title="Informações da Igreja"
            description="Identidade, endereço e canais oficiais da comunidade."
          />
        </div>

        {isAdmin ? (
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/dashboard/settings">
              <SettingsIcon className="size-4" />
              Painel de Configurações
            </Link>
          </Button>
        ) : null}
      </header>

      <ChurchInfoCard
        organization={organization}
        isAdmin={isAdmin}
        peopleCount={people.length}
        departmentsCount={departments.length}
      />
    </div>
  );
}

function ChurchSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { HandHeartIcon } from "lucide-react";

import { PageInfo } from "@/components/app/page-info";
import { CreateDepartmentDialog } from "@/components/departments/create-department-dialog";
import { DepartmentCard } from "@/components/departments/department-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listDepartments } from "@/lib/departments";
import { requireOrganizationContext } from "@/lib/organizations";

export const metadata: Metadata = {
  title: "Departamentos",
};

export default function DepartmentsPage() {
  return (
    <Suspense fallback={<DepartmentsSkeleton />}>
      <DepartmentsContent />
    </Suspense>
  );
}

async function DepartmentsContent() {
  await connection();

  const { organization, isAdmin } = await requireOrganizationContext();
  const departments = await listDepartments(organization.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-4xl leading-none tracking-tight">
            Departamentos
          </h1>
          <Badge variant="outline" className="font-normal">
            {departments.length}
          </Badge>
          <PageInfo
            title="Departamentos"
            description={
              <>
                Cada ministério reúne as funções e as pessoas que servem em{" "}
                <span className="font-medium text-foreground">
                  {organization.name}
                </span>
                .
              </>
            }
          />
        </div>
        {isAdmin ? <CreateDepartmentDialog /> : null}
      </header>

      {departments.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HandHeartIcon className="size-6" />
          </span>
          <div className="max-w-sm space-y-1.5">
            <p className="font-heading text-xl tracking-tight">
              Nenhum departamento ainda
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isAdmin
                ? "Comece pelo ministério que mais movimenta a igreja. Depois adicione as funções e as pessoas."
                : "Quando a liderança criar os primeiros ministérios, eles aparecem aqui."}
            </p>
          </div>
          {isAdmin ? <CreateDepartmentDialog /> : null}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {departments.map((department) => (
            <DepartmentCard key={department.id} department={department} />
          ))}
        </div>
      )}
    </div>
  );
}

function DepartmentsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );
}

import Link from "next/link";
import { CheckIcon, ClipboardListIcon } from "lucide-react";

import {
  formatEventFullDate,
  relativeDayLabel,
  type DepartmentCoverage,
} from "@/lib/events";
import { cn } from "@/lib/utils";

export function DepartmentCoverageBoard({
  departments,
  eventsCount,
}: {
  departments: DepartmentCoverage[];
  eventsCount: number;
}) {
  if (departments.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <div>
          <h2 className="font-heading text-2xl tracking-tight">
            Cobertura por departamento
          </h2>
          <p className="text-[0.8125rem] text-muted-foreground">
            Quem já tem gente em cada função nos próximos{" "}
            {eventsCount === 1 ? "encontro" : "encontros"}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
        {departments.map((department) => {
          const hasFunctions = department.totalSlots > 0;
          const percentage = !hasFunctions
            ? 0
            : Math.round(
                (department.coveredSlots / department.totalSlots) * 100,
              );
          const gapDate = department.nextGap?.startsAt;
          const gapDay = gapDate ? relativeDayLabel(gapDate) : null;

          return (
            <div
              key={department.departmentId}
              className="flex flex-col min-w-0 rounded-xl border border-border/70 bg-card p-4 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-heading text-lg tracking-tight">
                    <Link
                      href={`/dashboard/departments/${department.departmentId}`}
                      prefetch={true}
                      className="underline-offset-4 hover:underline"
                    >
                      {department.departmentName}
                    </Link>
                  </h3>
                  <p className="text-[0.8125rem] text-muted-foreground">
                    {department.eventsCount}{" "}
                    {department.eventsCount === 1 ? "encontro" : "encontros"}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                    !hasFunctions
                      ? "bg-muted text-muted-foreground"
                      : department.eventsWithGaps === 0
                        ? "bg-primary/10 text-primary"
                        : "bg-amber-500/15 text-amber-800 dark:text-amber-300",
                  )}
                >
                  {!hasFunctions
                    ? "Sem funções"
                    : department.eventsWithGaps === 0
                      ? "Em dia"
                      : `${department.eventsWithGaps} ${
                          department.eventsWithGaps === 1
                            ? "pendência"
                            : "pendências"
                        }`}
                </span>
              </div>

              {hasFunctions ? (
                <>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        percentage === 100 ? "bg-primary" : "bg-amber-500",
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <p className="mt-2 text-[0.8125rem] text-muted-foreground">
                    {department.coveredSlots} de {department.totalSlots} funções
                    com pelo menos 1 pessoa
                  </p>
                </>
              ) : (
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
                  Nenhuma função cadastrada nos encontros deste departamento.
                </p>
              )}

              {department.nextGap ? (
                <Link
                  href={`/dashboard/events/${department.nextGap.eventId}?tab=teams`}
                  prefetch={true}
                  className="mt-3 block min-w-0 rounded-lg border border-amber-500/25 bg-amber-500/10 p-2.5 transition-colors hover:bg-amber-500/15 overflow-hidden"
                >
                  <div className="flex items-start gap-1.5 text-[0.8125rem] font-medium text-amber-900 dark:text-amber-200 min-w-0">
                    <ClipboardListIcon className="mt-0.5 size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 break-words leading-snug">
                      Faltam {department.nextGap.missingFunctions.length}{" "}
                      {department.nextGap.missingFunctions.length === 1
                        ? "função"
                        : "funções"}{" "}
                      ·{" "}
                      {gapDay ??
                        formatEventFullDate(department.nextGap.startsAt)}
                    </span>
                  </div>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {department.nextGap.missingFunctions.join(", ")}
                  </span>
                  <span className="mt-1 block truncate text-xs font-medium text-foreground">
                    Abrir escala de {department.nextGap.eventTitle}
                  </span>
                </Link>
              ) : hasFunctions ? (
                <p className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-primary">
                  <CheckIcon className="size-3.5" />
                  Tudo coberto
                </p>
              ) : (
                <Link
                  href={`/dashboard/departments/${department.departmentId}`}
                  prefetch={true}
                  className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  Configurar funções
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

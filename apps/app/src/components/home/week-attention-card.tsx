import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { HomeCard, HomeCardContent } from "@/components/home/home-card";
import {
  HomeSection,
  HomeSectionAction,
  HomeSectionHeader,
  HomeSectionTitle,
} from "@/components/home/home-section";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatEventFullDate, type DepartmentCoverage } from "@/lib/events";

export type WeekAttentionItem = {
  departmentId: string;
  departmentName: string;
  eventId: string;
  eventTitle: string;
  startsAt: Date;
  missingFunctions: string[];
};

const MAX_ITEMS = 3;

/**
 * Resume as pendências de escala dos departamentos liderados, sem planilhas:
 * apenas os próximos encontros com funções em aberto, do mais próximo ao mais
 * distante.
 */
export function buildWeekAttentionItems(
  departments: DepartmentCoverage[],
  limit = MAX_ITEMS,
): WeekAttentionItem[] {
  return departments
    .flatMap((department) =>
      department.nextGap
        ? [
            {
              departmentId: department.departmentId,
              departmentName: department.departmentName,
              eventId: department.nextGap.eventId,
              eventTitle: department.nextGap.eventTitle,
              startsAt: department.nextGap.startsAt,
              missingFunctions: department.nextGap.missingFunctions,
            },
          ]
        : [],
    )
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .slice(0, limit);
}

export function WeekAttentionCard({
  departments,
  canManage = false,
}: {
  departments: DepartmentCoverage[];
  canManage?: boolean;
}) {
  const items = buildWeekAttentionItems(departments);

  if (!canManage || items.length === 0) {
    return null;
  }

  return (
    <HomeSection aria-labelledby="home-week-attention-title">
      <HomeSectionHeader>
        <HomeSectionTitle id="home-week-attention-title">
          Atenção da semana
        </HomeSectionTitle>
        <HomeSectionAction>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 min-h-[44px] px-2 text-xs text-primary hover:text-primary"
          >
            <Link href="/schedules">
              Ver escalas
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </HomeSectionAction>
      </HomeSectionHeader>

      <HomeCard>
        <HomeCardContent className="space-y-0">
          {items.map((item, index) => (
            <div key={`${item.departmentId}:${item.eventId}`}>
              {index > 0 ? <Separator className="my-1" /> : null}
              <Link
                href={`/events/${item.eventId}`}
                className="flex min-h-[44px] items-start gap-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.departmentName} · {item.eventTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatEventFullDate(item.startsAt)} · Falta:{" "}
                    {item.missingFunctions.join(", ")}
                  </p>
                </div>
                <ArrowRightIcon
                  className="mt-1 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
              </Link>
            </div>
          ))}
        </HomeCardContent>
      </HomeCard>
    </HomeSection>
  );
}

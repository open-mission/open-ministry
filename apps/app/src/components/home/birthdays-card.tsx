import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { HomeCard, HomeCardContent } from "@/components/home/home-card";
import {
  HomeSection,
  HomeSectionAction,
  HomeSectionHeader,
  HomeSectionTitle,
} from "@/components/home/home-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  relativeBirthdayLabel,
  shortMonthLabel,
  type BirthdayEntry,
  type CalendarDate,
} from "@/lib/birthdays";
import { getInitials } from "@/lib/format";

/**
 * Regra da nova home: aniversariantes fora do mês atual não aparecem e,
 * não havendo nenhum, a seção inteira não é renderizada.
 */
export function birthdaysForCurrentMonth(
  entries: BirthdayEntry[],
  today: CalendarDate,
): BirthdayEntry[] {
  return entries
    .filter((entry) => entry.month === today.month)
    .sort((a, b) => a.day - b.day || a.name.localeCompare(b.name, "pt-BR"));
}

export function BirthdaysCard({
  entries,
  today,
  leaderIds = [],
}: {
  entries: BirthdayEntry[];
  today: CalendarDate;
  leaderIds?: string[];
}) {
  const monthEntries = birthdaysForCurrentMonth(entries, today);

  if (monthEntries.length === 0) {
    return null;
  }

  const leaders = new Set(leaderIds);

  return (
    <HomeSection aria-labelledby="home-birthdays-title">
      <HomeSectionHeader>
        <HomeSectionTitle id="home-birthdays-title">
          Aniversariantes do mês
        </HomeSectionTitle>
        <HomeSectionAction>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 min-h-[44px] px-2 text-xs text-primary hover:text-primary"
          >
            <Link href="/dashboard/birthdays">
              Ver todos
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </HomeSectionAction>
      </HomeSectionHeader>

      <HomeCard>
        <HomeCardContent className="space-y-0">
          {monthEntries.map((entry) => (
            <div key={entry.personId} className="flex items-center gap-3 py-2">
              <Avatar className="size-10 shrink-0">
                <AvatarImage src={entry.image ?? undefined} alt={entry.name} />
                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                  {getInitials(entry.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {entry.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {leaders.has(entry.personId) ? "Líder" : "Membro"} ·{" "}
                  {relativeBirthdayLabel(entry)}
                </p>
              </div>

              <span className="flex shrink-0 flex-col items-center text-primary">
                <span className="font-heading text-lg leading-none font-semibold tabular-nums">
                  {entry.day}
                </span>
                <span className="text-[10px] font-semibold tracking-[0.12em]">
                  {shortMonthLabel(entry.month)}
                </span>
              </span>
            </div>
          ))}
        </HomeCardContent>
      </HomeCard>
    </HomeSection>
  );
}

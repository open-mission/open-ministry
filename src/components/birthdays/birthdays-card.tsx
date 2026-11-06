import Link from "next/link";
import { ArrowRightIcon, CakeIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  relativeBirthdayLabel,
  shortMonthLabel,
  type BirthdayEntry,
} from "@/lib/birthdays";

export function BirthdaysCard({ entries }: { entries: BirthdayEntry[] }) {
  const highlights = [
    ...entries
      .filter((entry) => entry.isToday)
      .map((entry) => ({ entry, label: "Hoje" })),
    ...entries
      .filter((entry) => entry.isTomorrow)
      .map((entry) => ({ entry, label: "Amanhã" })),
  ];
  const upcoming = entries
    .filter((entry) => !entry.isToday && !entry.isTomorrow)
    .slice(0, 4);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle className="font-heading text-xl tracking-tight">
            Aniversariantes
          </CardTitle>
          <CardDescription>
            Quem faz festa nos próximos dias.
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/birthdays">
            Ver todos
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CakeIcon className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">Nenhuma data cadastrada</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                Cada pessoa pode completar a própria data de nascimento em
                Aniversariantes.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/birthdays">Completar as datas</Link>
            </Button>
          </div>
        ) : (
          <>
            {highlights.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {highlights.map(({ entry, label }) => (
                  <Highlight
                    key={`${entry.personId}-${label}`}
                    entry={entry}
                    label={label}
                  />
                ))}
              </div>
            ) : null}

            {upcoming.length > 0 ? (
              <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
                {upcoming.map((entry) => (
                  <li
                    key={entry.personId}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                  >
                    <span className="flex w-9 shrink-0 flex-col items-center">
                      <span className="font-heading text-xl leading-none text-foreground">
                        {entry.day}
                      </span>
                      <span className="mt-0.5 text-[0.6rem] tracking-[0.12em] text-muted-foreground">
                        {shortMonthLabel(entry.month)}
                      </span>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {entry.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {relativeBirthdayLabel(entry)}
                        {entry.turningAge !== null
                          ? ` · ${entry.turningAge} anos`
                          : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum outro aniversário nos próximos dias.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Highlight({
  entry,
  label,
}: {
  entry: BirthdayEntry;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-accent/60 px-4 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background/70 text-accent-foreground">
        <CakeIcon className="size-5" />
      </span>
      <div className="min-w-0">
        <Badge variant="secondary" className="mb-1 font-normal">
          {label}
        </Badge>
        <p className="truncate font-heading text-base leading-tight tracking-tight">
          {entry.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {entry.dateLabel}
          {entry.turningAge !== null
            ? ` · completa ${entry.turningAge} anos`
            : ""}
        </p>
      </div>
    </div>
  );
}

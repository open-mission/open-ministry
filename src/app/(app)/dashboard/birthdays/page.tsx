import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CakeIcon } from "lucide-react";

import { BirthdayForm } from "@/components/birthdays/birthday-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildBirthdayEntries,
  getTodayInSaoPaulo,
  groupBirthdaysByMonth,
  relativeBirthdayLabel,
  type BirthdayEntry,
} from "@/lib/birthdays";
import { requireOrganizationContext } from "@/lib/organizations";
import { listPeople } from "@/lib/people";

export const metadata: Metadata = {
  title: "Aniversariantes",
};

export default function BirthdaysPage() {
  return (
    <Suspense fallback={<BirthdaysSkeleton />}>
      <BirthdaysContent />
    </Suspense>
  );
}

async function BirthdaysContent() {
  await connection();

  const { organization, session, isAdmin } = await requireOrganizationContext();
  const people = await listPeople(organization.id);
  const today = getTodayInSaoPaulo();
  const entries = buildBirthdayEntries(people, {
    includeAge: isAdmin,
    today,
  });
  const groups = groupBirthdaysByMonth(entries, today);
  const highlights: { entry: BirthdayEntry; label: string }[] = [
    ...entries
      .filter((entry) => entry.isToday)
      .map((entry) => ({ entry, label: "Hoje" })),
    ...entries
      .filter((entry) => entry.isTomorrow)
      .map((entry) => ({ entry, label: "Amanhã" })),
  ];

  if (highlights.length < 2) {
    for (const entry of entries) {
      if (
        highlights.some(
          (highlight) => highlight.entry.personId === entry.personId,
        )
      ) {
        continue;
      }

      highlights.push({ entry, label: "Próximo" });

      if (highlights.length >= 2) {
        break;
      }
    }
  }

  const maxDate = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;
  const ownBirthday = session.user.birthday ?? null;
  const thisMonthCount = entries.filter(
    (entry) => entry.month === today.month,
  ).length;
  const withoutBirthday = people.length - entries.length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-4xl leading-none tracking-tight">
            Aniversariantes
          </h1>
          <Badge variant="outline" className="font-normal">
            {entries.length}
          </Badge>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          As datas de quem faz parte de{" "}
          <span className="font-medium text-foreground">
            {organization.name}
          </span>
          . O dia e o mês ficam visíveis para toda a equipe.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.55fr_0.85fr]">
        <div className="space-y-6">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-14 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CakeIcon className="size-6" />
              </span>
              <div className="max-w-sm space-y-1.5">
                <p className="font-heading text-xl tracking-tight">
                  Nenhuma data cadastrada ainda
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Cada pessoa pode preencher a própria data de nascimento ao
                  lado. Assim que a primeira data chegar, os aniversários
                  aparecem aqui.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {highlights.map(({ entry, label }, index) => (
                  <HighlightPanel
                    key={`${entry.personId}-${label}`}
                    entry={entry}
                    label={label}
                    tone={index === 0 ? "primary" : "accent"}
                  />
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-xl tracking-tight">
                    O ano da equipe
                  </CardTitle>
                  <CardDescription>
                    De {groups[0]?.label.toLowerCase()} a{" "}
                    {groups[11]?.label.toLowerCase()}, mês a mês.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                    {groups.map((group) => (
                      <section key={group.month} className="space-y-2">
                        <div className="flex items-baseline justify-between gap-2 border-b pb-1.5">
                          <h2 className="font-heading text-lg tracking-tight">
                            {group.label}
                          </h2>
                          <span className="text-[0.7rem] whitespace-nowrap text-muted-foreground">
                            {group.entries.length === 0
                              ? "sem datas"
                              : group.entries.length === 1
                                ? "1 aniversário"
                                : `${group.entries.length} aniversários`}
                          </span>
                        </div>

                        {group.entries.length === 0 ? null : (
                          <ul className="space-y-1">
                            {group.entries.map((entry) => (
                              <li
                                key={entry.personId}
                                className="flex items-baseline justify-between gap-3"
                              >
                                <span className="flex min-w-0 items-baseline gap-2">
                                  <span className="w-6 shrink-0 text-right font-heading text-base text-primary">
                                    {entry.day}
                                  </span>
                                  <span className="truncate text-sm">
                                    {entry.name}
                                  </span>
                                </span>
                                {entry.turningAge !== null ? (
                                  <span className="shrink-0 text-[0.7rem] whitespace-nowrap text-muted-foreground">
                                    {entry.birthYear} · {entry.turningAge} anos
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl tracking-tight">
                Sua data
              </CardTitle>
              <CardDescription>
                Mantenha a sua data em dia para a equipe celebrar com você.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BirthdayForm birthday={ownBirthday} maxDate={maxDate} />
            </CardContent>
            <CardFooter className="text-xs leading-relaxed text-muted-foreground">
              A equipe vê o dia e o mês para celebrar junto. O ano fica visível
              apenas para administradores.
            </CardFooter>
          </Card>

          {entries.length > 0 ? (
            <Card>
              <CardContent className="space-y-3 p-5">
                <dl className="space-y-2 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground">
                      Pessoas com data
                    </dt>
                    <dd className="font-medium">{entries.length}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground">Neste mês</dt>
                    <dd className="font-medium">{thisMonthCount}</dd>
                  </div>
                  {isAdmin && withoutBirthday > 0 ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground">Sem data</dt>
                      <dd className="font-medium">{withoutBirthday}</dd>
                    </div>
                  ) : null}
                </dl>
                <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                  {isAdmin
                    ? "Administradores veem o ano de nascimento e a idade. Os demais membros veem apenas o dia e o mês."
                    : "O ano de nascimento e a idade ficam visíveis apenas para administradores."}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function HighlightPanel({
  entry,
  label,
  tone,
}: {
  entry: BirthdayEntry;
  label: string;
  tone: "primary" | "accent";
}) {
  const isPrimary = tone === "primary";

  return (
    <div
      className={
        isPrimary
          ? "flex flex-col justify-between gap-6 rounded-xl bg-primary p-5 text-primary-foreground"
          : "flex flex-col justify-between gap-6 rounded-xl bg-accent/60 p-5 text-accent-foreground"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={
            isPrimary
              ? "rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium"
              : "rounded-full bg-background/60 px-2.5 py-1 text-xs font-medium"
          }
        >
          {label}
        </span>
        <CakeIcon
          className={
            isPrimary ? "size-5 text-primary-foreground/70" : "size-5 opacity-60"
          }
        />
      </div>

      <div className="space-y-1">
        <p className="font-heading text-2xl leading-tight tracking-tight text-balance">
          {entry.name}
        </p>
        <p
          className={
            isPrimary
              ? "text-sm text-primary-foreground/75"
              : "text-sm text-accent-foreground/75"
          }
        >
          {entry.dateLabel} · {relativeBirthdayLabel(entry)}
          {entry.turningAge !== null
            ? ` · completa ${entry.turningAge} anos`
            : ""}
        </p>
      </div>
    </div>
  );
}

function BirthdaysSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.55fr_0.85fr]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

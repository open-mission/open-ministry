import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import {
  CalendarDaysIcon,
  ClockIcon,
  DownloadIcon,
  GlobeIcon,
  LockIcon,
  MapPinIcon,
  Music2Icon,
  UserIcon,
} from "lucide-react";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { computePlanItemTimes } from "@/lib/plan-utils";
import { formatEventFullDate, formatEventTimeRange } from "@/lib/events";
import { eventKindLabels, type EventKind } from "@/lib/event-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const event = await db.query.event.findFirst({
    where: and(
      eq(schema.event.publicShareToken, token),
      eq(schema.event.isPublicShareEnabled, true),
    ),
    columns: { title: true },
    with: { organization: { columns: { name: true } } },
  });

  if (!event) {
    return {
      title: "Cronograma não encontrado | OpenMinistry",
    };
  }

  return {
    title: `Cronograma: ${event.title} • ${event.organization.name}`,
    description: `Acompanhe a ordem litúrgica e os momentos de ${event.title} em ${event.organization.name}.`,
  };
}

export default async function PublicCronogramaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const event = await db.query.event.findFirst({
    where: eq(schema.event.publicShareToken, token),
    with: {
      organization: true,
      planItems: {
        with: {
          person: true,
          song: true,
        },
        orderBy: (items, { asc }) => [asc(items.order), asc(items.createdAt)],
      },
    },
  });

  if (!event || !event.isPublicShareEnabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
          <LockIcon className="size-6" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Cronograma Indisponível
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
          Este link público foi desativado pela liderança da igreja ou expirou.
          Entre em contato com os organizadores caso precise de acesso.
        </p>
      </div>
    );
  }

  const { computedItems, totalPlanSeconds } = computePlanItemTimes(
    event.startsAt,
    event.planItems,
  );

  const kindLabel =
    eventKindLabels[event.kind as EventKind] || "Culto ou Evento";
  const dateLabel = formatEventFullDate(event.startsAt);
  const timeLabel = formatEventTimeRange(event.startsAt, event.endsAt);

  const totalMinutes = Math.floor(totalPlanSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const durationFormatted =
    hours > 0 ? `${hours}h ${minutes.toString().padStart(2, "0")}m` : `${totalMinutes} min`;

  return (
    <div className="min-h-screen bg-muted/20 text-foreground pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b bg-background/90 px-4 py-3 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {event.organization.logo ? (
              <Image
                src={event.organization.logo}
                alt={event.organization.name}
                width={32}
                height={32}
                className="size-8 rounded-lg object-cover"
              />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary text-xs">
                {event.organization.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {event.organization.name}
              </p>
              <h2 className="truncate text-sm font-bold text-foreground">
                {event.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {event.publicShareAllowPdf ? (
              <Button asChild size="sm" variant="default" className="gap-1.5 h-8 text-xs font-medium">
                <a
                  href={`/api/events/${event.id}/plan/pdf?token=${token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <DownloadIcon className="size-3.5" />
                  <span className="hidden sm:inline">Baixar PDF</span>
                  <span className="sm:hidden">PDF</span>
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 pt-6 sm:px-8 space-y-6">
        {/* Hero Card */}
        <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <Badge variant="secondary" className="font-medium text-xs">
              {kindLabel}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <GlobeIcon className="size-3 text-emerald-500" />
              Link Público Oficial
            </span>
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {event.title}
          </h1>

          {event.description ? (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {event.description}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-5 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarDaysIcon className="size-4 text-primary shrink-0" />
              <span>{dateLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ClockIcon className="size-4 text-primary shrink-0" />
              <span>{timeLabel}</span>
            </div>
            {event.location ? (
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="size-4 text-primary shrink-0" />
                <span>{event.location}</span>
              </div>
            ) : null}
          </div>

          {/* Metrics summary */}
          <div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-center sm:text-left">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Momentos
              </p>
              <p className="mt-0.5 text-lg font-bold text-foreground">
                {computedItems.filter((i) => i.type === "item").length}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Músicas
              </p>
              <p className="mt-0.5 text-lg font-bold text-foreground">
                {computedItems.filter((i) => i.type === "item" && (i.songId || i.song)).length}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Tempo Litúrgico
              </p>
              <p className="mt-0.5 text-lg font-bold text-foreground">
                {durationFormatted}
              </p>
            </div>
          </div>
        </div>

        {/* Schedule Items */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold tracking-tight">
              Ordem dos Momentos
            </h3>
            <span className="text-xs text-muted-foreground">
              Horários estimados
            </span>
          </div>

          {computedItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Nenhum momento cadastrado neste cronograma até o momento.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {computedItems.map((item, index) => {
                if (item.type === "header") {
                  return (
                    <div
                      key={item.id || index}
                      className="mt-6 first:mt-2 rounded-xl bg-muted/80 px-4 py-2.5 border border-border/50"
                    >
                      <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                        {item.title}
                      </h4>
                      {item.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  );
                }

                const responsible =
                  item.person?.name || item.customResponsible || null;

                return (
                  <div
                    key={item.id || index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border bg-card p-3.5 sm:p-4 shadow-2xs hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Time pill */}
                      <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-muted px-2.5 py-1 text-center min-w-16">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {item.timeLabel}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {item.durationLabel}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground leading-snug">
                          {item.title}
                        </h4>
                        {item.description ? (
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                        ) : null}

                        {/* Song details */}
                        {item.song ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                            <Badge
                              variant="outline"
                              className="gap-1 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40"
                            >
                              <Music2Icon className="size-3" />
                              <span className="font-medium">{item.song.title}</span>
                              {item.song.tone ? (
                                <span className="font-bold ml-0.5">({item.song.tone})</span>
                              ) : null}
                            </Badge>
                            {item.song.bpm ? (
                              <span className="text-[10px] text-muted-foreground">
                                {item.song.bpm} BPM
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Responsible badge */}
                    {responsible ? (
                      <div className="flex sm:justify-end shrink-0 pl-19 sm:pl-0">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary/60 px-2 py-1 text-xs font-medium text-foreground">
                          <UserIcon className="size-3 text-muted-foreground" />
                          <span>{responsible}</span>
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="pt-8 pb-4 text-center text-xs text-muted-foreground space-y-1">
          <p>
            Cronograma compartilhado através do{" "}
            <Link
              href="/"
              className="font-medium text-foreground hover:underline"
            >
              OpenMinistry
            </Link>
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            Atualizado em tempo real pelos líderes de departamento.
          </p>
        </footer>
      </main>
    </div>
  );
}

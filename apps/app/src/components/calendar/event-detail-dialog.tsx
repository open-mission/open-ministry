"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ptBR } from "date-fns/locale";
import {
  CakeIcon,
  CalendarDaysIcon,
  CalendarX2Icon,
  ClockIcon,
  ExternalLinkIcon,
  ListOrderedIcon,
  MapPinIcon,
  Music2Icon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react";

import { getCalendarEventPreviewAction } from "@/app/actions/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  formatCalendarDate,
  type CalendarEventPreview,
  type CalendarItem,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

type EventPreviewSheetProps = {
  item: CalendarItem | null;
  open: boolean;
  timeZone?: string | null;
  onOpenChange: (open: boolean) => void;
};

function capitalizeFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDurationMinutes(durationSeconds: number): string {
  const mins = Math.max(1, Math.round(durationSeconds / 60));
  return `${mins} min`;
}

function buildPlanPreviewRows(
  planItems: CalendarEventPreview["planItems"],
  startsAt: string,
  timeZone?: string | null,
) {
  const baseStartMs = new Date(startsAt).getTime();
  return planItems.reduce<{
    offsetSeconds: number;
    rows: (CalendarEventPreview["planItems"][number] & { timeLabel: string })[];
  }>(
    (acc, planItem) => {
      const stepTimeIso = new Date(
        baseStartMs + acc.offsetSeconds * 1000,
      ).toISOString();
      const nextOffset =
        planItem.type !== "header"
          ? acc.offsetSeconds + Math.max(0, planItem.durationSeconds)
          : acc.offsetSeconds;
      acc.rows.push({
        ...planItem,
        timeLabel: formatCalendarDate(stepTimeIso, "HH:mm", { timeZone }),
      });
      acc.offsetSeconds = nextOffset;
      return acc;
    },
    { offsetSeconds: 0, rows: [] },
  );
}

export function EventPreviewSheet({
  item,
  open,
  timeZone,
  onOpenChange,
}: EventPreviewSheetProps) {
  const isMobile = useIsMobile();
  const cacheRef = useRef<Map<string, CalendarEventPreview | null>>(new Map());
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [preview, setPreview] = useState<CalendarEventPreview | null>(null);

  const eventId =
    item && (item.type === "event" || item.type === "assignment")
      ? item.metadata?.eventId ?? null
      : null;

  useEffect(() => {
    if (!open || !eventId) {
      return;
    }

    if (cacheRef.current.has(eventId)) {
      setPreview(cacheRef.current.get(eventId) ?? null);
      setLoadingEventId(null);
      return;
    }

    let cancelled = false;
    setPreview(null);
    setLoadingEventId(eventId);

    getCalendarEventPreviewAction(eventId)
      .then((result) => {
        cacheRef.current.set(eventId, result);
        if (!cancelled) {
          setPreview(result);
          setLoadingEventId(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreview(null);
          setLoadingEventId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, open]);

  if (!item) return null;

  const isLoadingPreview = Boolean(eventId && loadingEventId === eventId);
  const effectivePreview =
    preview && eventId && preview.eventId === eventId ? preview : null;

  const formattedDate = capitalizeFirst(
    formatCalendarDate(item.startsAt, "EEEE, dd 'de' MMMM 'de' yyyy", {
      timeZone,
      locale: ptBR,
    }),
  );

  const formattedTime = item.allDay
    ? "Dia todo"
    : `${formatCalendarDate(item.startsAt, "HH:mm", {
        timeZone,
      })} às ${formatCalendarDate(item.endsAt, "HH:mm", { timeZone })}`;

  const isRehearsal =
    item.metadata?.eventKind === "rehearsal" || item.color === "purple";
  const hasMyAssignment =
    item.type === "assignment" || Boolean(item.metadata?.isMyAssignment);

  const badgeRow = (
    <div className="flex flex-wrap items-center gap-2">
      {hasMyAssignment ? (
        <Badge className="border-primary/20 bg-secondary text-[11px] font-semibold text-primary">
          <UserCheckIcon className="mr-1 size-3" aria-hidden="true" />
          {item.metadata?.functionName
            ? `Você serve: ${item.metadata.functionName}`
            : "Minha escala"}
        </Badge>
      ) : item.type === "event" && isRehearsal ? (
        <Badge className="border-event-purple-border/40 bg-event-purple-bg text-[11px] font-medium text-event-purple">
          <Music2Icon className="mr-1 size-3" aria-hidden="true" />
          Ensaio
        </Badge>
      ) : item.type === "event" ? (
        <Badge variant="outline" className="text-[11px] font-medium">
          <CalendarDaysIcon className="mr-1 size-3 text-primary" aria-hidden="true" />
          Culto / Evento
        </Badge>
      ) : item.type === "unavailability" ? (
        <Badge className="border-event-orange-border/40 bg-event-orange-bg text-[11px] font-medium text-event-orange">
          <CalendarX2Icon className="mr-1 size-3" aria-hidden="true" />
          {item.metadata?.isMine === false
            ? "Indisponibilidade da equipe"
            : "Indisponível"}
        </Badge>
      ) : (
        <Badge className="border-event-red-border/40 bg-event-red-bg text-[11px] font-medium text-event-red">
          <CakeIcon className="mr-1 size-3" aria-hidden="true" />
          Aniversariante
        </Badge>
      )}
    </div>
  );

  const { rows: planRows, offsetSeconds: totalPlanSeconds } =
    buildPlanPreviewRows(
      effectivePreview?.planItems ?? [],
      effectivePreview?.startsAt ?? item.startsAt,
      timeZone,
    );

  const totalPlanMinutes = Math.round(totalPlanSeconds / 60);
  const targetHref = effectivePreview?.href ?? item.href ?? null;
  const effectiveLocation = effectivePreview?.location ?? item.location;
  const effectiveDescription = effectivePreview?.description ?? item.description;

  const assignmentsByDepartment = effectivePreview
    ? Array.from(
        effectivePreview.assignments.reduce(
          (acc, assignment) => {
            const deptLabel = assignment.departmentName?.trim() || "Equipe geral";
            const currentGroup = acc.get(deptLabel) ?? [];
            currentGroup.push(assignment);
            acc.set(deptLabel, currentGroup);
            return acc;
          },
          new Map<string, CalendarEventPreview["assignments"]>(),
        ),
      )
    : [];

  const shouldShowTeamSection =
    !isLoadingPreview &&
    effectivePreview &&
    (effectivePreview.assignments.length > 0 ||
      effectivePreview.coverage.total > 0 ||
      effectivePreview.kind === "service" ||
      effectivePreview.kind === "rehearsal");

  const bodyContent = (
    <div className="space-y-4 text-sm">
      {/* Data, hora e local */}
      <div className="rounded-xl border bg-card p-3.5 space-y-2">
        <div className="flex items-start gap-2.5">
          <ClockIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">{formattedDate}</p>
            <p className="text-xs text-muted-foreground">{formattedTime}</p>
          </div>
        </div>
        {effectiveLocation ? (
          <div className="flex items-start gap-2.5 border-t pt-2">
            <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">{effectiveLocation}</p>
          </div>
        ) : null}
      </div>

      {/* Loading skeleton para detalhes completos */}
      {isLoadingPreview ? (
        <div className="space-y-3" aria-label="Carregando detalhes do evento">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : null}

      {/* Equipe escalada agrupada por departamento */}
      {shouldShowTeamSection ? (
        <section
          aria-label="Equipe escalada"
          className="rounded-xl border bg-card p-3.5 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <UsersIcon className="size-3.5" aria-hidden="true" />
              Equipe escalada
            </h3>
            {effectivePreview.coverage.total > 0 ? (
              <span className="text-[11px] font-semibold text-primary">
                {effectivePreview.coverage.assigned}/
                {effectivePreview.coverage.total} funções
              </span>
            ) : null}
          </div>

          {assignmentsByDepartment.length > 0 ? (
            <div className="space-y-3">
              {assignmentsByDepartment.map(([departmentName, group]) => (
                <div key={departmentName} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground/90">
                      {departmentName}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {group.length}{" "}
                      {group.length === 1 ? "pessoa" : "pessoas"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.map((assignment) => (
                      <span
                        key={assignment.id}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs",
                          assignment.isMine
                            ? "border-primary/30 bg-secondary font-semibold text-primary"
                            : "bg-muted/50 text-foreground",
                        )}
                      >
                        <span>{assignment.personName}</span>
                        <span className="text-muted-foreground">
                          · {assignment.functionName}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty className="gap-3 rounded-lg border border-dashed bg-muted/20 px-4 py-5">
              <EmptyHeader className="gap-1.5">
                <EmptyMedia
                  variant="icon"
                  className="mb-0.5 size-9 rounded-full bg-secondary/70 text-primary"
                >
                  <UsersIcon className="size-4" aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle className="text-sm font-semibold text-foreground">
                  Nenhuma pessoa escalada ainda
                </EmptyTitle>
                <EmptyDescription className="text-xs leading-relaxed text-muted-foreground">
                  Quando os líderes preencherem as funções por departamento, a
                  equipe escalada aparecerá organizada aqui.
                </EmptyDescription>
              </EmptyHeader>
              {targetHref ? (
                <EmptyContent>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg px-3 text-xs font-semibold"
                  >
                    <Link href={targetHref}>Escalar equipe</Link>
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          )}
        </section>
      ) : null}

      {/* Louvores escalados */}
      {!isLoadingPreview &&
      effectivePreview &&
      effectivePreview.songs.length > 0 ? (
        <section
          aria-label="Louvores do culto"
          className="rounded-xl border bg-card p-3.5 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              <Music2Icon className="size-3.5" aria-hidden="true" />
              Louvores do culto
            </h3>
            <span className="text-[11px] font-medium text-muted-foreground">
              {effectivePreview.songs.length}{" "}
              {effectivePreview.songs.length === 1 ? "música" : "músicas"}
            </span>
          </div>
          <ol className="space-y-1.5">
            {effectivePreview.songs.map((song, idx) => (
              <li
                key={song.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    <span className="mr-1.5 text-primary">{idx + 1}.</span>
                    {song.title}
                  </p>
                  {song.artist ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {song.artist}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  {song.tone ? (
                    <Badge variant="outline" className="text-[11px]">
                      Tom {song.tone}
                    </Badge>
                  ) : null}
                  {song.bpm ? (
                    <span className="font-mono">{song.bpm} BPM</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* Cronograma (Modo leitura) */}
      {!isLoadingPreview && effectivePreview && planRows.length > 0 ? (
        <section
          aria-label="Cronograma em modo leitura"
          className="rounded-xl border bg-card p-3.5 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
              <ListOrderedIcon className="size-3.5" aria-hidden="true" />
              Cronograma (Modo leitura)
            </h3>
            {totalPlanMinutes > 0 ? (
              <span className="text-[11px] font-medium text-muted-foreground">
                {totalPlanMinutes} min
              </span>
            ) : null}
          </div>

          <ol className="divide-y">
            {planRows.map((row) =>
              row.type === "header" ? (
                <li
                  key={row.id}
                  className="py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary"
                >
                  {row.title}
                </li>
              ) : (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3 py-2 text-xs"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="shrink-0 font-mono text-[11px] font-semibold text-primary">
                      {row.timeLabel}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{row.title}</p>
                      {row.leaderName ? (
                        <p className="text-[11px] text-muted-foreground">
                          {row.leaderName}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {row.durationSeconds > 0 ? (
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {formatDurationMinutes(row.durationSeconds)}
                    </span>
                  ) : null}
                </li>
              ),
            )}
          </ol>
        </section>
      ) : null}

      {/* Estado limpo sem cronograma/louvores */}
      {!isLoadingPreview &&
      effectivePreview &&
      planRows.length === 0 &&
      effectivePreview.songs.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          Este compromisso ainda não possui cronograma ou louvores vinculados.
        </div>
      ) : null}

      {/* Observações */}
      {effectiveDescription ? (
        <div className="rounded-xl border bg-muted/20 p-3.5 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-foreground">
            Observações
          </p>
          <p>{effectiveDescription}</p>
        </div>
      ) : null}
    </div>
  );

  const primaryActionLabel =
    item.type === "unavailability"
      ? "Ver disponibilidade"
      : item.type === "birthday"
        ? "Ver perfil do membro"
        : isRehearsal
          ? "Abrir página do ensaio"
          : "Abrir página do evento para editar";

  const footerActions = (
    <div className="flex w-full items-center gap-2">
      {targetHref ? (
        <Button
          asChild
          className="h-11 flex-1 gap-1.5 rounded-xl font-semibold sm:h-10"
        >
          <Link href={targetHref}>
            <span>{primaryActionLabel}</span>
            <ExternalLinkIcon className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="gap-0 rounded-t-xl border-x-0 border-b-0 bg-popover p-0">
          <DrawerHeader className="space-y-1.5 px-5 pt-3 pb-3 text-left">
            {badgeRow}
            <DrawerTitle className="font-heading text-xl tracking-tight text-foreground">
              {item.title}
            </DrawerTitle>
            {item.subtitle ? (
              <DrawerDescription className="text-xs font-medium text-muted-foreground">
                {item.subtitle}
              </DrawerDescription>
            ) : null}
          </DrawerHeader>

          <div className="max-h-[62dvh] overflow-y-auto px-5 pb-4">
            {bodyContent}
          </div>

          <DrawerFooter className="border-t bg-card px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {footerActions}
            <DrawerClose asChild>
              <Button variant="outline" className="h-11 w-full rounded-xl">
                Fechar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md md:max-w-lg"
      >
        <SheetHeader className="space-y-2 border-b bg-card/50 px-6 py-5 pr-12 text-left">
          {badgeRow}
          <SheetTitle className="font-heading text-2xl leading-snug tracking-tight text-foreground">
            {item.title}
          </SheetTitle>
          {item.subtitle ? (
            <SheetDescription className="text-xs font-medium text-muted-foreground">
              {item.subtitle}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">{bodyContent}</div>

        {targetHref ? (
          <SheetFooter className="border-t bg-card px-6 py-4">
            {footerActions}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export const EventDetailDialog = EventPreviewSheet;

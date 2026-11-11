import Link from "next/link";
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClockIcon,
  SparklesIcon,
  UsersIcon,
  ArrowRightIcon,
  AlertCircleIcon,
} from "lucide-react";
import { isToday, isTomorrow, differenceInCalendarDays } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  eventDateParts,
  formatEventTimeRange,
  scheduleProgress,
  type EventListItem,
} from "@/lib/events";
import { getInitials } from "@/lib/format";
import { personDisplayName, personDisplayImage } from "@/lib/people";
import { cn } from "@/lib/utils";

export function FeaturedServiceCard({
  event,
  isAdmin = false,
}: {
  event?: EventListItem | null;
  isAdmin?: boolean;
}) {
  if (!event) {
    return (
      <Card className="overflow-hidden border-dashed bg-card/40">
        <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center sm:p-10">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarDaysIcon className="size-6" />
          </span>
          <div className="space-y-1 max-w-sm">
            <h3 className="font-heading text-xl tracking-tight">
              Nenhum culto nos próximos dias
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isAdmin
                ? "Cadastre um novo culto ou evento para mobilizar a igreja e montar as escalas da liderança."
                : "Novos encontros aparecerão aqui assim que forem agendados pela liderança."}
            </p>
          </div>
          {isAdmin ? (
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/dashboard/events" prefetch={true}>
                Ver todos os cultos
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const parts = eventDateParts(event.startsAt);
  const timeRange = formatEventTimeRange(event.startsAt, event.endsAt);
  const progress = scheduleProgress(event);

  // Status de proximidade
  const eventDate = new Date(event.startsAt);
  const isTodayEvent = isToday(eventDate);
  const isTomorrowEvent = isTomorrow(eventDate);
  const daysDiff = differenceInCalendarDays(eventDate, new Date());

  let timingLabel = `${parts.weekday}, ${parts.day} de ${parts.monthShort}`;
  if (isTodayEvent) timingLabel = "Hoje";
  else if (isTomorrowEvent) timingLabel = "Amanhã";
  else if (daysDiff > 1 && daysDiff <= 7) timingLabel = `Em ${daysDiff} dias`;

  const assignments = event.schedule?.assignments ?? [];
  const previewAssignments = assignments.slice(0, 5);
  const remainingAssignments = assignments.length - previewAssignments.length;

  return (
    <Card className="overflow-hidden border-primary/15 bg-card shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-primary/25 hover:shadow-sm motion-reduce:transition-none">
      <CardContent className="space-y-5 p-5 sm:space-y-6 sm:p-6">
        {/* Cabeçalho do Card */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={isTodayEvent ? "default" : "secondary"}
              className="px-2.5 py-0.5 text-xs font-medium"
            >
              <SparklesIcon className="mr-1 size-3" />
              {isTodayEvent ? "Acontecendo hoje" : timingLabel}
            </Badge>

            {event.recurrence ? (
              <Badge
                variant="outline"
                className="text-[0.68rem] font-normal text-muted-foreground"
              >
                Culto recorrente
              </Badge>
            ) : null}
          </div>

          {/* Status da Escala */}
          {progress.totalFunctions > 0 ? (
            <Badge
              variant="outline"
              className={cn(
                "border text-xs font-normal",
                progress.status === "complete"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : progress.status === "partial"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
              )}
            >
              {progress.status === "complete" ? (
                <>
                  <CheckCircle2Icon className="mr-1 size-3.5" />
                  Escala completa ({progress.assignmentsCount})
                </>
              ) : progress.status === "partial" ? (
                <>
                  <UsersIcon className="mr-1 size-3.5" />
                  {progress.filledFunctions} de {progress.totalFunctions} funções
                </>
              ) : (
                <>
                  <AlertCircleIcon className="mr-1 size-3.5" />
                  Sem escala montada
                </>
              )}
            </Badge>
          ) : null}
        </div>

        {/* Informações Principais do Culto */}
        <div className="flex items-start gap-4">
          {/* Estampa da Data */}
          <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-inner">
            <span className="font-heading text-2xl font-bold leading-none tracking-tight">
              {parts.day}
            </span>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary/80">
              {parts.monthShort}
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="line-clamp-2 font-heading text-2xl leading-tight font-medium tracking-tight text-foreground lg:line-clamp-1 lg:text-3xl">
              {event.title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-medium text-foreground/80">
                <ClockIcon className="size-3.5 text-primary" />
                {timeRange}
              </span>

              {event.departments && event.departments.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground/50">•</span>
                  {event.departments.map(({ department }) => (
                    <span
                      key={department.id}
                      className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground"
                    >
                      {department.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Equipe escalada & Botões de ação */}
        <div className="flex flex-col gap-4 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {assignments.length > 0 ? (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2 overflow-hidden">
                  {previewAssignments.map((assignment) => {
                    const person = assignment.person;
                    const name = personDisplayName(person);
                    const image = personDisplayImage(person);

                    return (
                      <Avatar
                        key={assignment.id}
                        className="size-8 border ring-2 ring-background"
                        title={`${name} (${assignment.function.name})`}
                      >
                        <AvatarImage src={image ?? undefined} alt={name} />
                        <AvatarFallback className="bg-primary/10 text-[0.62rem] font-medium text-primary">
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                </div>
                <span className="text-xs text-muted-foreground">
                  {remainingAssignments > 0
                    ? `+${remainingAssignments} na escala`
                    : `${assignments.length} ${assignments.length === 1 ? "voluntário" : "voluntários"}`}
                </span>
              </div>
            ) : (
              <p className="text-xs italic text-muted-foreground">
                Nenhum membro escalado ainda.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 flex-1 sm:h-9 sm:flex-initial"
            >
              <Link href={`/dashboard/events/${event.id}`} prefetch={true}>
                Ver detalhes
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-10 flex-1 sm:h-9 sm:flex-initial"
            >
              <Link href={`/dashboard/events/${event.id}`} prefetch={true}>
                Ver cronograma
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import {
  CalendarDaysIcon,
  ExternalLinkIcon,
  HeadphonesIcon,
  PencilLineIcon,
  SearchIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DepartmentArrangement } from "@/features/songs/lib/song-arrangements";
import { formatDate } from "@/lib/format";
import { isStreamingSearchUrl } from "@/lib/music/lyrics-service";
import type { SongUsageSummary } from "@/lib/song-usage";
import type { SongWithDetails } from "@/lib/songs";
import { DepartmentArrangementPicker } from "../department-arrangement-picker";
import {
  getStreamingLinks,
  streamingLinkLabel,
} from "../song-streaming-links";
import { SongTagsList } from "../song-tags-list";

type SongDetailContextPanelProps = {
  song: SongWithDetails;
  usage: SongUsageSummary;
  initialArrangements: DepartmentArrangement[];
  selectedDepartment: DepartmentArrangement | null;
  onSelectDepartment: (departmentId: string) => void;
  formationNames: string[];
  canUpdate: boolean;
  onEditNote: () => void;
};

export function SongDetailContextPanel({
  song,
  usage,
  initialArrangements,
  selectedDepartment,
  onSelectDepartment,
  formationNames,
  canUpdate,
  onEditNote,
}: SongDetailContextPanelProps) {
  const streamingLinks = getStreamingLinks(song);
  const planItems = song.planItems ?? [];
  const nextEvent = usage.nextEvent;
  const lastEvent = usage.lastEvent;
  const serviceCount = usage.eventCount || planItems.length;

  return (
    <div className="space-y-3">
      {/* REFERÊNCIAS DE ÁUDIO */}
      {streamingLinks.length > 0 ? (
        <Card className="space-y-2.5 p-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <HeadphonesIcon className="size-3.5 text-primary" />
            <span>Referências de áudio</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {streamingLinks.map((link) => (
              <Button
                key={link.platform}
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="min-h-11 gap-1.5 px-3 text-xs font-medium sm:min-h-8 sm:px-2.5"
              >
                <a href={link.url} target="_blank" rel="noreferrer">
                  {isStreamingSearchUrl(link.url) ? (
                    <SearchIcon className="size-3.5 text-muted-foreground" />
                  ) : (
                    <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
                  )}
                  <span>{streamingLinkLabel(link)}</span>
                </a>
              </Button>
            ))}
          </div>
        </Card>
      ) : null}

      {/* NOTAS & BANDA */}
      {selectedDepartment ? (
        <Card className="space-y-2.5 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <UsersRoundIcon className="size-3.5 shrink-0 text-primary" />
              <span className="truncate text-xs font-semibold text-foreground">
                Notas &amp; Banda
              </span>
            </div>
            {initialArrangements.length === 1 ? (
              <Badge variant="secondary" className="shrink-0 text-[11px]">
                {selectedDepartment.departmentName}
              </Badge>
            ) : null}
          </div>

          {initialArrangements.length > 1 ? (
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">
                Departamento
              </span>
              <DepartmentArrangementPicker
                id="song-viewer-department"
                departments={initialArrangements.map((department) => ({
                  id: department.departmentId,
                  name: department.departmentName,
                }))}
                value={selectedDepartment.departmentId}
                onChange={onSelectDepartment}
                className="w-full"
              />
            </div>
          ) : null}

          {formationNames.length > 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Formação:</span>{" "}
              {formationNames.join(", ")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma formação selecionada para este departamento.
            </p>
          )}

          {canUpdate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEditNote}
              className="min-h-11 w-full gap-1.5 text-xs font-medium sm:min-h-8"
            >
              <PencilLineIcon className="size-3.5" />
              <span>Editar notas &amp; banda</span>
            </Button>
          ) : null}
        </Card>
      ) : null}

      {/* TAGS */}
      {(song.tags?.length ?? 0) > 0 ? (
        <Card className="space-y-2 p-3.5 shadow-2xs">
          <span className="text-xs font-semibold text-foreground">Tags</span>
          <SongTagsList tags={song.tags ?? []} />
        </Card>
      ) : null}

      {/* USO NOS CULTOS */}
      <Card className="space-y-2.5 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <CalendarDaysIcon className="size-3.5 text-primary" />
            <span>Uso nos cultos</span>
          </div>
          {serviceCount > 0 ? (
            <Badge variant="secondary" className="text-[11px]">
              {serviceCount}
            </Badge>
          ) : null}
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          {nextEvent ? (
            <p className="text-foreground">
              <span className="font-medium">Próximo:</span>{" "}
              {formatDate(nextEvent.startsAt)} · {nextEvent.eventTitle}
            </p>
          ) : lastEvent ? (
            <p>
              <span className="font-medium text-foreground">Último:</span>{" "}
              {formatDate(lastEvent.startsAt)} · {lastEvent.eventTitle}
            </p>
          ) : (
            <p>Nunca usada em cultos</p>
          )}

          {nextEvent && lastEvent ? (
            <p>
              Último: {formatDate(lastEvent.startsAt)} · {lastEvent.eventTitle}
            </p>
          ) : null}

          {nextEvent?.responsible ? (
            <p className="inline-flex items-center gap-1">
              <UserRoundIcon className="size-3 shrink-0" />
              <span>Responsável: {nextEvent.responsible}</span>
            </p>
          ) : null}
        </div>

        {planItems.length > 0 ? (
          <div className="divide-y divide-border/60 rounded-lg border border-border/70 bg-background/60">
            {planItems.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">
                    {item.event?.title ?? "Culto"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.event?.startsAt ? formatDate(item.event.startsAt) : ""}
                    {item.title ? ` · ${item.title}` : ""}
                  </p>
                </div>
                {item.event ? (
                  <Link
                    href={`/events/${item.event.id}`}
                    className="shrink-0 text-[11px] font-medium text-primary hover:underline"
                  >
                    Ver culto ›
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

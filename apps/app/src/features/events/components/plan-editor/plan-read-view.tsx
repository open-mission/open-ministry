"use client";

import { Music2Icon, UserIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { QuickDrawerSong } from "@/components/songs/song-quick-drawer";
import { getInitials } from "@/lib/format";
import type { ComputedPlanItem } from "@/lib/plan-utils";
import { formatDurationMinutesLabel } from "./format";

export function PlanReadView({
  computedItems,
  onOpenSong,
}: {
  computedItems: ComputedPlanItem[];
  onOpenSong?: (song: QuickDrawerSong) => void;
}) {
  return (
    <div className="divide-y rounded-2xl border bg-card overflow-hidden shadow-xs">
      {computedItems.map((item) => {
        if (item.type === "header") {
          return (
            <div
              key={item.id}
              className="bg-muted/50 px-4 py-2.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              {item.title}
            </div>
          );
        }

        return (
          <div
            key={item.id}
            className="flex items-start gap-3.5 p-3.5 transition-colors hover:bg-muted/20"
          >
            {/* Bloco de Horário */}
            <div className="flex flex-col items-center shrink-0 w-14 text-center pt-0.5">
              <span className="font-mono text-xs font-semibold text-foreground">
                {item.timeLabel}
              </span>
              <Badge
                variant="secondary"
                className="mt-1 font-mono text-[11px] px-1.5 py-0.5 h-auto font-normal whitespace-nowrap"
              >
                {formatDurationMinutesLabel(item.durationSeconds)}
              </Badge>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-medium text-sm text-foreground leading-snug">
                {item.title}
              </p>
              {item.description ? (
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {item.description}
                </p>
              ) : null}
              {item.song ? (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => onOpenSong?.(item.song!)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    title="Abrir cifra e letra desta música"
                  >
                    <Music2Icon className="size-3" />
                    <span>{item.song.title}</span>
                    {item.song.tone ? (
                      <span className="font-bold text-[11px] opacity-80">
                        ({item.song.tone})
                      </span>
                    ) : null}
                  </button>
                </div>
              ) : null}
              {item.person ? (
                <div className="pt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Avatar className="size-4 shrink-0 ring-1 ring-border">
                    <AvatarImage src={item.person.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[11px]">
                      {getInitials(item.person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-foreground font-medium text-[11px]">
                    {item.person.name}
                  </span>
                </div>
              ) : item.customResponsible ? (
                <div className="pt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <UserIcon className="size-3 shrink-0" />
                  <span className="truncate">{item.customResponsible}</span>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

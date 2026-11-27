"use client";

import { PencilIcon, StickyNoteIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SectionNoteStripProps = {
  note: string;
  sectionKey: string;
  sectionName?: string;
  canEdit?: boolean;
  onEdit?: (sectionKey: string) => void;
  orphan?: boolean;
  className?: string;
};

/**
 * Nota prática de uma seção da música (ex.: "só guitarra e violão na intro").
 * Texto puro, fora da cifra. O botão de edição só existe para quem pode editar.
 */
export function SectionNoteStrip({
  note,
  sectionKey,
  sectionName,
  canEdit = false,
  onEdit,
  orphan = false,
  className,
}: SectionNoteStripProps) {
  if (!note.trim()) return null;

  return (
    <div
      data-slot="section-note-strip"
      className={cn(
        "flex min-w-0 items-start justify-between gap-2 border-l-2 border-primary/30 pl-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <StickyNoteIcon
          className="mt-0.5 size-3.5 shrink-0 text-primary/70"
          aria-hidden="true"
        />
        <p className="min-w-0 whitespace-pre-line wrap-break-word">
          {orphan ? (
            <Badge
              variant="outline"
              className="mr-1.5 align-middle text-[11px] font-medium"
            >
              Sem seção
            </Badge>
          ) : null}
          <span>{note}</span>
        </p>
      </div>

      {canEdit && onEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(sectionKey)}
          className="h-9 shrink-0 gap-1 px-2 text-[11px] font-medium sm:text-xs"
          aria-label={`Editar nota de ${sectionName ?? sectionKey}`}
        >
          <PencilIcon className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Editar nota</span>
        </Button>
      ) : null}
    </div>
  );
}

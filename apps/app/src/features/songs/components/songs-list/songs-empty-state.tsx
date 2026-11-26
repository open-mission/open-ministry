"use client";

import { Music2Icon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AddSongChoiceDialog } from "../add-song-choice-dialog";

type SongsEmptyStateProps = {
  hasSongs: boolean;
  canManage: boolean;
  existingCollections: string[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

export function SongsEmptyState({
  hasSongs,
  canManage,
  existingCollections,
  hasActiveFilters,
  onClearFilters,
}: SongsEmptyStateProps) {
  if (!hasSongs) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Music2Icon className="size-6" />
        </span>
        <h2 className="mt-4 font-heading text-lg font-semibold tracking-tight">
          Nenhuma música no repertório
        </h2>
        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Cadastre as músicas da igreja para organizar letras, cifras, links e
          vincular aos momentos dos cultos.
        </p>
        {canManage ? (
          <div className="mt-5">
            <AddSongChoiceDialog
              existingCollections={existingCollections}
              trigger={
                <Button className="h-11 gap-1.5 font-semibold shadow-xs md:h-10">
                  <PlusIcon className="size-4" />
                  Adicionar música
                </Button>
              }
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/40 px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">
        Nenhuma música encontrada
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Ajuste a busca ou os filtros para ver outras músicas.
      </p>
      {hasActiveFilters ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="mt-4 min-h-11 md:min-h-0"
        >
          Limpar filtros
        </Button>
      ) : null}
    </div>
  );
}

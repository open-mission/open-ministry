"use client";

import { useMemo, useState } from "react";
import { CheckIcon, Music2Icon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useStableIsMobile } from "@/hooks/use-stable-is-mobile";
import type { RehearsalSongOption } from "@/features/rehearsals/lib/rehearsal-ui";
import { cn } from "@/lib/utils";

type RehearsalSongPickerProps = {
  songs: RehearsalSongOption[];
  selectedIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (songIds: string[]) => void;
};

export function RehearsalSongPicker({
  songs,
  selectedIds,
  open,
  onOpenChange,
  onConfirm,
}: RehearsalSongPickerProps) {
  const isMobile = useStableIsMobile(open);
  const [draft, setDraft] = useState<string[]>(selectedIds);
  const [search, setSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [toneFilter, setToneFilter] = useState("");

  // Reinicia a seleção e os filtros ao abrir (render-phase).
  const pickerSyncKey = open ? "open" : "closed";
  const [prevPickerSyncKey, setPrevPickerSyncKey] = useState(pickerSyncKey);

  if (pickerSyncKey !== prevPickerSyncKey) {
    setPrevPickerSyncKey(pickerSyncKey);
    if (open) {
      setDraft(selectedIds);
      setSearch("");
      setCollectionFilter("");
      setToneFilter("");
    }
  }

  const collections = useMemo(() => {
    const set = new Set<string>();
    for (const song of songs) {
      if (song.collection?.trim()) set.add(song.collection.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [songs]);

  const tones = useMemo(() => {
    const set = new Set<string>();
    for (const song of songs) {
      if (song.tone?.trim()) set.add(song.tone.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [songs]);

  const filteredSongs = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return songs.filter((song) => {
      if (collectionFilter && song.collection !== collectionFilter) {
        return false;
      }
      if (toneFilter && song.tone !== toneFilter) {
        return false;
      }
      if (!term) return true;
      return [
        song.title,
        song.artist ?? "",
        song.tone ?? "",
        song.collection ?? "",
        ...(song.tags ?? []),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(term);
    });
  }, [songs, search, collectionFilter, toneFilter]);

  const selectedSet = new Set(draft);

  const toggleSong = (songId: string) => {
    setDraft((current) =>
      current.includes(songId)
        ? current.filter((id) => id !== songId)
        : [...current, songId],
    );
  };

  const handleConfirm = () => {
    // Preserva a ordem global das músicas para a setlist nascer previsível.
    const ordered = songs
      .filter((song) => draft.includes(song.id))
      .map((song) => song.id);
    const missing = draft.filter((id) => !ordered.includes(id));
    onConfirm([...ordered, ...missing]);
    onOpenChange(false);
  };

  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 border-b border-border/70 px-4 py-3">
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por título, artista, tom ou grupo..."
            aria-label="Buscar músicas"
            className="h-11 pl-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NativeSelect
            value={collectionFilter}
            onChange={(event) => setCollectionFilter(event.target.value)}
            aria-label="Filtrar por grupo"
            className="w-full [&_select]:h-11"
          >
            <option value="">Todos os grupos</option>
            {collections.map((collection) => (
              <option key={collection} value={collection}>
                {collection}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            value={toneFilter}
            onChange={(event) => setToneFilter(event.target.value)}
            aria-label="Filtrar por tom"
            className="w-full [&_select]:h-11"
          >
            <option value="">Todos os tons</option>
            {tones.map((tone) => (
              <option key={tone} value={tone}>
                Tom {tone}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div
        data-vaul-no-drag=""
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
      >
        {filteredSongs.length === 0 ? (
          <div className="space-y-1 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">
              Nenhuma música encontrada
            </p>
            <p className="text-xs text-muted-foreground">
              Ajuste a busca ou os filtros para ver outras músicas.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filteredSongs.map((song) => {
              const isSelected = selectedSet.has(song.id);
              return (
                <li key={song.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleSong(song.id)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected && "bg-primary/5",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background",
                      )}
                    >
                      {isSelected ? <CheckIcon className="size-3.5" /> : null}
                    </span>

                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Music2Icon className="size-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground">
                          {song.title}
                        </span>
                        {song.tone ? (
                          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                            {song.tone}
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {song.artist || "Artista não informado"}
                        {song.collection ? ` · ${song.collection}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border/70 px-4 py-2 text-xs text-muted-foreground">
        {filteredSongs.length === 1
          ? "1 música disponível"
          : `${filteredSongs.length} músicas disponíveis`}
        {draft.length > 0 ? ` · ${draft.length} selecionada(s)` : ""}
      </div>
    </div>
  );

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        className="min-h-11 shrink-0 px-4"
      >
        Cancelar
      </Button>
      <Button
        type="button"
        onClick={handleConfirm}
        disabled={draft.length === 0}
        className="min-h-11 flex-1"
      >
        {draft.length === 0
          ? "Selecione músicas"
          : draft.length === 1
            ? "Adicionar 1 música"
            : `Adicionar ${draft.length} músicas`}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex h-[88dvh] max-h-[88dvh] flex-col gap-0 rounded-t-[24px] p-0">
          <DrawerHeader className="shrink-0 border-b px-4 pt-3 pb-3 !text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <DrawerTitle className="flex items-center gap-2 font-heading text-xl">
              <Music2Icon className="size-5 text-primary" />
              Escolher músicas
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              Marque uma ou mais músicas do repertório para este ensaio.
            </DrawerDescription>
          </DrawerHeader>

          {body}

          <DrawerFooter className="shrink-0 flex-row items-center gap-2 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <Music2Icon className="size-5 text-primary" />
            Escolher músicas
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Marque uma ou mais músicas do repertório para este ensaio.
          </DialogDescription>
        </DialogHeader>

        {body}

        <DialogFooter className="border-t px-5 py-3 sm:justify-end">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

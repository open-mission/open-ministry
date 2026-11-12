"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowRightIcon,
  GlobeIcon,
  Loader2Icon,
  Music2Icon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import {
  fetchLyricsDetailsAction,
  searchOnlineSongsAction,
} from "@/app/actions/songs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { OnlineSongResult } from "@/lib/music/lyrics-service";
import { SongFormDialog } from "./song-form-dialog";

type OnlineSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OnlineSearchDialog({
  open,
  onOpenChange,
}: OnlineSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OnlineSongResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, startSearching] = useTransition();
  const [isFetchingLyrics, startFetchingLyrics] = useTransition();

  // Selected item to forward to form dialog
  const [selectedItem, setSelectedItem] = useState<{
    title: string;
    artist?: string;
    lyrics?: string;
  } | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setResults([]);
      setHasSearched(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = query.trim();
    if (!clean) return;

    startSearching(async () => {
      try {
        const data = await searchOnlineSongsAction(clean);
        setResults(data);
        setHasSearched(true);
      } catch (err) {
        toast.error("Erro ao pesquisar músicas na internet.");
        console.error(err);
      }
    });
  };

  const handleSelect = (item: OnlineSongResult) => {
    startFetchingLyrics(async () => {
      try {
        const lyrics = await fetchLyricsDetailsAction(item);
        setSelectedItem({
          title: item.title,
          artist: item.artist,
          lyrics,
        });
        handleOpenChange(false);
        setFormOpen(true);
      } catch (err) {
        toast.error("Não foi possível carregar a letra completa.");
        console.error(err);
      }
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="gap-1.5 text-left">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GlobeIcon className="size-4" />
              </span>
              <DialogTitle className="font-heading text-xl tracking-tight">
                Buscar Músicas e Letras
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
              Digite o nome do louvor ou do cantor para importar
              automaticamente. Fontes: Vagalume e LRCLIB.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSearch} className="flex gap-2 pt-2">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: A Casa É Sua, Bondade de Deus..."
                className={query ? "pl-9 pr-9" : "pl-9"}
                aria-label="Pesquisar música ou artista"
                autoFocus
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Limpar busca"
                  title="Limpar busca"
                >
                  <XIcon className="size-3.5" />
                </button>
              ) : null}
            </div>
            <Button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="gap-1.5"
            >
              {isSearching ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SearchIcon className="size-4" />
              )}
              Buscar
            </Button>
          </form>

          <div className="max-h-72 min-h-[160px] overflow-y-auto pt-2">
            {isSearching ? (
              <div className="flex h-36 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin text-primary" />
                <span className="text-xs">Buscando na internet...</span>
              </div>
            ) : isFetchingLyrics ? (
              <div className="flex h-36 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin text-primary" />
                <span className="text-xs">Importando letra da música...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1.5 divide-y divide-border/50">
                {results.map((item) => (
                  <button
                    key={`${item.source}-${item.id}`}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        <Music2Icon className="size-4" />
                      </span>
                      <div className="truncate">
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                          {item.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.artist || "Artista desconhecido"}
                          {item.album ? ` · ${item.album}` : ""} ·{" "}
                          {item.source === "vagalume" ? "Vagalume" : "LRCLIB"}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowRightIcon className="size-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            ) : hasSearched ? (
              <div className="flex h-36 flex-col items-center justify-center gap-1.5 text-center text-muted-foreground">
                <p className="text-sm font-medium">Nenhuma música encontrada</p>
                <p className="text-xs text-muted-foreground">
                  Tente buscar apenas pelo título ou pelo nome do cantor.
                </p>
              </div>
            ) : (
              <div className="flex h-36 flex-col items-center justify-center gap-1.5 text-center text-muted-foreground">
                <GlobeIcon className="size-8 stroke-[1.25] text-muted-foreground/60" />
                <p className="text-xs">
                  Pesquise letras de louvores nacionais e internacionais.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedItem ? (
        <SongFormDialog
          open={formOpen}
          onOpenChange={(isOpen) => {
            setFormOpen(isOpen);
            if (!isOpen) setSelectedItem(null);
          }}
          initialData={{
            title: selectedItem.title,
            artist: selectedItem.artist ?? "",
            lyrics: selectedItem.lyrics ?? "",
          }}
        />
      ) : null}
    </>
  );
}

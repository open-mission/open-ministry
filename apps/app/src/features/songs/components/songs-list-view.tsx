"use client";

import { useMemo, useState } from "react";
import {
  CalendarDaysIcon,
  CheckIcon,
  ChevronDownIcon,
  FileMusicIcon,
  FileTextIcon,
  FolderIcon,
  GuitarIcon,
  LayersIcon,
  Music2Icon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import { PageInfo } from "@/components/app/page-info";
import { StatStrip, type StatItem } from "@/components/app/stat-strip";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { NativeSelect } from "@/components/ui/native-select";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSongsQuery } from "@/hooks/use-songs";
import { STANDARD_TONES } from "@/lib/music/chords-utils";
import type { SongWithUsage } from "@/lib/songs";
import { cn } from "@/lib/utils";
import { AddSongChoiceDialog } from "./add-song-choice-dialog";
import { SongCard } from "./song-card";

type SongsListViewProps = {
  songs: SongWithUsage[];
  existingCollections?: string[];
  canManage?: boolean;
  canAddToNextService?: boolean;
};

type StatusFilter =
  | "all"
  | "missing-chords"
  | "missing-lyrics"
  | "scheduled"
  | "never";
type SortOption = "title" | "usage" | "updated";

const STATUS_LABEL: Record<Exclude<StatusFilter, "all">, string> = {
  "missing-chords": "Sem cifra",
  "missing-lyrics": "Sem letra",
  scheduled: "Agendadas",
  never: "Nunca usadas",
};

function normalizeSearch(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function SongsListView({
  songs: initialSongs,
  existingCollections = [],
  canManage = true,
  canAddToNextService = false,
}: SongsListViewProps) {
  const { data } = useSongsQuery({
    initialData: { songs: initialSongs, collections: existingCollections },
  });

  const songs = data?.songs ?? initialSongs;
  const dataCollections = data?.collections;
  const collections = useMemo(() => {
    const set = new Set<string>();
    for (const c of existingCollections) {
      if (c?.trim()) set.add(c.trim());
    }
    if (dataCollections) {
      for (const c of dataCollections) {
        if (c?.trim()) set.add(c.trim());
      }
    }
    if (songs) {
      for (const s of songs) {
        if (s.collection?.trim()) set.add(s.collection.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [existingCollections, dataCollections, songs]);

  const isMobile = useIsMobile();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toneFilter, setToneFilter] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("title");

  const filteredSongs = useMemo(() => {
    let result = songs;

    if (collectionFilter) {
      result = result.filter((s) => s.collection === collectionFilter);
    }

    if (toneFilter) {
      result = result.filter((s) => s.tone === toneFilter);
    }

    switch (statusFilter) {
      case "missing-chords":
        result = result.filter((s) => !s.chords?.trim());
        break;
      case "missing-lyrics":
        result = result.filter((s) => !s.lyrics?.trim());
        break;
      case "scheduled":
        result = result.filter((s) => Boolean(s.usage.nextEvent));
        break;
      case "never":
        result = result.filter((s) => s.usage.eventCount === 0);
        break;
      default:
        break;
    }

    const query = normalizeSearch(search.trim());
    if (query) {
      result = result.filter((s) =>
        [
          s.title,
          s.artist,
          s.collection,
          s.tone,
          ...(s.tags ?? []),
        ].some((value) => normalizeSearch(value).includes(query)),
      );
    }

    const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });
    return [...result].sort((a, b) => {
      if (sortOption === "usage") {
        const usageDiff = b.usage.eventCount - a.usage.eventCount;
        if (usageDiff !== 0) return usageDiff;
        const nextA = a.usage.nextEvent?.startsAt
          ? new Date(a.usage.nextEvent.startsAt).getTime()
          : Number.MAX_SAFE_INTEGER;
        const nextB = b.usage.nextEvent?.startsAt
          ? new Date(b.usage.nextEvent.startsAt).getTime()
          : Number.MAX_SAFE_INTEGER;
        if (nextA !== nextB) return nextA - nextB;
      }
      if (sortOption === "updated") {
        const updatedDiff =
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        if (updatedDiff !== 0) return updatedDiff;
      }
      return collator.compare(a.title, b.title);
    });
  }, [songs, search, toneFilter, collectionFilter, statusFilter, sortOption]);

  const missingChordsCount = useMemo(
    () => songs.filter((s) => !s.chords?.trim()).length,
    [songs],
  );
  const missingLyricsCount = useMemo(
    () => songs.filter((s) => !s.lyrics?.trim()).length,
    [songs],
  );
  const neverUsedCount = useMemo(
    () => songs.filter((s) => s.usage.eventCount === 0).length,
    [songs],
  );

  const statsItems: StatItem[] = useMemo(() => {
    const withChords = songs.filter((s) => Boolean(s.chords?.trim())).length;
    const withLyrics = songs.filter((s) => Boolean(s.lyrics?.trim())).length;

    return [
      {
        icon: Music2Icon,
        label: "Músicas",
        value: songs.length,
        hint: "No repertório da igreja",
      },
      {
        icon: FileMusicIcon,
        label: "Com Cifra",
        value: withChords,
        hint: `${missingChordsCount} sem cifra`,
      },
      {
        icon: FileTextIcon,
        label: "Com Letra",
        value: withLyrics,
        hint: `${missingLyricsCount} sem letra`,
      },
    ];
  }, [songs, missingChordsCount, missingLyricsCount]);

  const hasActiveFilters =
    Boolean(search || toneFilter || collectionFilter) || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setToneFilter("");
    setCollectionFilter("");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* HEADER DA PÁGINA */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="line-clamp-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Repertório de Músicas
          </h1>
          <PageInfo
            title="Repertório de Músicas"
            description={
              <>
                <p>
                  Use a busca e os filtros para encontrar músicas por título,
                  artista, tom, grupo ou pendência (sem cifra ou sem letra).
                </p>
                <p className="mt-2">
                  Em cada música você pode abrir a cifra, transpor o tom,
                  definir capotraste, adicionar ao próximo culto e consultar em
                  quais cultos ela já foi usada.
                </p>
              </>
            }
          />
        </div>

        {canManage ? (
          <AddSongChoiceDialog existingCollections={collections} />
        ) : null}
      </header>

      {/* STATS STRIP */}
      <StatStrip items={statsItems} />

      {/* BARRA DE FILTROS E BUSCA COM ALTURAS PADRONIZADAS (h-10) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {/* INPUT GROUP UNIFICADO COM BUSCA E SELETOR DE TOM */}
          <InputGroup className="h-10 w-full max-w-lg rounded-xl border border-border/80 bg-background shadow-2xs transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
            <InputGroupAddon align="inline-start" className="pl-3 text-muted-foreground">
              <SearchIcon className="size-4" />
            </InputGroupAddon>

            <InputGroupInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, artista, tom ou tag..."
              className="h-10 text-sm placeholder:text-muted-foreground/70"
            />

            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Limpar busca"
                aria-label="Limpar busca"
              >
                <XIcon className="size-3.5" />
              </button>
            ) : null}

            {/* SELETOR DE TOM INTEGRADO AO INPUT GROUP (DRAWER NO MOBILE / DROPDOWN NO DESKTOP) */}
            <div className="pr-1.5 shrink-0">
              {isMobile ? (
                <Drawer
                  open={mobileDrawerOpen}
                  onOpenChange={setMobileDrawerOpen}
                >
                  <DrawerTrigger asChild>
                    <Button
                      type="button"
                      variant={toneFilter ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-8 gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors select-none sm:px-2.5",
                        toneFilter
                          ? "border border-primary/25 bg-primary/10 font-semibold text-primary hover:bg-primary/20"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                      title={
                        toneFilter
                          ? `Filtrando por Tom ${toneFilter}`
                          : "Filtrar por tom musical"
                      }
                    >
                      <GuitarIcon className="size-3.5 text-primary" />
                      <span className="hidden sm:inline">
                        {toneFilter ? `Tom ${toneFilter}` : "Todos os tons"}
                      </span>
                      {toneFilter ? (
                        <span className="font-bold sm:hidden text-primary">
                          {toneFilter}
                        </span>
                      ) : null}
                      <ChevronDownIcon className="size-3 opacity-60" />
                    </Button>
                  </DrawerTrigger>

                  <DrawerContent className="h-[90dvh] max-h-[90dvh] flex flex-col p-0">
                    <DrawerHeader className="border-b border-border/70 px-5 py-3.5 text-left">
                      <div className="flex items-center justify-between">
                        <DrawerTitle className="flex items-center gap-2 text-base font-bold font-heading">
                          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <GuitarIcon className="size-4" />
                          </span>
                          <span>Filtrar por Tom</span>
                        </DrawerTitle>
                        {toneFilter ? (
                          <button
                            type="button"
                            onClick={() => {
                              setToneFilter("");
                              setMobileDrawerOpen(false);
                            }}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Limpar filtro
                          </button>
                        ) : null}
                      </div>
                      <DrawerDescription className="text-xs text-muted-foreground mt-0.5">
                        Selecione o tom desejado para filtrar as músicas do
                        repertório.
                      </DrawerDescription>
                    </DrawerHeader>

                    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
                      {/* TODOS OS TONS */}
                      <button
                        type="button"
                        onClick={() => {
                          setToneFilter("");
                          setMobileDrawerOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                          !toneFilter
                            ? "bg-primary text-primary-foreground shadow-2xs"
                            : "border border-border/80 bg-muted/40 text-foreground hover:bg-muted",
                        )}
                      >
                        <span>Todos os tons</span>
                        {!toneFilter ? <CheckIcon className="size-4" /> : null}
                      </button>

                      {/* TONS MAIORES */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                          Tons Maiores
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {STANDARD_TONES.filter((t) => !t.endsWith("m")).map(
                            (t) => (
                              <Button
                                key={t}
                                type="button"
                                variant={
                                  toneFilter === t ? "default" : "outline"
                                }
                                onClick={() => {
                                  setToneFilter(toneFilter === t ? "" : t);
                                  setMobileDrawerOpen(false);
                                }}
                                className={cn(
                                  "h-11 rounded-xl text-sm font-bold shadow-2xs",
                                  toneFilter === t &&
                                    "ring-2 ring-primary ring-offset-2",
                                )}
                              >
                                {t}
                              </Button>
                            ),
                          )}
                        </div>
                      </div>

                      {/* TONS MENORES */}
                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                          Tons Menores
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {STANDARD_TONES.filter((t) => t.endsWith("m")).map(
                            (t) => (
                              <Button
                                key={t}
                                type="button"
                                variant={
                                  toneFilter === t ? "default" : "outline"
                                }
                                onClick={() => {
                                  setToneFilter(toneFilter === t ? "" : t);
                                  setMobileDrawerOpen(false);
                                }}
                                className={cn(
                                  "h-11 rounded-xl text-sm font-bold shadow-2xs",
                                  toneFilter === t &&
                                    "ring-2 ring-primary ring-offset-2",
                                )}
                              >
                                {t}
                              </Button>
                            ),
                          )}
                        </div>
                      </div>
                    </div>

                    <DrawerFooter className="border-t border-border/70 px-5 py-3 bg-muted/20">
                      <DrawerClose asChild>
                        <Button variant="outline" className="w-full">
                          Fechar
                        </Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant={toneFilter ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors select-none",
                        toneFilter
                          ? "border border-primary/25 bg-primary/10 font-semibold text-primary hover:bg-primary/20"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                      title="Filtrar por tom musical"
                    >
                      <GuitarIcon className="size-3.5 text-primary" />
                      <span>
                        {toneFilter ? `Tom ${toneFilter}` : "Todos os tons"}
                      </span>
                      <ChevronDownIcon className="size-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="w-64 max-h-[80vh] overflow-y-auto rounded-xl p-2.5 shadow-lg"
                  >
                    <div className="flex items-center justify-between border-b border-border/60 px-1 pb-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <GuitarIcon className="size-3.5 text-primary" />
                        Filtrar por Tom
                      </span>
                      {toneFilter ? (
                        <button
                          type="button"
                          onClick={() => setToneFilter("")}
                          className="text-[11px] font-medium text-primary hover:underline"
                        >
                          Limpar
                        </button>
                      ) : null}
                    </div>

                    <div className="py-2">
                      <button
                        type="button"
                        onClick={() => setToneFilter("")}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                          !toneFilter
                            ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <span>Todos os tons</span>
                        {!toneFilter ? (
                          <CheckIcon className="size-3.5" />
                        ) : null}
                      </button>
                    </div>

                    <div className="space-y-1.5 border-t border-border/60 pt-2">
                      <div className="px-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Tons Maiores
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {STANDARD_TONES.filter((t) => !t.endsWith("m")).map(
                          (t) => (
                            <Button
                              key={t}
                              type="button"
                              variant={toneFilter === t ? "default" : "outline"}
                              size="xs"
                              onClick={() =>
                                setToneFilter(toneFilter === t ? "" : t)
                              }
                              className="h-7 rounded-md text-xs font-semibold"
                            >
                              {t}
                            </Button>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-1.5 border-t border-border/60 pt-2">
                      <div className="px-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Tons Menores
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {STANDARD_TONES.filter((t) => t.endsWith("m")).map(
                          (t) => (
                            <Button
                              key={t}
                              type="button"
                              variant={toneFilter === t ? "default" : "outline"}
                              size="xs"
                              onClick={() =>
                                setToneFilter(toneFilter === t ? "" : t)
                              }
                              className="h-7 rounded-md text-xs font-semibold"
                            >
                              {t}
                            </Button>
                          ),
                        )}
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </InputGroup>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <NativeSelect
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            aria-label="Filtrar por pendência"
            className="w-full [&_select]:h-10 [&_select]:text-xs sm:w-44"
          >
            <option value="all">Todas as músicas</option>
            <option value="missing-chords">Sem cifra ({missingChordsCount})</option>
            <option value="missing-lyrics">Sem letra ({missingLyricsCount})</option>
            <option value="scheduled">Agendadas</option>
            <option value="never">Nunca usadas ({neverUsedCount})</option>
          </NativeSelect>

          <NativeSelect
            value={sortOption}
            onChange={(event) =>
              setSortOption(event.target.value as SortOption)
            }
            aria-label="Ordenar músicas"
            className="w-full [&_select]:h-10 [&_select]:text-xs sm:w-44"
          >
            <option value="title">Título (A-Z)</option>
            <option value="usage">Mais usadas</option>
            <option value="updated">Atualizadas recentemente</option>
          </NativeSelect>
        </div>
      </div>

      {/* ATALHOS DE PENDÊNCIAS DO REPERTÓRIO */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Pendências:</span>
        <button
          type="button"
          onClick={() =>
            setStatusFilter((current) =>
              current === "missing-chords" ? "all" : "missing-chords",
            )
          }
          aria-pressed={statusFilter === "missing-chords"}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 font-medium transition-colors",
            statusFilter === "missing-chords"
              ? "border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200"
              : "border-border/70 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <FileMusicIcon className="size-3.5" />
          {missingChordsCount} sem cifra
        </button>
        <button
          type="button"
          onClick={() =>
            setStatusFilter((current) =>
              current === "missing-lyrics" ? "all" : "missing-lyrics",
            )
          }
          aria-pressed={statusFilter === "missing-lyrics"}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 font-medium transition-colors",
            statusFilter === "missing-lyrics"
              ? "border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200"
              : "border-border/70 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <FileTextIcon className="size-3.5" />
          {missingLyricsCount} sem letra
        </button>
        <button
          type="button"
          onClick={() =>
            setStatusFilter((current) =>
              current === "never" ? "all" : "never",
            )
          }
          aria-pressed={statusFilter === "never"}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 font-medium transition-colors",
            statusFilter === "never"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border/70 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <CalendarDaysIcon className="size-3.5" />
          {neverUsedCount} nunca usadas
        </button>
      </div>

      {/* SELETOR RÁPIDO DE COLEÇÃO / GRUPO */}
      {collections.length > 0 ? (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setCollectionFilter("")}
            aria-pressed={!collectionFilter}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !collectionFilter
                ? "bg-foreground text-background shadow-2xs"
                : "border border-border/70 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <LayersIcon className="size-3.5" />
            <span>Todos os Grupos ({songs.length})</span>
          </button>

          {collections.map((col) => {
            const count = songs.filter((s) => s.collection === col).length;
            const isSelected = collectionFilter === col;
            return (
              <button
                key={col}
                type="button"
                onClick={() => setCollectionFilter(isSelected ? "" : col)}
                aria-pressed={isSelected}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "border border-primary/30 bg-primary/10 font-bold text-primary shadow-2xs"
                    : "border border-border/70 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <FolderIcon className="size-3.5 opacity-80" />
                <span>{col}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px]",
                    isSelected
                      ? "bg-primary/20 text-primary font-bold"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* CHIP DE FILTRO ATIVO SELECIONADO */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Filtros ativos:</span>
          {statusFilter !== "all" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
              {STATUS_LABEL[statusFilter]}
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="rounded p-0.5 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Remover filtro de pendência"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ) : null}
          {collectionFilter ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
              <FolderIcon className="size-3" />
              Grupo: {collectionFilter}
              <button
                type="button"
                onClick={() => setCollectionFilter("")}
                className="rounded p-0.5 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Remover filtro de grupo"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ) : null}
          {search ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2.5 py-0.5 text-foreground">
              Busca: &ldquo;{search}&rdquo;
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded p-0.5 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Remover busca"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ) : null}
          {toneFilter ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
              <GuitarIcon className="size-3" />
              Tom {toneFilter}
              <button
                type="button"
                onClick={() => setToneFilter("")}
                className="rounded p-0.5 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Remover filtro de tom"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ) : null}
          <button
            type="button"
            onClick={clearFilters}
            className="ml-1 text-xs font-medium text-primary hover:underline"
          >
            Limpar todos
          </button>
        </div>
      )}

      {/* GRID DE MÚSICAS */}
      {filteredSongs.length > 0 ? (
        <div className="grid min-w-0 max-w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              canManage={canManage}
              canAddToNextService={canAddToNextService}
              existingCollections={collections}
            />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/60 p-8 text-center sm:p-12">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Music2Icon className="size-7" />
          </span>
          <h2 className="mt-4 font-heading text-xl font-semibold tracking-tight">
            Nenhuma música no repertório
          </h2>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Cadastre as músicas da igreja para organizar letras, cifras, links e
            vincular aos momentos dos cultos e momentos de louvor.
          </p>
          <div className="mt-5">
            {canManage ? (
              <AddSongChoiceDialog
                existingCollections={collections}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/40 p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            Nenhuma música encontrada para os filtros aplicados
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tente pesquisar com outros termos ou limpar o filtro de tom.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-xs font-medium text-primary hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

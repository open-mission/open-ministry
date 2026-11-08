"use client";

import { useId, useMemo, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  FolderIcon,
  GuitarIcon,
  Music2Icon,
  SearchIcon,
  TagIcon,
  XIcon,
} from "lucide-react";

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
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { SongOption } from "./plan-item-dialog";

type PlanSongPickerProps = {
  songs: SongOption[];
  value: string;
  onChange: (songId: string) => void;
  disabled?: boolean;
};

export function PlanSongPicker({
  songs,
  value,
  onChange,
  disabled = false,
}: PlanSongPickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [toneFilter, setToneFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const searchInputId = useId();

  // Encontrar música atualmente selecionada
  const selectedSong = useMemo(() => {
    if (!value || value === "none") return null;
    return songs.find((s) => s.id === value) ?? null;
  }, [songs, value]);

  // Lista de coleções / grupos existentes nas músicas
  const availableCollections = useMemo(() => {
    const set = new Set<string>();
    for (const s of songs) {
      if (s.collection?.trim()) set.add(s.collection.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [songs]);

  // Lista de tons únicos existentes nas músicas
  const availableTones = useMemo(() => {
    const set = new Set<string>();
    for (const s of songs) {
      if (s.tone?.trim()) set.add(s.tone.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [songs]);

  // Lista de tags únicas existentes nas músicas
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const s of songs) {
      if (Array.isArray(s.tags)) {
        for (const t of s.tags) {
          if (t.trim()) set.add(t.trim());
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [songs]);

  // Filtragem de músicas
  const filteredSongs = useMemo(() => {
    let result = songs;

    if (collectionFilter) {
      result = result.filter((s) => s.collection === collectionFilter);
    }

    if (toneFilter) {
      result = result.filter((s) => s.tone === toneFilter);
    }

    if (tagFilter) {
      result = result.filter((s) => s.tags?.includes(tagFilter));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist?.toLowerCase().includes(q) ||
          s.tone?.toLowerCase().includes(q) ||
          s.collection?.toLowerCase().includes(q) ||
          s.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [songs, search, collectionFilter, toneFilter, tagFilter]);

  const hasActiveFilters = Boolean(
    search.trim() || collectionFilter || toneFilter || tagFilter,
  );

  const clearAllFilters = () => {
    setSearch("");
    setCollectionFilter("");
    setToneFilter("");
    setTagFilter("");
  };

  const handleSelectSong = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  // Conteúdo compartilhado do painel de busca e filtros
  const pickerBody = (
    <div className="flex flex-col h-full min-h-0">
      {/* 1. BARRA DE BUSCA COM INPUT GROUP */}
      <div className="p-3 border-b border-border/70 space-y-2.5 bg-card/60">
        <InputGroup className="h-10 w-full rounded-xl border border-border/80 bg-background shadow-2xs transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
          <InputGroupAddon align="inline-start" className="pl-3 text-muted-foreground">
            <SearchIcon className="size-4" />
          </InputGroupAddon>

          <InputGroupInput
            id={searchInputId}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, artista, tom ou tag..."
            className="h-10 text-sm placeholder:text-muted-foreground/70"
            autoFocus={!isMobile}
          />

          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mr-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Limpar busca"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </InputGroup>

        {/* 2. BARRA DE FILTROS (GRUPOS, TOM, TAGS) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* FILTRO POR GRUPO/COLEÇÃO */}
          {availableCollections.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant={collectionFilter ? "secondary" : "outline"}
                  size="xs"
                  className={cn(
                    "h-7 gap-1.5 rounded-lg px-2.5 text-xs font-medium",
                    collectionFilter &&
                      "border-primary/30 bg-primary/10 text-primary font-semibold",
                  )}
                >
                  <FolderIcon className="size-3 opacity-70" />
                  <span className="truncate max-w-[110px]">
                    {collectionFilter || "Grupo"}
                  </span>
                  <ChevronDownIcon className="size-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 max-h-56 overflow-y-auto">
                <DropdownMenuItem
                  onClick={() => setCollectionFilter("")}
                  className="font-medium"
                >
                  <span>Todos os grupos</span>
                  {!collectionFilter ? (
                    <CheckIcon className="size-3.5 ml-auto text-primary" />
                  ) : null}
                </DropdownMenuItem>
                {availableCollections.map((col) => (
                  <DropdownMenuItem
                    key={col}
                    onClick={() =>
                      setCollectionFilter(collectionFilter === col ? "" : col)
                    }
                  >
                    <FolderIcon className="size-3.5 mr-1.5 text-muted-foreground" />
                    <span className="truncate">{col}</span>
                    {collectionFilter === col ? (
                      <CheckIcon className="size-3.5 ml-auto text-primary" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* FILTRO POR TOM */}
          {availableTones.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant={toneFilter ? "secondary" : "outline"}
                  size="xs"
                  className={cn(
                    "h-7 gap-1.5 rounded-lg px-2.5 text-xs font-medium",
                    toneFilter &&
                      "border-primary/30 bg-primary/10 text-primary font-semibold",
                  )}
                >
                  <GuitarIcon className="size-3 opacity-70" />
                  <span>{toneFilter ? `Tom ${toneFilter}` : "Tom"}</span>
                  <ChevronDownIcon className="size-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40 max-h-56 overflow-y-auto">
                <DropdownMenuItem
                  onClick={() => setToneFilter("")}
                  className="font-medium"
                >
                  <span>Todos os tons</span>
                  {!toneFilter ? (
                    <CheckIcon className="size-3.5 ml-auto text-primary" />
                  ) : null}
                </DropdownMenuItem>
                {availableTones.map((tone) => (
                  <DropdownMenuItem
                    key={tone}
                    onClick={() =>
                      setToneFilter(toneFilter === tone ? "" : tone)
                    }
                  >
                    <span>Tom {tone}</span>
                    {toneFilter === tone ? (
                      <CheckIcon className="size-3.5 ml-auto text-primary" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* FILTRO POR TAG */}
          {availableTags.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant={tagFilter ? "secondary" : "outline"}
                  size="xs"
                  className={cn(
                    "h-7 gap-1.5 rounded-lg px-2.5 text-xs font-medium",
                    tagFilter &&
                      "border-primary/30 bg-primary/10 text-primary font-semibold",
                  )}
                >
                  <TagIcon className="size-3 opacity-70" />
                  <span className="truncate max-w-[100px]">
                    {tagFilter || "Tag"}
                  </span>
                  <ChevronDownIcon className="size-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 max-h-56 overflow-y-auto">
                <DropdownMenuItem
                  onClick={() => setTagFilter("")}
                  className="font-medium"
                >
                  <span>Todas as tags</span>
                  {!tagFilter ? (
                    <CheckIcon className="size-3.5 ml-auto text-primary" />
                  ) : null}
                </DropdownMenuItem>
                {availableTags.map((tag) => (
                  <DropdownMenuItem
                    key={tag}
                    onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
                  >
                    <TagIcon className="size-3 mr-1.5 text-muted-foreground" />
                    <span className="truncate">{tag}</span>
                    {tagFilter === tag ? (
                      <CheckIcon className="size-3.5 ml-auto text-primary" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] font-medium text-primary hover:underline ml-auto"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
      </div>

      {/* 3. LISTA DE MÚSICAS ROLÁVEL */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/60">
        {/* OPÇÃO 0: NENHUMA MÚSICA VINCULADA */}
        <button
          type="button"
          onClick={() => handleSelectSong("none")}
          className={cn(
            "flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/60 text-xs sm:text-sm",
            !selectedSong
              ? "bg-primary/10 font-semibold text-primary"
              : "text-muted-foreground",
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <XIcon className="size-3.5" />
            </span>
            <span>Nenhuma música vinculada</span>
          </div>
          {!selectedSong ? <CheckIcon className="size-4 text-primary" /> : null}
        </button>

        {/* RESULTADOS FILTRADOS */}
        {filteredSongs.length > 0 ? (
          filteredSongs.map((song) => {
            const isSelected = selectedSong?.id === song.id;
            return (
              <button
                key={song.id}
                type="button"
                onClick={() => handleSelectSong(song.id)}
                className={cn(
                  "flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60 active:scale-[0.99]",
                  isSelected && "bg-primary/10 font-semibold",
                )}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <Music2Icon className="size-3.5" />
                  </span>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-foreground sm:text-sm">
                        {song.title}
                      </span>
                      {song.tone ? (
                        <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                          {song.tone}
                        </span>
                      ) : null}
                    </div>

                    <p className="truncate text-[11px] text-muted-foreground">
                      {song.artist || "Artista não informado"}
                    </p>

                    {/* BADGES COMPLEMENTARES: COLEÇÃO E TAGS */}
                    {(song.collection || (song.tags && song.tags.length > 0)) && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {song.collection ? (
                          <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.2 text-[9px] font-medium text-muted-foreground">
                            <FolderIcon className="size-2.5 opacity-70" />
                            {song.collection}
                          </span>
                        ) : null}
                        {song.tags?.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="rounded bg-muted px-1.5 py-0.2 text-[9px] text-muted-foreground"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected ? (
                  <CheckIcon className="size-4 shrink-0 text-primary mt-1" />
                ) : null}
              </button>
            );
          })
        ) : (
          <div className="p-8 text-center space-y-2">
            <span className="flex size-10 mx-auto items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Music2Icon className="size-5" />
            </span>
            <p className="text-xs font-semibold text-foreground">
              Nenhuma música encontrada
            </p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Tente pesquisar por outros termos ou limpe os filtros de grupo, tom
              e tag.
            </p>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={clearAllFilters}
                className="mt-1"
              >
                Limpar filtros
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {/* RODAPÉ INFORMATIVO */}
      <div className="px-4 py-2 border-t border-border/70 bg-card/40 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{filteredSongs.length} músicas disponíveis</span>
        {selectedSong ? (
          <button
            type="button"
            onClick={() => handleSelectSong("none")}
            className="text-primary hover:underline font-medium"
          >
            Desvincular música
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <button
              id="plan-song-select"
              type="button"
              disabled={disabled}
              className={cn(
                "flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors hover:border-primary/50 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left",
                disabled && "opacity-50 pointer-events-none",
              )}
            >
              {selectedSong ? (
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Music2Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-foreground truncate">
                        {selectedSong.title}
                      </span>
                      {selectedSong.tone ? (
                        <Badge
                          variant="secondary"
                          className="px-1 py-0 text-[10px] font-bold text-primary"
                        >
                          {selectedSong.tone}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {selectedSong.artist || "Artista não informado"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Music2Icon className="size-4 opacity-70" />
                  <span>Nenhuma música vinculada</span>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0 ml-2">
                {selectedSong ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange("none");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onChange("none");
                      }
                    }}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                    title="Desvincular música"
                  >
                    <XIcon className="size-3.5" />
                  </span>
                ) : null}
                <ChevronDownIcon className="size-4 opacity-50" />
              </div>
            </button>
          </DrawerTrigger>

          <DrawerContent className="h-[88dvh] max-h-[88dvh] flex flex-col p-0">
            <DrawerHeader className="border-b border-border/70 px-4 py-3 text-left">
              <DrawerTitle className="flex items-center gap-2 text-base font-bold font-heading">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Music2Icon className="size-4" />
                </span>
                <span>Vincular Música ao Momento</span>
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                Selecione uma música do repertório com letra e cifra para este
                momento.
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 min-h-0 overflow-hidden">{pickerBody}</div>

            <DrawerFooter className="border-t border-border/70 px-4 py-3 bg-muted/20">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">
                  Fechar
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              id="plan-song-select"
              type="button"
              disabled={disabled}
              className={cn(
                "flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors hover:border-primary/50 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left",
                disabled && "opacity-50 pointer-events-none",
              )}
            >
              {selectedSong ? (
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Music2Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-foreground truncate">
                        {selectedSong.title}
                      </span>
                      {selectedSong.tone ? (
                        <Badge
                          variant="secondary"
                          className="px-1 py-0 text-[10px] font-bold text-primary"
                        >
                          {selectedSong.tone}
                        </Badge>
                      ) : null}
                      {selectedSong.collection ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                          <FolderIcon className="size-2.5 opacity-70" />
                          {selectedSong.collection}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {selectedSong.artist || "Artista não informado"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Music2Icon className="size-4 opacity-70" />
                  <span>Nenhuma música vinculada</span>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0 ml-2">
                {selectedSong ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange("none");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onChange("none");
                      }
                    }}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                    title="Desvincular música"
                  >
                    <XIcon className="size-3.5" />
                  </span>
                ) : null}
                <ChevronDownIcon className="size-4 opacity-50" />
              </div>
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className="w-[460px] p-0 rounded-2xl shadow-xl overflow-hidden h-[420px] flex flex-col"
          >
            {pickerBody}
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  FileMusicIcon,
  FileTextIcon,
  GuitarIcon,
  Music2Icon,
  SearchIcon,
  XIcon,
} from "lucide-react";

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
import { useIsMobile } from "@/hooks/use-mobile";
import { STANDARD_TONES } from "@/lib/music/chords-utils";
import type { SongRecord } from "@/lib/songs";
import { cn } from "@/lib/utils";
import { AddSongChoiceDialog } from "./add-song-choice-dialog";
import { SongCard } from "./song-card";

type SongsListViewProps = {
  songs: SongRecord[];
  canManage?: boolean;
};

export function SongsListView({ songs, canManage = true }: SongsListViewProps) {
  const isMobile = useIsMobile();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toneFilter, setToneFilter] = useState("");

  const filteredSongs = useMemo(() => {
    let result = songs;

    if (toneFilter) {
      result = result.filter((s) => s.tone === toneFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist?.toLowerCase().includes(q) ||
          s.tags?.some((t) => t.toLowerCase().includes(q)) ||
          s.tone?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [songs, search, toneFilter]);

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
        hint: "Prontas para tocar",
      },
      {
        icon: FileTextIcon,
        label: "Com Letra",
        value: withLyrics,
        hint: "Com texto completo",
      },
    ];
  }, [songs]);

  return (
    <div className="space-y-6">
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
                className="mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Limpar busca"
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

        {/* BOTÃO NOVA MÚSICA COM ALTURA PADRONIZADA (h-10) - OCULTO NO MOBILE */}
        {canManage ? (
          <div className="hidden shrink-0 sm:block">
            <AddSongChoiceDialog />
          </div>
        ) : null}
      </div>

      {/* CHIP DE FILTRO ATIVO SELECIONADO */}
      {(search || toneFilter) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Filtros ativos:</span>
          {search ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2.5 py-0.5 text-foreground">
              Busca: &ldquo;{search}&rdquo;
              <button
                type="button"
                onClick={() => setSearch("")}
                className="hover:text-destructive"
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
                className="hover:text-destructive"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setToneFilter("");
            }}
            className="text-xs text-primary hover:underline font-medium ml-1"
          >
            Limpar todos
          </button>
        </div>
      )}

      {/* GRID DE MÚSICAS */}
      {filteredSongs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSongs.map((song) => (
            <SongCard key={song.id} song={song} canManage={canManage} />
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
            {canManage ? <AddSongChoiceDialog /> : null}
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
          {(search || toneFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setToneFilter("");
              }}
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

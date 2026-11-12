"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangleIcon,
  ExternalLinkIcon,
  FileMusicIcon,
  FileTextIcon,
  GuitarIcon,
  Loader2Icon,
  Maximize2Icon,
  Minimize2Icon,
  Music2Icon,
  SparklesIcon,
  XIcon,
} from "lucide-react";

import {
  useCreateSongMutation,
  useSongsQuery,
  useUpdateSongMutation,
} from "@/hooks/use-songs";
import type { SongInput } from "@/lib/music/songs-schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  extractLyricsFromChords,
  STANDARD_TIME_SIGNATURES,
  STANDARD_TONES,
} from "@/lib/music/chords-utils";
import { generateStreamingSearchLinks } from "@/lib/music/lyrics-service";
import type { SongRecord } from "@/lib/songs";
import { cn } from "@/lib/utils";
import { CollectionCombobox } from "./collection-combobox";

type SongFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songId?: string;
  initialData?: {
    title?: string;
    artist?: string;
    tone?: string;
    capo?: number | null;
    bpm?: number | null;
    timeSignature?: string;
    lyrics?: string;
    chords?: string;
    youtubeUrl?: string;
    youtubeMusicUrl?: string;
    spotifyUrl?: string;
    collection?: string | null;
    tags?: string[];
  };
  existingCollections?: string[];
  onSongCreated?: (song: SongRecord) => void;
  onSongUpdated?: (song: SongRecord) => void;
};

export function SongFormDialog({
  open,
  onOpenChange,
  songId,
  initialData,
  existingCollections = [],
  onSongCreated,
  onSongUpdated,
}: SongFormDialogProps) {
  const isEditing = Boolean(songId);
  const isMobile = useIsMobile();

  const createMutation = useCreateSongMutation();
  const updateMutation = useUpdateSongMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: songsData } = useSongsQuery();
  const initialCollection = initialData?.collection;
  const availableCollections = useMemo(() => {
    const set = new Set<string>();
    for (const c of existingCollections) {
      if (c?.trim()) set.add(c.trim());
    }
    if (songsData?.collections) {
      for (const c of songsData.collections) {
        if (c?.trim()) set.add(c.trim());
      }
    }
    if (songsData?.songs) {
      for (const s of songsData.songs) {
        if (s.collection?.trim()) set.add(s.collection.trim());
      }
    }
    if (initialCollection?.trim()) {
      set.add(initialCollection.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [existingCollections, songsData, initialCollection]);

  // Estados de confirmação e visualização
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);
  const [showSyncAlert, setShowSyncAlert] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [mobileMusicTab, setMobileMusicTab] = useState<"chords" | "lyrics">(
    "chords",
  );

  // Campos do formulário
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [artist, setArtist] = useState(initialData?.artist ?? "");
  const [tone, setTone] = useState(initialData?.tone ?? "");
  const [capo, setCapo] = useState(
    initialData?.capo ? String(initialData.capo) : "",
  );
  const [bpm, setBpm] = useState(
    initialData?.bpm ? String(initialData.bpm) : "",
  );
  const [timeSignature, setTimeSignature] = useState(
    initialData?.timeSignature ?? "4/4",
  );
  const [lyrics, setLyrics] = useState(initialData?.lyrics ?? "");
  const [chords, setChords] = useState(initialData?.chords ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initialData?.youtubeUrl ?? "");
  const [youtubeMusicUrl, setYoutubeMusicUrl] = useState(
    initialData?.youtubeMusicUrl ?? "",
  );
  const [spotifyUrl, setSpotifyUrl] = useState(initialData?.spotifyUrl ?? "");
  const [collection, setCollection] = useState(
    initialData?.collection ?? "",
  );
  const [tagsInput, setTagsInput] = useState(
    initialData?.tags?.join(", ") ?? "",
  );

  // Sincroniza os campos quando initialData mudar
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setTitle(initialData?.title ?? "");
    setArtist(initialData?.artist ?? "");
    setTone(initialData?.tone ?? "");
    setCapo(initialData?.capo ? String(initialData.capo) : "");
    setBpm(initialData?.bpm ? String(initialData.bpm) : "");
    setTimeSignature(initialData?.timeSignature ?? "4/4");
    setLyrics(initialData?.lyrics ?? "");
    setChords(initialData?.chords ?? "");
    setYoutubeUrl(initialData?.youtubeUrl ?? "");
    setYoutubeMusicUrl(initialData?.youtubeMusicUrl ?? "");
    setSpotifyUrl(initialData?.spotifyUrl ?? "");
    setCollection(initialData?.collection ?? "");
    setTagsInput(initialData?.tags?.join(", ") ?? "");
  }

  // Detecção de alterações não salvas (Dirty State)
  const isDirty = useMemo(() => {
    return (
      title !== (initialData?.title ?? "") ||
      artist !== (initialData?.artist ?? "") ||
      tone !== (initialData?.tone ?? "") ||
      capo !== (initialData?.capo ? String(initialData.capo) : "") ||
      bpm !== (initialData?.bpm ? String(initialData.bpm) : "") ||
      timeSignature !== (initialData?.timeSignature ?? "4/4") ||
      lyrics !== (initialData?.lyrics ?? "") ||
      chords !== (initialData?.chords ?? "") ||
      youtubeUrl !== (initialData?.youtubeUrl ?? "") ||
      youtubeMusicUrl !== (initialData?.youtubeMusicUrl ?? "") ||
      spotifyUrl !== (initialData?.spotifyUrl ?? "") ||
      collection !== (initialData?.collection ?? "") ||
      tagsInput !== (initialData?.tags?.join(", ") ?? "")
    );
  }, [
    title,
    artist,
    tone,
    capo,
    bpm,
    timeSignature,
    lyrics,
    chords,
    youtubeUrl,
    youtubeMusicUrl,
    spotifyUrl,
    collection,
    tagsInput,
    initialData,
  ]);

  const handleRequestClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (isDirty) {
        setShowDiscardAlert(true);
      } else {
        setIsMaximized(false);
        onOpenChange(false);
      }
    } else {
      onOpenChange(true);
    }
  };

  const handleDiscardChanges = () => {
    // Restaura valores originais
    setTitle(initialData?.title ?? "");
    setArtist(initialData?.artist ?? "");
    setTone(initialData?.tone ?? "");
    setCapo(initialData?.capo ? String(initialData.capo) : "");
    setBpm(initialData?.bpm ? String(initialData.bpm) : "");
    setTimeSignature(initialData?.timeSignature ?? "4/4");
    setLyrics(initialData?.lyrics ?? "");
    setChords(initialData?.chords ?? "");
    setYoutubeUrl(initialData?.youtubeUrl ?? "");
    setYoutubeMusicUrl(initialData?.youtubeMusicUrl ?? "");
    setSpotifyUrl(initialData?.spotifyUrl ?? "");
    setCollection(initialData?.collection ?? "");
    setTagsInput(initialData?.tags?.join(", ") ?? "");

    setShowDiscardAlert(false);
    setIsMaximized(false);
    onOpenChange(false);
  };

  const handleFillSearchLinks = () => {
    if (!title.trim()) {
      toast.info("Digite o título da música primeiro.");
      return;
    }
    const links = generateStreamingSearchLinks(title, artist);
    if (!youtubeUrl) setYoutubeUrl(links.youtube);
    if (!youtubeMusicUrl) setYoutubeMusicUrl(links.youtubeMusic);
    if (!spotifyUrl) setSpotifyUrl(links.spotify);
    toast.success("Links de busca gerados para YouTube e Spotify!");
  };

  // Disparo da sincronização de letra a partir da cifra
  const handleSyncLyricsClick = () => {
    if (!chords.trim()) {
      toast.error("Cole ou preencha a cifra primeiro para poder extrair a letra.");
      return;
    }

    if (lyrics.trim()) {
      setShowSyncAlert(true);
    } else {
      performSyncLyrics();
    }
  };

  const performSyncLyrics = () => {
    const extracted = extractLyricsFromChords(chords);
    if (!extracted) {
      toast.error("Não foram encontrados versos de letra para extrair da cifra.");
      return;
    }
    setLyrics(extracted);
    setShowSyncAlert(false);
    toast.success("Letra sincronizada com sucesso a partir da cifra!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("O título da música é obrigatório.");
      return;
    }

    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: SongInput = {
      title: title.trim(),
      artist: artist.trim() || null,
      tone: tone.trim() || null,
      capo: capo.trim() ? Number(capo) : 0,
      bpm: bpm ? Number(bpm) : null,
      timeSignature: timeSignature.trim() || null,
      lyrics: lyrics.trim() || null,
      chords: chords.trim() || null,
      youtubeUrl: youtubeUrl.trim() || null,
      youtubeMusicUrl: youtubeMusicUrl.trim() || null,
      spotifyUrl: spotifyUrl.trim() || null,
      collection: collection.trim() || null,
      tags: parsedTags,
    };

    try {
      if (isEditing && songId) {
        const result = await updateMutation.mutateAsync({
          songId,
          data: payload,
        });
        toast.success("Música atualizada com sucesso!");
        if (result.song) {
          onSongUpdated?.(result.song as SongRecord);
        }
      } else {
        const result = await createMutation.mutateAsync(payload);
        toast.success("Música adicionada ao repertório!");
        if (result.song) {
          onSongCreated?.(result.song);
        }
      }
      setIsMaximized(false);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar música.";
      toast.error(message);
    }
  };

  // Formulário compartilhado entre Sheet (mobile) e Dialog (desktop)
  const formBody = (
    <form
      onSubmit={handleSubmit}
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
    >
      {/* 1. HEADER DO FORMULÁRIO */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-card/60 px-4 py-3 sm:px-6 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Music2Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-base font-bold tracking-tight text-foreground sm:text-lg">
              {isEditing ? "Editar Música" : "Nova Música no Repertório"}
            </h2>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {isEditing
                ? "Edite metadados, tom, letra, cifra e plataformas."
                : "Cadastre letras, cifras e links para a equipe de louvor."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* BOTÃO MAXIMIZAR / RESTAURAR (DESKTOP) */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsMaximized((prev) => !prev)}
            className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
            title={
              isMaximized
                ? "Restaurar tamanho da janela"
                : "Maximizar para tela cheia"
            }
          >
            {isMaximized ? (
              <Minimize2Icon className="size-4" />
            ) : (
              <Maximize2Icon className="size-4" />
            )}
            <span className="sr-only">
              {isMaximized ? "Restaurar tamanho" : "Maximizar tela"}
            </span>
          </Button>

          {/* ÚNICO BOTÃO DE FECHAR (X) */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => handleRequestClose(false)}
            className="text-muted-foreground hover:text-foreground"
            title="Fechar"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>
      </div>

      {/* 2. TABS CONTAINER FIXO COM SCROLL DENTRO DOS CAMPOS */}
      <Tabs
        defaultValue="dados"
        className="flex flex-1 min-h-0 flex-col overflow-hidden"
      >
        {/* TABS LIST FIXO NO TOPO COM SUPORTE A ROLAGEM HORIZONTAL NO MOBILE */}
        <div className="shrink-0 border-b border-border/70 bg-muted/20 px-3 py-2 sm:px-6">
          <div className="w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="inline-flex h-9.5 w-max min-w-full items-center justify-start gap-1 rounded-lg bg-muted/80 p-1 sm:grid sm:h-10 sm:w-full sm:grid-cols-3">
              <TabsTrigger
                value="dados"
                className="shrink-0 gap-1.5 px-3 py-1.5 text-xs font-medium sm:text-sm"
              >
                <GuitarIcon className="size-3.5" />
                <span>Dados Gerais</span>
              </TabsTrigger>
              <TabsTrigger
                value="cifra-letra"
                className="shrink-0 gap-1.5 px-3 py-1.5 text-xs font-medium sm:text-sm"
              >
                <FileMusicIcon className="size-3.5" />
                <span>Cifra & Letra</span>
              </TabsTrigger>
              <TabsTrigger
                value="links"
                className="shrink-0 gap-1.5 px-3 py-1.5 text-xs font-medium sm:text-sm"
              >
                <ExternalLinkIcon className="size-3.5" />
                <span>Plataformas & Links</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* ABA 1: DADOS GERAIS */}
        <TabsContent
          value="dados"
          className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 data-[state=inactive]:hidden"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="song-title">
                Título da música <span className="text-destructive">*</span>
              </Label>
              <Input
                id="song-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: A Casa É Sua"
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="song-artist">Artista / Ministério</Label>
              <Input
                id="song-artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Ex: Casa Worship, Morada..."
                className="h-10"
              />
            </div>

            {/* GRUPO DO REPERTÓRIO */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label>Grupo</Label>
              <CollectionCombobox
                value={collection}
                onChange={setCollection}
                existingCollections={availableCollections}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="song-tone">Tom principal</Label>
              <NativeSelect
                id="song-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="h-10"
              >
                <option value="">Selecione o tom...</option>
                {STANDARD_TONES.map((t) => (
                  <option key={t} value={t}>
                    Tom {t}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="song-capo">Capotraste</Label>
              <NativeSelect
                id="song-capo"
                value={capo}
                onChange={(e) => setCapo(e.target.value)}
                className="h-10"
              >
                <option value="">Sem capotraste</option>
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (position) => (
                    <option key={position} value={String(position)}>
                      Capo {position}ª casa
                    </option>
                  ),
                )}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="song-bpm">BPM (Andamento)</Label>
              <Input
                id="song-bpm"
                type="number"
                min={20}
                max={300}
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                placeholder="Ex: 72"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="song-time-signature">Compasso</Label>
              <NativeSelect
                id="song-time-signature"
                value={timeSignature}
                onChange={(e) => setTimeSignature(e.target.value)}
                className="h-10"
              >
                {STANDARD_TIME_SIGNATURES.map((ts) => (
                  <option key={ts} value={ts}>
                    {ts}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="song-tags">
                Tags / Temas (separadas por vírgula)
              </Label>
              <Input
                id="song-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ex: Adoração, Celebração, Ceia, Gratidão"
                className="h-10"
              />
              <p className="text-[11px] text-muted-foreground">
                Use vírgula para separar múltiplos temas. Até 3 tags aparecerão em destaque no cabeçalho.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ABA 2: CIFRA & LETRA (MODAL SEM SCROLL; SCROLL DENTRO DOS TEXTAREAS; ABAS NO MOBILE) */}
        <TabsContent
          value="cifra-letra"
          className="mt-0 flex flex-1 min-h-0 flex-col overflow-hidden p-3 sm:p-5 data-[state=inactive]:hidden"
        >
          {/* CONTROLE DE SUB-ABAS NO MOBILE (CIFRA / LETRA) */}
          <div className="mb-2.5 flex shrink-0 items-center justify-between lg:hidden">
            <div
              role="tablist"
              aria-label="Cifra ou letra"
              className="inline-flex h-8 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs"
            >
              <button
                type="button"
                role="tab"
                id="mobile-music-chords-tab"
                aria-selected={mobileMusicTab === "chords"}
                aria-controls="mobile-music-chords-panel"
                onClick={() => setMobileMusicTab("chords")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  mobileMusicTab === "chords"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <FileMusicIcon className="size-3.5" />
                <span>Cifra</span>
              </button>
              <button
                type="button"
                role="tab"
                id="mobile-music-lyrics-tab"
                aria-selected={mobileMusicTab === "lyrics"}
                aria-controls="mobile-music-lyrics-panel"
                onClick={() => setMobileMusicTab("lyrics")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  mobileMusicTab === "lyrics"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <FileTextIcon className="size-3.5" />
                <span>Letra</span>
              </button>
            </div>

            {mobileMusicTab === "lyrics" ? (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleSyncLyricsClick}
                className="h-7 gap-1 px-2.5 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
                title="Extrai e preenche a letra a partir da cifra"
              >
                <SparklesIcon className="size-3" />
                <span>Sincronizar</span>
              </Button>
            ) : null}
          </div>

          {/* GRID 2 COLUNAS NO DESKTOP / VISUALIZAÇÃO ALTERNADA NO MOBILE */}
          <div className="grid h-full min-h-0 flex-1 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
            {/* COLUNA 1: CIFRA */}
            <div
              id="mobile-music-chords-panel"
              role="tabpanel"
              aria-labelledby="mobile-music-chords-tab"
              className={cn(
                "flex h-full min-h-0 flex-1 flex-col space-y-1.5",
                mobileMusicTab === "lyrics" ? "hidden lg:flex" : "flex",
              )}
            >
              <div className="flex shrink-0 items-center justify-between">
                <Label
                  htmlFor="song-chords"
                  className="flex items-center gap-1.5 text-xs font-medium text-foreground sm:text-sm"
                >
                  <FileMusicIcon className="size-4 text-primary" />
                  <span>Cifra (Acordes com texto)</span>
                </Label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Fonte monoespaçada
                </span>
              </div>
              <Textarea
                id="song-chords"
                value={chords}
                onChange={(e) => setChords(e.target.value)}
                placeholder="Cole aqui a cifra do Cifra Club ou do seu arquivo .txt...&#10;&#10;[Intro] D  A6  D  A6&#10;&#10;[Primeira Parte]&#10;D         A6&#10;Os meus olhos viram a salvação&#10;D         A6&#10;A luz para o mundo, esperança da terra&#10;&#10;[Refrão]&#10;G           D&#10;Glória nas alturas"
                style={{ fieldSizing: "fixed" as never }}
                className="h-full min-h-0 flex-1 resize-none overflow-y-auto font-mono text-xs leading-relaxed sm:text-sm [field-sizing:fixed]"
              />
              <p className="shrink-0 text-[11px] leading-relaxed text-muted-foreground">
                Dica: Use <code>[Intro]</code>, <code>[Primeira Parte]</code>,{" "}
                <code>[Refrão]</code> ou <code>[Ponte]</code> para dividir a cifra em cards automáticos.
              </p>
            </div>

            {/* COLUNA 2: LETRA COMPLETA + BOTÃO DE SINCRONIZAÇÃO */}
            <div
              id="mobile-music-lyrics-panel"
              role="tabpanel"
              aria-labelledby="mobile-music-lyrics-tab"
              className={cn(
                "flex h-full min-h-0 flex-1 flex-col space-y-1.5",
                mobileMusicTab === "chords" ? "hidden lg:flex" : "flex",
              )}
            >
              <div className="flex shrink-0 items-center justify-between">
                <Label
                  htmlFor="song-lyrics"
                  className="flex items-center gap-1.5 text-xs font-medium text-foreground sm:text-sm"
                >
                  <FileTextIcon className="size-4 text-primary" />
                  <span>Letra completa da música</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleSyncLyricsClick}
                  className="hidden h-7 gap-1.5 px-2.5 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary lg:inline-flex"
                  title="Extrai e preenche a letra a partir da cifra apagando acordes e tablaturas"
                >
                  <SparklesIcon className="size-3 text-primary" />
                  <span>Sincronizar da cifra</span>
                </Button>
              </div>
              <Textarea
                id="song-lyrics"
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="A letra cantada limpa sem acordes (para projeção de slides no culto e ensaios)...&#10;&#10;[Primeira Parte]&#10;Os meus olhos viram a salvação&#10;A luz para o mundo, esperança da terra&#10;&#10;[Refrão]&#10;Glória nas alturas"
                style={{ fieldSizing: "fixed" as never }}
                className="h-full min-h-0 flex-1 resize-none overflow-y-auto font-sans text-xs leading-relaxed sm:text-sm [field-sizing:fixed]"
              />
              <p className="shrink-0 text-[11px] leading-relaxed text-muted-foreground">
                Texto limpo sem acordes, ideal para projeção no telão e leitura dos vocalistas.
              </p>
            </div>
          </div>
        </TabsContent>

          {/* ABA 3: PLATAFORMAS & LINKS */}
          <TabsContent value="links" className="space-y-4 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground sm:p-4">
              <span className="flex items-center gap-2">
                <SparklesIcon className="size-4 text-primary" />
                <span>
                  Gere links automáticos de busca caso não tenha a URL exata do YouTube ou Spotify.
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillSearchLinks}
                className="h-8 gap-1.5 text-xs text-primary hover:bg-primary/10 hover:text-primary font-medium"
              >
                Gerar links de busca
              </Button>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="song-youtube" className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-red-500" />
                  Link do YouTube
                </Label>
                <div className="relative">
                  <Input
                    id="song-youtube"
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="h-10 pr-9"
                  />
                  {youtubeUrl ? (
                    <a
                      href={youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      title="Abrir no YouTube"
                    >
                      <ExternalLinkIcon className="size-4" />
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="song-youtube-music"
                  className="flex items-center gap-1.5"
                >
                  <span className="size-2 rounded-full bg-red-600" />
                  Link do YouTube Music
                </Label>
                <div className="relative">
                  <Input
                    id="song-youtube-music"
                    type="url"
                    value={youtubeMusicUrl}
                    onChange={(e) => setYoutubeMusicUrl(e.target.value)}
                    placeholder="https://music.youtube.com/watch?v=..."
                    className="h-10 pr-9"
                  />
                  {youtubeMusicUrl ? (
                    <a
                      href={youtubeMusicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      title="Abrir no YouTube Music"
                    >
                      <ExternalLinkIcon className="size-4" />
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="song-spotify" className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Link do Spotify
                </Label>
                <div className="relative">
                  <Input
                    id="song-spotify"
                    type="url"
                    value={spotifyUrl}
                    onChange={(e) => setSpotifyUrl(e.target.value)}
                    placeholder="https://open.spotify.com/track/..."
                    className="h-10 pr-9"
                  />
                  {spotifyUrl ? (
                    <a
                      href={spotifyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      title="Abrir no Spotify"
                    >
                      <ExternalLinkIcon className="size-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

      {/* 3. FOOTER FIXO DO FORMULÁRIO */}
      <div className="flex shrink-0 flex-row items-center justify-between border-t border-border/70 bg-card/95 backdrop-blur-xs px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          {isDirty ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <span className="size-2 rounded-full bg-amber-500 motion-safe:animate-pulse" />
              Alterações não salvas
            </span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              Tudo salvo
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleRequestClose(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="gap-1.5 font-semibold"
          >
            {isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : null}
            {isEditing ? "Salvar alterações" : "Adicionar ao repertório"}
          </Button>
        </div>
      </div>
    </form>
  );

  return (
    <>
      {/* RENDERIZAÇÃO RESPONSIVA: SHEET 100% NO MOBILE / DIALOG AMPLO NO DESKTOP */}
      {isMobile ? (
        <Sheet open={open} onOpenChange={handleRequestClose}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden rounded-none border-0 bg-background p-0"
            onPointerDownOutside={(e) => {
              if (isDirty) {
                e.preventDefault();
                setShowDiscardAlert(true);
              }
            }}
            onEscapeKeyDown={(e) => {
              if (isDirty) {
                e.preventDefault();
                setShowDiscardAlert(true);
              }
            }}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>
                {isEditing ? "Editar Música" : "Nova Música no Repertório"}
              </SheetTitle>
              <SheetDescription>
                Formulário completo de edição de músicas e cifras.
              </SheetDescription>
            </SheetHeader>
            {formBody}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={handleRequestClose}>
          <DialogContent
            showCloseButton={false}
            className={cn(
              "flex flex-col gap-0 overflow-hidden bg-background p-0 duration-150",
              isMaximized
                ? "fixed top-0 left-0 translate-x-0 translate-y-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none sm:max-w-none xl:max-w-none rounded-none border-0 ring-0"
                : "h-[92vh] max-h-[92vh] min-h-0 sm:max-w-5xl xl:max-w-6xl rounded-2xl border border-border/80 shadow-2xl",
            )}
            onPointerDownOutside={(e) => {
              if (isDirty) {
                e.preventDefault();
                setShowDiscardAlert(true);
              }
            }}
            onEscapeKeyDown={(e) => {
              if (isDirty) {
                e.preventDefault();
                setShowDiscardAlert(true);
              }
            }}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>
                {isEditing ? "Editar Música" : "Nova Música no Repertório"}
              </DialogTitle>
              <DialogDescription>
                Formulário completo de edição de músicas e cifras.
              </DialogDescription>
            </DialogHeader>
            {formBody}
          </DialogContent>
        </Dialog>
      )}

      {/* DIÁLOGO DE SEGURANÇA: DESCARTAR ALTERAÇÕES NÃO SALVAS */}
      <AlertDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <AlertTriangleIcon className="size-5" />
            </div>
            <AlertDialogTitle className="font-heading text-lg font-bold">
              Descartar alterações não salvas?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground sm:text-sm">
              Você possui alterações no formulário da música que ainda não foram salvas. Se você fechar agora, todas as edições serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => setShowDiscardAlert(false)}>
              Continuar editando
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={handleDiscardChanges}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Descartar alterações
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIÁLOGO DE CONFIRMAÇÃO: SINCRONIZAR LETRA A PARTIR DA CIFRA */}
      <AlertDialog open={showSyncAlert} onOpenChange={setShowSyncAlert}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <SparklesIcon className="size-5" />
            </div>
            <AlertDialogTitle className="font-heading text-lg font-bold">
              Substituir letra atual pela cifra?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground sm:text-sm">
              A letra atual desta música será apagada e substituída pelos versos extraídos da cifra (removendo acordes e tablaturas).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => setShowSyncAlert(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={performSyncLyrics}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Substituir letra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ExternalLinkIcon,
  FileMusicIcon,
  Loader2Icon,
  Music2Icon,
  SparklesIcon,
} from "lucide-react";

import { createSongAction, updateSongAction } from "@/app/actions/songs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  STANDARD_TIME_SIGNATURES,
  STANDARD_TONES,
} from "@/lib/music/chords-utils";
import { generateStreamingSearchLinks } from "@/lib/music/lyrics-service";

type SongFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songId?: string;
  initialData?: {
    title?: string;
    artist?: string;
    tone?: string;
    bpm?: number | null;
    timeSignature?: string;
    lyrics?: string;
    chords?: string;
    youtubeUrl?: string;
    youtubeMusicUrl?: string;
    spotifyUrl?: string;
    tags?: string[];
  };
};

export function SongFormDialog({
  open,
  onOpenChange,
  songId,
  initialData,
}: SongFormDialogProps) {
  const isEditing = Boolean(songId);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [artist, setArtist] = useState(initialData?.artist ?? "");
  const [tone, setTone] = useState(initialData?.tone ?? "");
  const [bpm, setBpm] = useState(initialData?.bpm ? String(initialData.bpm) : "");
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
  const [tagsInput, setTagsInput] = useState(
    initialData?.tags?.join(", ") ?? "",
  );

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("O título da música é obrigatório.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      if (songId) formData.append("songId", songId);
      formData.append("title", title);
      formData.append("artist", artist);
      formData.append("tone", tone);
      formData.append("bpm", bpm);
      formData.append("timeSignature", timeSignature);
      formData.append("lyrics", lyrics);
      formData.append("chords", chords);
      formData.append("youtubeUrl", youtubeUrl);
      formData.append("youtubeMusicUrl", youtubeMusicUrl);
      formData.append("spotifyUrl", spotifyUrl);

      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      formData.append("tags", JSON.stringify(parsedTags));

      const result = isEditing
        ? await updateSongAction(formData)
        : await createSongAction(formData);

      if (!result.ok) {
        toast.error(result.error ?? "Erro ao salvar música.");
      } else {
        toast.success(
          isEditing
            ? "Música atualizada com sucesso!"
            : "Música adicionada ao repertório!",
        );
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader className="gap-1.5 text-left">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Music2Icon className="size-4" />
              </span>
              <DialogTitle className="font-heading text-xl tracking-tight">
                {isEditing ? "Editar Música" : "Nova Música no Repertório"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
              Preencha os metadados, tom, letra, cifra e links de streaming para
              a equipe.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dados" className="text-xs sm:text-sm">
                Dados Gerais
              </TabsTrigger>
              <TabsTrigger value="cifra-letra" className="text-xs sm:text-sm">
                Cifra & Letra
              </TabsTrigger>
              <TabsTrigger value="links" className="text-xs sm:text-sm">
                Plataformas & Links
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: DADOS GERAIS */}
            <TabsContent value="dados" className="space-y-4 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
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
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="song-artist">Artista / Ministério</Label>
                  <Input
                    id="song-artist"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Ex: Casa Worship, Fernandinho, Morada..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="song-tone">Tom principal</Label>
                  <NativeSelect
                    id="song-tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                  >
                    <option value="">Selecione o tom...</option>
                    {STANDARD_TONES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
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
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="song-time-signature">Compasso</Label>
                  <NativeSelect
                    id="song-time-signature"
                    value={timeSignature}
                    onChange={(e) => setTimeSignature(e.target.value)}
                  >
                    {STANDARD_TIME_SIGNATURES.map((ts) => (
                      <option key={ts} value={ts}>
                        {ts}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="song-tags">Tags / Temas (separadas por vírgula)</Label>
                  <Input
                    id="song-tags"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Ex: Adoração, Celebração, Ceia"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: CIFRA & LETRA */}
            <TabsContent value="cifra-letra" className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="song-chords" className="flex items-center gap-1.5">
                    <FileMusicIcon className="size-3.5 text-primary" />
                    Cifra (Acordes com texto)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Fonte monoespaçada
                  </span>
                </div>
                <Textarea
                  id="song-chords"
                  value={chords}
                  onChange={(e) => setChords(e.target.value)}
                  placeholder="[Intro] G  C  G  C&#10;&#10;G                C&#10;Você é bem-vindo aqui&#10;G                 C&#10;A casa é sua pode entrar"
                  className="font-mono text-xs leading-relaxed sm:text-sm min-h-[160px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="song-lyrics">Letra completa da música</Label>
                <Textarea
                  id="song-lyrics"
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder="Você é bem-vindo aqui&#10;A casa é sua pode entrar&#10;Me esvazio de mim..."
                  className="text-xs leading-relaxed sm:text-sm min-h-[140px]"
                />
              </div>
            </TabsContent>

            {/* ABA 3: PLATAFORMAS & LINKS */}
            <TabsContent value="links" className="space-y-4 pt-3">
              <div className="flex items-center justify-between rounded-xl bg-accent/30 p-3 text-xs text-accent-foreground">
                <span className="flex items-center gap-2">
                  <SparklesIcon className="size-4 text-primary" />
                  Gere links automáticos de busca caso não tenha o endereço exato.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleFillSearchLinks}
                  className="shrink-0"
                >
                  Gerar links
                </Button>
              </div>

              <div className="space-y-3">
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
                  <Label htmlFor="song-youtube-music" className="flex items-center gap-1.5">
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              {isEditing ? "Salvar alterações" : "Adicionar ao repertório"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

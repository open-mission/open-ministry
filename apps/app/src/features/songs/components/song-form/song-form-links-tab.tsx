"use client";

import { ExternalLinkIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SongFormFields } from "./song-form.types";

type SongFormLinksTabProps = {
  youtubeUrl: string;
  youtubeMusicUrl: string;
  spotifyUrl: string;
  onFieldChange: (field: keyof SongFormFields, value: string) => void;
  onFillSearchLinks: () => void;
};

export function SongFormLinksTab({
  youtubeUrl,
  youtubeMusicUrl,
  spotifyUrl,
  onFieldChange,
  onFillSearchLinks,
}: SongFormLinksTabProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground sm:p-4">
        <span className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-primary" />
          <span>
            Gere links automáticos de busca caso não tenha a URL exata do
            YouTube ou Spotify.
          </span>
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onFillSearchLinks}
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
              onChange={(e) => onFieldChange("youtubeUrl", e.target.value)}
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
              onChange={(e) =>
                onFieldChange("youtubeMusicUrl", e.target.value)
              }
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
              onChange={(e) => onFieldChange("spotifyUrl", e.target.value)}
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
    </>
  );
}

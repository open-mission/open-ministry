"use client";

import type { FormEvent } from "react";
import { toast } from "sonner";

import {
  useCreateSongMutation,
  useUpdateSongMutation,
} from "@/hooks/use-songs";
import { extractLyricsFromChords } from "@/lib/music/chords-utils";
import { generateStreamingSearchLinks } from "@/lib/music/lyrics-service";
import type { SongInput } from "@/lib/music/songs-schema";
import type { SongRecord } from "@/lib/songs";
import type { SongFormFields } from "./song-form.types";

type UseSongFormActionsParams = {
  songId?: string;
  isEditing: boolean;
  fields: SongFormFields;
  setField: (field: keyof SongFormFields, value: string) => void;
  setShowSyncAlert: (open: boolean) => void;
  setIsMaximized: (value: boolean) => void;
  onOpenChange: (open: boolean) => void;
  onSongCreated?: (song: SongRecord) => void;
  onSongUpdated?: (song: SongRecord) => void;
};

export function useSongFormActions({
  songId,
  isEditing,
  fields,
  setField,
  setShowSyncAlert,
  setIsMaximized,
  onOpenChange,
  onSongCreated,
  onSongUpdated,
}: UseSongFormActionsParams) {
  const createMutation = useCreateSongMutation();
  const updateMutation = useUpdateSongMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleFillSearchLinks = () => {
    if (!fields.title.trim()) {
      toast.info("Digite o título da música primeiro.");
      return;
    }
    const links = generateStreamingSearchLinks(fields.title, fields.artist);
    if (!fields.youtubeUrl) setField("youtubeUrl", links.youtube);
    if (!fields.youtubeMusicUrl) setField("youtubeMusicUrl", links.youtubeMusic);
    if (!fields.spotifyUrl) setField("spotifyUrl", links.spotify);
    toast.success("Links de busca gerados para YouTube e Spotify!");
  };

  const performSyncLyrics = () => {
    const extracted = extractLyricsFromChords(fields.chords);
    if (!extracted) {
      toast.error(
        "Não foram encontrados versos de letra para extrair da cifra.",
      );
      return;
    }
    setField("lyrics", extracted);
    setShowSyncAlert(false);
    toast.success("Letra sincronizada com sucesso a partir da cifra!");
  };

  const handleSyncLyricsClick = () => {
    if (!fields.chords.trim()) {
      toast.error(
        "Cole ou preencha a cifra primeiro para poder extrair a letra.",
      );
      return;
    }
    if (fields.lyrics.trim()) {
      setShowSyncAlert(true);
    } else {
      performSyncLyrics();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fields.title.trim()) {
      toast.error("O título da música é obrigatório.");
      return;
    }

    const parsedTags = fields.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: SongInput = {
      title: fields.title.trim(),
      artist: fields.artist.trim() || null,
      tone: fields.tone.trim() || null,
      capo: fields.capo.trim() ? Number(fields.capo) : 0,
      bpm: fields.bpm ? Number(fields.bpm) : null,
      timeSignature: fields.timeSignature.trim() || null,
      lyrics: fields.lyrics.trim() || null,
      chords: fields.chords.trim() || null,
      youtubeUrl: fields.youtubeUrl.trim() || null,
      youtubeMusicUrl: fields.youtubeMusicUrl.trim() || null,
      spotifyUrl: fields.spotifyUrl.trim() || null,
      collection: fields.collection.trim() || null,
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

  return {
    isPending,
    handleFillSearchLinks,
    handleSyncLyricsClick,
    performSyncLyrics,
    handleSubmit,
  };
}

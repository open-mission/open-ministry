"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SongRecord } from "@/lib/songs";
import { DeleteSongDialog } from "./delete-song-dialog";
import { SongFormDialog } from "./song-form-dialog";

export function SongDetailHeaderActions({ song }: { song: SongRecord }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
          className="h-9 gap-1.5"
        >
          <PencilIcon className="size-3.5" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          className="h-9 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon className="size-3.5" />
          Excluir
        </Button>
      </div>

      <SongFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        songId={song.id}
        initialData={{
          title: song.title,
          artist: song.artist ?? "",
          tone: song.tone ?? "",
          bpm: song.bpm,
          timeSignature: song.timeSignature ?? "4/4",
          lyrics: song.lyrics ?? "",
          chords: song.chords ?? "",
          youtubeUrl: song.youtubeUrl ?? "",
          youtubeMusicUrl: song.youtubeMusicUrl ?? "",
          spotifyUrl: song.spotifyUrl ?? "",
          tags: song.tags ?? [],
        }}
      />

      <DeleteSongDialog
        open={deleteOpen}
        onOpenChange={(isOpen) => {
          setDeleteOpen(isOpen);
          if (!isOpen) {
            router.push("/dashboard/songs");
          }
        }}
        songId={song.id}
        songTitle={song.title}
      />
    </>
  );
}

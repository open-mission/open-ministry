"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreVerticalIcon,
  Music2Icon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SongRecord } from "@/lib/songs";
import { DeleteSongDialog } from "./delete-song-dialog";
import { SongFormDialog } from "./song-form-dialog";

export function SongDetailHeaderActions({
  song,
  canUpdate = true,
  canDelete = true,
}: {
  song: SongRecord;
  canUpdate?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!canUpdate && !canDelete) {
    return null;
  }

  return (
    <>
      {isMobile ? (
        <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-xl text-muted-foreground hover:text-foreground"
              aria-label="Opções da música"
              title="Opções da música"
            >
              <MoreVerticalIcon className="size-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[80dvh] rounded-t-[24px] p-0">
            <DrawerHeader className="border-b px-5 pt-4 pb-3 text-left">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Music2Icon className="size-4" />
                </span>
                <DrawerTitle className="font-heading text-base font-bold truncate">
                  {song.title}
                </DrawerTitle>
              </div>
              <DrawerDescription className="text-xs text-muted-foreground truncate">
                {song.artist || "Opções da música"}
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex flex-col gap-1 p-3">
              {canUpdate ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditOpen(true);
                  }}
                  className="h-11 justify-start gap-3 rounded-xl px-3 text-sm font-medium"
                >
                  <PencilIcon className="size-4 text-muted-foreground" />
                  <span>Editar música</span>
                </Button>
              ) : null}

              {canUpdate && canDelete ? (
                <div className="my-1 border-t border-border/60" />
              ) : null}

              {canDelete ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleteOpen(true);
                  }}
                  className="h-11 justify-start gap-3 rounded-xl px-3 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                  <span>Excluir música</span>
                </Button>
              ) : null}
            </div>

            <DrawerFooter className="border-t pt-2 pb-4">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">
                  Cancelar
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-xl text-muted-foreground hover:text-foreground"
              aria-label="Opções da música"
              title="Opções da música"
            >
              <MoreVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {canUpdate ? (
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <PencilIcon className="size-4 mr-2" />
                Editar música
              </DropdownMenuItem>
            ) : null}
            {canUpdate && canDelete ? <DropdownMenuSeparator /> : null}
            {canDelete ? (
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2Icon className="size-4 mr-2" />
                Excluir música
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

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
          collection: song.collection ?? "",
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

"use client";

import { useState } from "react";
import { FolderIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CollectionCombobox } from "@/features/songs/components/collection-combobox";
import { useUpdateSongMutation } from "@/features/songs/hooks/use-songs";
import { useIsMobile } from "@/hooks/use-mobile";

type SongTarget = {
  id: string;
  title: string;
  collection: string | null;
  tags?: string[];
};

export function SetSongGroupDialog({
  song,
  existingCollections = [],
  open,
  onOpenChange,
}: {
  song: SongTarget;
  existingCollections?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="p-0">
          <DrawerHeader className="border-b px-5 pt-4 pb-3 !text-left text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FolderIcon className="size-4" />
              </span>
              <DrawerTitle className="font-heading text-base font-bold truncate text-left">
                Definir grupo
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground truncate text-left">
              Organize &ldquo;{song.title}&rdquo; por grupo ou ministério
            </DrawerDescription>
          </DrawerHeader>

          {open ? (
            <SetSongGroupMobileForm
              song={song}
              existingCollections={existingCollections}
              onClose={() => onOpenChange(false)}
            />
          ) : null}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderIcon className="size-4" />
            </span>
            <DialogTitle className="font-heading text-xl tracking-tight">
              Definir grupo da música
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Organize &ldquo;{song.title}&rdquo; vinculando-a a um grupo do
            repertório.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <SetSongGroupDesktopForm
            song={song}
            existingCollections={existingCollections}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SetSongGroupMobileForm({
  song,
  existingCollections,
  onClose,
}: {
  song: SongTarget;
  existingCollections: string[];
  onClose: () => void;
}) {
  const [collection, setCollection] = useState(song.collection ?? "");
  const [isPending, setIsPending] = useState(false);
  const updateSong = useUpdateSongMutation();

  const handleSave = async () => {
    try {
      setIsPending(true);
      const cleanCollection = collection.trim() || null;
      await updateSong.mutateAsync({
        songId: song.id,
        data: {
          title: song.title,
          collection: cleanCollection,
          tags: song.tags ?? [],
        },
      });
      toast.success(
        cleanCollection
          ? `Música vinculada ao grupo "${cleanCollection}".`
          : "Grupo removido da música.",
      );
      onClose();
    } catch {
      toast.error("Não foi possível atualizar o grupo da música.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <div className="p-5">
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Grupo do repertório
            </label>
            <CollectionCombobox
              value={collection}
              onChange={setCollection}
              existingCollections={existingCollections}
              disabled={isPending}
            />
            <p className="text-[11px] text-muted-foreground">
              Ex: Louvor Jovem, Harpa Cristã, Ministério Infantil, Celebração
            </p>
          </div>
        </div>
      </div>

      <DrawerFooter className="border-t gap-2 px-5 pb-5 pt-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="w-full h-10 font-semibold"
        >
          {isPending ? "Salvando..." : "Salvar grupo"}
        </Button>
        <DrawerClose asChild>
          <Button variant="outline" className="w-full h-10">
            Cancelar
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </>
  );
}

function SetSongGroupDesktopForm({
  song,
  existingCollections,
  onClose,
}: {
  song: SongTarget;
  existingCollections: string[];
  onClose: () => void;
}) {
  const [collection, setCollection] = useState(song.collection ?? "");
  const [isPending, setIsPending] = useState(false);
  const updateSong = useUpdateSongMutation();

  const handleSave = async () => {
    try {
      setIsPending(true);
      const cleanCollection = collection.trim() || null;
      await updateSong.mutateAsync({
        songId: song.id,
        data: {
          title: song.title,
          collection: cleanCollection,
          tags: song.tags ?? [],
        },
      });
      toast.success(
        cleanCollection
          ? `Música vinculada ao grupo "${cleanCollection}".`
          : "Grupo removido da música.",
      );
      onClose();
    } catch {
      toast.error("Não foi possível atualizar o grupo da música.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Grupo do repertório
          </label>
          <CollectionCombobox
            value={collection}
            onChange={setCollection}
            existingCollections={existingCollections}
            disabled={isPending}
          />
          <p className="text-[11px] text-muted-foreground">
            Ex: Louvor Jovem, Harpa Cristã, Ministério Infantil, Celebração
          </p>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="font-semibold"
        >
          {isPending ? "Salvando..." : "Salvar grupo"}
        </Button>
      </DialogFooter>
    </>
  );
}

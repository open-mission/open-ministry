"use client";

import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { useDeleteSongMutation } from "@/hooks/use-songs";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type DeleteSongDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songId: string;
  songTitle: string;
  onSongDeleted?: (songId: string) => void;
};

export function DeleteSongDialog({
  open,
  onOpenChange,
  songId,
  songTitle,
  onSongDeleted,
}: DeleteSongDialogProps) {
  const deleteMutation = useDeleteSongMutation();
  const isPending = deleteMutation.isPending;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(songId);
      toast.success("Música removida do repertório.");
      onSongDeleted?.(songId);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao excluir música.";
      toast.error(message);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir &quot;{songTitle}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação removerá a música do repertório da igreja. Músicas já
            vinculadas a cronogramas passados permanecerão registradas no
            histórico.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleDelete}
            className="gap-1.5"
          >
            {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Excluir música
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

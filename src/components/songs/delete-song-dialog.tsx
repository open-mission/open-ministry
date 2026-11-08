"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { deleteSongAction } from "@/app/actions/songs";
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
};

export function DeleteSongDialog({
  open,
  onOpenChange,
  songId,
  songTitle,
}: DeleteSongDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("songId", songId);

      const result = await deleteSongAction(formData);

      if (!result.ok) {
        toast.error(result.error ?? "Erro ao excluir música.");
      } else {
        toast.success("Música removida do repertório.");
        onOpenChange(false);
        router.refresh();
      }
    });
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

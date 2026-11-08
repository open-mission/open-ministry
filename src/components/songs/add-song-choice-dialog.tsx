"use client";

import { useState } from "react";
import { GlobeIcon, Music2Icon, PenLineIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OnlineSearchDialog } from "./online-search-dialog";
import { SongFormDialog } from "./song-form-dialog";

type AddSongChoiceDialogProps = {
  trigger?: React.ReactNode;
};

export function AddSongChoiceDialog({ trigger }: AddSongChoiceDialogProps) {
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <>
      <Dialog open={choiceOpen} onOpenChange={setChoiceOpen}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button className="h-9 gap-1.5 shadow-xs">
              <PlusIcon className="size-4" />
              <span>Nova música</span>
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="gap-1.5 text-left">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Music2Icon className="size-4" />
              </span>
              <DialogTitle className="font-heading text-xl tracking-tight">
                Adicionar ao Repertório
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
              Como você deseja cadastrar esta música no acervo da igreja?
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setChoiceOpen(false);
                setOnlineOpen(true);
              }}
              className="group flex items-start gap-4 rounded-2xl border border-border/80 bg-card p-4 text-left shadow-xs transition-all hover:border-primary/50 hover:bg-muted/40 active:scale-[0.99]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <GlobeIcon className="size-5" />
              </span>
              <div className="space-y-1">
                <span className="text-sm font-semibold text-foreground group-hover:text-primary">
                  Buscar na internet (Vagalume / Letras)
                </span>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Pesquise pelo nome da música ou artista e preencha o título e a
                  letra automaticamente.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setChoiceOpen(false);
                setManualOpen(true);
              }}
              className="group flex items-start gap-4 rounded-2xl border border-border/80 bg-card p-4 text-left shadow-xs transition-all hover:border-primary/50 hover:bg-muted/40 active:scale-[0.99]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/40 text-accent-foreground transition-colors group-hover:bg-accent group-hover:text-foreground">
                <PenLineIcon className="size-5" />
              </span>
              <div className="space-y-1">
                <span className="text-sm font-semibold text-foreground group-hover:text-primary">
                  Cadastrar manualmente
                </span>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Preencha manualmente todos os campos: tom, BPM, cifra, letra e
                  links de streaming (YouTube/Spotify).
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <OnlineSearchDialog open={onlineOpen} onOpenChange={setOnlineOpen} />
      <SongFormDialog open={manualOpen} onOpenChange={setManualOpen} />
    </>
  );
}

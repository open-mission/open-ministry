"use client";

import { KeyboardIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

const STAGE_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["+"], label: "Sobe meio tom" },
  { keys: ["−"], label: "Desce meio tom" },
  { keys: ["0"], label: "Volta ao tom original" },
  { keys: ["F"], label: "Entra ou sai do modo palco" },
  { keys: ["T"], label: "Alterna seções, 2 colunas e contínua" },
  { keys: ["C"], label: "Copia a cifra" },
  { keys: ["↑", "↓"], label: "Aumenta ou diminui a fonte" },
  { keys: ["Esc"], label: "Sai do modo palco" },
  { keys: ["?"], label: "Abre esta ajuda" },
];

type ChordsHelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFullscreen: boolean;
};

export function ChordsHelpDialog({
  open,
  onOpenChange,
  isFullscreen,
}: ChordsHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-h-[85vh] overflow-y-auto sm:max-w-md",
          isFullscreen && "z-120",
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyboardIcon className="size-4" />
            </span>
            Atalhos do modo palco
          </DialogTitle>
          <DialogDescription id="stage-help-description">
            Durante o culto, use o teclado sem tirar os olhos da cifra. Os
            atalhos valem com o Modo Palco aberto.
          </DialogDescription>
        </DialogHeader>

        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/80">
          {STAGE_SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.label}
              className="flex items-center justify-between gap-3 bg-card px-3.5 py-2.5"
            >
              <span className="text-sm text-foreground">{shortcut.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key) => (
                  <Kbd key={key} className="min-w-6 px-1.5 py-0.5">
                    {key}
                  </Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Toque em “Modo Palco” para abrir em tela cheia. A tela permanece acesa
          enquanto ele estiver aberto.
        </p>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="min-h-11 sm:min-h-9">
              Fechar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

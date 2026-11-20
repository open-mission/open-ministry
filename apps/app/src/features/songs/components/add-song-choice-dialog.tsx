"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDownIcon,
  FileUpIcon,
  GlobeIcon,
  Music2Icon,
  PenLineIcon,
  PlusIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStableIsMobile } from "@/hooks/use-stable-is-mobile";
import type { ParsedCifraTxt } from "@/lib/music/chords-utils";
import type { SongRecord } from "@/lib/songs";
import { ImportSongDialog } from "./import-song-dialog";
import { OnlineSearchDialog } from "./online-search-dialog";
import { SongFormDialog } from "./song-form-dialog";

type AddSongChoiceDialogProps = {
  trigger?: React.ReactNode;
  existingCollections?: string[];
  onSongCreated?: (song: SongRecord) => void;
};

export function AddSongChoiceDialog({
  trigger,
  existingCollections = [],
  onSongCreated,
}: AddSongChoiceDialogProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const isMobile = useStableIsMobile(
    mobileSheetOpen || importOpen || onlineOpen || manualOpen,
  );
  const [manualFormKey, setManualFormKey] = useState(0);
  const [manualInitialData, setManualInitialData] = useState<
    | {
        title?: string;
        artist?: string;
        tone?: string;
        capo?: number | null;
        chords?: string;
        lyrics?: string;
        collection?: string | null;
      }
    | undefined
  >(undefined);
  const handoffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (handoffTimer.current !== null) clearTimeout(handoffTimer.current);
    };
  }, []);

  // Abre o próximo modal só depois que o anterior terminate de fechar, para
  // não sobrepor dois locks de pointer-events no mesmo tick.
  const scheduleAfterClose = (openNext: () => void) => {
    if (handoffTimer.current !== null) clearTimeout(handoffTimer.current);
    handoffTimer.current = setTimeout(() => {
      handoffTimer.current = null;
      openNext();
    }, 220);
  };

  // No mobile, fecha o Sheet primeiro e só abre o próximo modal depois da
  // animação de saída (200ms) do radix-ui.
  const openAfterSheetClose = (openNext: () => void) => {
    setMobileSheetOpen(false);
    scheduleAfterClose(openNext);
  };

  const handleOpenManual = () => {
    setManualInitialData(undefined);
    setManualFormKey((current) => current + 1);
    setManualOpen(true);
  };

  const handleImportReady = (
    data: ParsedCifraTxt & { collection?: string },
  ) => {
    setManualInitialData({
      title: data.title,
      artist: data.artist,
      tone: data.tone,
      capo: data.capo,
      chords: data.chords,
      lyrics: data.lyrics,
      collection: data.collection,
    });
    setManualFormKey((current) => current + 1);
    // handleConfirmImport chama onImportReady ANTES de fechar o diálogo;
    // esperar o fechamento evita dois diálogos disputando o lock do body.
    scheduleAfterClose(() => setManualOpen(true));
  };

  return (
    <>
      {isMobile ? (
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            {trigger ?? (
              <Button className="h-10 gap-1.5 font-semibold shadow-xs">
                <PlusIcon className="size-4" />
                <span>Adicionar</span>
              </Button>
            )}
          </SheetTrigger>

          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="flex max-h-[85dvh] flex-col gap-0 rounded-t-2xl p-0"
          >
            <SheetHeader className="border-b border-border/70 px-5 py-4 text-left">
              <SheetTitle className="flex items-center gap-2 text-base font-bold font-heading">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Music2Icon className="size-4" />
                </span>
                <span>Adicionar ao Repertório</span>
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Escolha como deseja adicionar uma música ao acervo da igreja.
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-2.5 overflow-y-auto p-4">
              {/* OPÇÃO 1: NOVA MÚSICA (MANUAL) */}
              <button
                type="button"
                onClick={() => openAfterSheetClose(handleOpenManual)}
                className="group flex items-start gap-3.5 rounded-2xl border border-border/80 bg-card p-4 text-left shadow-2xs transition-all hover:border-primary/50 hover:bg-muted/40 active:scale-[0.99]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <PenLineIcon className="size-5" />
                </span>
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-foreground group-hover:text-primary">
                    Nova Música
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Cadastre manualmente metadados, tom, BPM, cifra e letra.
                  </p>
                </div>
              </button>

              {/* OPÇÃO 2: IMPORTAR .TXT DO CIFRA CLUB */}
              <button
                type="button"
                onClick={() => openAfterSheetClose(() => setImportOpen(true))}
                className="group flex items-start gap-3.5 rounded-2xl border border-border/80 bg-card p-4 text-left shadow-2xs transition-all hover:border-primary/50 hover:bg-muted/40 active:scale-[0.99]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white dark:text-amber-400">
                  <FileUpIcon className="size-5" />
                </span>
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-foreground group-hover:text-primary">
                    Importar Música (.txt)
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Carregue o arquivo .txt baixado do Cifra Club com cifra e letra.
                  </p>
                </div>
              </button>

              {/* OPÇÃO 3: BUSCAR ONLINE */}
              <button
                type="button"
                onClick={() => openAfterSheetClose(() => setOnlineOpen(true))}
                className="group flex items-start gap-3.5 rounded-2xl border border-border/80 bg-card p-4 text-left shadow-2xs transition-all hover:border-primary/50 hover:bg-muted/40 active:scale-[0.99]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 transition-colors group-hover:bg-sky-600 group-hover:text-white dark:text-sky-400">
                  <GlobeIcon className="size-5" />
                </span>
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-foreground group-hover:text-primary">
                    Buscar na internet
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pesquise letras no Vagalume e no LRCLIB.
                  </p>
                </div>
              </button>
            </div>

            <SheetFooter className="mt-0 border-t border-border/70 bg-muted/20 px-4 py-3">
              <SheetClose asChild>
                <Button variant="outline" className="w-full">
                  Cancelar
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            {trigger ?? (
              <Button className="h-10 gap-1.5 font-semibold shadow-xs">
                <PlusIcon className="size-4" />
                <span>Adicionar</span>
                <ChevronDownIcon className="size-3.5 opacity-60" />
              </Button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-lg">
            <DropdownMenuItem
              onClick={handleOpenManual}
              className="gap-2.5 py-2 cursor-pointer font-medium"
            >
              <PenLineIcon className="size-4 text-primary" />
              <span>Nova Música</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setImportOpen(true)}
              className="gap-2.5 py-2 cursor-pointer font-medium"
            >
              <FileUpIcon className="size-4 text-amber-600 dark:text-amber-400" />
              <span>Importar Música (.txt)</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => setOnlineOpen(true)}
              className="gap-2.5 py-2 cursor-pointer font-medium"
            >
              <GlobeIcon className="size-4 text-sky-600 dark:text-sky-400" />
              <span>Buscar na internet</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* DIÁLOGO DE IMPORTAÇÃO DE CIFRA .TXT */}
      <ImportSongDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportReady={handleImportReady}
        existingCollections={existingCollections}
      />

      {/* BUSCA ONLINE */}
      <OnlineSearchDialog open={onlineOpen} onOpenChange={setOnlineOpen} />

      {/* FORMULÁRIO COMPLETO DA MÚSICA */}
      <SongFormDialog
        key={`${manualInitialData?.title ?? "new-song"}-${
          manualInitialData?.tone ?? ""
        }-${manualFormKey}`}
        open={manualOpen}
        onOpenChange={setManualOpen}
        initialData={manualInitialData}
        existingCollections={existingCollections}
        onSongCreated={onSongCreated}
      />
    </>
  );
}

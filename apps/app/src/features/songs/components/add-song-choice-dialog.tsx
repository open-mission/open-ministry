"use client";

import { useState } from "react";
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
  const isMobile = useIsMobile();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualInitialData, setManualInitialData] = useState<
    | {
        title?: string;
        artist?: string;
        tone?: string;
        chords?: string;
        lyrics?: string;
        collection?: string | null;
      }
    | undefined
  >(undefined);

  const handleOpenManual = () => {
    setManualInitialData(undefined);
    setManualOpen(true);
  };

  const handleImportReady = (
    data: ParsedCifraTxt & { collection?: string },
  ) => {
    setManualInitialData({
      title: data.title,
      artist: data.artist,
      tone: data.tone,
      chords: data.chords,
      lyrics: data.lyrics,
      collection: data.collection,
    });
    setManualOpen(true);
  };

  return (
    <>
      {isMobile ? (
        <Drawer
          open={mobileDrawerOpen}
          onOpenChange={setMobileDrawerOpen}
        >
          <DrawerTrigger asChild>
            {trigger ?? (
              <Button className="h-10 gap-1.5 font-semibold shadow-xs">
                <PlusIcon className="size-4" />
                <span>Adicionar</span>
              </Button>
            )}
          </DrawerTrigger>

          <DrawerContent className="max-h-[85dvh] flex flex-col p-0">
            <DrawerHeader className="border-b border-border/70 px-5 py-4 text-left">
              <DrawerTitle className="flex items-center gap-2 text-base font-bold font-heading">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Music2Icon className="size-4" />
                </span>
                <span>Adicionar ao Repertório</span>
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                Escolha como deseja adicionar uma música ao acervo da igreja.
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex flex-col gap-2.5 p-4">
              {/* OPÇÃO 1: NOVA MÚSICA (MANUAL) */}
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  handleOpenManual();
                }}
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
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setImportOpen(true);
                }}
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
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setOnlineOpen(true);
                }}
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
                    Pesquise letra e informações online no Vagalume/Letras.
                  </p>
                </div>
              </button>
            </div>

            <DrawerFooter className="border-t border-border/70 px-4 py-3 bg-muted/20">
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
        key={
          manualInitialData
            ? `${manualInitialData.title}-${manualInitialData.tone}`
            : "new-song"
        }
        open={manualOpen}
        onOpenChange={setManualOpen}
        initialData={manualInitialData}
        existingCollections={existingCollections}
        onSongCreated={onSongCreated}
      />
    </>
  );
}

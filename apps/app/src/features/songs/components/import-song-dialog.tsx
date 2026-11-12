"use client";

import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangleIcon,
  FileTextIcon,
  FileUpIcon,
  Music2Icon,
  SparklesIcon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { parseCifraClubTxt, type ParsedCifraTxt } from "@/lib/music/chords-utils";
import { cn } from "@/lib/utils";
import { CollectionCombobox } from "./collection-combobox";

type ImportSongDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportReady: (data: ParsedCifraTxt & { collection?: string }) => void;
  existingCollections?: string[];
};

export function ImportSongDialog({
  open,
  onOpenChange,
  onImportReady,
  existingCollections = [],
}: ImportSongDialogProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedCifraTxt | null>(null);
  const [collection, setCollection] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [tone, setTone] = useState("");
  const [capo, setCapo] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);

  const isDirty = Boolean(
    rawText.trim() ||
      parsed ||
      collection.trim() ||
      title.trim() ||
      artist.trim() ||
      tone.trim() ||
      capo,
  );

  const resetState = () => {
    setRawText("");
    setParsed(null);
    setCollection("");
    setTitle("");
    setArtist("");
    setTone("");
    setCapo("");
    setIsDragging(false);
    setShowDiscardAlert(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const applyParsedResult = (result: ParsedCifraTxt) => {
    setParsed(result);
    setTitle(result.title);
    setArtist(result.artist);
    setTone(result.tone);
    setCapo(result.capo > 0 ? String(result.capo) : "");
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".txt") && file.type && !file.type.includes("text")) {
      toast.error("Por favor, selecione um arquivo de texto (.txt).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content || !content.trim()) {
        toast.error("O arquivo selecionado está vazio.");
        return;
      }

      const result = parseCifraClubTxt(content, file.name);
      setRawText(content);
      applyParsedResult(result);
      toast.success("Arquivo .txt analisado com sucesso!");
    };
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo.");
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleAnalyzePastedText = () => {
    if (!rawText.trim()) {
      toast.error("Cole o texto da cifra no campo antes de continuar.");
      return;
    }

    const result = parseCifraClubTxt(rawText);
    applyParsedResult(result);
    toast.success("Cifra analisada com sucesso!");
  };

  const handleConfirmImport = () => {
    if (!parsed) return;

    if (!title.trim()) {
      toast.error("Informe o título da música.");
      return;
    }

    const parsedCapo = capo.trim() ? Number(capo) : 0;

    onImportReady({
      ...parsed,
      title: title.trim(),
      artist: artist.trim(),
      tone: tone.trim(),
      capo: Number.isInteger(parsedCapo)
        ? Math.min(12, Math.max(0, parsedCapo))
        : 0,
      collection: collection.trim() || undefined,
    });

    resetState();
    onOpenChange(false);
  };

  const handleRequestClose = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (isDirty) {
      setShowDiscardAlert(true);
      return;
    }
    resetState();
    onOpenChange(false);
  };

  const handleDiscard = () => {
    resetState();
    onOpenChange(false);
  };

  const content = (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-card/60 px-4 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileUpIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-base font-bold text-foreground sm:text-lg">
              Importar Música (.txt)
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              Carregue um arquivo .txt do Cifra Club ou cole o texto com cifra e
              letra.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => handleRequestClose(false)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Fechar importação"
          title="Fechar"
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      {/* BODY SCROLLÁVEL */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
        {!parsed ? (
          <>
            {/* ÁREA DE DRAG & DROP / FILE PICKER */}
            <label
              htmlFor={fileInputId}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node)) {
                  return;
                }
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={cn(
                "group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 focus-within:ring-2 focus-within:ring-ring",
                isDragging &&
                  "border-primary bg-primary/10 ring-2 ring-primary/40",
              )}
            >
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept=".txt,text/plain"
                onChange={handleFileChange}
                className="sr-only"
              />
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                <UploadCloudIcon className="size-6" />
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {isDragging
                  ? "Solte o arquivo .txt aqui"
                  : "Arraste um arquivo .txt ou clique para selecionar"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Arquivo exportado do Cifra Club ou bloco de notas
              </p>
            </label>

            {/* OU COLAR TEXTO */}
            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/70" />
              </div>
              <span className="relative bg-background px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Ou cole o texto aqui
              </span>
            </div>

            <div className="space-y-2">
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Cole aqui o texto completo com título, tom, acordes e letra..."
                className="h-44 resize-y font-mono text-xs sm:text-sm"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAnalyzePastedText}
                  disabled={!rawText.trim()}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <SparklesIcon className="size-3.5" />
                  <span>Analisar texto colado</span>
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* PREVIEW DOS DADOS EXTRAÍDOS */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground">
              <span className="flex items-center gap-2 font-medium">
                <SparklesIcon className="size-4 text-primary" />
                <span>Dados extraídos automaticamente com sucesso!</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  setParsed(null);
                  setRawText("");
                  setTitle("");
                  setArtist("");
                  setTone("");
                  setCapo("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Trocar arquivo
              </Button>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="import-title">
                  Título da música <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="import-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: A Casa É Sua"
                  required
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="import-artist">Artista / Ministério</Label>
                <Input
                  id="import-artist"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Ex: Casa Worship"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="import-tone">Tom detectado</Label>
                <Input
                  id="import-tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="Ex: D, E, G#m"
                  className="h-10 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="import-capo">Capotraste detectado</Label>
                <NativeSelect
                  id="import-capo"
                  value={capo}
                  onChange={(e) => setCapo(e.target.value)}
                  className="h-10"
                >
                  <option value="">Sem capotraste</option>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map(
                    (position) => (
                      <option key={position} value={String(position)}>
                        Capo {position}ª casa
                      </option>
                    ),
                  )}
                </NativeSelect>
              </div>

              {/* GRUPO */}
              <div className="space-y-1.5">
                <Label>Grupo (opcional)</Label>
                <CollectionCombobox
                  value={collection}
                  onChange={setCollection}
                  existingCollections={existingCollections}
                />
                <p className="text-[11px] text-muted-foreground">
                  Vincule a um grupo existente (ex: Harpa Cristã, Jovens) ou
                  crie um novo.
                </p>
              </div>
            </div>

            {/* RESUMO DOS DADOS */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 text-xs space-y-1 text-muted-foreground">
              <p className="flex items-center gap-1.5 text-foreground font-medium">
                <FileTextIcon className="size-3.5 text-primary" />
                <span>Resumo da importação:</span>
              </p>
              <p>• Cifra identificada com acordes e tablaturas.</p>
              <p>• Versos cantados extraídos automaticamente para a letra.</p>
              {capo ? (
                <p>
                  • Capotraste na {capo}ª casa — o tom exibido é o som real.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER FIXO */}
      <div className="flex shrink-0 items-center justify-between border-t border-border/70 bg-card/95 px-4 py-3 sm:px-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleRequestClose(false)}
        >
          Cancelar
        </Button>

        {parsed ? (
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmImport}
            className="gap-1.5 font-semibold"
          >
            <Music2Icon className="size-3.5" />
            <span>Continuar para Edição Completa</span>
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={open} onOpenChange={handleRequestClose}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="flex h-[92dvh] max-h-[92dvh] min-h-0 w-full flex-col overflow-hidden rounded-none border-0 bg-background p-0"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Importar Música</SheetTitle>
              <SheetDescription>
                Carregar arquivo .txt com cifra e letra.
              </SheetDescription>
            </SheetHeader>
            {content}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={handleRequestClose}>
          <DialogContent
            showCloseButton={false}
            className="flex max-h-[90vh] sm:max-w-xl flex-col gap-0 overflow-hidden rounded-2xl p-0"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Importar Música</DialogTitle>
              <DialogDescription>
                Carregar arquivo .txt com cifra e letra.
              </DialogDescription>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <AlertTriangleIcon className="size-5" />
            </div>
            <AlertDialogTitle className="font-heading text-lg font-bold">
              Descartar importação?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground sm:text-sm">
              O texto analisado e os campos preenchidos serão perdidos se você
              fechar agora.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => setShowDiscardAlert(false)}>
              Continuar importando
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={handleDiscard}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Descartar importação
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

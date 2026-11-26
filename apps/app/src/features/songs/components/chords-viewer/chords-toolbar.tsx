"use client";

import {
  CheckIcon,
  Columns2Icon,
  CopyIcon,
  KeyboardIcon,
  LayoutGridIcon,
  ListIcon,
  Maximize2Icon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { ChordsViewerControlVisibility } from "@/features/songs/lib/chords-viewer-controls";
import {
  VIEWER_FONT_SIZE_LABELS,
  VIEWER_FONT_SIZES,
  type ViewerFontSize,
} from "@/lib/music/viewer-preferences";
import { cn } from "@/lib/utils";
import type { AutoScrollSpeed } from "../viewer/use-auto-scroll";

export type ChordsViewMode = "sections" | "columns" | "continuous";

type ChordsToolbarProps = {
  originalTone?: string | null;
  currentTone: string | null;
  safeCapo: number;
  shapeTone: string | null;
  semitones: number;
  toneOptions: string[];
  onStepSemitones: (delta: number) => void;
  onResetTone: () => void;
  onTargetToneChange: (target: string) => void;
  fontSize: ViewerFontSize;
  onMoveFontSize: (direction: 1 | -1) => void;
  viewMode: ChordsViewMode;
  onViewModeChange: (mode: ChordsViewMode) => void;
  autoScrollActive: boolean;
  autoScrollSpeed: AutoScrollSpeed;
  onToggleAutoScroll: () => void;
  onCycleAutoScrollSpeed: () => void;
  copied: boolean;
  onCopy: () => void;
  onOpenHelp: () => void;
  onToggleFullscreen: () => void;
  controlVisibility: ChordsViewerControlVisibility;
};

function CompactButton({
  label,
  active,
  disabled,
  onClick,
  children,
  className,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={typeof active === "boolean" ? active : undefined}
      title={label}
      className={cn(
        "flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40 sm:size-8",
        active && "bg-background font-semibold text-foreground shadow-2xs",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ChordsToolbar({
  originalTone,
  currentTone,
  safeCapo,
  shapeTone,
  semitones,
  toneOptions,
  onStepSemitones,
  onResetTone,
  onTargetToneChange,
  fontSize,
  onMoveFontSize,
  viewMode,
  onViewModeChange,
  autoScrollActive,
  autoScrollSpeed,
  onToggleAutoScroll,
  onCycleAutoScrollSpeed,
  copied,
  onCopy,
  onOpenHelp,
  onToggleFullscreen,
  controlVisibility,
}: ChordsToolbarProps) {
  const fontIndex = VIEWER_FONT_SIZES.indexOf(fontSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {/* CONTROLE UNIFICADO DE TOM */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div
          className="inline-flex min-h-11 items-center rounded-lg border border-border/80 bg-background p-0.5 shadow-2xs sm:min-h-9"
          role="group"
          aria-label="Transposição de tom"
        >
          <CompactButton
            label="Diminuir meio tom"
            onClick={() => onStepSemitones(-1)}
          >
            <MinusIcon className="size-4" />
          </CompactButton>

          <div className="relative flex items-center px-1">
            <label className="sr-only" htmlFor="chords-viewer-target-tone">
              Tom alvo
            </label>
            {originalTone ? (
              <NativeSelect
                id="chords-viewer-target-tone"
                value={currentTone ?? ""}
                onChange={(event) => onTargetToneChange(event.target.value)}
                title="Selecionar tom alvo"
                aria-label="Selecionar tom alvo"
                className="border-0 bg-transparent shadow-none [&_select]:h-9 [&_select]:border-0 [&_select]:bg-transparent [&_select]:pl-1.5 [&_select]:pr-6 [&_select]:text-xs [&_select]:font-semibold [&_select]:shadow-none [&_select]:focus-visible:ring-0 sm:[&_select]:h-8"
              >
                {toneOptions.map((tone) => (
                  <option key={tone} value={tone}>
                    Tom {tone}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <span className="px-2 text-xs font-semibold text-foreground">
                Tom —
              </span>
            )}
          </div>

          <CompactButton
            label="Aumentar meio tom"
            onClick={() => onStepSemitones(1)}
          >
            <PlusIcon className="size-4" />
          </CompactButton>
        </div>

        {semitones !== 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetTone}
            aria-label="Restaurar tom original"
            title="Restaurar tom original (0)"
            className="min-h-11 gap-1 px-2 text-xs font-semibold text-primary hover:bg-primary/10 sm:min-h-9"
          >
            <RotateCcwIcon className="size-3.5" />
            <span>{semitones > 0 ? `+${semitones}` : semitones}</span>
          </Button>
        ) : null}

        {safeCapo > 0 ? (
          <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            Capo {safeCapo}
            {shapeTone ? ` · forma ${shapeTone}` : ""}
          </span>
        ) : null}
      </div>

      {/* FONTE, COLUNAS, AUTO-SCROLL E MODO PALCO */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div
          className="inline-flex min-h-11 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 shadow-2xs sm:min-h-9"
          role="group"
          aria-label="Tamanho da fonte"
        >
          <CompactButton
            label="Diminuir tamanho da fonte"
            disabled={fontIndex === 0}
            onClick={() => onMoveFontSize(-1)}
          >
            <span className="text-[11px] font-semibold">A−</span>
          </CompactButton>
          <span
            aria-live="polite"
            className="sr-only"
          >
            Tamanho da fonte: {VIEWER_FONT_SIZE_LABELS[fontSize]}
          </span>
          <CompactButton
            label="Aumentar tamanho da fonte"
            disabled={fontIndex === VIEWER_FONT_SIZES.length - 1}
            onClick={() => onMoveFontSize(1)}
          >
            <span className="text-[11px] font-semibold">A+</span>
          </CompactButton>
        </div>

        <div
          className="hidden min-h-9 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 shadow-2xs md:inline-flex"
          role="group"
          aria-label="Modo de visualização"
        >
          <CompactButton
            label="Visualização em seções"
            active={viewMode === "sections"}
            onClick={() => onViewModeChange("sections")}
          >
            <LayoutGridIcon className="size-3.5" />
          </CompactButton>
          <CompactButton
            label="Visualização em 2 colunas"
            active={viewMode === "columns"}
            onClick={() => onViewModeChange("columns")}
          >
            <Columns2Icon className="size-3.5" />
          </CompactButton>
          <CompactButton
            label="Visualização contínua"
            active={viewMode === "continuous"}
            onClick={() => onViewModeChange("continuous")}
          >
            <ListIcon className="size-3.5" />
          </CompactButton>
        </div>

        <div className="inline-flex items-center gap-1">
          <Button
            type="button"
            variant={autoScrollActive ? "secondary" : "outline"}
            size="sm"
            onClick={onToggleAutoScroll}
            aria-pressed={autoScrollActive}
            aria-label={
              autoScrollActive
                ? "Pausar rolagem automática"
                : "Iniciar rolagem automática"
            }
            title="Rolagem automática"
            className="min-h-11 gap-1.5 px-2.5 text-xs font-medium shadow-2xs sm:min-h-9"
          >
            {autoScrollActive ? (
              <PauseIcon className="size-3.5 text-primary" />
            ) : (
              <PlayIcon className="size-3.5" />
            )}
            <span className="hidden sm:inline">Auto-scroll</span>
          </Button>

          {autoScrollActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCycleAutoScrollSpeed}
              aria-label={`Velocidade da rolagem: ${autoScrollSpeed}x`}
              title="Alterar velocidade da rolagem"
              className="min-h-11 px-2 font-mono text-[11px] font-semibold text-primary sm:min-h-9"
            >
              {autoScrollSpeed}×
            </Button>
          ) : null}
        </div>

        {controlVisibility.copy ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCopy}
            className="min-h-11 gap-1.5 px-2.5 text-xs font-medium shadow-2xs sm:min-h-9"
            aria-label={copied ? "Cifra copiada" : "Copiar cifra"}
            title="Copiar cifra (C)"
          >
            {copied ? (
              <CheckIcon className="size-3.5 text-emerald-700 dark:text-emerald-300" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            <span className="hidden xl:inline">
              {copied ? "Copiado!" : "Copiar"}
            </span>
          </Button>
        ) : null}

        {controlVisibility.help ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenHelp}
            className="hidden size-9 shrink-0 px-0 text-muted-foreground hover:text-foreground sm:inline-flex"
            aria-label="Ver atalhos do modo palco"
            title="Atalhos do modo palco (?)"
          >
            <KeyboardIcon className="size-4" />
          </Button>
        ) : null}

        {controlVisibility.fullscreen ? (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onToggleFullscreen}
            className="min-h-11 gap-1.5 px-3 text-xs font-semibold shadow-2xs sm:min-h-9"
            aria-label="Abrir modo palco em tela cheia"
            title="Modo palco (F)"
          >
            <Maximize2Icon className="size-3.5" />
            <span>Modo Palco</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

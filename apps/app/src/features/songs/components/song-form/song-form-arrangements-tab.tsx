"use client";

import { Loader2Icon, SaveIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { parseSongSections } from "@/lib/music/chords-utils";

type ParsedSongSection = ReturnType<typeof parseSongSections>[number];
import { DepartmentArrangementPicker } from "../department-arrangement-picker";

type ArrangementDepartmentOption = {
  id: string;
  name: string;
};

type ArrangementFunction = {
  id: string;
  name: string;
};

type SongFormArrangementsTabProps = {
  songId?: string;
  canUpdate: boolean;
  isLoading: boolean;
  error: string | null;
  savingKey: string | null;
  departmentOptions: ArrangementDepartmentOption[];
  selectedDepartmentId: string;
  arrangementSections: ParsedSongSection[];
  orphanNoteKeys: string[];
  effectiveNotes: Record<string, string>;
  arrangementFunctions: ArrangementFunction[];
  formationDraft: string[];
  onDepartmentChange: (departmentId: string) => void;
  onNoteEdit: (key: string, value: string) => void;
  onSaveNotes: () => void;
  onToggleFormationFunction: (functionId: string) => void;
  onSaveFormation: () => void;
};

export function SongFormArrangementsTab({
  songId,
  canUpdate,
  isLoading,
  error,
  savingKey,
  departmentOptions,
  selectedDepartmentId,
  arrangementSections,
  orphanNoteKeys,
  effectiveNotes,
  arrangementFunctions,
  formationDraft,
  onDepartmentChange,
  onNoteEdit,
  onSaveNotes,
  onToggleFormationFunction,
  onSaveFormation,
}: SongFormArrangementsTabProps) {
  if (!songId) {
    return (
      <p className="text-xs text-muted-foreground sm:text-sm">
        Salve a música primeiro para registrar notas por seção e a formação da
        banda.
      </p>
    );
  }
  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
        <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
        Carregando notas e formação...
      </p>
    );
  }
  if (error) {
    return (
      <p className="text-xs text-destructive sm:text-sm" role="alert">
        {error}
      </p>
    );
  }
  if (departmentOptions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground sm:text-sm">
        Nenhum departamento com o módulo de música está disponível para você.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5 sm:max-w-xs">
        <Label htmlFor="arrangement-department">Departamento</Label>
        <DepartmentArrangementPicker
          id="arrangement-department"
          departments={departmentOptions}
          value={selectedDepartmentId}
          onChange={onDepartmentChange}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Notas e formação são específicas de cada departamento.
        </p>
      </div>

      {canUpdate ? (
        <>
          <section className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Notas por seção
              </h3>
              <Button
                type="button"
                size="sm"
                onClick={onSaveNotes}
                disabled={savingKey !== null}
                className="min-h-9 gap-1.5 text-xs"
              >
                {savingKey?.startsWith("notes:") ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <SaveIcon className="size-3.5" />
                )}
                Salvar notas
              </Button>
            </div>

            {arrangementSections.length === 0 && orphanNoteKeys.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Adicione a cifra ou a letra para detectar as seções da música.
              </p>
            ) : null}

            <div className="space-y-3">
              {arrangementSections.map((section) => (
                <div key={section.key} className="space-y-1.5">
                  <Label
                    htmlFor={`section-note-${section.key}`}
                    className="text-xs font-medium"
                  >
                    {section.name}
                  </Label>
                  <Textarea
                    id={`section-note-${section.key}`}
                    data-section-key={section.key}
                    value={effectiveNotes[section.key] ?? ""}
                    onChange={(event) =>
                      onNoteEdit(section.key, event.target.value)
                    }
                    placeholder="Ex.: só guitarra e violão, entrar em 2..."
                    className="min-h-16 resize-y text-xs sm:text-sm"
                  />
                </div>
              ))}

              {orphanNoteKeys.map((key) => (
                <div key={key} className="space-y-1.5">
                  <Label
                    htmlFor={`section-note-${key}`}
                    className="flex items-center gap-1.5 text-xs font-medium"
                  >
                    <Badge
                      variant="outline"
                      className="text-[11px] font-medium"
                    >
                      Sem seção
                    </Badge>
                    <span className="text-muted-foreground">{key}</span>
                  </Label>
                  <Textarea
                    id={`section-note-${key}`}
                    data-section-key={key}
                    value={effectiveNotes[key] ?? ""}
                    onChange={(event) => onNoteEdit(key, event.target.value)}
                    placeholder="Nota de uma seção que não existe mais na cifra."
                    className="min-h-16 resize-y text-xs sm:text-sm"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Formação da banda
              </h3>
              <Button
                type="button"
                size="sm"
                onClick={onSaveFormation}
                disabled={savingKey !== null}
                className="min-h-9 gap-1.5 text-xs"
              >
                {savingKey?.startsWith("formation:") ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <SaveIcon className="size-3.5" />
                )}
                Salvar formação
              </Button>
            </div>

            {arrangementFunctions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Este departamento ainda não tem funções cadastradas.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {arrangementFunctions.map((fn) => (
                  <label
                    key={fn.id}
                    htmlFor={`formation-${fn.id}`}
                    className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border/70 bg-card px-3 text-sm text-foreground"
                  >
                    <Checkbox
                      id={`formation-${fn.id}`}
                      checked={formationDraft.includes(fn.id)}
                      onCheckedChange={() => onToggleFormationFunction(fn.id)}
                    />
                    <span>{fn.name}</span>
                  </label>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="space-y-4">
          <section className="space-y-2">
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Notas por seção
            </h3>
            {Object.entries(effectiveNotes).filter(
              ([, note]) => note.trim().length > 0,
            ).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma nota registrada para este departamento.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {Object.entries(effectiveNotes)
                  .filter(([, note]) => note.trim().length > 0)
                  .map(([key, note]) => (
                    <li
                      key={key}
                      className="border-l-2 border-primary/30 pl-2 text-xs text-muted-foreground"
                    >
                      <span className="font-medium text-foreground">
                        {arrangementSections.find(
                          (section) => section.key === key,
                        )?.name ?? key}
                        :
                      </span>{" "}
                      <span className="whitespace-pre-line">{note}</span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Formação da banda
            </h3>
            <p className="text-xs text-muted-foreground">
              {formationDraft.length === 0
                ? "Nenhuma função definida para este departamento."
                : arrangementFunctions
                    .filter((fn) => formationDraft.includes(fn.id))
                    .map((fn) => fn.name)
                    .join(", ")}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

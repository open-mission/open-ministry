"use client";

import { useMemo, useState } from "react";
import {
  ClipboardListIcon,
  ExternalLinkIcon,
  FileMusicIcon,
  GuitarIcon,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSongsQuery } from "@/hooks/use-songs";
import { useStableIsMobile } from "@/hooks/use-stable-is-mobile";
import { parseSongSections } from "@/lib/music/chords-utils";
import { useSongArrangements } from "../hooks/use-song-arrangements";

import { SongFormArrangementsTab } from "./song-form/song-form-arrangements-tab";
import { SongFormConfirmations } from "./song-form/song-form-confirmations";
import { SongFormDetailsTab } from "./song-form/song-form-details-tab";
import { SongFormLinksTab } from "./song-form/song-form-links-tab";
import { SongFormMusicTab } from "./song-form/song-form-music-tab";
import { SongFormShell } from "./song-form/song-form-shell";
import type { SongFormDialogProps } from "./song-form/song-form.types";
import { useSongFormState } from "./song-form/use-song-form-state";
import { useSongFormActions } from "./song-form/use-song-form-submit";

export function SongFormDialog({
  open,
  onOpenChange,
  songId,
  initialData,
  existingCollections = [],
  onSongCreated,
  onSongUpdated,
  initialTab = "dados",
  initialDepartmentId,
  canUpdate = false,
}: SongFormDialogProps) {
  const isEditing = Boolean(songId);
  const isMobile = useStableIsMobile(open);
  const { data: songsData } = useSongsQuery();

  const initialCollection = initialData?.collection;
  const availableCollections = useMemo(() => {
    const set = new Set<string>();
    for (const c of existingCollections) {
      if (c?.trim()) set.add(c.trim());
    }
    if (songsData?.collections) {
      for (const c of songsData.collections) {
        if (c?.trim()) set.add(c.trim());
      }
    }
    if (songsData?.songs) {
      for (const s of songsData.songs) {
        if (s.collection?.trim()) set.add(s.collection.trim());
      }
    }
    if (initialCollection?.trim()) {
      set.add(initialCollection.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [existingCollections, songsData, initialCollection]);

  // Aba controlada: volta para `initialTab` sempre que o formulário reabre.
  const [activeTab, setActiveTab] = useState(initialTab);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setActiveTab(initialTab);
  }

  const form = useSongFormState(initialData);

  // Sincroniza os campos quando initialData mudar
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    form.syncInitialData(initialData);
  }

  // Notas por seção e formação da banda (por departamento)
  const {
    departments: arrangementDepartments,
    isLoading: arrangementsLoading,
    error: arrangementsError,
    savingKey: arrangementsSavingKey,
    setNotes: saveNotes,
    setFormation: saveFormation,
  } = useSongArrangements(songId);

  const selectedDepartment = useMemo(
    () =>
      arrangementDepartments.find(
        (department) => department.departmentId === form.selectedDepartmentId,
      ) ??
      arrangementDepartments.find(
        (department) => department.departmentId === initialDepartmentId,
      ) ??
      arrangementDepartments[0] ??
      null,
    [arrangementDepartments, initialDepartmentId, form.selectedDepartmentId],
  );

  const effectiveNotes = useMemo(
    () => ({ ...(selectedDepartment?.notes ?? {}), ...form.notesEdits }),
    [selectedDepartment, form.notesEdits],
  );

  const formationDraft =
    form.formationEdits ?? selectedDepartment?.selectedFunctionIds ?? [];

  const arrangementSections = useMemo(() => {
    const merged = [
      ...parseSongSections(form.fields.chords),
      ...parseSongSections(form.fields.lyrics),
    ];
    const seen = new Set<string>();

    return merged.filter((section) => {
      if (seen.has(section.key)) return false;
      seen.add(section.key);
      return true;
    });
  }, [form.fields.chords, form.fields.lyrics]);

  const arrangementSectionKeys = useMemo(
    () => new Set(arrangementSections.map((section) => section.key)),
    [arrangementSections],
  );

  const orphanNoteKeys = useMemo(
    () =>
      Object.keys(effectiveNotes).filter(
        (key) =>
          !arrangementSectionKeys.has(key) &&
          (effectiveNotes[key] ?? "").trim(),
      ),
    [arrangementSectionKeys, effectiveNotes],
  );

  const arrangementFunctions = selectedDepartment?.functions ?? [];

  const handleSaveNotes = async () => {
    if (!selectedDepartment) return;
    const saved = await saveNotes(
      selectedDepartment.departmentId,
      effectiveNotes,
    );
    if (saved) form.clearNotesEdits();
  };

  const handleSaveFormation = async () => {
    if (!selectedDepartment) return;
    const saved = await saveFormation(
      selectedDepartment.departmentId,
      formationDraft,
    );
    if (saved) form.setFormationEdits(null);
  };

  const toggleFormationFunction = (functionId: string) => {
    form.setFormationEdits(
      formationDraft.includes(functionId)
        ? formationDraft.filter((id) => id !== functionId)
        : [...formationDraft, functionId],
    );
  };

  const arrangementDepartmentOptions = arrangementDepartments.map(
    (department) => ({
      id: department.departmentId,
      name: department.departmentName,
    }),
  );

  const {
    isPending,
    handleFillSearchLinks,
    handleSyncLyricsClick,
    performSyncLyrics,
    handleSubmit,
  } = useSongFormActions({
    songId,
    isEditing,
    fields: form.fields,
    setField: form.setField,
    setShowSyncAlert: form.setShowSyncAlert,
    setIsMaximized: form.setIsMaximized,
    onOpenChange,
    onSongCreated,
    onSongUpdated,
  });

  const handleRequestClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (form.isDirty) {
        form.setShowDiscardAlert(true);
      } else {
        form.resetArrangementEdits();
        form.setIsMaximized(false);
        onOpenChange(false);
      }
    } else {
      onOpenChange(true);
    }
  };

  const handleDiscardChanges = () => {
    form.discardChanges(initialData);
    onOpenChange(false);
  };

  return (
    <>
      <SongFormShell
        open={open}
        isMobile={isMobile}
        isEditing={isEditing}
        isMaximized={form.isMaximized}
        isDirty={form.isDirty}
        isPending={isPending}
        onRequestClose={handleRequestClose}
        onShowDiscardAlert={() => form.setShowDiscardAlert(true)}
        onToggleMaximized={form.toggleMaximized}
        onSubmit={handleSubmit}
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-1 min-h-0 flex-col overflow-hidden"
        >
          {/* TABS LIST FIXO NO TOPO COM SUPORTE A ROLAGEM HORIZONTAL NO MOBILE */}
          <div className="shrink-0 border-b border-border/70 bg-muted/20 px-3 py-2 sm:px-6">
            <div className="w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="inline-flex h-9.5 w-max min-w-full items-center justify-start gap-1 rounded-lg bg-muted/80 p-1 sm:grid sm:h-10 sm:w-full sm:grid-cols-4">
                <TabsTrigger
                  value="dados"
                  className="shrink-0 gap-1.5 px-3 py-1.5 text-xs font-medium sm:text-sm"
                >
                  <GuitarIcon className="size-3.5" />
                  <span>Dados Gerais</span>
                </TabsTrigger>
                <TabsTrigger
                  value="cifra-letra"
                  className="shrink-0 gap-1.5 px-3 py-1.5 text-xs font-medium sm:text-sm"
                >
                  <FileMusicIcon className="size-3.5" />
                  <span>Cifra & Letra</span>
                </TabsTrigger>
                <TabsTrigger
                  value="links"
                  className="shrink-0 gap-1.5 px-3 py-1.5 text-xs font-medium sm:text-sm"
                >
                  <ExternalLinkIcon className="size-3.5" />
                  <span>Plataformas & Links</span>
                </TabsTrigger>
                <TabsTrigger
                  value="notas-banda"
                  className="shrink-0 gap-1.5 px-3 py-1.5 text-xs font-medium sm:text-sm"
                >
                  <ClipboardListIcon className="size-3.5" />
                  <span>Notas &amp; Banda</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* ABA 1: DADOS GERAIS */}
          <TabsContent
            value="dados"
            className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 data-[state=inactive]:hidden"
          >
            <SongFormDetailsTab
              fields={form.fields}
              availableCollections={availableCollections}
              onFieldChange={form.setField}
            />
          </TabsContent>

          {/* ABA 2: CIFRA & LETRA */}
          <TabsContent
            value="cifra-letra"
            className="mt-0 flex flex-1 min-h-0 flex-col overflow-hidden p-3 sm:p-5 data-[state=inactive]:hidden"
          >
            <SongFormMusicTab
              chords={form.fields.chords}
              lyrics={form.fields.lyrics}
              mobileMusicTab={form.mobileMusicTab}
              onMobileMusicTabChange={form.setMobileMusicTab}
              onFieldChange={form.setField}
              onSyncLyricsClick={handleSyncLyricsClick}
            />
          </TabsContent>

          {/* ABA 3: PLATAFORMAS & LINKS */}
          <TabsContent
            value="links"
            className="mt-0 flex-1 min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6 data-[state=inactive]:hidden"
          >
            <SongFormLinksTab
              youtubeUrl={form.fields.youtubeUrl}
              youtubeMusicUrl={form.fields.youtubeMusicUrl}
              spotifyUrl={form.fields.spotifyUrl}
              onFieldChange={form.setField}
              onFillSearchLinks={handleFillSearchLinks}
            />
          </TabsContent>

          {/* ABA 4: NOTAS POR SEÇÃO & FORMAÇÃO DA BANDA */}
          <TabsContent
            value="notas-banda"
            className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 data-[state=inactive]:hidden"
          >
            <SongFormArrangementsTab
              songId={songId}
              canUpdate={canUpdate}
              isLoading={arrangementsLoading}
              error={arrangementsError}
              savingKey={arrangementsSavingKey}
              departmentOptions={arrangementDepartmentOptions}
              selectedDepartmentId={selectedDepartment?.departmentId ?? ""}
              arrangementSections={arrangementSections}
              orphanNoteKeys={orphanNoteKeys}
              effectiveNotes={effectiveNotes}
              arrangementFunctions={arrangementFunctions}
              formationDraft={formationDraft}
              onDepartmentChange={form.selectDepartment}
              onNoteEdit={form.setNoteEdit}
              onSaveNotes={handleSaveNotes}
              onToggleFormationFunction={toggleFormationFunction}
              onSaveFormation={handleSaveFormation}
            />
          </TabsContent>
        </Tabs>
      </SongFormShell>

      <SongFormConfirmations
        showDiscardAlert={form.showDiscardAlert}
        onShowDiscardAlertChange={form.setShowDiscardAlert}
        onDiscardChanges={handleDiscardChanges}
        showSyncAlert={form.showSyncAlert}
        onShowSyncAlertChange={form.setShowSyncAlert}
        onConfirmSyncLyrics={performSyncLyrics}
      />
    </>
  );
}

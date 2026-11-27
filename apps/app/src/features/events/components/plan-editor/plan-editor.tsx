"use client";

import { ListOrderedIcon, PlusIcon, SparklesIcon, UploadIcon } from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SongQuickDrawer } from "@/components/songs/song-quick-drawer";
import { PlanItemDialog } from "../plan-item-dialog";
import {
  ClearPlanDialog,
  ImportPlanDialog,
  ManagePlanTemplatesDialog,
  SavePlanDialog,
} from "../plan-template-dialogs";

import { PlanDiscardConfirmation } from "./plan-discard-confirmation";
import { PlanEditorDrawer } from "./plan-editor-drawer";
import { PlanEditorHeader } from "./plan-editor-header";
import { SortableSectionRow } from "./plan-header-row";
import { SortableItemRow } from "./plan-item-row";
import { PlanReadView } from "./plan-read-view";
import type { PlanEditorProps } from "./plan-editor.types";
import { usePlanEditor } from "./use-plan-editor";

export function PlanEditor(props: PlanEditorProps) {
  const controller = usePlanEditor(props);

  const {
    eventId,
    people,
    songs,
    canManage,
    isMobile,
    isPending,
    computedItems,
    totalPlanSeconds,
    sensors,
    handleItemSaved,
    editingItem,
    editDialogOpen,
    handleEditDialogOpenChange,
    deletingId,
    handleOpenSong,
    handleDragEnd,
    handleMove,
    openEditDialog,
    handleDelete,
    showDiscardAlert,
    setShowDiscardAlert,
    handleSaveDrawer,
    handleDiscardChanges,
    selectedSongForDrawer,
    quickDrawerOpen,
    setQuickDrawerOpen,
    saveDialogOpen,
    setSaveDialogOpen,
    manageTemplatesOpen,
    setManageTemplatesOpen,
    clearDialogOpen,
    setClearDialogOpen,
    importDialogOpen,
    setImportDialogOpen,
  } = controller;

  return (
    <div className="space-y-6">
      {/* Header bar and action controls */}
      <PlanEditorHeader controller={controller} />

      {/* Main List */}
      {computedItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
              <ListOrderedIcon className="size-6" />
            </div>
            <p className="font-heading text-lg font-medium">
              Cronograma em branco
            </p>
            <p className="max-w-md text-sm text-muted-foreground mt-1 mb-6">
              Defina a ordem dos acontecimentos do culto: louvores, orações, mensagens, ofertas e responsáveis.
            </p>

            {canManage ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => setManageTemplatesOpen(true)}
                  disabled={isPending}
                  className="gap-2"
                >
                  <SparklesIcon className="size-4" />
                  Carregar modelo de culto
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setImportDialogOpen(true)}
                  className="gap-2"
                >
                  <UploadIcon className="size-4" />
                  Importar arquivo (.json)
                </Button>
                <PlanItemDialog
                  eventId={eventId}
                  people={people}
                  songs={songs}
                  mode="create-item"
                  trigger={
                    <Button variant="outline" className="gap-1.5">
                      <PlusIcon className="size-4" />
                      Começar do zero
                    </Button>
                  }
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Aguardando a liderança publicar a programação.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Read-Only View */}
          <div className="sm:hidden">
            <PlanReadView
              computedItems={computedItems}
              onOpenSong={handleOpenSong}
            />
          </div>

          {/* Desktop Full In-place Editor */}
          <div className="hidden sm:block divide-y rounded-xl border bg-card overflow-hidden shadow-xs">
            <div className="grid grid-cols-[36px_80px_90px_1fr_220px_100px] items-center gap-3 bg-muted/40 px-4 py-2.5 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
              <span />
              <span>Início</span>
              <span>Duração</span>
              <span>Momento / Detalhes</span>
              <span>Responsável</span>
              <span className="text-right">Ações</span>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={computedItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {computedItems.map((item, index) => {
                  if (item.type === "header") {
                    return (
                      <SortableSectionRow
                        key={item.id}
                        item={item}
                        index={index}
                        totalCount={computedItems.length}
                        canManage={canManage}
                        isPending={isPending}
                        deletingId={deletingId}
                        onMove={handleMove}
                        onEdit={openEditDialog}
                        onDelete={handleDelete}
                      />
                    );
                  }
                  return (
                    <SortableItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      totalCount={computedItems.length}
                      canManage={canManage}
                      isPending={isPending}
                      deletingId={deletingId}
                      onMove={handleMove}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                      onOpenSong={handleOpenSong}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>
        </>
      )}

      {/* Mobile Edit Drawer */}
      <PlanEditorDrawer controller={controller} />

      {/* Discard confirmation dialog */}
      <PlanDiscardConfirmation
        open={showDiscardAlert}
        onOpenChange={setShowDiscardAlert}
        isMobile={isMobile}
        isPending={isPending}
        onSave={handleSaveDrawer}
        onDiscard={handleDiscardChanges}
      />

      {/* Edit Dialog */}
      {editingItem ? (
        <PlanItemDialog
          eventId={eventId}
          people={people}
          songs={songs}
          mode="edit"
          initialItem={{
            id: editingItem.id,
            type: editingItem.type as "header" | "item",
            title: editingItem.title,
            description: editingItem.description,
            durationSeconds: editingItem.durationSeconds,
            personId: editingItem.personId,
            customResponsible: editingItem.customResponsible,
            songId: editingItem.songId,
          }}
          open={editDialogOpen}
          onOpenChange={handleEditDialogOpenChange}
          onItemSaved={handleItemSaved}
        />
      ) : null}

      {/* Save Template Dialog */}
      <SavePlanDialog
        eventId={eventId}
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        itemsCount={computedItems.length}
        totalDurationSeconds={totalPlanSeconds}
      />

      {/* Manage / Apply Templates Dialog */}
      <ManagePlanTemplatesDialog
        eventId={eventId}
        open={manageTemplatesOpen}
        onOpenChange={setManageTemplatesOpen}
        currentItemsCount={computedItems.length}
      />

      {/* Clear Plan Confirmation Dialog */}
      <ClearPlanDialog
        eventId={eventId}
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        itemsCount={computedItems.length}
      />

      {/* Import Plan JSON Dialog */}
      <ImportPlanDialog
        eventId={eventId}
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        currentItemsCount={computedItems.length}
      />

      {/* Song Quick Drawer */}
      <SongQuickDrawer
        song={selectedSongForDrawer}
        open={quickDrawerOpen}
        onOpenChange={setQuickDrawerOpen}
      />
    </div>
  );
}

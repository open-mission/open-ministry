"use client";

import { CheckIcon, PlusIcon, Share2Icon, XIcon } from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { PlanItemDialog } from "../plan-item-dialog";
import { SharePlanDialog } from "../share-plan-dialog";
import { PlanActionsMenu } from "./plan-actions-menu";
import { SortableSectionRow } from "./plan-header-row";
import { SortableItemRow } from "./plan-item-row";
import type { PlanEditorController } from "./use-plan-editor";

export function PlanEditorDrawer({
  controller,
}: {
  controller: PlanEditorController;
}) {
  const {
    eventId,
    eventTitle,
    people,
    songs,
    canManage,
    isPending,
    computedItems,
    sensors,
    handleDragEnd,
    handleMove,
    openEditDialog,
    handleDelete,
    handleOpenSong,
    mobileEditDrawerOpen,
    openMobileDrawer,
    handleCloseDrawerRequest,
    hasUnsavedReorder,
    handleSaveDrawer,
    deletingId,
  } = controller;

  if (!canManage) return null;

  return (
    <Drawer
      open={mobileEditDrawerOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleCloseDrawerRequest();
        } else {
          openMobileDrawer();
        }
      }}
    >
      <DrawerContent className="h-[92dvh] max-h-[92dvh] flex flex-col gap-0 rounded-t-[28px] border-x-0 border-b-0 bg-background p-0">
        {/* Header: Title, Description e Close Button */}
        <div className="relative px-5 pt-3.5 pb-3 border-b text-left">
          <DrawerHeader className="p-0 text-left">
            <div className="flex items-center gap-2">
              <DrawerTitle className="font-heading text-lg tracking-tight">
                Editar Cronograma
              </DrawerTitle>
              {hasUnsavedReorder ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  Alterações pendentes
                </span>
              ) : null}
            </div>
            <DrawerDescription className="text-xs text-muted-foreground mt-0.5">
              Arraste ou use as setas para reordenar os momentos e seções do culto.
            </DrawerDescription>
          </DrawerHeader>

          <button
            type="button"
            onClick={handleCloseDrawerRequest}
            className="absolute right-4 top-3.5 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Quick Actions Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/20 shrink-0 overflow-x-auto no-scrollbar">
          <PlanItemDialog
            eventId={eventId}
            people={people}
            songs={songs}
            mode="create-item"
            trigger={
              <Button size="sm" className="gap-1.5 h-8 text-xs shrink-0 rounded-lg">
                <PlusIcon className="size-3.5" />
                Momento
              </Button>
            }
          />
          <PlanItemDialog
            eventId={eventId}
            people={people}
            songs={songs}
            mode="create-header"
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs shrink-0 rounded-lg"
              >
                <PlusIcon className="size-3.5" />
                Seção
              </Button>
            }
          />

          <SharePlanDialog
            eventId={eventId}
            eventTitle={eventTitle}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs shrink-0 rounded-lg text-primary"
              >
                <Share2Icon className="size-3.5" />
                Compartilhar
              </Button>
            }
          />

          <PlanActionsMenu controller={controller} variant="mobile" />
        </div>

        {/* Sortable List inside Drawer */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
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

        {/* Dedicated Drawer Footer */}
        <DrawerFooter className="p-3 sm:p-4 border-t bg-background shrink-0 flex flex-row gap-2.5 items-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleCloseDrawerRequest}
            className="flex-1 h-10 rounded-xl text-xs sm:text-sm font-medium"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={isPending}
            onClick={handleSaveDrawer}
            className="flex-1 h-10 rounded-xl text-xs sm:text-sm font-medium gap-1.5"
          >
            <CheckIcon className="size-4" />
            {hasUnsavedReorder ? "Salvar e Concluir" : "Concluir"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

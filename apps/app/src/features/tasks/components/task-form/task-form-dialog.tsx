"use client";

import { HistoryIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { TaskAuditHistoryDialog } from "../task-audit-history-dialog";
import { TaskFormFields } from "./task-form-fields";
import type { TaskFormDialogProps } from "./task-form.types";
import { useTaskForm } from "./use-task-form";

export function TaskFormDialog({
  open,
  onClose,
  onSuccess,
  taskToEdit = null,
  departments = [],
  members = [],
  currentUserId,
  canDelegateDepartment = false,
  canDelegateChurch = false,
  defaultScope = "personal",
  defaultDepartmentId = null,
  defaultStatus = "todo",
  nested = false,
}: TaskFormDialogProps) {
  const isMobile = useIsMobile();
  const form = useTaskForm({
    open,
    onClose,
    onSuccess,
    taskToEdit,
    departments,
    members,
    currentUserId,
    canDelegateDepartment,
    canDelegateChurch,
    defaultScope,
    defaultDepartmentId,
    defaultStatus,
  });

  const formBody = (
    <TaskFormFields
      isEditing={form.isEditing}
      titleInputRef={form.titleInputRef}
      submitError={form.submitError}
      fieldErrors={form.fieldErrors}
      fields={form.fields}
      departments={departments}
      members={members}
      filteredMembers={form.filteredMembers}
      canDelegateDepartment={canDelegateDepartment}
      canDelegateChurch={canDelegateChurch}
      onFieldChange={form.setField}
      onClearFieldErrors={form.clearFieldErrors}
      onSelectDeadlinePreset={form.handleSelectDeadlinePreset}
      onAddTag={form.handleAddTag}
      onRemoveTag={form.handleRemoveTag}
      onSubmit={form.handleSubmit}
    />
  );

  const submitLabel = form.submitting ? (
    <>
      <Loader2Icon className="mr-2 size-4 animate-spin" />
      Salvando...
    </>
  ) : form.isEditing ? (
    "Salvar alterações"
  ) : (
    "Criar tarefa"
  );

  if (isMobile) {
    const Wrapper = nested ? DrawerNestedRoot : Drawer;
    return (
      <Wrapper open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="flex h-auto max-h-[90dvh] data-[vaul-drawer-direction=bottom]:max-h-[90dvh] flex-col gap-0 rounded-t-[24px] bg-background p-0">
          <DrawerHeader className="shrink-0 border-b px-4 pt-3 pb-3 text-left! group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <div className="flex items-center justify-between gap-2">
              <DrawerTitle className="font-heading text-xl font-bold">
                {form.isEditing ? "Editar tarefa" : "Nova tarefa"}
              </DrawerTitle>
              {form.isEditing && taskToEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => form.setAuditOpen(true)}
                  className="min-h-11 gap-1.5 text-muted-foreground"
                >
                  <HistoryIcon className="size-4" />
                  Histórico
                </Button>
              ) : null}
            </div>
            <DrawerDescription>
              {form.isEditing
                ? "Atualize os dados da tarefa abaixo."
                : "Organize uma atividade pessoal ou delegue para sua equipe."}
            </DrawerDescription>
          </DrawerHeader>

          <div
            data-vaul-no-drag=""
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
          >
            <div className="px-4 py-3.5">{formBody}</div>
          </div>

          <DrawerFooter className="shrink-0 flex-row items-center gap-2 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              disabled={form.submitting}
              onClick={onClose}
              className="min-h-11 shrink-0 px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="task-editor-form"
              disabled={form.submitting}
              className="min-h-11 flex-1"
            >
              {submitLabel}
            </Button>
          </DrawerFooter>

          {form.isEditing && taskToEdit ? (
            <TaskAuditHistoryDialog
              task={taskToEdit}
              open={form.auditOpen}
              onClose={() => form.setAuditOpen(false)}
              members={members}
              departments={departments}
              nested
            />
          ) : null}
        </DrawerContent>
      </Wrapper>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="font-heading text-xl font-bold">
              {form.isEditing ? "Editar tarefa" : "Nova tarefa"}
            </DialogTitle>
            {form.isEditing && taskToEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => form.setAuditOpen(true)}
                className="gap-1.5 text-muted-foreground"
              >
                <HistoryIcon className="size-4" />
                Histórico
              </Button>
            ) : null}
          </div>
          <DialogDescription>
            {form.isEditing
              ? "Atualize os dados da tarefa."
              : "Crie um lembrete pessoal ou delegue para sua equipe."}
          </DialogDescription>
        </DialogHeader>

        {formBody}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={form.submitting}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="task-editor-form"
            disabled={form.submitting}
          >
            {submitLabel}
          </Button>
        </DialogFooter>

        {form.isEditing && taskToEdit ? (
          <TaskAuditHistoryDialog
            task={taskToEdit}
            open={form.auditOpen}
            onClose={() => form.setAuditOpen(false)}
            members={members}
            departments={departments}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

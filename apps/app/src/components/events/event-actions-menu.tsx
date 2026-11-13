"use client";

import { useState } from "react";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { DeleteEventButton } from "@/components/events/delete-event-button";
import { EditEventDialog } from "@/components/events/edit-event-dialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";

import type { DepartmentOption } from "@/lib/departments";

export function EventActionsMenu({
  event,
  departments,
  selectedDepartmentIds,
  selectedFunctionIds = [],
  departmentAssignmentCounts = {},
  seriesOccurrences = 0,
  defaultDate,
  defaultTime,
  defaultDuration,
  canEdit = true,
  canDelete = true,
}: {
  event: {
    id: string;
    title: string;
    description: string | null;
    kind: string;
    location: string | null;
    seriesId: string | null;
  };
  departments: DepartmentOption[];
  selectedDepartmentIds: string[];
  selectedFunctionIds?: string[];
  departmentAssignmentCounts?: Record<string, number>;
  seriesOccurrences?: number;
  defaultDate: string;
  defaultTime: string;
  defaultDuration: number;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!canEdit && !canDelete) {
    return null;
  }

  return (
    <>
      {isMobile ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setDrawerOpen(true)}
            className="relative size-9 rounded-lg text-muted-foreground after:absolute after:-inset-1 after:rounded-lg after:content-[''] hover:bg-muted hover:text-foreground"
            title="Opções do evento"
          >
            <MoreHorizontalIcon className="size-4" />
            <span className="sr-only">Opções do evento</span>
          </Button>

          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerContent className="p-0">
              <DrawerHeader className="border-b px-5 pt-4 pb-3 !text-left text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
                <DrawerTitle className="font-heading text-base font-bold truncate">
                  {event.title}
                </DrawerTitle>
                <DrawerDescription className="text-xs text-muted-foreground truncate text-left">
                  Opções do culto ou evento
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex flex-col gap-1 p-3">
                {canEdit ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDrawerOpen(false);
                      setEditOpen(true);
                    }}
                    className="h-11 justify-start gap-3 rounded-xl px-3 text-sm font-medium"
                  >
                    <PencilIcon className="size-4 text-muted-foreground" />
                    <span>Editar evento</span>
                  </Button>
                ) : null}

                {canDelete ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDrawerOpen(false);
                      setDeleteOpen(true);
                    }}
                    className="h-11 justify-start gap-3 rounded-xl px-3 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2Icon className="size-4" />
                    <span>Excluir evento</span>
                  </Button>
                ) : null}
              </div>

              <DrawerFooter className="border-t pt-2 pb-4">
                <DrawerClose asChild>
                  <Button variant="outline" className="w-full">
                    Cancelar
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="relative size-9 rounded-lg text-muted-foreground after:absolute after:-inset-1 after:rounded-lg after:content-[''] hover:bg-muted hover:text-foreground"
              title="Opções do evento"
            >
              <MoreHorizontalIcon className="size-4" />
              <span className="sr-only">Opções do evento</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {canEdit ? (
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <PencilIcon className="size-4 mr-2" />
                Editar evento
              </DropdownMenuItem>
            ) : null}
            {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
            {canDelete ? (
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2Icon className="size-4 mr-2" />
                Excluir evento
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {canEdit ? (
        <EditEventDialog
          event={event}
          departments={departments}
          selectedDepartmentIds={selectedDepartmentIds}
          selectedFunctionIds={selectedFunctionIds}
          departmentAssignmentCounts={departmentAssignmentCounts}
          defaultDate={defaultDate}
          defaultTime={defaultTime}
          defaultDuration={defaultDuration}
          trigger={null}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}

      {canDelete ? (
        <DeleteEventButton
          eventId={event.id}
          eventTitle={event.title}
          seriesId={event.seriesId}
          seriesOccurrences={seriesOccurrences}
          trigger={null}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      ) : null}
    </>
  );
}

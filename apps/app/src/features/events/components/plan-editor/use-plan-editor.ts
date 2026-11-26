"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import {
  deletePlanItemAction,
  reorderPlanItemsAction,
} from "@/app/actions/events";
import { enqueueEventPlanPdfJobAction } from "@/app/actions/jobs";
import type { QuickDrawerSong } from "@/components/songs/song-quick-drawer";
import { useStableIsMobile } from "@/hooks/use-stable-is-mobile";
import { computePlanItemTimes } from "@/lib/plan-utils";
import type { PlanEditorProps, RawPlanItem } from "./plan-editor.types";

export type SavedPlanItem = {
  id?: string;
  type: "header" | "item";
  title: string;
  description: string | null;
  durationSeconds: number;
  personId: string | null;
  customResponsible: string | null;
  songId?: string | null;
};

export function usePlanEditor({
  eventId,
  eventTitle,
  startsAt,
  endsAt,
  planItems,
  people,
  songs = [],
  canManage,
}: PlanEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<RawPlanItem[]>(planItems);
  const [prevPlanItems, setPrevPlanItems] = useState(planItems);
  const [editingItem, setEditingItem] = useState<RawPlanItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mobileEditDrawerOpen, setMobileEditDrawerOpen] = useState(false);
  const [hasUnsavedReorder, setHasUnsavedReorder] = useState(false);
  const [drawerSnapshot, setDrawerSnapshot] = useState<RawPlanItem[]>([]);
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);
  const [selectedSongForDrawer, setSelectedSongForDrawer] =
    useState<QuickDrawerSong | null>(null);
  const [quickDrawerOpen, setQuickDrawerOpen] = useState(false);
  const isMobile = useStableIsMobile(
    mobileEditDrawerOpen ||
      showDiscardAlert ||
      editDialogOpen ||
      Boolean(deletingId),
  );
  const editCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Template and action dialog states
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (editCloseTimer.current !== null) clearTimeout(editCloseTimer.current);
    };
  }, []);

  if (prevPlanItems !== planItems) {
    setPrevPlanItems(planItems);
    setItems(planItems);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const { computedItems, totalPlanSeconds } = computePlanItemTimes(
    startsAt,
    items,
  );

  const eventDurationSeconds = Math.max(
    0,
    Math.round((endsAt.getTime() - startsAt.getTime()) / 1000),
  );

  const diffSeconds = eventDurationSeconds - totalPlanSeconds;

  function handleItemSaved(savedItem: SavedPlanItem) {
    if (savedItem.id) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === savedItem.id
            ? {
                ...item,
                title: savedItem.title,
                description: savedItem.description,
                durationSeconds: savedItem.durationSeconds,
                personId: savedItem.personId,
                customResponsible: savedItem.customResponsible,
                songId: savedItem.songId,
                type: savedItem.type,
                person: savedItem.personId
                  ? (people.find((p) => p.id === savedItem.personId) ?? null)
                  : null,
                song: savedItem.songId
                  ? ((songs.find((s) => s.id === savedItem.songId) as
                      | QuickDrawerSong
                      | undefined) ?? null)
                  : null,
              }
            : item,
        ),
      );
    }
  }

  function openEditDialog(item: RawPlanItem) {
    if (editCloseTimer.current !== null) {
      clearTimeout(editCloseTimer.current);
      editCloseTimer.current = null;
    }
    setEditingItem(item);
    setEditDialogOpen(true);
  }

  function handleEditDialogOpenChange(open: boolean) {
    setEditDialogOpen(open);
    if (open) {
      if (editCloseTimer.current !== null) {
        clearTimeout(editCloseTimer.current);
        editCloseTimer.current = null;
      }
      return;
    }
    // Mantém o item montado até o Drawer/Dialog terminar de fechar.
    if (editCloseTimer.current !== null) clearTimeout(editCloseTimer.current);
    editCloseTimer.current = setTimeout(() => {
      editCloseTimer.current = null;
      setEditingItem(null);
    }, isMobile ? 550 : 220);
  }

  const handleOpenSong = (song: QuickDrawerSong) => {
    setSelectedSongForDrawer(song);
    setQuickDrawerOpen(true);
  };

  const handleExportPdfDirect = () => {
    window.open(`/api/events/${eventId}/plan/pdf`, "_blank");
  };

  const handleExportPdfBackground = () => {
    startTransition(async () => {
      const res = await enqueueEventPlanPdfJobAction(eventId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        "Exportação iniciada em segundo plano! Acompanhe na aba Tarefas.",
        {
          action: {
            label: "Ver tarefas",
            onClick: () => router.push("/dashboard/jobs"),
          },
        },
      );
    });
  };

  function openMobileDrawer() {
    setDrawerSnapshot(items);
    setHasUnsavedReorder(false);
    setMobileEditDrawerOpen(true);
  }

  function handleCloseDrawerRequest() {
    if (hasUnsavedReorder) {
      setShowDiscardAlert(true);
    } else {
      setMobileEditDrawerOpen(false);
    }
  }

  function handleDiscardChanges() {
    if (drawerSnapshot.length > 0) {
      setItems(drawerSnapshot);
    }
    setHasUnsavedReorder(false);
    setShowDiscardAlert(false);
    setMobileEditDrawerOpen(false);
    toast.info("Alterações na ordem descartadas.");
  }

  function handleSaveDrawer() {
    const orderedIds = items.map((item) => item.id);
    startTransition(async () => {
      const res = await reorderPlanItemsAction(eventId, orderedIds);
      if (res.ok) {
        toast.success("Cronograma salvo com sucesso!");
        setHasUnsavedReorder(false);
        setMobileEditDrawerOpen(false);
        setShowDiscardAlert(false);
        router.refresh();
      } else {
        toast.error(res.error || "Erro ao salvar cronograma.");
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);

    if (mobileEditDrawerOpen) {
      setHasUnsavedReorder(true);
    } else {
      const orderedIds = newItems.map((item) => item.id);
      startTransition(async () => {
        const res = await reorderPlanItemsAction(eventId, orderedIds);
        if (!res.ok) {
          toast.error(res.error || "Erro ao reordenar cronograma.");
          setItems(planItems);
        }
      });
    }
  }

  function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = arrayMove(items, index, targetIndex);
    setItems(newItems);

    if (mobileEditDrawerOpen) {
      setHasUnsavedReorder(true);
    } else {
      const orderedIds = newItems.map((item) => item.id);
      startTransition(async () => {
        const res = await reorderPlanItemsAction(eventId, orderedIds);
        if (!res.ok) {
          toast.error(res.error || "Erro ao reordenar.");
          setItems(planItems);
        }
      });
    }
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    // Remoção otimista imediata na interface (0ms de latência percebida)
    setItems((prev) => prev.filter((item) => item.id !== id));
    startTransition(async () => {
      const res = await deletePlanItemAction(id, eventId);
      if (res.ok) {
        toast.success("Item removido do cronograma.");
        router.refresh();
      } else {
        toast.error(res.error || "Erro ao excluir.");
        setItems(planItems); // Rollback em caso de erro
      }
      setDeletingId(null);
    });
  }

  return {
    eventId,
    eventTitle,
    people,
    songs,
    canManage,
    isMobile,
    isPending,
    items,
    computedItems,
    totalPlanSeconds,
    diffSeconds,
    sensors,
    handleItemSaved,
    openEditDialog,
    handleEditDialogOpenChange,
    editingItem,
    editDialogOpen,
    deletingId,
    handleOpenSong,
    handleExportPdfDirect,
    handleExportPdfBackground,
    handleDragEnd,
    handleMove,
    handleDelete,
    mobileEditDrawerOpen,
    openMobileDrawer,
    handleCloseDrawerRequest,
    hasUnsavedReorder,
    handleSaveDrawer,
    handleDiscardChanges,
    showDiscardAlert,
    setShowDiscardAlert,
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
  };
}

export type PlanEditorController = ReturnType<typeof usePlanEditor>;

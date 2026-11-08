"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookmarkPlusIcon,
  CheckIcon,
  ClockIcon,
  DownloadIcon,
  GripVerticalIcon,
  LayoutTemplateIcon,
  ListOrderedIcon,
  MoreHorizontalIcon,
  Music2Icon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  deletePlanItemAction,
  reorderPlanItemsAction,
} from "@/app/actions/events";
import {
  PlanItemDialog,
  type SongOption,
} from "@/components/events/plan-item-dialog";
import {
  SongQuickDrawer,
  type QuickDrawerSong,
} from "@/components/songs/song-quick-drawer";
import {
  ClearPlanDialog,
  exportPlanAsJson,
  ImportPlanDialog,
  ManagePlanTemplatesDialog,
  SavePlanDialog,
} from "@/components/events/plan-template-dialogs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Drawer,
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
import {
  computePlanItemTimes,
  type ComputedPlanItem,
} from "@/lib/plan-utils";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

type PersonOption = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

type RawPlanItem = {
  id: string;
  eventId: string;
  sectionId: string | null;
  type: string;
  title: string;
  description: string | null;
  durationSeconds: number;
  order: number;
  personId: string | null;
  customResponsible: string | null;
  songId?: string | null;
  song?: QuickDrawerSong | null;
  person?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    user?: { image?: string | null } | null;
  } | null;
};

type PlanEditorProps = {
  eventId: string;
  eventTitle: string;
  startsAt: Date;
  endsAt: Date;
  planItems: RawPlanItem[];
  people: PersonOption[];
  songs?: SongOption[];
  canManage: boolean;
};

export function PlanEditor({
  eventId,
  eventTitle,
  startsAt,
  endsAt,
  planItems,
  people,
  songs = [],
  canManage,
}: PlanEditorProps) {
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

  const handleOpenSong = (song: QuickDrawerSong) => {
    setSelectedSongForDrawer(song);
    setQuickDrawerOpen(true);
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
      } else {
        toast.error(res.error || "Erro ao salvar cronograma.");
      }
    });
  }

  // Template and action dialog states
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

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

  function formatHoursMinutes(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ""}`.trim();
    }
    return `${minutes} min`;
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
    startTransition(async () => {
      const res = await deletePlanItemAction(id, eventId);
      if (res.ok) {
        toast.success("Item removido do cronograma.");
      } else {
        toast.error(res.error || "Erro ao excluir.");
      }
      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header bar and action controls */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-lg">Ordem do Culto</span>
            <Badge variant="secondary" className="gap-1 font-mono text-xs">
              <ClockIcon className="size-3" />
              {formatHoursMinutes(totalPlanSeconds)} planejados
            </Badge>

            {diffSeconds >= 0 ? (
              <span className="text-xs text-muted-foreground">
                ({formatHoursMinutes(diffSeconds)} livres da duração prevista)
              </span>
            ) : (
              <Badge variant="destructive" className="text-xs">
                Excede {formatHoursMinutes(Math.abs(diffSeconds))}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {computedItems.length === 0
              ? "Nenhum momento cadastrado ainda."
              : `${computedItems.filter((i) => i.type === "item").length} momentos e ${
                  computedItems.filter((i) => i.type === "header").length
                } seções planejadas.`}
          </p>
        </div>

        {/* Desktop actions */}
        {canManage ? (
          <div className="hidden sm:flex flex-wrap items-center gap-2">
            <PlanItemDialog
              eventId={eventId}
              people={people}
              songs={songs}
              mode="create-header"
            />
            <PlanItemDialog
              eventId={eventId}
              people={people}
              songs={songs}
              mode="create-item"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9">
                  <MoreHorizontalIcon className="size-4" />
                  <span>Modelos &amp; Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => setManageTemplatesOpen(true)}
                  className="gap-2 cursor-pointer"
                >
                  <LayoutTemplateIcon className="size-4 text-muted-foreground" />
                  <span>Modelos de cronograma</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSaveDialogOpen(true)}
                  disabled={computedItems.length === 0}
                  className="gap-2 cursor-pointer"
                >
                  <BookmarkPlusIcon className="size-4 text-muted-foreground" />
                  <span>Salvar como modelo...</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => exportPlanAsJson(eventTitle, computedItems)}
                  disabled={computedItems.length === 0}
                  className="gap-2 cursor-pointer"
                >
                  <DownloadIcon className="size-4 text-muted-foreground" />
                  <span>Exportar arquivo (.json)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setImportDialogOpen(true)}
                  className="gap-2 cursor-pointer"
                >
                  <UploadIcon className="size-4 text-muted-foreground" />
                  <span>Importar arquivo (.json)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setClearDialogOpen(true)}
                  disabled={computedItems.length === 0}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2Icon className="size-4" />
                  <span>Limpar cronograma</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}

        {/* Mobile: Botão Editar Cronograma */}
        {canManage && computedItems.length > 0 ? (
          <div className="sm:hidden pt-1">
            <Button
              onClick={openMobileDrawer}
              className="w-full gap-2 rounded-xl h-9 font-medium"
              size="sm"
            >
              <PencilIcon className="size-3.5" />
              Editar Cronograma
            </Button>
          </div>
        ) : null}
      </div>

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
                {computedItems.map((item, index) => (
                  <SortablePlanRow
                    key={item.id}
                    item={item}
                    index={index}
                    totalCount={computedItems.length}
                    canManage={canManage}
                    isPending={isPending}
                    deletingId={deletingId}
                    onMove={handleMove}
                    onEdit={(raw) => {
                      setEditingItem(raw);
                      setEditDialogOpen(true);
                    }}
                    onDelete={handleDelete}
                    onOpenSong={handleOpenSong}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </>
      )}

      {/* Mobile Edit Drawer */}
      {canManage ? (
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
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 text-xs shrink-0 rounded-lg"
                  >
                    <MoreHorizontalIcon className="size-3.5" />
                    Opções
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => setManageTemplatesOpen(true)}
                    className="gap-2 cursor-pointer"
                  >
                    <LayoutTemplateIcon className="size-4 text-muted-foreground" />
                    <span>Modelos de cronograma</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSaveDialogOpen(true)}
                    disabled={computedItems.length === 0}
                    className="gap-2 cursor-pointer"
                  >
                    <BookmarkPlusIcon className="size-4 text-muted-foreground" />
                    <span>Salvar como modelo...</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => exportPlanAsJson(eventTitle, computedItems)}
                    disabled={computedItems.length === 0}
                    className="gap-2 cursor-pointer"
                  >
                    <DownloadIcon className="size-4 text-muted-foreground" />
                    <span>Exportar arquivo (.json)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setImportDialogOpen(true)}
                    className="gap-2 cursor-pointer"
                  >
                    <UploadIcon className="size-4 text-muted-foreground" />
                    <span>Importar arquivo (.json)</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setClearDialogOpen(true)}
                    disabled={computedItems.length === 0}
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2Icon className="size-4" />
                    <span>Limpar cronograma</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                  {computedItems.map((item, index) => (
                    <SortablePlanRow
                      key={item.id}
                      item={item}
                      index={index}
                      totalCount={computedItems.length}
                      canManage={canManage}
                      isPending={isPending}
                      deletingId={deletingId}
                      onMove={handleMove}
                      onEdit={(raw) => {
                        setEditingItem(raw);
                        setEditDialogOpen(true);
                      }}
                      onDelete={handleDelete}
                      onOpenSong={handleOpenSong}
                    />
                  ))}
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
      ) : null}

      {/* Discard confirmation dialog */}
      <AlertDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você possui alterações na ordem dos momentos do cronograma que ainda não foram salvas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleDiscardChanges}
              className="text-destructive hover:bg-destructive/10"
            >
              Descartar alterações
            </Button>
            <AlertDialogAction onClick={handleSaveDrawer} disabled={isPending}>
              Salvar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setEditingItem(null);
          }}
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

function formatDurationMinutesLabel(totalSeconds: number): string {
  const mins = Math.max(1, Math.round(totalSeconds / 60));
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h${remainingMins > 0 ? ` ${remainingMins}m` : ""}`;
}

function PlanReadView({
  computedItems,
  onOpenSong,
}: {
  computedItems: ComputedPlanItem[];
  onOpenSong?: (song: QuickDrawerSong) => void;
}) {
  return (
    <div className="divide-y rounded-2xl border bg-card overflow-hidden shadow-xs">
      {computedItems.map((item) => {
        if (item.type === "header") {
          return (
            <div
              key={item.id}
              className="bg-muted/50 px-4 py-2.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              {item.title}
            </div>
          );
        }

        return (
          <div
            key={item.id}
            className="flex items-start gap-3.5 p-3.5 transition-colors hover:bg-muted/20"
          >
            {/* Bloco de Horário */}
            <div className="flex flex-col items-center shrink-0 w-14 text-center pt-0.5">
              <span className="font-mono text-xs font-semibold text-foreground">
                {item.timeLabel}
              </span>
              <Badge
                variant="secondary"
                className="mt-1 font-mono text-[10px] px-1.5 py-0.5 h-auto font-normal whitespace-nowrap"
              >
                {formatDurationMinutesLabel(item.durationSeconds)}
              </Badge>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-medium text-sm text-foreground leading-snug">
                {item.title}
              </p>
              {item.description ? (
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {item.description}
                </p>
              ) : null}
              {item.song ? (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => onOpenSong?.(item.song!)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    title="Abrir cifra e letra desta música"
                  >
                    <Music2Icon className="size-3" />
                    <span>{item.song.title}</span>
                    {item.song.tone ? (
                      <span className="font-bold text-[10px] opacity-80">
                        ({item.song.tone})
                      </span>
                    ) : null}
                  </button>
                </div>
              ) : null}
              {item.person ? (
                <div className="pt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Avatar className="size-4 shrink-0 ring-1 ring-border">
                    <AvatarImage src={item.person.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[8px]">
                      {getInitials(item.person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-foreground font-medium text-[11px]">
                    {item.person.name}
                  </span>
                </div>
              ) : item.customResponsible ? (
                <div className="pt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <UserIcon className="size-3 shrink-0" />
                  <span className="truncate">{item.customResponsible}</span>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type SortablePlanRowProps = {
  item: ComputedPlanItem;
  index: number;
  totalCount: number;
  canManage: boolean;
  isPending: boolean;
  deletingId: string | null;
  onMove: (index: number, direction: "up" | "down") => void;
  onEdit: (item: RawPlanItem) => void;
  onDelete: (id: string) => void;
  onOpenSong?: (song: QuickDrawerSong) => void;
};

function SortablePlanRow({
  item,
  index,
  totalCount,
  canManage,
  isPending,
  deletingId,
  onMove,
  onEdit,
  onDelete,
  onOpenSong,
}: SortablePlanRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !canManage });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const rawItem: RawPlanItem = {
    id: item.id,
    eventId: item.eventId,
    sectionId: item.sectionId,
    type: item.type,
    title: item.title,
    description: item.description,
    durationSeconds: item.durationSeconds,
    order: item.order,
    personId: item.personId,
    customResponsible: item.customResponsible,
    songId: item.songId,
    song: item.song,
    person: item.person,
  };

  if (item.type === "header") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group flex items-center justify-between bg-muted/50 px-3.5 py-2.5 rounded-lg border transition-colors hover:bg-muted/70",
          isDragging &&
            "relative z-30 bg-muted/90 shadow-md ring-2 ring-primary/40 rounded-lg opacity-95",
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {canManage ? (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              title="Arrastar para reordenar"
              aria-label="Arrastar para reordenar"
            >
              <GripVerticalIcon className="size-4" />
            </button>
          ) : null}
          <span className="font-heading text-xs font-semibold tracking-wider text-foreground uppercase truncate">
            {item.title}
          </span>
        </div>

        {canManage ? (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={index === 0 || isPending}
              onClick={() => onMove(index, "up")}
              title="Mover para cima"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowUpIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={index === totalCount - 1 || isPending}
              onClick={() => onMove(index, "down")}
              title="Mover para baixo"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowDownIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(rawItem)}
              title="Editar seção"
              className="text-muted-foreground hover:text-foreground"
            >
              <PencilIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive"
              disabled={deletingId === item.id || isPending}
              onClick={() => onDelete(item.id)}
              title="Excluir seção"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex flex-col gap-2 p-3 transition-colors rounded-xl border bg-card hover:bg-muted/20 sm:rounded-none sm:border-0 sm:grid sm:grid-cols-[36px_80px_90px_1fr_220px_100px] sm:items-center sm:gap-3 sm:px-4 sm:py-3 shadow-2xs sm:shadow-none",
        isDragging &&
          "relative z-30 bg-card shadow-lg ring-2 ring-primary/40 rounded-xl opacity-95",
      )}
    >
      {/* Mobile Top Row: Drag Handle + Time + Duration Badge + Actions */}
      <div className="flex items-center justify-between sm:contents">
        <div className="flex items-center gap-2 sm:contents">
          {/* Drag Handle */}
          <div className="flex items-center">
            {canManage ? (
              <button
                type="button"
                {...attributes}
                {...listeners}
                className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                title="Arrastar para reordenar"
                aria-label="Arrastar para reordenar"
              >
                <GripVerticalIcon className="size-4" />
              </button>
            ) : (
              <span className="size-4" />
            )}
          </div>

          {/* Horário */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <span className="font-semibold text-foreground">{item.timeLabel}</span>
          </div>

          {/* Duração */}
          <div>
            <Badge variant="secondary" className="font-mono text-xs font-normal">
              {formatDurationMinutesLabel(item.durationSeconds)}
            </Badge>
          </div>
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center justify-end gap-0.5 sm:hidden">
          {canManage ? (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={index === 0 || isPending}
                onClick={() => onMove(index, "up")}
                title="Subir"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowUpIcon className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={index === totalCount - 1 || isPending}
                onClick={() => onMove(index, "down")}
                title="Descer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowDownIcon className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onEdit(rawItem)}
                title="Editar"
                className="text-muted-foreground hover:text-foreground"
              >
                <PencilIcon className="size-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive"
                    title="Remover"
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover momento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja remover &ldquo;{item.title}&rdquo; do
                      cronograma?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(item.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : null}
        </div>
      </div>

      {/* Título e Detalhes */}
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium text-sm text-foreground">{item.title}</p>
        {item.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
            {item.description}
          </p>
        ) : null}
        {item.song ? (
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => onOpenSong?.(item.song!)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              title="Abrir cifra e letra desta música"
            >
              <Music2Icon className="size-3" />
              <span>{item.song.title}</span>
              {item.song.tone ? (
                <span className="font-bold text-[10px] opacity-80">
                  ({item.song.tone})
                </span>
              ) : null}
            </button>
          </div>
        ) : null}
      </div>

      {/* Responsável */}
      <div className="flex items-center gap-2">
        {item.person ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="size-5 shrink-0 ring-1 ring-border">
              <AvatarImage src={item.person.avatarUrl ?? undefined} />
              <AvatarFallback className="text-[9px]">
                {getInitials(item.person.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs font-medium text-foreground">
              {item.person.name}
            </span>
          </div>
        ) : item.customResponsible ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserIcon className="size-3" />
            </span>
            <span className="truncate text-xs text-foreground">
              {item.customResponsible}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/60 italic">
            A definir
          </span>
        )}
      </div>

      {/* Desktop Actions */}
      <div className="hidden sm:flex items-center justify-end gap-1">
        {canManage ? (
          <>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={index === 0 || isPending}
              onClick={() => onMove(index, "up")}
              title="Subir"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowUpIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={index === totalCount - 1 || isPending}
              onClick={() => onMove(index, "down")}
              title="Descer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowDownIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(rawItem)}
              title="Editar"
              className="text-muted-foreground hover:text-foreground"
            >
              <PencilIcon className="size-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-destructive"
                  title="Remover"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover momento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja remover &ldquo;{item.title}&rdquo; do
                    cronograma?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(item.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : null}
      </div>
    </div>
  );
}

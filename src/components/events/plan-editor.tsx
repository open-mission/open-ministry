"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookmarkPlusIcon,
  ClockIcon,
  DownloadIcon,
  GripVerticalIcon,
  LayoutTemplateIcon,
  ListOrderedIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
  UserIcon,
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
import { PlanItemDialog } from "@/components/events/plan-item-dialog";
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
  canManage: boolean;
};

export function PlanEditor({
  eventId,
  eventTitle,
  startsAt,
  endsAt,
  planItems,
  people,
  canManage,
}: PlanEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<RawPlanItem[]>(planItems);
  const [prevPlanItems, setPrevPlanItems] = useState(planItems);
  const [editingItem, setEditingItem] = useState<RawPlanItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

    const orderedIds = newItems.map((item) => item.id);
    startTransition(async () => {
      const res = await reorderPlanItemsAction(eventId, orderedIds);
      if (!res.ok) {
        toast.error(res.error || "Erro ao reordenar cronograma.");
        setItems(planItems);
      }
    });
  }

  function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = arrayMove(items, index, targetIndex);
    setItems(newItems);

    const orderedIds = newItems.map((item) => item.id);

    startTransition(async () => {
      const res = await reorderPlanItemsAction(eventId, orderedIds);
      if (!res.ok) {
        toast.error(res.error || "Erro ao reordenar.");
        setItems(planItems);
      }
    });
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

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <PlanItemDialog
              eventId={eventId}
              people={people}
              mode="create-header"
            />
            <PlanItemDialog
              eventId={eventId}
              people={people}
              mode="create-item"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9">
                  <MoreHorizontalIcon className="size-4" />
                  <span className="hidden sm:inline">Modelos &amp; Ações</span>
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
      </div>

      {/* Cronograma list */}
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
        <div className="divide-y rounded-xl border bg-card overflow-hidden shadow-xs">
          {/* Table Header on Desktop */}
          <div className="hidden grid-cols-[36px_80px_90px_1fr_220px_100px] items-center gap-3 bg-muted/40 px-4 py-2.5 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase sm:grid">
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
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Edit Dialog */}
      {editingItem ? (
        <PlanItemDialog
          eventId={eventId}
          people={people}
          mode="edit"
          initialItem={{
            id: editingItem.id,
            type: editingItem.type as "header" | "item",
            title: editingItem.title,
            description: editingItem.description,
            durationSeconds: editingItem.durationSeconds,
            personId: editingItem.personId,
            customResponsible: editingItem.customResponsible,
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
    person: item.person,
  };

  if (item.type === "header") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group flex items-center justify-between bg-muted/40 px-4 py-2.5 transition-colors hover:bg-muted/60",
          isDragging &&
            "relative z-30 bg-muted/90 shadow-md ring-2 ring-primary/40 rounded-lg opacity-95",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {canManage ? (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground p-1 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
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
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={index === 0 || isPending}
              onClick={() => onMove(index, "up")}
              title="Mover para cima"
            >
              <ArrowUpIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={index === totalCount - 1 || isPending}
              onClick={() => onMove(index, "down")}
              title="Mover para baixo"
            >
              <ArrowDownIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(rawItem)}
              title="Editar seção"
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
        "group flex flex-col gap-2 p-3.5 transition-colors hover:bg-muted/20 sm:grid sm:grid-cols-[36px_80px_90px_1fr_220px_100px] sm:items-center sm:gap-3 sm:px-4 sm:py-3",
        isDragging &&
          "relative z-30 bg-card shadow-lg ring-2 ring-primary/40 rounded-lg opacity-95",
      )}
    >
      {/* Drag Handle */}
      <div className="flex items-center">
        {canManage ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground p-1 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
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
          {item.durationLabel}
        </Badge>
      </div>

      {/* Título e Detalhes */}
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium text-sm text-foreground">{item.title}</p>
        {item.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
            {item.description}
          </p>
        ) : null}
      </div>

      {/* Responsável */}
      <div className="flex items-center gap-2">
        {item.person ? (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="size-6 shrink-0 ring-1 ring-border">
              <AvatarImage src={item.person.avatarUrl ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {getInitials(item.person.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs font-medium text-foreground">
              {item.person.name}
            </span>
          </div>
        ) : item.customResponsible ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
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

      {/* Ações */}
      <div className="flex items-center justify-end gap-1">
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

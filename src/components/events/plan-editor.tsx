"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClockIcon,
  ListOrderedIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";

import {
  createPlanItemAction,
  deletePlanItemAction,
  reorderPlanItemsAction,
} from "@/app/actions/events";
import { PlanItemDialog } from "@/components/events/plan-item-dialog";
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
  computePlanItemTimes,
} from "@/lib/plan-utils";
import { getInitials } from "@/lib/format";

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
  startsAt,
  endsAt,
  planItems,
  people,
  canManage,
}: PlanEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [editingItem, setEditingItem] = useState<RawPlanItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { computedItems, totalPlanSeconds } = computePlanItemTimes(
    startsAt,
    planItems,
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

  function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= computedItems.length) return;

    const newOrder = [...computedItems];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    const orderedIds = newOrder.map((item) => item.id);

    startTransition(async () => {
      const res = await reorderPlanItemsAction(eventId, orderedIds);
      if (!res.ok) {
        toast.error(res.error || "Erro ao reordenar.");
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

  async function handleApplyTemplate() {
    startTransition(async () => {
      const template = [
        { type: "header", title: "INTRODUÇÃO & ABERTURA", duration: 0 },
        {
          type: "item",
          title: "Oração Inicial e Boas-Vindas",
          duration: 300,
          desc: "Acolhimento da congregação e oração de abertura.",
        },
        { type: "header", title: "LOUVOR & ADORAÇÃO", duration: 0 },
        {
          type: "item",
          title: "Momento de Louvor Congregacional",
          duration: 1200,
          desc: "Músicas e adoração com o ministério de louvor.",
        },
        { type: "header", title: "COMUNHÃO & AVISOS", duration: 0 },
        {
          type: "item",
          title: "Avisos e Recepção de Visitantes",
          duration: 300,
          desc: "Avisos gerais e acolhimento dos que nos visitam pela primeira vez.",
        },
        {
          type: "item",
          title: "Dízimos e Ofertas",
          duration: 420,
          desc: "Oração e cântico de gratidão pelas ofertas.",
        },
        { type: "header", title: "MINISTRAÇÃO DA PALAVRA", duration: 0 },
        {
          type: "item",
          title: "Pregação da Palavra",
          duration: 2100,
          desc: "Ministração bíblica principal.",
        },
        { type: "header", title: "ENCERRAMENTO", duration: 0 },
        {
          type: "item",
          title: "Apelo / Oração Final e Bênção Apostólica",
          duration: 480,
          desc: "Oração pastoral e encerramento.",
        },
      ];

      for (const item of template) {
        const formData = new FormData();
        formData.set("eventId", eventId);
        formData.set("type", item.type);
        formData.set("title", item.title);
        formData.set("durationSeconds", item.duration.toString());
        if (item.desc) formData.set("description", item.desc);
        await createPlanItemAction(undefined, formData);
      }

      toast.success("Modelo de culto carregado com sucesso!");
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
                  onClick={handleApplyTemplate}
                  disabled={isPending}
                  className="gap-2"
                >
                  {isPending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <SparklesIcon className="size-4" />
                  )}
                  Carregar modelo padrão de culto
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
          <div className="hidden grid-cols-[80px_90px_1fr_220px_100px] items-center gap-3 bg-muted/40 px-4 py-2.5 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase sm:grid">
            <span>Início</span>
            <span>Duração</span>
            <span>Momento / Detalhes</span>
            <span>Responsável</span>
            <span className="text-right">Ações</span>
          </div>

          {computedItems.map((item, index) => {
            if (item.type === "header") {
              return (
                <div
                  key={item.id}
                  className="group flex items-center justify-between bg-muted/50 px-4 py-2.5 transition-colors hover:bg-muted/70"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">:::</span>
                    <span className="font-heading text-xs font-semibold tracking-wider text-foreground uppercase">
                      {item.title}
                    </span>
                  </div>

                  {canManage ? (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={index === 0 || isPending}
                        onClick={() => handleMove(index, "up")}
                        title="Mover para cima"
                      >
                        <ArrowUpIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={index === computedItems.length - 1 || isPending}
                        onClick={() => handleMove(index, "down")}
                        title="Mover para baixo"
                      >
                        <ArrowDownIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          setEditingItem({
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
                          });
                          setEditDialogOpen(true);
                        }}
                        title="Editar seção"
                      >
                        <PencilIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={deletingId === item.id || isPending}
                        onClick={() => handleDelete(item.id)}
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
                key={item.id}
                className="group flex flex-col gap-2 p-3.5 transition-colors hover:bg-muted/20 sm:grid sm:grid-cols-[80px_90px_1fr_220px_100px] sm:items-center sm:gap-3 sm:px-4 sm:py-3"
              >
                {/* Horário */}
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {item.timeLabel}
                  </span>
                </div>

                {/* Duração LEN */}
                <div>
                  <Badge
                    variant="secondary"
                    className="font-mono text-xs font-normal"
                  >
                    {item.durationLabel}
                  </Badge>
                </div>

                {/* Título e Detalhes */}
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium text-sm text-foreground">
                    {item.title}
                  </p>
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
                        onClick={() => handleMove(index, "up")}
                        title="Subir"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ArrowUpIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={
                          index === computedItems.length - 1 || isPending
                        }
                        onClick={() => handleMove(index, "down")}
                        title="Descer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ArrowDownIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          setEditingItem({
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
                          });
                          setEditDialogOpen(true);
                        }}
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
                              Tem certeza que deseja remover &ldquo;{item.title}&rdquo; do cronograma?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item.id)}
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
          })}
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
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClockIcon,
  Loader2Icon,
  MapPinIcon,
  MoreHorizontalIcon,
  Music2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { deleteRehearsalAction } from "@/app/actions/rehearsals";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  formatRehearsalFullDate,
  formatRehearsalTimeRange,
  rehearsalDateParts,
  rehearsalSongCountLabel,
  splitRehearsals,
} from "@/features/rehearsals/lib/rehearsal-ui";
import { useIsMobile } from "@/hooks/use-mobile";

export type RehearsalListItem = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  songs?: {
    songId: string;
    musicalKey?: string | null;
    notes?: string | null;
    song?: {
      title: string;
      artist?: string | null;
      tone?: string | null;
    } | null;
  }[];
};

type RehearsalListProps = {
  departmentId: string;
  rehearsals: RehearsalListItem[];
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (rehearsal: RehearsalListItem) => void;
  onNew?: () => void;
};

export function RehearsalList({
  departmentId,
  rehearsals,
  canUpdate,
  canDelete,
  onEdit,
  onNew,
}: RehearsalListProps) {
  const { upcoming, past } = splitRehearsals(rehearsals);
  const [deleting, setDeleting] = useState<RehearsalListItem | null>(null);

  if (rehearsals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
          <CalendarClockIcon className="size-6" />
        </span>
        <div className="max-w-sm space-y-1.5">
          <p className="font-heading text-xl tracking-tight">
            Nenhum ensaio agendado
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Agende o primeiro ensaio para definir a data, o repertório e avisar
            a equipe com antecedência.
          </p>
        </div>
        {onNew ? (
          <Button type="button" onClick={onNew} className="min-h-11">
            <PlusIcon data-icon="inline-start" />
            Agendar ensaio
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <RehearsalGroup
        label="Próximos ensaios"
        rehearsals={upcoming}
        emptyLabel="Nenhum ensaio futuro agendado."
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={onEdit}
        onDelete={setDeleting}
      />

      {past.length > 0 ? (
        <RehearsalGroup
          label="Ensaios realizados"
          rehearsals={past}
          emptyLabel="Nenhum ensaio realizado ainda."
          canUpdate={canUpdate}
          canDelete={canDelete}
          onEdit={onEdit}
          onDelete={setDeleting}
        />
      ) : null}

      <RehearsalDeleteDialog
        departmentId={departmentId}
        rehearsal={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        canDelete={canDelete}
      />
    </div>
  );
}

function RehearsalGroup({
  label,
  rehearsals,
  emptyLabel,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  label: string;
  rehearsals: RehearsalListItem[];
  emptyLabel: string;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (rehearsal: RehearsalListItem) => void;
  onDelete: (rehearsal: RehearsalListItem) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-heading text-xl tracking-tight">{label}</h2>
        <span className="text-xs text-muted-foreground">
          {rehearsals.length === 1
            ? "1 ensaio"
            : `${rehearsals.length} ensaios`}
        </span>
      </div>

      {rehearsals.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2">
          {rehearsals.map((rehearsal) => (
            <RehearsalCard
              key={rehearsal.id}
              rehearsal={rehearsal}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function RehearsalCard({
  rehearsal,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  rehearsal: RehearsalListItem;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (rehearsal: RehearsalListItem) => void;
  onDelete: (rehearsal: RehearsalListItem) => void;
}) {
  const parts = rehearsalDateParts(rehearsal.startsAt);
  const songs = rehearsal.songs ?? [];
  const songTitles = songs
    .map((entry) => entry.song?.title)
    .filter((title): title is string => Boolean(title));
  const visibleTitles = songTitles.slice(0, 3);
  const remaining = songTitles.length - visibleTitles.length;

  return (
    <li className="group rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-violet-500/40 sm:p-4">
      <div className="flex items-start gap-3">
        <Link
          href={`/dashboard/events/${rehearsal.id}`}
          prefetch={true}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300 sm:size-14">
            <span className="font-heading text-xl leading-none sm:text-2xl">
              {parts.day}
            </span>
            <span className="mt-0.5 text-[11px] font-semibold tracking-[0.14em]">
              {parts.monthShort}
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-heading text-base leading-tight tracking-tight sm:text-lg">
                {rehearsal.title}
              </span>
              <Badge
                variant="outline"
                className="gap-1 border-violet-500/30 bg-violet-500/10 font-normal text-violet-700 dark:text-violet-300"
              >
                <Music2Icon className="size-3" />
                {rehearsalSongCountLabel(songs.length)}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              {parts.weekday} · {formatRehearsalFullDate(rehearsal.startsAt)} ·{" "}
              {formatRehearsalTimeRange(rehearsal.startsAt, rehearsal.endsAt)}
            </p>

            {rehearsal.location ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{rehearsal.location}</span>
              </p>
            ) : null}

            {visibleTitles.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {visibleTitles.map((title, index) => (
                  <span
                    key={`${title}-${index}`}
                    className="max-w-[14rem] truncate rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {title}
                  </span>
                ))}
                {remaining > 0 ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    +{remaining}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </Link>

        {canUpdate || canDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-muted-foreground"
                aria-label={`Ações do ensaio ${rehearsal.title}`}
              >
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {canUpdate ? (
                <DropdownMenuItem onClick={() => onEdit(rehearsal)}>
                  <PencilIcon className="size-3.5" />
                  Editar ensaio
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(rehearsal)}
                >
                  <Trash2Icon className="size-3.5" />
                  Excluir ensaio
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </li>
  );
}

export function RehearsalDeleteDialog({
  departmentId,
  rehearsal,
  onOpenChange,
  canDelete,
  onDeleted,
}: {
  departmentId: string;
  rehearsal: RehearsalListItem | null;
  onOpenChange: (open: boolean) => void;
  canDelete: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const open = Boolean(rehearsal);

  const handleDelete = async () => {
    if (!rehearsal || !canDelete) return;
    setPending(true);

    try {
      const result = await deleteRehearsalAction(departmentId, rehearsal.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Ensaio excluído.");
      onOpenChange(false);
      onDeleted?.();
      startTransition(() => router.refresh());
    } catch {
      toast.error("Não foi possível excluir o ensaio.");
    } finally {
      setPending(false);
    }
  };

  if (!rehearsal) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="p-0" role="alertdialog">
          <DrawerHeader className="!text-left px-5 pt-4 pb-2">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
              >
                <Trash2Icon className="size-5" />
              </span>
              <div className="min-w-0 space-y-1">
                <DrawerTitle className="font-heading text-lg leading-snug">
                  Excluir {rehearsal.title}?
                </DrawerTitle>
                <DrawerDescription className="leading-relaxed">
                  O repertório e os lembretes pendentes deste ensaio serão
                  removidos. Essa ação não pode ser desfeita.
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <DrawerFooter className="pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
              className="min-h-11 w-full"
            >
              {pending ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : null}
              Excluir ensaio
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="min-h-11 w-full"
            >
              Manter ensaio
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {rehearsal.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            O repertório e os lembretes pendentes deste ensaio serão removidos.
            Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Manter ensaio</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
            disabled={pending}
          >
            {pending ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : null}
            Excluir ensaio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

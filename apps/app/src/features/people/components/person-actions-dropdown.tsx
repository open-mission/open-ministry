"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Link2OffIcon,
  LinkIcon,
  MailPlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  UserIcon,
  UserRoundCogIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  deletePersonAction,
  unlinkPersonAction,
} from "@/app/actions/people";
import { impersonateMemberAction } from "@/app/actions/impersonation";
import { EditPersonDialog } from "@/features/people/components/edit-person-dialog";
import { InvitePersonDialog } from "@/features/people/components/invite-person-dialog";
import { LinkPersonDialog } from "@/features/people/components/link-person-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  personDisplayEmail,
  personDisplayName,
} from "@/lib/person-format";
import type { PersonRecord } from "@/lib/people";

type LinkableMember = {
  id: string;
  name: string;
  email: string;
};

export function PersonActionsDropdown({
  person,
  linkableMembers,
  currentUserId,
}: {
  person: PersonRecord;
  linkableMembers: LinkableMember[];
  currentUserId: string;
}) {
  const displayName = personDisplayName(person);
  const displayEmail = personDisplayEmail(person);

  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  function handleImpersonate() {
    if (!person.userId) return;
    startTransition(async () => {
      const result = await impersonateMemberAction(person.userId!);
      if (!result.ok) {
        toast.error(
          result.error ?? "Não foi possível entrar como essa pessoa.",
        );
      }
    });
  }

  function handleUnlink() {
    startTransition(async () => {
      const result = await unlinkPersonAction(person.id);
      if (result.ok) {
        toast.success("Conta desvinculada com sucesso.");
        setUnlinkOpen(false);
        return;
      }
      toast.error(result.error ?? "Não foi possível desvincular a conta.");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePersonAction(person.id, {
        forceUnlink: Boolean(person.userId),
      });
      if (result.ok) {
        toast.success("Pessoa excluída.");
        setDeleteOpen(false);
        return;
      }
      toast.error(result.error ?? "Não foi possível excluir a pessoa.");
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8.5 rounded-lg text-muted-foreground hover:text-foreground"
            aria-label={`Ações para ${displayName}`}
            title="Mais opções"
          >
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link
              href={`/dashboard/members/${person.id}`}
              className="flex items-center gap-2 cursor-pointer"
            >
              <UserIcon className="size-4 text-muted-foreground" />
              <span>Ver perfil</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => setEditOpen(true)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <PencilIcon className="size-4 text-muted-foreground" />
            <span>Editar dados</span>
          </DropdownMenuItem>

          {!person.userId && displayEmail ? (
            <DropdownMenuItem
              onSelect={() => setInviteOpen(true)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <MailPlusIcon className="size-4 text-muted-foreground" />
              <span>Convidar para app</span>
            </DropdownMenuItem>
          ) : null}

          {!person.userId ? (
            <DropdownMenuItem
              onSelect={() => setLinkOpen(true)}
              disabled={linkableMembers.length === 0}
              className="flex items-center gap-2 cursor-pointer"
            >
              <LinkIcon className="size-4 text-muted-foreground" />
              <span>Vincular a conta</span>
            </DropdownMenuItem>
          ) : null}

          {person.userId && person.userId !== currentUserId ? (
            <DropdownMenuItem
              onSelect={() => setImpersonateOpen(true)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <UserRoundCogIcon className="size-4 text-muted-foreground" />
              <span>Ver como esta pessoa</span>
            </DropdownMenuItem>
          ) : null}

          {person.userId ? (
            <DropdownMenuItem
              onSelect={() => setUnlinkOpen(true)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Link2OffIcon className="size-4 text-muted-foreground" />
              <span>Desvincular conta</span>
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
          >
            <Trash2Icon className="size-4" />
            <span>Excluir pessoa</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Controlled Dialogs */}
      <EditPersonDialog
        person={{
          id: person.id,
          name: person.name,
          email: person.email,
          phone: person.phone,
          birthday: person.birthday,
          userId: person.userId,
          user: person.user
            ? {
                name: person.user.name,
                email: person.user.email,
                birthday: person.user.birthday,
              }
            : null,
        }}
        open={editOpen}
        onOpenChange={setEditOpen}
        trigger={null}
      />

      {!person.userId && displayEmail ? (
        <InvitePersonDialog
          person={{
            id: person.id,
            name: displayName,
            email: displayEmail,
            phone: person.phone,
          }}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          trigger={null}
        />
      ) : null}

      {!person.userId ? (
        <LinkPersonDialog
          person={{
            id: person.id,
            name: displayName,
            email: displayEmail,
          }}
          availableMembers={linkableMembers}
          open={linkOpen}
          onOpenChange={setLinkOpen}
          trigger={null}
        />
      ) : null}

      {/* Impersonate Alert Dialog */}
      <AlertDialog open={impersonateOpen} onOpenChange={setImpersonateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <UserRoundCogIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Entrar como {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Você verá o painel com as permissões e escalas desta pessoa. Um
              aviso fixo no topo permitirá voltar para a sua conta a qualquer
              momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleImpersonate} disabled={isPending}>
              Entrar como {displayName}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlink Alert Dialog */}
      <AlertDialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Link2OffIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Desvincular conta de {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta de usuário será desvinculada do registro de voluntário na
              igreja. O histórico de cultos, departamentos e dados do membro
              serão preservados como um voluntário pré-cadastrado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink} disabled={isPending}>
              Desvincular conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>Excluir {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              {person.userId
                ? "Esta pessoa tem uma conta vinculada. Ao confirmar, o vínculo será desfeito e o registro de voluntário será removido dos departamentos e escalas. Essa ação não pode ser desfeita."
                : "A pessoa sairá de todos os departamentos e escalas da igreja. Essa ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter pessoa</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              Excluir pessoa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

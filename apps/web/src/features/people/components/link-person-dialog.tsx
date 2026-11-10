"use client";

import { useState, useTransition } from "react";
import { LinkIcon } from "lucide-react";
import { toast } from "sonner";

import { linkPersonAction } from "@/app/actions/people";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

type LinkableMember = {
  id: string;
  name: string;
  email: string;
};

export function LinkPersonDialog({
  person,
  availableMembers,
}: {
  person: {
    id: string;
    name: string;
    email: string | null;
  };
  availableMembers: LinkableMember[];
}) {
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState(
    availableMembers[0]?.id ?? "",
  );
  const [pending, startTransition] = useTransition();
  const disabled = availableMembers.length === 0;

  function handleLink() {
    startTransition(async () => {
      const result = await linkPersonAction(person.id, memberId);

      if (result.ok) {
        toast.success("Conta vinculada à pessoa.");
        setOpen(false);
        return;
      }

      toast.error(result.error ?? "Não foi possível vincular a conta.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Vincular ${person.name} a uma conta`}
          title={
            disabled
              ? "Nenhuma conta disponível para vincular"
              : "Vincular a uma conta"
          }
          disabled={disabled}
        >
          <LinkIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Vincular {person.name}
          </DialogTitle>
          <DialogDescription>
            Escolha uma conta que já faz parte da igreja. A pessoa passa a ver
            as escalas e o perfil dela.
          </DialogDescription>
        </DialogHeader>

        {disabled ? (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Todas as contas da igreja já estão vinculadas a outra pessoa.
          </p>
        ) : (
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="link-person-account">Conta</FieldLabel>
              <NativeSelect
                id="link-person-account"
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
                className="w-full [&_select]:h-10"
              >
                {availableMembers.map((member) => (
                  <NativeSelectOption key={member.id} value={member.id}>
                    {member.name} — {member.email}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <Button
              type="button"
              className="h-10 w-full"
              size="lg"
              disabled={pending || !memberId}
              onClick={handleLink}
            >
              <LinkIcon data-icon="inline-start" />
              {pending ? "Vinculando..." : "Vincular conta"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

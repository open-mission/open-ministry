"use client";

import { useState, useTransition } from "react";
import {
  CheckIcon,
  ClockIcon,
  MailPlusIcon,
  UserPlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import { invitePersonAction } from "@/app/actions/people";
import { FormAlert } from "@/components/auth/form-alert";
import { CopyTextButton } from "@/components/members/copy-text-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

export function InvitePersonDialog({
  person,
}: {
  person: {
    id: string;
    name: string;
    email: string | null;
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Convidar ${person.name}`}
          title="Gerar link de cadastro"
        >
          <MailPlusIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Convidar {person.name}
          </DialogTitle>
          <DialogDescription>
            Gere um link para a pessoa criar a conta. O vínculo com este
            cadastro é feito automaticamente pelo email.
          </DialogDescription>
        </DialogHeader>
        <InvitePersonContent person={person} />
      </DialogContent>
    </Dialog>
  );
}

function InvitePersonContent({
  person,
}: {
  person: {
    id: string;
    name: string;
    email: string | null;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    link: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleInvite() {
    setError(null);

    startTransition(async () => {
      const response = await invitePersonAction(person.id);

      if (response.ok && response.link) {
        setResult({
          link: response.link,
          expiresAt: response.expiresAt ?? new Date().toISOString(),
        });
        return;
      }

      if (response.error) {
        setError(response.error);
        toast.error(response.error);
      }
    });
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-accent/40 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CheckIcon className="size-3.5" />
            </span>
            Convite criado
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Envie o link para{" "}
            <span className="font-medium text-foreground">
              {person.email}
            </span>
            . A pessoa entra na igreja usando este mesmo email.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Input
              readOnly
              value={result.link}
              className="h-9 flex-1 bg-background text-xs"
              onFocus={(event) => event.currentTarget.select()}
            />
            <CopyTextButton value={result.link} size="icon-sm" />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
            <ClockIcon className="size-3.5" />
            Válido até {formatDate(result.expiresAt)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        O convite será enviado para{" "}
        <span className="font-medium text-foreground">{person.email}</span> e
        expira em 7 dias.
      </div>

      {error ? <FormAlert>{error}</FormAlert> : null}

      <Button
        type="button"
        className="h-10 w-full"
        size="lg"
        disabled={pending}
        onClick={handleInvite}
      >
        {pending ? (
          <>
            <UserPlusIcon data-icon="inline-start" />
            Gerando link...
          </>
        ) : (
          <>
            <MailPlusIcon data-icon="inline-start" />
            Gerar link de cadastro
          </>
        )}
      </Button>
    </div>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import {
  createFunctionAction,
  updateFunctionAction,
  type FunctionFormState,
} from "@/app/actions/departments";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type DepartmentFunction = {
  id: string;
  name: string;
  description: string | null;
};

type Action = (
  state: FunctionFormState,
  formData: FormData,
) => Promise<FunctionFormState>;

export function CreateFunctionDialog({
  departmentId,
}: {
  departmentId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusIcon data-icon="inline-start" />
          Nova função
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Nova função
          </DialogTitle>
          <DialogDescription>
            Funções são as áreas em que as pessoas atuam, como Projeção,
            Stories ou Fotografia.
          </DialogDescription>
        </DialogHeader>
        <FunctionForm
          action={createFunctionAction}
          departmentId={departmentId}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function EditFunctionDialog({
  departmentId,
  departmentFunction,
}: {
  departmentId: string;
  departmentFunction: DepartmentFunction;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Editar ${departmentFunction.name}`}
          title="Editar função"
        >
          <PencilIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Editar função
          </DialogTitle>
          <DialogDescription>
            Ajuste o nome e a explicação desta função.
          </DialogDescription>
        </DialogHeader>
        <FunctionForm
          action={updateFunctionAction}
          departmentId={departmentId}
          departmentFunction={departmentFunction}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function FunctionForm({
  action,
  departmentId,
  departmentFunction,
  onDone,
}: {
  action: Action;
  departmentId: string;
  departmentFunction?: DepartmentFunction;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<FunctionFormState, FormData>(
    action,
    undefined,
  );
  const handled = useRef(false);

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      toast.success(
        departmentFunction ? "Função atualizada." : "Função criada.",
      );
      onDone();
    }
  }, [state, departmentFunction, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="departmentId" value={departmentId} />
      {departmentFunction ? (
        <input
          type="hidden"
          name="functionId"
          value={departmentFunction.id}
        />
      ) : null}

      <FieldGroup>
        <Field data-invalid={Boolean(state?.fieldErrors?.name)}>
          <FieldLabel htmlFor="function-name">Nome da função</FieldLabel>
          <Input
            id="function-name"
            name="name"
            defaultValue={departmentFunction?.name ?? ""}
            placeholder="Projeção"
            className="h-10"
            aria-invalid={Boolean(state?.fieldErrors?.name)}
            autoFocus
            required
          />
          <FieldError
            errors={state?.fieldErrors?.name?.map((message) => ({ message }))}
          />
        </Field>

        <Field data-invalid={Boolean(state?.fieldErrors?.description)}>
          <FieldLabel htmlFor="function-description">
            Descrição{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Textarea
            id="function-description"
            name="description"
            defaultValue={departmentFunction?.description ?? ""}
            placeholder="O que essa função faz no culto ou evento."
            rows={3}
            aria-invalid={Boolean(state?.fieldErrors?.description)}
          />
          <FieldDescription>
            Ajuda quem está aprendendo a função a saber o que se espera.
          </FieldDescription>
          <FieldError
            errors={state?.fieldErrors?.description?.map((message) => ({
              message,
            }))}
          />
        </Field>
      </FieldGroup>

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <SubmitButton
        className="h-10 w-full"
        pendingLabel="Salvando..."
        size="lg"
      >
        {departmentFunction ? "Salvar função" : "Criar função"}
      </SubmitButton>
    </form>
  );
}

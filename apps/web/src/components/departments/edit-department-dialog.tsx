"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";

import {
  updateDepartmentAction,
  type DepartmentFormState,
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function EditDepartmentDialog({
  department,
}: {
  department: {
    id: string;
    name: string;
    description: string | null;
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PencilIcon data-icon="inline-start" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Editar departamento
          </DialogTitle>
          <DialogDescription>
            O nome e a descrição aparecem para toda a igreja.
          </DialogDescription>
        </DialogHeader>
        <DepartmentForm
          department={department}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function DepartmentForm({
  department,
  onDone,
}: {
  department: {
    id: string;
    name: string;
    description: string | null;
  };
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<DepartmentFormState, FormData>(
    updateDepartmentAction,
    undefined,
  );
  const handled = useRef(false);

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      toast.success("Departamento atualizado.");
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="departmentId" value={department.id} />

      <FieldGroup>
        <Field data-invalid={Boolean(state?.fieldErrors?.name)}>
          <FieldLabel htmlFor="edit-department-name">Nome</FieldLabel>
          <Input
            id="edit-department-name"
            name="name"
            defaultValue={department.name}
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
          <FieldLabel htmlFor="edit-department-description">
            Descrição{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Textarea
            id="edit-department-description"
            name="description"
            defaultValue={department.description ?? ""}
            rows={3}
            aria-invalid={Boolean(state?.fieldErrors?.description)}
          />
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
        Salvar alterações
      </SubmitButton>
    </form>
  );
}

"use client";

import { useActionState, useEffect } from "react";
import { CalendarDaysIcon } from "lucide-react";
import { toast } from "sonner";

import {
  updateOwnBirthdayAction,
  type BirthdayFormState,
} from "@/app/actions/profile";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function BirthdayForm({
  birthday,
  maxDate,
  onSuccess,
}: {
  birthday: string | null;
  maxDate: string;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState<BirthdayFormState, FormData>(
    updateOwnBirthdayAction,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success("Sua data de nascimento foi salva.");
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <Field data-invalid={Boolean(state?.fieldErrors?.birthday)}>
        <FieldLabel htmlFor="own-birthday" className="gap-2">
          <CalendarDaysIcon className="size-4 text-muted-foreground" />
          Data de nascimento
        </FieldLabel>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="own-birthday"
            name="birthday"
            type="date"
            defaultValue={birthday ?? ""}
            max={maxDate}
            className="h-10 flex-1"
            aria-invalid={Boolean(state?.fieldErrors?.birthday)}
            required
          />
          <SubmitButton
            className="h-10 w-full sm:w-auto"
            pendingLabel="Salvando..."
            size="default"
          >
            Salvar
          </SubmitButton>
        </div>
        <FieldError
          errors={state?.fieldErrors?.birthday?.map((message) => ({
            message,
          }))}
        />
      </Field>

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}
    </form>
  );
}

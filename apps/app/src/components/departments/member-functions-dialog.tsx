"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { PlusIcon, SlidersHorizontalIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  addMemberFunctionAction,
  removeMemberFunctionAction,
  updateExperienceAction,
  type MemberFunctionFormState,
} from "@/app/actions/departments";
import { ResponsiveDialog } from "@/components/app/responsive-dialog";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import {
  EXPERIENCE_LEVELS,
  experienceLevelDescriptions,
  experienceLevelLabels,
  type ExperienceLevel,
} from "@/lib/experience";
import {
  personDisplayName,
  type PersonLike,
} from "@/lib/person-format";

type Assignment = {
  id: string;
  functionId: string;
  experienceLevel: string;
  function: { id: string; name: string };
};

type DepartmentFunction = {
  id: string;
  name: string;
};

export function MemberFunctionsDialog({
  member,
  functions,
}: {
  member: {
    id: string;
    person: PersonLike;
    assignments: Assignment[];
  };
  functions: DepartmentFunction[];
}) {
  const [open, setOpen] = useState(false);
  const assignedIds = new Set(
    member.assignments.map((assignment) => assignment.functionId),
  );
  const availableFunctions = functions.filter(
    (departmentFunction) => !assignedIds.has(departmentFunction.id),
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="max-sm:size-9"
          aria-label={`Gerenciar funções de ${personDisplayName(member.person)}`}
          title="Funções e experiência"
        >
          <SlidersHorizontalIcon />
        </Button>
      }
      title={personDisplayName(member.person)}
      description="Funções em que esta pessoa atua e o nível de experiência em cada uma. Esses níveis ficam visíveis apenas para administradores e líderes."
      contentClassName="sm:max-w-md"
    >
      <div className="space-y-4">
        {member.assignments.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma função atribuída ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {member.assignments.map((assignment) => (
              <AssignmentRow key={assignment.id} assignment={assignment} />
            ))}
          </ul>
        )}

        {functions.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Cadastre as funções do departamento antes de atribuí-las às pessoas.
          </p>
        ) : availableFunctions.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Todas as funções já foram atribuídas a esta pessoa.
          </p>
        ) : (
          <>
            <Separator />
            <AddAssignmentForm
              departmentMemberId={member.id}
              availableFunctions={availableFunctions}
            />
          </>
        )}
      </div>
    </ResponsiveDialog>
  );
}

function AssignmentRow({ assignment }: { assignment: Assignment }) {
  const [level, setLevel] = useState(
    assignment.experienceLevel as ExperienceLevel,
  );
  const [pending, startTransition] = useTransition();

  function handleLevelChange(nextLevel: ExperienceLevel) {
    const previous = level;
    setLevel(nextLevel);

    startTransition(async () => {
      const result = await updateExperienceAction(assignment.id, nextLevel);

      if (result.ok) {
        toast.success("Nível de experiência atualizado.");
        return;
      }

      setLevel(previous);
      toast.error(result.error ?? "Não foi possível atualizar o nível.");
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeMemberFunctionAction(assignment.id);

      if (result.ok) {
        toast.success("Função removida.");
        return;
      }

      toast.error(result.error ?? "Não foi possível remover a função.");
    });
  }

  return (
    <li className="rounded-lg bg-muted/50 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {assignment.function.name}
        </span>
        <NativeSelect
          size="sm"
          value={level}
          disabled={pending}
          className="max-sm:[&_select]:h-10"
          aria-label={`Nível de experiência em ${assignment.function.name}`}
          onChange={(event) =>
            handleLevelChange(event.target.value as ExperienceLevel)
          }
        >
          {EXPERIENCE_LEVELS.map((experienceLevel) => (
            <NativeSelectOption key={experienceLevel} value={experienceLevel}>
              {experienceLevelLabels[experienceLevel]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="max-sm:size-9 text-destructive"
          aria-label={`Remover ${assignment.function.name}`}
          title="Remover função"
          disabled={pending}
          onClick={handleRemove}
        >
          <Trash2Icon />
        </Button>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {experienceLevelDescriptions[level]}
      </p>
    </li>
  );
}

function AddAssignmentForm({
  departmentMemberId,
  availableFunctions,
}: {
  departmentMemberId: string;
  availableFunctions: DepartmentFunction[];
}) {
  const [state, formAction] = useActionState<
    MemberFunctionFormState,
    FormData
  >(addMemberFunctionAction, undefined);
  const [level, setLevel] = useState<ExperienceLevel>("beginner");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      toast.success("Função atribuída.");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="departmentMemberId" value={departmentMemberId} />

      <FieldGroup className="gap-3">
        <Field data-invalid={Boolean(state?.fieldErrors?.functionId)}>
          <FieldLabel htmlFor="member-function">Adicionar função</FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <NativeSelect
              id="member-function"
              name="functionId"
              defaultValue=""
              className="min-w-0 flex-1 [&_select]:h-10 sm:[&_select]:h-9"
              aria-invalid={Boolean(state?.fieldErrors?.functionId)}
              required
            >
              <NativeSelectOption value="" disabled>
                Escolha uma função
              </NativeSelectOption>
              {availableFunctions.map((departmentFunction) => (
                <NativeSelectOption
                  key={departmentFunction.id}
                  value={departmentFunction.id}
                >
                  {departmentFunction.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              name="experienceLevel"
              value={level}
              onChange={(event) =>
                setLevel(event.target.value as ExperienceLevel)
              }
              className="w-full [&_select]:h-10 sm:w-40 sm:[&_select]:h-9"
              aria-label="Nível de experiência"
            >
              {EXPERIENCE_LEVELS.map((experienceLevel) => (
                <NativeSelectOption
                  key={experienceLevel}
                  value={experienceLevel}
                >
                  {experienceLevelLabels[experienceLevel]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <FieldDescription className="text-xs leading-relaxed">
            {experienceLevelDescriptions[level]}
          </FieldDescription>
          <FieldError
            errors={state?.fieldErrors?.functionId?.map((message) => ({
              message,
            }))}
          />
        </Field>
      </FieldGroup>

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <SubmitButton
        className="h-10 w-full"
        pendingLabel="Atribuindo..."
        size="sm"
      >
        <PlusIcon data-icon="inline-start" />
        Atribuir função
      </SubmitButton>
    </form>
  );
}

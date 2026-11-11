"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangleIcon, Loader2Icon, PlusIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";

import { saveScheduleAssignmentAction } from "@/app/actions/events";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getInitials } from "@/lib/format";
import type { PersonLike } from "@/lib/person-format";
import { cn } from "@/lib/utils";

type DepartmentMember = {
  id: string;
  name: string;
  email: string | null;
  image?: string | null;
};

type AssignmentInput = {
  id: string;
  departmentId: string;
  functionId: string;
  personId: string;
  person: PersonLike;
  function: { name: string };
};

export function InlineAssignmentPicker({
  eventId,
  departmentId,
  functionId,
  functionName,
  members,
  assignedPersonIds,
  unavailablePeopleMap,
  label = "Escalar",
  onAdded,
}: {
  eventId: string;
  departmentId: string;
  functionId: string;
  functionName: string;
  members: DepartmentMember[];
  assignedPersonIds: string[];
  unavailablePeopleMap?: Record<
    string,
    { isBlocked: boolean; reason?: string | null }
  >;
  label?: string;
  onAdded: (assignment: AssignmentInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [confirming, setConfirming] = useState<DepartmentMember | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingPersonId, setPendingPersonId] = useState<string | null>(null);

  const availableMembers = useMemo(() => {
    const assigned = new Set(assignedPersonIds);
    const search = term.trim().toLocaleLowerCase("pt-BR");

    return members
      .filter((member) => !assigned.has(member.id))
      .filter((member) =>
        search
          ? `${member.name} ${member.email ?? ""}`
              .toLocaleLowerCase("pt-BR")
              .includes(search)
          : true,
      )
      .sort((a, b) => {
        const aBlocked = unavailablePeopleMap?.[a.id]?.isBlocked ? 1 : 0;
        const bBlocked = unavailablePeopleMap?.[b.id]?.isBlocked ? 1 : 0;

        if (aBlocked !== bBlocked) {
          return aBlocked - bBlocked;
        }

        return a.name.localeCompare(b.name, "pt-BR");
      });
  }, [assignedPersonIds, members, term, unavailablePeopleMap]);

  const assign = (member: DepartmentMember) => {
    setPendingPersonId(member.id);
    setConfirming(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("eventId", eventId);
      formData.set("departmentId", departmentId);
      formData.set("functionId", functionId);
      formData.set("personId", member.id);

      const result = await saveScheduleAssignmentAction(undefined, formData);

      if (result?.success && result.assignment) {
        onAdded({
          id: result.assignment.id,
          departmentId: result.assignment.departmentId,
          functionId: result.assignment.functionId,
          personId: result.assignment.personId,
          person: {
            name: result.assignment.person.name,
            email: result.assignment.person.email ?? null,
            image: result.assignment.person.image ?? null,
            birthday: null,
            userId: null,
          },
          function: { name: result.assignment.function.name },
        });
        toast.success("Pessoa escalada.");
        setOpen(false);
        setTerm("");
      } else {
        toast.error(result?.error ?? "Não foi possível escalar.");
      }

      setPendingPersonId(null);
    });
  };

  const handleSelect = (member: DepartmentMember) => {
    if (unavailablePeopleMap?.[member.id]?.isBlocked) {
      setConfirming(member);
      return;
    }

    assign(member);
  };

  const disabledReason =
    members.length === 0
      ? "Este departamento ainda não tem pessoas. Adicione membros ao departamento primeiro."
      : members.length === assignedPersonIds.length
        ? `Todas as pessoas do departamento já estão escaladas em ${functionName}.`
        : undefined;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);

        if (!next) {
          setConfirming(null);
          setTerm("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={label === "Escalar" ? "outline" : "ghost"}
          size="sm"
          className={cn(
            "h-8 shrink-0 gap-1 px-2 text-[0.8125rem]",
            label !== "Escalar" && "text-muted-foreground hover:text-foreground",
          )}
          disabled={Boolean(disabledReason) || pending}
          title={disabledReason ?? `Escalar pessoa em ${functionName}`}
        >
          {pending ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : label === "Escalar" ? (
            <UserPlusIcon className="size-3.5" />
          ) : (
            <PlusIcon className="size-3.5" />
          )}
          {label}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b border-border/70 p-2">
          <Input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar pessoa..."
            aria-label={`Buscar pessoa para ${functionName}`}
            className="h-9"
          />
        </div>

        <div className="max-h-56 overflow-y-auto p-1">
          {availableMembers.length === 0 ? (
            <p className="px-2 py-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
              {term
                ? "Nenhuma pessoa encontrada."
                : "Todas as pessoas disponíveis já estão nesta função."}
            </p>
          ) : (
            availableMembers.map((member) => {
              const blocked = unavailablePeopleMap?.[member.id]?.isBlocked;
              const isPending = pending && pendingPersonId === member.id;

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelect(member)}
                  disabled={pending}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-60"
                >
                  <Avatar className="size-6">
                    <AvatarImage
                      src={member.image ?? undefined}
                      alt={member.name}
                    />
                    <AvatarFallback className="bg-primary/10 text-[0.6rem] font-medium text-primary">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {member.name}
                    </span>
                    {member.email ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {member.email}
                      </span>
                    ) : null}
                  </span>
                  {isPending ? (
                    <Loader2Icon className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                  ) : blocked ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-800 dark:text-amber-300">
                      <AlertTriangleIcon className="size-3" />
                      Indisponível
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {confirming ? (
          <div className="space-y-2 border-t border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-[0.8125rem] font-medium text-amber-900 dark:text-amber-200">
              {confirming.name} marcou indisponibilidade nesta data.
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {unavailablePeopleMap?.[confirming.id]?.reason
                ? `Observação: “${unavailablePeopleMap[confirming.id]?.reason}”`
                : "Escalar mesmo assim pode gerar um conflito com a agenda da pessoa."}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-8 flex-1"
                onClick={() => assign(confirming)}
                disabled={pending}
              >
                Escalar mesmo assim
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => setConfirming(null)}
                disabled={pending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

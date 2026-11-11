"use client";

import { useState } from "react";
import {
  ClipboardListIcon,
  ClockIcon,
  UsersIcon,
} from "lucide-react";

import {
  ScheduleEditor,
  type ScheduleAssignment,
} from "@/components/events/schedule-editor";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { DepartmentRecord } from "@/lib/departments";

export function EventTabs({
  defaultTab,
  plan,
  planItemsCount,
  eventId,
  departments,
  assignments: initialAssignments,
  currentUserId,
  isAdmin,
  unavailablePeopleMap,
}: {
  defaultTab: "order" | "teams";
  plan: React.ReactNode;
  planItemsCount: number;
  eventId: string;
  departments: DepartmentRecord[];
  assignments: ScheduleAssignment[];
  currentUserId: string;
  isAdmin: boolean;
  unavailablePeopleMap?: Record<
    string,
    { isBlocked: boolean; reason?: string | null }
  >;
}) {
  const [assignments, setAssignments] =
    useState<ScheduleAssignment[]>(initialAssignments);
  const [previousInitial, setPreviousInitial] = useState(initialAssignments);

  if (initialAssignments !== previousInitial) {
    setPreviousInitial(initialAssignments);
    setAssignments(initialAssignments);
  }

  const totalFunctions = departments.reduce(
    (total, department) => total + department.functions.length,
    0,
  );
  const coveredFunctions = new Set(
    assignments.map((assignment) => assignment.functionId),
  ).size;
  const peopleCount = new Set(
    assignments.map((assignment) => assignment.personId),
  ).size;

  const addAssignment = (assignment: ScheduleAssignment) => {
    setAssignments((current) => [
      ...current.filter(
        (item) =>
          !(
            item.departmentId === assignment.departmentId &&
            item.functionId === assignment.functionId &&
            item.personId === assignment.personId
          ),
      ),
      assignment,
    ]);
  };

  const removeAssignment = (assignmentId: string) => {
    setAssignments((current) =>
      current.filter((assignment) => assignment.id !== assignmentId),
    );
  };

  const restoreAssignment = (assignment: ScheduleAssignment) => {
    setAssignments((current) =>
      current.some((item) => item.id === assignment.id)
        ? current
        : [...current, assignment],
    );
  };

  return (
    <Tabs defaultValue={defaultTab} className="space-y-6">
      <TabsList className="grid h-11 w-full grid-cols-2 items-stretch rounded-xl bg-muted p-1 group-data-horizontal/tabs:h-11 sm:inline-flex sm:w-fit">
        <TabsTrigger
          value="order"
          className="flex h-9 items-center justify-center gap-1.5 px-2.5 text-[0.8125rem] sm:gap-2 sm:px-3 sm:text-sm"
        >
          <ClockIcon className="size-4 shrink-0" />
          <span className="truncate sm:hidden">Cronograma</span>
          <span className="hidden truncate sm:inline">
            Cronograma do Culto
          </span>
          {planItemsCount > 0 ? (
            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-semibold text-primary">
              {planItemsCount}
            </span>
          ) : null}
        </TabsTrigger>

        <TabsTrigger
          value="teams"
          className="flex h-9 items-center justify-center gap-1.5 px-2.5 text-[0.8125rem] sm:gap-2 sm:px-3 sm:text-sm"
        >
          <UsersIcon className="size-4 shrink-0" />
          <span className="truncate sm:hidden">Escala</span>
          <span className="hidden truncate sm:inline">Escala &amp; Equipes</span>
          {totalFunctions > 0 ? (
            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-muted-foreground/15 px-1 text-[10px] font-semibold text-muted-foreground">
              {coveredFunctions}/{totalFunctions}
            </span>
          ) : null}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="order">{plan}</TabsContent>

      <TabsContent value="teams" className="space-y-4">
        <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <h2 className="font-heading text-2xl tracking-tight">
            Equipes e funções
          </h2>
          <span
            className="text-[0.8125rem] text-muted-foreground"
            title="Uma função é considerada coberta quando tem pelo menos 1 pessoa escalada."
          >
            {totalFunctions === 0
              ? "Sem funções definidas"
              : `${coveredFunctions} de ${totalFunctions} funções com pelo menos 1 pessoa · ${peopleCount} ${
                  peopleCount === 1 ? "pessoa escalada" : "pessoas escaladas"
                }`}
          </span>
        </div>

        {departments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ClipboardListIcon className="size-5" />
            </span>
            <div className="max-w-md space-y-1">
              <p className="text-sm font-medium">
                Nenhum departamento atuando
              </p>
              <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
                {isAdmin
                  ? "Edite o evento para escolher os departamentos. Depois, volte aqui para escalar as pessoas em cada função."
                  : "A liderança ainda não definiu os departamentos deste evento."}
              </p>
            </div>
          </div>
        ) : (
          <ScheduleEditor
            eventId={eventId}
            departments={departments}
            assignments={assignments}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            unavailablePeopleMap={unavailablePeopleMap}
            onAddAssignment={addAssignment}
            onRemoveAssignment={removeAssignment}
            onRestoreAssignment={restoreAssignment}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
